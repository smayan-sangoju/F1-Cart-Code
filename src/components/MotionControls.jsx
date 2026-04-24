import { useState } from 'react'

const SPEEDS = [
  { label: 'Slow',   level: 1 },
  { label: 'Medium', level: 2 },
  { label: 'Fast',   level: 3 },
]

// Forward: above neutral, higher = faster
const FWD_MIN  = 93
const FWD_MAX  = 130
const FWD_STEP = 2
const FWD_PRESETS = [98, 100, 103]   // Slow / Med / Fast

// Reverse: below neutral, lower = faster
const REV_MIN  = 50
const REV_MAX  = 88
const REV_STEP = 2
const REV_PRESETS = [84, 79, 74]     // Slow / Med / Fast

function fwdPct(val) {
  return Math.round(((val - FWD_MIN) / (FWD_MAX - FWD_MIN)) * 100)
}

// Reverse bar is inverted: lower val = more throttle = fuller bar
function revPct(val) {
  return Math.round(((REV_MAX - val) / (REV_MAX - REV_MIN)) * 100)
}

function fwdLabel(val) {
  if (val < FWD_PRESETS[0]) return 'Below Slow'
  if (val < FWD_PRESETS[1]) return '~ Slow'
  if (val < FWD_PRESETS[2]) return '~ Medium'
  if (val === FWD_PRESETS[2]) return '~ Fast'
  return 'Above Fast'
}

function revLabel(val) {
  if (val > REV_PRESETS[0]) return 'Below Slow'
  if (val > REV_PRESETS[1]) return '~ Slow'
  if (val > REV_PRESETS[2]) return '~ Medium'
  if (val === REV_PRESETS[2]) return '~ Fast'
  return 'Above Fast'
}

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

function CustomStepper({ value, pct, label, tickPcts, onDec, onInc, variant, disabled }) {
  return (
    <div className={`custom-stepper custom-stepper-${variant}`}>
      <button
        className="stepper-btn stepper-dec"
        onClick={onDec}
        disabled={disabled}
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
          {tickPcts.map((tp, i) => (
            <div
              key={i}
              className={`stepper-tick tick-${variant}`}
              style={{ left: `${tp}%` }}
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
        onClick={onInc}
        disabled={disabled}
        aria-label="Increase speed"
      >
        +
      </button>
    </div>
  )
}

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
      <button className="btn-profile-confirm" onClick={commit} disabled={!name.trim()}>Save</button>
      <button className="btn-profile-cancel" onClick={onCancel}>✕</button>
    </div>
  )
}

export default function MotionControls({ serial, speedProfiles }) {
  const { connected, sendCommand } = serial
  const { profiles, addProfile, removeProfile } = speedProfiles

  const [activeCmd,  setActiveCmd]  = useState(null)
  const [customFwd,  setCustomFwd]  = useState(FWD_PRESETS[0])
  const [customRev,  setCustomRev]  = useState(REV_PRESETS[0])
  const [savingFwd,  setSavingFwd]  = useState(false)
  const [savingRev,  setSavingRev]  = useState(false)

  const fire = (cmd) => { sendCommand(cmd); setActiveCmd(cmd) }
  const stop = ()    => { sendCommand('STOP'); setActiveCmd('STOP') }

  const fireCustomFwd = (val) => {
    if (!connected) return
    sendCommand(`FWD CUSTOM ${val}`)
    setActiveCmd('FWD CUSTOM')
  }

  const fireCustomRev = (val) => {
    if (!connected) return
    sendCommand(`REV CUSTOM ${val}`)
    setActiveCmd('REV CUSTOM')
  }

  const adjFwd = (delta) => {
    const next = Math.max(FWD_MIN, Math.min(FWD_MAX, customFwd + delta))
    setCustomFwd(next)
    fireCustomFwd(next)
  }

  const adjRev = (delta) => {
    const next = Math.max(REV_MIN, Math.min(REV_MAX, customRev + delta))
    setCustomRev(next)
    fireCustomRev(next)
  }

  return (
    <div className="card motion-controls">
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
            pct={fwdPct(customFwd)}
            label={fwdLabel(customFwd)}
            tickPcts={FWD_PRESETS.map(fwdPct)}
            onDec={() => adjFwd(-FWD_STEP)}
            onInc={() => adjFwd(+FWD_STEP)}
            variant="fwd"
            disabled={!connected}
          />
          <button
            className="btn-save-profile"
            title="Save as speed profile"
            onClick={() => { setSavingFwd(true); setSavingRev(false) }}
          >+</button>
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
            pct={revPct(customRev)}
            label={revLabel(customRev)}
            tickPcts={REV_PRESETS.map(revPct)}
            onDec={() => adjRev(+REV_STEP)}
            onInc={() => adjRev(-REV_STEP)}
            variant="rev"
            disabled={!connected}
          />
          <button
            className="btn-save-profile"
            title="Save as speed profile"
            onClick={() => { setSavingRev(true); setSavingFwd(false) }}
          >+</button>
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
                <span className="profile-chip-speed">{fwdPct(p.servoVal)}%</span>
                <button
                  className="profile-chip-remove"
                  onClick={() => removeProfile(p.id)}
                  title="Delete profile"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
