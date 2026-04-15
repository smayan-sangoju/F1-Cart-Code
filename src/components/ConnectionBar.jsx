const hasWebSerial =
  typeof navigator !== 'undefined' && 'serial' in navigator

/** Side-profile F1 car silhouette with spinning wheel rims */
function F1CarSVG() {
  return (
    <svg
      className="f1-car-svg"
      viewBox="0 0 300 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#0369a1" />
          <stop offset="45%"  stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {/* ── Ground shadow ── */}
      <ellipse cx="148" cy="77" rx="115" ry="4" fill="rgba(0,0,0,0.28)" />

      {/* ── Motion speed lines (behind car) ── */}
      <line x1="2"  y1="32" x2="22" y2="32" stroke="rgba(14,165,233,0.28)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2"  y1="39" x2="14" y2="39" stroke="rgba(14,165,233,0.18)" strokeWidth="1"   strokeLinecap="round" />
      <line x1="2"  y1="25" x2="17" y2="25" stroke="rgba(14,165,233,0.18)" strokeWidth="1"   strokeLinecap="round" />

      {/* ── Rear wing assembly ── */}
      {/* Vertical strut */}
      <rect x="22" y="16" width="5" height="30" rx="1" fill="url(#sideGrad)" />
      {/* Upper wing plane */}
      <path d="M 6,15 L 32,15 L 32,11 L 8,11 Z" fill="url(#sideGrad)" />
      {/* Lower wing plane */}
      <path d="M 9,21 L 32,21 L 32,17 L 11,17 Z" fill="url(#sideGrad)" opacity="0.82" />
      {/* Wing endplate */}
      <rect x="5" y="11" width="4" height="30" rx="1.5" fill="url(#sideGrad)" opacity="0.65" />

      {/* ── Main body ── */}
      <path
        d="
          M 35,50 L 35,28
          Q 44,22 52,21
          L 82,18 L 122,15
          Q 136,12 148,10
          Q 153,9  157,10
          Q 170,12 184,15
          L 202,20
          Q 228,30 254,42
          L 269,46
          L 266,50
          Q 250,48 230,47
          L 195,47 L 165,47
          L 120,47 L 78,49
          L 52,51
          Z
        "
        fill="url(#sideGrad)"
      />

      {/* ── Sidepod air intake ── */}
      <ellipse cx="70" cy="30" rx="7" ry="10" fill="#050d18" stroke="rgba(14,165,233,0.22)" strokeWidth="1.5" />

      {/* ── Engine cover detail ── */}
      <rect x="108" y="22" width="40" height="7" rx="3.5" fill="rgba(0,0,0,0.28)" />

      {/* ── Cockpit surround + helmet ── */}
      <path
        d="M 136,12 L 143,7 Q 150,5 157,7 L 163,12"
        fill="#050d18"
        stroke="#0ea5e9"
        strokeWidth="0.9"
      />
      {/* Helmet */}
      <circle cx="150" cy="11" r="6.5" fill="#0f172a" />
      <ellipse cx="148" cy="10"  rx="4"  ry="2.5" fill="#1e3a5f" />
      {/* Visor shine */}
      <ellipse cx="146" cy="8.5" rx="2"  ry="1.2" fill="rgba(186,230,253,0.55)" />

      {/* ── Floor underline ── */}
      <rect x="42" y="49" width="175" height="2" rx="1" fill="rgba(255,255,255,0.07)" />

      {/* ── Front wing ── */}
      <path
        d="M 263,47 L 284,43 L 292,45 L 292,50 L 284,52 L 263,50 Z"
        fill="url(#sideGrad)"
        opacity="0.88"
      />
      {/* Front wing endplate */}
      <rect x="289" y="41" width="4" height="13" rx="1.5" fill="url(#sideGrad)" />

      {/* ── Rear tyre — spinning rim ── */}
      {/* Outer tyre */}
      <circle cx="62" cy="63" r="14" fill="#141f2e" stroke="#2d3f55" strokeWidth="1.5" />
      {/* Tyre sidewall texture ring */}
      <circle cx="62" cy="63" r="13.2" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
      {/* Rotating spokes */}
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 62 63" to="360 62 63" dur="1s" repeatCount="indefinite" />
        <circle cx="62" cy="63" r="8.5" fill="#0a1420" />
        <line x1="62" y1="55" x2="62" y2="71" stroke="#334155" strokeWidth="2.5" />
        <line x1="54" y1="63" x2="70" y2="63" stroke="#334155" strokeWidth="2.5" />
        <line x1="56" y1="57" x2="68" y2="69" stroke="#334155" strokeWidth="1.8" />
        <line x1="68" y1="57" x2="56" y2="69" stroke="#334155" strokeWidth="1.8" />
      </g>
      {/* Hub cap */}
      <circle cx="62" cy="63" r="3.5" fill="#475569" />

      {/* ── Front tyre — spinning rim ── */}
      {/* Outer tyre */}
      <circle cx="220" cy="63" r="11" fill="#141f2e" stroke="#2d3f55" strokeWidth="1.5" />
      <circle cx="220" cy="63" r="10.3" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
      {/* Rotating spokes */}
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 220 63" to="360 220 63" dur="0.85s" repeatCount="indefinite" />
        <circle cx="220" cy="63" r="6.5" fill="#0a1420" />
        <line x1="220" y1="57" x2="220" y2="69" stroke="#334155" strokeWidth="2" />
        <line x1="214" y1="63" x2="226" y2="63" stroke="#334155" strokeWidth="2" />
        <line x1="215" y1="58" x2="225" y2="68" stroke="#334155" strokeWidth="1.5" />
        <line x1="225" y1="58" x2="215" y2="68" stroke="#334155" strokeWidth="1.5" />
      </g>
      <circle cx="220" cy="63" r="3" fill="#475569" />
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

/** Battery level indicator */
function BatteryIndicator({ percent, voltage, connected }) {
  const hasData = connected && percent !== null

  const color = !hasData
    ? '#475569'
    : percent >= 50
      ? '#22c55e'
      : percent >= 20
        ? '#f59e0b'
        : '#ef4444'

  // Fill bar inside battery body (max inner width ≈ 14px)
  const fillW = hasData ? Math.max(1, Math.round((percent / 100) * 14)) : 0

  const isCritical = hasData && percent < 20

  return (
    <div className={`battery-indicator${!hasData ? ' batt-nodata' : ''}${isCritical ? ' batt-critical' : ''}`}>
      <svg className="battery-icon" viewBox="0 0 22 13" width="28" height="18" aria-hidden="true">
        {/* Battery body outline */}
        <rect x="0.5" y="0.5" width="18" height="12" rx="2" fill="none" stroke={color} strokeWidth="1.5" />
        {/* Positive terminal nub */}
        <rect x="19" y="3.5" width="2.5" height="6" rx="1" fill={color} />
        {/* Fill level */}
        {fillW > 0 && (
          <rect x="2" y="2" width={fillW} height="9" rx="1" fill={color} />
        )}
      </svg>
      <div className="battery-text">
        <span className="battery-pct">
          {hasData ? `${percent}%` : '--%'}
        </span>
        {hasData && voltage !== null && (
          <span className="battery-volt">{voltage.toFixed(1)}V</span>
        )}
      </div>
    </div>
  )
}

export default function ConnectionBar({ serial }) {
  const { connected, portName, connect, disconnect, batteryPercent, batteryVoltage } = serial

  const showLowBattWarning = connected && batteryPercent !== null && batteryPercent < 15

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
          {/* Battery */}
          <BatteryIndicator
            percent={batteryPercent}
            voltage={batteryVoltage}
            connected={connected}
          />

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

      {/* Low battery warning */}
      {showLowBattWarning && (
        <div className="batt-warning-bar">
          ⚠ Low battery — charge soon
        </div>
      )}
    </header>
  )
}
