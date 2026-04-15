import { useState } from 'react'

const SPEEDS = [
  { label: 'Slow',   level: 1 },
  { label: 'Medium', level: 2 },
  { label: 'Fast',   level: 3 },
]

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
      {/* Emergency stop */}
      <button
        className={`btn-estop${activeCmd === 'STOP' ? ' active' : ''}`}
        onClick={stop}
        disabled={!connected}
      >
        ■&nbsp; EMERGENCY STOP
      </button>

      {/* Forward */}
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
                <span className="speed-level">Lv {level}</span>
                <span className="speed-label">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reverse */}
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
                <span className="speed-level">Lv {level}</span>
                <span className="speed-label">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
