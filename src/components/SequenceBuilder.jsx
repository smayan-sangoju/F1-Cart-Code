import { useState } from 'react'

const DIRECTIONS = ['Forward', 'Reverse', 'Stop']
const SPEEDS     = ['Slow', 'Medium', 'Fast']

/** Convert a step object to the Arduino LOAD wire format */
function encodeStep(step) {
  if (step.direction === 'Stop') {
    return `S,${Math.round(step.duration * 1000)}`
  }
  const dir = step.direction === 'Forward' ? 'F' : 'R'
  const spd = SPEEDS.indexOf(step.speed) + 1
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
              title={`${step.direction}${step.speed ? ' · ' + step.speed : ''} · ${step.duration}s`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function SequenceBuilder({ serial }) {
  const { connected, sendCommand, seqRunning, seqWaiting } = serial

  const [steps,       setSteps]       = useState([])
  const [newDir,      setNewDir]      = useState('Forward')
  const [newSpeed,    setNewSpeed]    = useState('Slow')
  const [newDuration, setNewDuration] = useState('2')

  // ── Add step ─────────────────────────────────────────────────────────────
  const addStep = () => {
    const dur = parseFloat(newDuration)
    if (isNaN(dur) || dur <= 0) return
    setSteps(prev => [
      ...prev,
      {
        id:        Date.now(),
        direction: newDir,
        speed:     newDir === 'Stop' ? null : newSpeed,
        duration:  dur,
      },
    ])
  }

  const removeStep = (id) => setSteps(prev => prev.filter(s => s.id !== id))

  const clearAll = () => setSteps([])

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

  const totalTime = steps.reduce((s, step) => s + step.duration, 0)

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
          {SPEEDS.map(s => <option key={s}>{s}</option>)}
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
            return (
              <div key={step.id} className={`step-item step-${mod}`}>
                <span className="step-drag-handle" aria-hidden="true">⋮⋮</span>
                <span className={`step-badge badge-${mod}`}>{i + 1}</span>
                <span className="step-dir">{step.direction}</span>
                {step.speed && (
                  <span className={`step-speed-tag tag-${mod}`}>
                    {step.speed}
                  </span>
                )}
                <span className="step-duration">{step.duration}s</span>
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
