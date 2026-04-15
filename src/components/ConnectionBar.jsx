const hasWebSerial =
  typeof navigator !== 'undefined' && 'serial' in navigator

/** Inline top-view F1 car silhouette (pure SVG, no external deps) */
function F1CarSVG() {
  return (
    <svg
      className="f1-car-svg"
      viewBox="0 0 220 60"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ── Rear wing ── */}
      <rect x="2" y="18" width="6" height="24" rx="2" fill="url(#carGrad)" opacity="0.9" />
      <rect x="0" y="14" width="10" height="5" rx="1.5" fill="url(#carGrad)" />
      <rect x="0" y="41" width="10" height="5" rx="1.5" fill="url(#carGrad)" />

      {/* ── Rear tyres ── */}
      <rect x="14" y="8"  width="22" height="14" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <rect x="14" y="38" width="22" height="14" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

      {/* ── Main body ── */}
      <path
        d="M10 20 L18 12 L130 10 L148 20 L160 30 L148 40 L130 50 L18 48 L10 40 Z"
        fill="url(#carGrad)"
      />

      {/* ── Cockpit / helmet ── */}
      <ellipse cx="100" cy="30" rx="18" ry="10" fill="#0f172a" opacity="0.85" />
      <ellipse cx="100" cy="30" rx="14" ry="7"  fill="#1e3a5f" />
      {/* visor shine */}
      <ellipse cx="97"  cy="27" rx="7"  ry="3"  fill="url(#visorGrad)" opacity="0.6" />

      {/* ── Engine cover detail ── */}
      <rect x="55" y="26" width="32" height="8" rx="4" fill="#0f172a" opacity="0.4" />

      {/* ── Front tyres ── */}
      <rect x="154" y="10" width="20" height="12" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
      <rect x="154" y="38" width="20" height="12" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

      {/* ── Front wing ── */}
      <path
        d="M174 24 L200 20 L210 24 L210 36 L200 40 L174 36 Z"
        fill="url(#carGrad)" opacity="0.85"
      />
      <rect x="205" y="22" width="14" height="4"  rx="1.5" fill="url(#carGrad)" />
      <rect x="205" y="34" width="14" height="4"  rx="1.5" fill="url(#carGrad)" />

      {/* ── Speed stripe ── */}
      <rect x="20" y="28" width="120" height="4" rx="2" fill="white" opacity="0.12" />

      {/* ── Gradients ── */}
      <defs>
        <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#0ea5e9" />
          <stop offset="60%"  stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#bae6fd" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
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

          {/* Car silhouette */}
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
