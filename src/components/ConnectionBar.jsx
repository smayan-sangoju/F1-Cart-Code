const hasWebSerial =
  typeof navigator !== 'undefined' && 'serial' in navigator

/**
 * Flat F1 car side-profile silhouette — car faces RIGHT.
 * Rear wing on left, pointed nose on right, two large wheels with spinning rims.
 * Flat logo style: no gradients, #0ea5e9 body, #1e293b wheels, #38bdf8 accents.
 *
 * Wheel arch math: each arch is a semicircle whose radius equals the tire radius,
 * so the arch boundary exactly matches the tire circle edge.
 *   Rear  tire: cx=42,  cy=38, r=12  → arch A 12,12 0 0 1 54,38  from (30,38)
 *   Front tire: cx=175, cy=38, r=11  → arch A 11,11 0 0 1 186,38 from (164,38)
 */
function F1CarSVG() {
  return (
    <svg
      className="f1-car-svg"
      viewBox="0 0 220 60"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ══ REAR WING (left side) ══ */}
      {/* Endplate — tall vertical slab */}
      <rect x="4" y="5" width="5" height="33" rx="1" fill="#0ea5e9" />
      {/* Upper wing element */}
      <rect x="4" y="5" width="30" height="6" rx="1.5" fill="#38bdf8" />
      {/* Lower wing element / DRS flap */}
      <rect x="5" y="12" width="27" height="5" rx="1" fill="#38bdf8" />
      {/* Wing strut connecting to body */}
      <rect x="19" y="18" width="4" height="19" rx="1" fill="#0ea5e9" />

      {/* ══ REAR TYRE (draw before body so body masks upper half) ══ */}
      <circle cx="42" cy="38" r="12" fill="#1e293b" />
      {/* Spinning rim + spokes */}
      <g>
        <animateTransform
          attributeName="transform" type="rotate"
          from="0 42 38" to="360 42 38"
          dur="3s" repeatCount="indefinite"
        />
        <circle cx="42" cy="38" r="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="42" y1="27" x2="42" y2="49" stroke="#38bdf8" strokeWidth="2" />
        <line x1="30" y1="38" x2="54" y2="38" stroke="#38bdf8" strokeWidth="2" />
        <line x1="33.5" y1="29.5" x2="50.5" y2="46.5" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="50.5" y1="29.5" x2="33.5" y2="46.5" stroke="#38bdf8" strokeWidth="1.5" />
      </g>
      {/* Static hub cap */}
      <circle cx="42" cy="38" r="3.5" fill="#1e293b" />

      {/* ══ FRONT TYRE ══ */}
      <circle cx="175" cy="38" r="11" fill="#1e293b" />
      {/* Spinning rim + spokes */}
      <g>
        <animateTransform
          attributeName="transform" type="rotate"
          from="0 175 38" to="360 175 38"
          dur="2.8s" repeatCount="indefinite"
        />
        <circle cx="175" cy="38" r="7" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="175" y1="28" x2="175" y2="48" stroke="#38bdf8" strokeWidth="1.8" />
        <line x1="165" y1="38" x2="185" y2="38" stroke="#38bdf8" strokeWidth="1.8" />
        <line x1="167.9" y1="30.9" x2="182.1" y2="45.1" stroke="#38bdf8" strokeWidth="1.3" />
        <line x1="182.1" y1="30.9" x2="167.9" y2="45.1" stroke="#38bdf8" strokeWidth="1.3" />
      </g>
      {/* Static hub cap */}
      <circle cx="175" cy="38" r="3" fill="#1e293b" />

      {/* ══ MAIN BODY ══
          Upper edge: nose tip (215,32) → rises left to cockpit peak (y=9) → falls to rear top (22,26)
          Lower edge: rear floor → wheel arch cutouts → nose underside
          Arches use sweep=1 (clockwise) = curves upward into body */}
      <path
        fill="#0ea5e9"
        d="
          M 215,32
          L 200,25 L 185,21 L 175,20 L 158,17 L 140,14
          Q 128,9 118,9
          Q 108,13 95,15
          L 78,17 L 55,18 L 42,20 L 22,26
          L 22,38
          L 30,38
          A 12,12 0 0 1 54,38
          L 164,38
          A 11,11 0 0 1 186,38
          L 193,37 L 200,35
          Z
        "
      />

      {/* ══ COCKPIT OPENING — dark arch overlaid on roll hoop bump ══ */}
      <path
        fill="#090f1a"
        d="M 112,17 L 117,11 Q 125,8 128,8 Q 133,8 138,12 L 142,17 Z"
      />

      {/* ══ FRONT WING (right side — furthest forward) ══ */}
      {/* Upper cascade element */}
      <rect x="188" y="39" width="27" height="5" rx="1" fill="#38bdf8" />
      {/* Main wing plane */}
      <rect x="186" y="44" width="31" height="6" rx="1" fill="#0ea5e9" />
      {/* Right endplate */}
      <rect x="215" y="37" width="4" height="14" rx="1" fill="#0ea5e9" />
    </svg>
  )
}

/** 3-bar signal strength indicator (cosmetic) */
function SignalBars({ connected }) {
  return (
    <div className="signal-bars" aria-hidden="true">
      <div className={`signal-bar signal-bar-1 ${connected ? 'signal-active' : ''}`} />
      <div className={`signal-bar signal-bar-2 ${connected ? 'signal-active' : ''}`} />
      <div className={`signal-bar signal-bar-3 ${connected ? 'signal-active' : ''}`} />
    </div>
  )
}

export default function ConnectionBar({ serial }) {
  const { connected, portName, connect, disconnect } = serial

  return (
    <header className="connection-bar">
      {!hasWebSerial && (
        <div className="serial-warning">
          ⚠ Your browser doesn&apos;t support Web Serial. Use Chrome or Edge on a
          Chromebook or desktop.
        </div>
      )}

      {/* Decorative speed-line track behind everything */}
      <div className="bar-track-lines" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="track-line" style={{ '--i': i }} />
        ))}
      </div>

      <div className="connection-bar-inner">
        {/* ── Brand left ── */}
        <div className="brand">
          {/* F1 badge */}
          <div className="brand-badge" aria-hidden="true">
            <span className="badge-f">F</span><span className="badge-1">1</span>
          </div>

          {/* Side-profile car silhouette */}
          <F1CarSVG />

          {/* Text */}
          <div className="brand-text">
            <span className="brand-title">F1 Cart Controller</span>
            <span className="brand-subtitle">
              Physics Demo Platform&nbsp;·&nbsp;ENGR&nbsp;1020
            </span>
          </div>
        </div>

        {/* ── Status + connect right ── */}
        <div className="connection-status">
          {/* Signal bars */}
          <SignalBars connected={connected} />

          {/* Status pill */}
          <div className={`status-pill ${connected ? 'status-pill--on' : 'status-pill--off'}`}>
            <span className="status-dot" />
            <span className="status-label">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {connected && portName && (
            <span className="port-name">{portName}</span>
          )}

          <button
            className={`btn-connect ${
              connected ? 'btn-connect-danger' : 'btn-connect-primary'
            }`}
            onClick={connected ? disconnect : connect}
            disabled={!hasWebSerial}
          >
            {connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>

    </header>
  )
}
