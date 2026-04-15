import { useEffect, useRef } from 'react'

const TYPE_CLASS = {
  sent:  'log-sent',
  recv:  'log-recv',
  error: 'log-error',
  info:  'log-info',
}

const TYPE_PREFIX = {
  sent:  '→',
  recv:  '←',
  error: '✗',
  info:  'ℹ',
}

export default function SerialLog({ logs }) {
  const bottomRef = useRef(null)

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="card serial-log-card">
      <div className="card-header">
        <h2>Serial Log</h2>
        <span className="log-count">
          {logs.length} msg{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="serial-log" role="log" aria-live="polite">
        {logs.length === 0 ? (
          <div className="log-empty">Waiting for messages&hellip;</div>
        ) : (
          logs.map((entry, i) => (
            <div
              key={i}
              className={`log-entry ${TYPE_CLASS[entry.type] ?? 'log-info'}`}
            >
              <span className="log-ts">{entry.ts}</span>
              <span className="log-prefix" aria-hidden="true">
                {TYPE_PREFIX[entry.type] ?? ' '}
              </span>
              <span className="log-msg">{entry.msg}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
