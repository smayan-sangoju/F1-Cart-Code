import { useState } from 'react'

const DIRECTIONS  = ['Forward', 'Reverse', 'Stop']
const PRESET_SPEEDS = ['Slow', 'Medium', 'Fast']

/** Convert a step object to the Arduino LOAD wire format */
function encodeStep(step) {
  if (step.direction === 'Stop') {
    return `S,${Math.round(step.duration * 1000)}`
  }
  const dir = step.direction === 'Forward' ? 'F' : 'R'

  if (step.speed?.isCustom) {
    // Custom profile: use spd=0 to signal raw servo value
    // Forward uses servoVal directly; reverse mirrors around neutral (90)
    const val = dir === 'F' ? step.speed.servoVal : 180 - step.speed.servoVal
    return `${dir},0,${val},${Math.round(step.duration * 1000)}`
  }

  const spd = PRESET_SPEEDS.indexOf(step.speed) + 1
  return `${dir},${spd},${Math.round(step.duration * 1000)}`
}

/** CSS modifier for each direction */
function dirMod(dir) {
  if (dir === 'Forward') return 'fwd'
  if (dir === 'Reverse') return 'rev'
  return 'stp'
}

/** Timeline bar showing each step's duration as a proportional colored segment */
function SequenceTimeline({ steps, totalTime }) {
  if (steps.length === 0 || totalTime === 0) return null
  return (
    <div className="seq-timeline">
      <div className="timeline-label">Timeline</div>
      <div className="timeline-track">
        {steps.map(step => {
          const pct = (step.duration / totalTime) * 100
          const mod = dirMod(step.direction)
          return (
            <div
              key={step.id}
              className={`timeline-seg seg-${mod}`}
              style={{ width: `${pct}%` }}
              title={`${step.direction}${step.speed ? ' · ' + (step.speed.isCustom ? step.speed.name : step.speed) : ''} · ${step.duration}s`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function SequenceBuilder({ serial, speedProfiles }) {
  const { connected, sendCommand, seqRunning, seqWaiting, seqStepIndex } = serial
  const { profiles } = speedProfiles

  const [steps,       setSteps]       = useState([])
  const [newDir,      setNewDir]      = useState('Forward')
  const [newSpeed,    setNewSpeed]    = useState('Slow')
  const [newDuration, setNewDuration] = useState('2')

  // ── Inline editing state ─────────────────────────────────────────────────
  const [editingId,  setEditingId]  = useState(null)
  const [editDir,    setEditDir]    = useState('Forward')
  const [editSpeed,  setEditSpeed]  = useState('Slow')
  const [editDur,    setEditDur]    = useState('2')

  const speedToSelectVal = (speed) => {
    if (!speed) return 'Slow'
    if (speed.isCustom) return `custom:${profiles.find(p => p.servoVal === speed.servoVal && p.name === speed.name)?.id ?? ''}`
    return speed
  }

  const startEdit = (step) => {
    setEditingId(step.id)
    setEditDir(step.direction)
    setEditSpeed(speedToSelectVal(step.speed))
    setEditDur(String(step.duration))
  }

  const cancelEdit = () => setEditingId(null)

  const resolveSpeedFor = (dir, speedVal) => {
    if (dir === 'Stop') return null
    if (speedVal.startsWith('custom:')) {
      const id = Number(speedVal.split(':')[1])
      const p  = profiles.find(p => p.id === id)
      return p ? { name: p.name, servoVal: p.servoVal, isCustom: true } : 'Slow'
    }
    return speedVal
  }

  const saveEdit = () => {
    const dur = parseFloat(editDur)
    if (isNaN(dur) || dur <= 0) return
    setSteps(prev => prev.map(s =>
      s.id === editingId
        ? { ...s, direction: editDir, speed: resolveSpeedFor(editDir, editSpeed), duration: dur }
        : s
    ))
    setEditingId(null)
  }

  // Resolve the newSpeed select value into a speed value for the step
  const resolveSpeed = () => resolveSpeedFor(newDir, newSpeed)

  // ── Add step ─────────────────────────────────────────────────────────────
  const addStep = () => {
    const dur = parseFloat(newDuration)
    if (isNaN(dur) || dur <= 0) return
    setSteps(prev => [
      ...prev,
      {
        id:        Date.now(),
        direction: newDir,
        speed:     resolveSpeed(),
        duration:  dur,
      },
    ])
  }

  const removeStep = (id) => {
    if (editingId === id) setEditingId(null)
    setSteps(prev => prev.filter(s => s.id !== id))
  }

  const clearAll = () => {
    setEditingId(null)
    setSteps([])
  }

  // ── Sequence execution ───────────────────────────────────────────────────
  const runSequence = async () => {
    if (steps.length === 0) return
    const payload = steps.map(encodeStep).join('|')
    await sendCommand(`LOAD ${payload}`)
    setTimeout(async () => {
      await sendCommand('SEQ')
    }, 150)
  }

  const stopSequence = async () => {
    await sendCommand('STOP_SEQ')
  }

  const saveSequence = async () => {
    if (steps.length === 0) return
    const payload = steps.map(encodeStep).join('|')
    await sendCommand(`LOAD ${payload}`)
    setTimeout(async () => {
      await sendCommand('SAVE')
    }, 150)
  }

  const totalTime = steps.reduce((s, step) => s + step.duration, 0)

  const speedLabel = (speed) => {
    if (!speed) return ''
    if (speed.isCustom) return speed.name
    return speed
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="card sequence-builder">
      {/* Header */}
      <div className="card-header">
        <h2>Sequence Builder</h2>
        <span className="step-count">
          {steps.length} step{steps.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add-step row */}
      <div className="add-step-row">
        <select
          value={newDir}
          onChange={e => setNewDir(e.target.value)}
          className="select"
        >
          {DIRECTIONS.map(d => <option key={d}>{d}</option>)}
        </select>

        <select
          value={newSpeed}
          onChange={e => setNewSpeed(e.target.value)}
          disabled={newDir === 'Stop'}
          className="select"
        >
          <optgroup label="Presets">
            {PRESET_SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}
          </optgroup>
          {profiles.length > 0 && (
            <optgroup label="Custom Profiles">
              {profiles.map(p => (
                <option key={p.id} value={`custom:${p.id}`}>{p.name}</option>
              ))}
            </optgroup>
          )}
        </select>

        <input
          type="number"
          min="0.1"
          step="0.1"
          value={newDuration}
          onChange={e => setNewDuration(e.target.value)}
          className="input-duration"
          placeholder="sec"
        />
        <span className="input-unit">s</span>

        <button
          className="btn-add"
          onClick={addStep}
          disabled={!connected}
        >
          + Add
        </button>
      </div>

      {/* Steps list */}
      <div className="steps-list">
        {steps.length === 0 ? (
          <div className="steps-empty">
            No steps yet. Add steps above to build a sequence.
          </div>
        ) : (
          steps.map((step, i) => {
            const mod = dirMod(step.direction)
            const isEditing = editingId === step.id
            const isActive = seqRunning && !seqWaiting && i === seqStepIndex

            if (isEditing) {
              return (
                <div key={step.id} className="step-item step-edit-row">
                  <span className={`step-badge badge-${mod}`}>{i + 1}</span>
                  <select
                    value={editDir}
                    onChange={e => setEditDir(e.target.value)}
                    className="select step-edit-select"
                  >
                    {DIRECTIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                  <select
                    value={editSpeed}
                    onChange={e => setEditSpeed(e.target.value)}
                    disabled={editDir === 'Stop'}
                    className="select step-edit-select"
                  >
                    <optgroup label="Presets">
                      {PRESET_SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}
                    </optgroup>
                    {profiles.length > 0 && (
                      <optgroup label="Custom Profiles">
                        {profiles.map(p => (
                          <option key={p.id} value={`custom:${p.id}`}>{p.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={editDur}
                    onChange={e => setEditDur(e.target.value)}
                    className="input-duration"
                  />
                  <span className="input-unit">s</span>
                  <button className="btn-edit-save" onClick={saveEdit}>Save</button>
                  <button className="btn-remove" onClick={cancelEdit}>✕</button>
                </div>
              )
            }

            return (
              <div key={step.id} className={`step-item step-${mod}${isActive ? ' step-active' : ''}`}>
                <span className="step-drag-handle" aria-hidden="true">⋮⋮</span>
                <span className={`step-badge badge-${mod}${isActive ? ' badge-running' : ''}`}>
                  {isActive ? '▶' : i + 1}
                </span>
                <span className="step-dir">{step.direction}</span>
                {step.speed && (
                  <span className={`step-speed-tag tag-${mod}${step.speed.isCustom ? ' tag-custom' : ''}`}>
                    {speedLabel(step.speed)}
                  </span>
                )}
                <span className="step-duration">{step.duration}s</span>
                <button
                  className="btn-edit"
                  onClick={() => startEdit(step)}
                  aria-label={`Edit step ${i + 1}`}
                  disabled={seqRunning}
                >
                  ✎
                </button>
                <button
                  className="btn-remove"
                  onClick={() => removeStep(step.id)}
                  aria-label={`Remove step ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Timeline */}
      <SequenceTimeline steps={steps} totalTime={totalTime} />

      {/* Footer */}
      <div className="sequence-footer">
        <div className="seq-footer-row">
          <div className="sequence-stats">
            Total:&nbsp;<strong>{totalTime.toFixed(1)}s</strong>
          </div>
          <div className="sequence-actions">
            <button
              className="btn-clear"
              onClick={clearAll}
              disabled={steps.length === 0 || seqRunning}
            >
              Clear All
            </button>

            <button
              className="btn-save-seq"
              onClick={saveSequence}
              disabled={!connected || steps.length === 0 || seqRunning}
              title="Save to Arduino EEPROM — runs on button press without USB"
            >
              💾&nbsp; Save to Arduino
            </button>

            {seqRunning ? (
              seqWaiting ? (
                /* Armed — waiting for physical button press */
                <div className="seq-waiting-state">
                  <span className="seq-waiting-text">⏳ Press cart button…</span>
                  <button
                    className="btn-cancel-seq"
                    onClick={stopSequence}
                    disabled={!connected}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                /* Sequence actively running */
                <button
                  className="btn-stop-seq"
                  onClick={stopSequence}
                  disabled={!connected}
                >
                  ⏹&nbsp; Stop Sequence
                </button>
              )
            ) : (
              <button
                className="btn-arm-seq"
                onClick={runSequence}
                disabled={!connected || steps.length === 0}
              >
                ⚑&nbsp; Arm Sequence
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
