const hasWebSerial =
  typeof navigator !== 'undefined' && 'serial' in navigator

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
      <div className="connection-bar-inner">
        {/* Brand */}
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">F1</div>
          <div className="brand-text">
            <span className="brand-title">F1 Cart Controller</span>
            <span className="brand-subtitle">
              Physics Demo Platform · ENGR&nbsp;1020
            </span>
          </div>
        </div>

        {/* Status + controls */}
        <div className="connection-status">
          <span
            className={`status-dot ${connected ? 'connected' : 'disconnected'}`}
            aria-label={connected ? 'Connected' : 'Disconnected'}
          />
          <span className="status-label">
            {connected ? 'Connected' : 'Disconnected'}
          </span>

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
