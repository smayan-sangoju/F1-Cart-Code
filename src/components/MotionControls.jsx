import { useState } from 'react'

const SPEEDS = [
  { label: 'Slow',   velocity: '20 cm/s', level: 1 },
  { label: 'Medium', velocity: '40 cm/s', level: 2 },
  { label: 'Fast',   velocity: '60 cm/s', level: 3 },
]

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

export default function MotionControls({ serial }) {
  const { connected, sendCommand } = serial
  const [activeCmd, setActiveCmd] = useState(null)

  const fire = (cmd) => {
    sendCommand(cmd)
    setActiveCmd(cmd)
  }

  const stop = () => {
    sendCommand('STOP')
    setActiveCmd('STOP')
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
          {SPEEDS.map(({ label, velocity, level }) => {
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
                <span className="speed-velocity">{velocity}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Reverse ── */}
      <div className="direction-section">
        <div className="direction-label rev-label">▼&nbsp; Reverse</div>
        <div className="speed-buttons">
          {SPEEDS.map(({ label, velocity, level }) => {
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
                <span className="speed-velocity">{velocity}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
