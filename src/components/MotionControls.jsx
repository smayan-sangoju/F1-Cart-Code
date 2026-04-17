import { useState } from 'react'

const SPEEDS = [
  { label: 'Slow',   level: 1 },
  { label: 'Medium', level: 2 },
  { label: 'Fast',   level: 3 },
]

// Servo value range exposed to the custom slider
const CUSTOM_MIN = 92
const CUSTOM_MAX = 125

// Where the presets fall on the slider (for tick marks)
const PRESET_VALS = [97, 110, 120]

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

/** Slider with ghost tick marks at the three preset positions */
function CustomSlider({ value, onChange, onCommit, color }) {
  const pct = (v) => ((v - CUSTOM_MIN) / (CUSTOM_MAX - CUSTOM_MIN)) * 100

  return (
    <div className="custom-slider-wrap">
      <div className="custom-slider-track-marks">
        {PRESET_VALS.map((v, i) => (
          <span
            key={i}
            className="custom-slider-mark"
            style={{ left: `${pct(v)}%`, '--mark-color': `var(${color})` }}
          />
        ))}
      </div>
      <input
        type="range"
        className={`custom-slider custom-slider-${color === '--blue' ? 'fwd' : 'rev'}`}
        min={CUSTOM_MIN}
        max={CUSTOM_MAX}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
      />
    </div>
  )
}

/** Inline save-profile form that appears when the save button is clicked */
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

  const [activeCmd, setActiveCmd]     = useState(null)
  const [customFwd, setCustomFwd]     = useState(110)
  const [customRev, setCustomRev]     = useState(110)
  const [savingFwd, setSavingFwd]     = useState(false)
  const [savingRev, setSavingRev]     = useState(false)

  const fire = (cmd) => {
    sendCommand(cmd)
    setActiveCmd(cmd)
  }

  const stop = () => {
    sendCommand('STOP')
    setActiveCmd('STOP')
  }

  const fireCustomFwd = () => {
    if (!connected) return
    sendCommand(`FWD CUSTOM ${customFwd}`)
    setActiveCmd('FWD CUSTOM')
  }

  const fireCustomRev = () => {
    if (!connected) return
    const revVal = 180 - customRev
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
          <CustomSlider
            value={customFwd}
            onChange={setCustomFwd}
            onCommit={fireCustomFwd}
            color="--blue"
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
          <CustomSlider
            value={customRev}
            onChange={setCustomRev}
            onCommit={fireCustomRev}
            color="--purple"
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
