import { useState } from 'react'

const SPEEDS = [
  { label: 'Slow',   level: 1 },
  { label: 'Medium', level: 2 },
  { label: 'Fast',   level: 3 },
]

const CUSTOM_MIN  = 93
const CUSTOM_MAX  = 155
const CUSTOM_STEP = 3

// Preset servo values for label hints
const PRESET_SLOW = 108
const PRESET_MED  = 130
const PRESET_FAST = 150

function speedLabel(val) {
  if (val < PRESET_SLOW - 5)  return 'Below Slow'
  if (val < PRESET_SLOW + 5)  return '~ Slow'
  if (val < PRESET_MED  - 5)  return 'Slow → Medium'
  if (val < PRESET_MED  + 5)  return '~ Medium'
  if (val < PRESET_FAST - 5)  return 'Medium → Fast'
  if (val < PRESET_FAST + 5)  return '~ Fast'
  return 'Above Fast'
}

function speedPct(val) {
  return Math.round(((val - CUSTOM_MIN) / (CUSTOM_MAX - CUSTOM_MIN)) * 100)
}

/** Signal-bar style speed meter — fills proportionally to level (1-3) */
function SpeedBars({ level }) {
  return (
    <div className="speed-bars">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className={`speed-bar speed-bar-${i}${i <= level ? ' bar-active' : ''}`}
        />
      ))}
    </div>
  )
}

/** +/− stepper that sends immediately on each click — no stale-closure issues */
function CustomStepper({ value, onChange, onFire, variant, disabled }) {
  const pct = speedPct(value)
  const label = speedLabel(value)

  const adjust = (delta) => {
    const next = Math.max(CUSTOM_MIN, Math.min(CUSTOM_MAX, value + delta))
    onChange(next)
    onFire(next)
  }

  return (
    <div className={`custom-stepper custom-stepper-${variant}`}>
      <button
        className="stepper-btn stepper-dec"
        onClick={() => adjust(-CUSTOM_STEP)}
        disabled={disabled || value <= CUSTOM_MIN}
        aria-label="Decrease speed"
      >
        −
      </button>

      <div className="stepper-display">
        <div className="stepper-bar-track">
          <div
            className={`stepper-bar-fill fill-${variant}`}
            style={{ width: `${pct}%` }}
          />
          {/* Preset tick marks */}
          {[PRESET_SLOW, PRESET_MED, PRESET_FAST].map(v => (
            <div
              key={v}
              className={`stepper-tick tick-${variant}`}
              style={{ left: `${speedPct(v)}%` }}
            />
          ))}
        </div>
        <div className="stepper-meta">
          <span className="stepper-label">{label}</span>
          <span className="stepper-pct">{pct}%</span>
        </div>
      </div>

      <button
        className="stepper-btn stepper-inc"
        onClick={() => adjust(CUSTOM_STEP)}
        disabled={disabled || value >= CUSTOM_MAX}
        aria-label="Increase speed"
      >
        +
      </button>
    </div>
  )
}

/** Inline save-profile form */
function SaveProfileForm({ servoVal, onSave, onCancel }) {
  const [name, setName] = useState('')

  const commit = () => {
    if (!name.trim()) return
    onSave(name, servoVal)
    setName('')
  }

  return (
    <div className="save-profile-form">
      <input
        className="save-profile-input"
        placeholder="Profile name…"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
        maxLength={20}
      />
      <button className="btn-profile-confirm" onClick={commit} disabled={!name.trim()}>
        Save
      </button>
      <button className="btn-profile-cancel" onClick={onCancel}>✕</button>
    </div>
  )
}

export default function MotionControls({ serial, speedProfiles }) {
  const { connected, sendCommand } = serial
  const { profiles, addProfile, removeProfile } = speedProfiles

  const [activeCmd, setActiveCmd] = useState(null)
  const [customFwd, setCustomFwd] = useState(118)
  const [customRev, setCustomRev] = useState(118)
  const [savingFwd, setSavingFwd] = useState(false)
  const [savingRev, setSavingRev] = useState(false)

  const fire = (cmd) => {
    sendCommand(cmd)
    setActiveCmd(cmd)
  }

  const stop = () => {
    sendCommand('STOP')
    setActiveCmd('STOP')
  }

  // Accept value directly — avoids stale React state closure
  const fireCustomFwd = (val) => {
    if (!connected) return
    sendCommand(`FWD CUSTOM ${val}`)
    setActiveCmd('FWD CUSTOM')
  }

  const fireCustomRev = (val) => {
    if (!connected) return
    const revVal = 180 - val
    sendCommand(`REV CUSTOM ${revVal}`)
    setActiveCmd('REV CUSTOM')
  }

  return (
    <div className="card motion-controls">
      {/* ── Emergency stop ── */}
      <button
        className={`btn-estop${activeCmd === 'STOP' ? ' active' : ''}`}
        onClick={stop}
        disabled={!connected}
      >
        ⚡&nbsp; EMERGENCY STOP
      </button>

      {/* ── Forward ── */}
      <div className="direction-section">
        <div className="direction-label fwd-label">▲&nbsp; Forward</div>
        <div className="speed-buttons">
          {SPEEDS.map(({ label, level }) => {
            const cmd = `FWD ${level}`
            return (
              <button
                key={level}
                data-level={level}
                className={`btn-speed btn-fwd${activeCmd === cmd ? ' active' : ''}`}
                onClick={() => fire(cmd)}
                disabled={!connected}
              >
                <SpeedBars level={level} />
                <span className="speed-label">{label}</span>
              </button>
            )
          })}
        </div>

        <div className={`custom-speed-row${activeCmd === 'FWD CUSTOM' ? ' custom-active-fwd' : ''}`}>
          <span className="custom-speed-label">Custom</span>
          <CustomStepper
            value={customFwd}
            onChange={setCustomFwd}
            onFire={fireCustomFwd}
            variant="fwd"
            disabled={!connected}
          />
          <button
            className="btn-save-profile"
            title="Save as speed profile"
            onClick={() => { setSavingFwd(true); setSavingRev(false) }}
          >
            +
          </button>
        </div>

        {savingFwd && (
          <SaveProfileForm
            servoVal={customFwd}
            onSave={(name, val) => { addProfile(name, val); setSavingFwd(false) }}
            onCancel={() => setSavingFwd(false)}
          />
        )}
      </div>

      {/* ── Reverse ── */}
      <div className="direction-section">
        <div className="direction-label rev-label">▼&nbsp; Reverse</div>
        <div className="speed-buttons">
          {SPEEDS.map(({ label, level }) => {
            const cmd = `REV ${level}`
            return (
              <button
                key={level}
                data-level={level}
                className={`btn-speed btn-rev${activeCmd === cmd ? ' active' : ''}`}
                onClick={() => fire(cmd)}
                disabled={!connected}
              >
                <SpeedBars level={level} />
                <span className="speed-label">{label}</span>
              </button>
            )
          })}
        </div>

        <div className={`custom-speed-row${activeCmd === 'REV CUSTOM' ? ' custom-active-rev' : ''}`}>
          <span className="custom-speed-label">Custom</span>
          <CustomStepper
            value={customRev}
            onChange={setCustomRev}
            onFire={fireCustomRev}
            variant="rev"
            disabled={!connected}
          />
          <button
            className="btn-save-profile"
            title="Save as speed profile"
            onClick={() => { setSavingRev(true); setSavingFwd(false) }}
          >
            +
          </button>
        </div>

        {savingRev && (
          <SaveProfileForm
            servoVal={customRev}
            onSave={(name, val) => { addProfile(name, val); setSavingRev(false) }}
            onCancel={() => setSavingRev(false)}
          />
        )}
      </div>

      {/* ── Saved profiles ── */}
      {profiles.length > 0 && (
        <div className="profiles-section">
          <div className="profiles-label">Saved Profiles</div>
          <div className="profiles-list">
            {profiles.map(p => (
              <div key={p.id} className="profile-chip">
                <span className="profile-chip-name">{p.name}</span>
                <span className="profile-chip-speed">{speedPct(p.servoVal)}%</span>
                <button
                  className="profile-chip-remove"
                  onClick={() => removeProfile(p.id)}
                  title="Delete profile"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
