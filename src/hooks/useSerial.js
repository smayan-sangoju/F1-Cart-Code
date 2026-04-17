import { useState, useCallback, useRef } from 'react'

export function useSerial() {
  const [connected, setConnected] = useState(false)
  const [portName, setPortName] = useState('')
  const [logs, setLogs] = useState([])
  const [seqRunning, setSeqRunning] = useState(false)
  const [seqWaiting, setSeqWaiting] = useState(false)
  const [batteryPercent, setBatteryPercent] = useState(null)
  const [batteryVoltage, setBatteryVoltage] = useState(null)

  const portRef = useRef(null)
  const writerRef = useRef(null)
  const readerRef = useRef(null)
  const readLoopActiveRef = useRef(false)

  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => [
      ...prev,
      { msg, type, ts: new Date().toLocaleTimeString('en-US', { hour12: false }) },
    ])
  }, [])

  // Background read loop — runs until readLoopActiveRef is false or port closes
  const startReadLoop = useCallback(async (port) => {
    const decoder = new TextDecoder()
    let buffer = ''

    while (port.readable && readLoopActiveRef.current) {
      const reader = port.readable.getReader()
      readerRef.current = reader
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Split on newlines, keep trailing partial line in buffer
          const lines = buffer.split('\n')
          buffer = lines.pop()

          for (const line of lines) {
            const trimmed = line.replace('\r', '').trim()
            if (!trimmed) continue

            // Battery report — parse silently, don't clutter the log
            if (trimmed.startsWith('BAT ')) {
              const parts = trimmed.split(' ')
              if (parts.length >= 3) {
                const pct = parseInt(parts[1], 10)
                const volt = parseFloat(parts[2])
                if (!isNaN(pct))  setBatteryPercent(pct)
                if (!isNaN(volt)) setBatteryVoltage(volt)
              }
              continue  // skip logging BAT lines
            }

            setLogs(prev => [
              ...prev,
              {
                msg: trimmed,
                type: 'recv',
                ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
              },
            ])

            if (trimmed === 'SEQ_DONE')    { setSeqRunning(false); setSeqWaiting(false) }
            if (trimmed === 'SEQ_ARMED')   { setSeqRunning(false); setSeqWaiting(true)  }
            if (trimmed === 'OK_STOP')     { setSeqRunning(false); setSeqWaiting(false) }
            if (trimmed === 'WAITING_BTN') { setSeqRunning(true);  setSeqWaiting(true)  }
            if (trimmed === 'BTN_START')   { setSeqWaiting(false); setSeqRunning(true)  }
          }
        }
      } catch (err) {
        if (readLoopActiveRef.current) {
          setLogs(prev => [
            ...prev,
            {
              msg: `Read error: ${err.message}`,
              type: 'error',
              ts: new Date().toLocaleTimeString('en-US', { hour12: false }),
            },
          ])
        }
      } finally {
        try { reader.releaseLock() } catch (_) {}
        readerRef.current = null
      }
    }
  }, [])

  const connect = useCallback(async () => {
    if (!navigator.serial) {
      addLog('Web Serial API not supported in this browser.', 'error')
      return
    }
    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })
      portRef.current = port

      // Build a readable port name from USB IDs
      try {
        const info = port.getInfo()
        const vid = info.usbVendorId?.toString(16).padStart(4, '0') ?? '????'
        const pid = info.usbProductId?.toString(16).padStart(4, '0') ?? '????'
        setPortName(`USB ${vid}:${pid}`)
      } catch (_) {
        setPortName('Serial Port')
      }

      // Set up writer
      const writer = port.writable.getWriter()
      writerRef.current = writer

      setConnected(true)
      addLog('Connected to serial port.', 'info')

      // Kick off read loop (fire-and-forget)
      readLoopActiveRef.current = true
      startReadLoop(port)
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        // User cancelled port selection → NotFoundError; don't log that as an error
        addLog(`Connection failed: ${err.message}`, 'error')
      }
    }
  }, [addLog, startReadLoop])

  const disconnect = useCallback(async () => {
    readLoopActiveRef.current = false

    // Best-effort STOP before closing
    try {
      if (writerRef.current) {
        const encoder = new TextEncoder()
        await writerRef.current.write(encoder.encode('STOP\n'))
      }
    } catch (_) {}

    // Cancel reader
    try {
      if (readerRef.current) {
        await readerRef.current.cancel()
        readerRef.current = null
      }
    } catch (_) {}

    // Release writer
    try {
      if (writerRef.current) {
        await writerRef.current.releaseLock()
        writerRef.current = null
      }
    } catch (_) {}

    // Close port
    try {
      if (portRef.current) {
        await portRef.current.close()
        portRef.current = null
      }
    } catch (_) {}

    setConnected(false)
    setPortName('')
    setSeqRunning(false)
    setSeqWaiting(false)
    setBatteryPercent(null)
    setBatteryVoltage(null)
    addLog('Disconnected.', 'info')
  }, [addLog])

  const sendCommand = useCallback(async (cmd) => {
    if (!writerRef.current) {
      addLog('Not connected — command not sent.', 'error')
      return
    }
    try {
      const encoder = new TextEncoder()
      await writerRef.current.write(encoder.encode(cmd + '\n'))
      addLog(cmd, 'sent')
    } catch (err) {
      addLog(`Send error: ${err.message}`, 'error')
    }
  }, [addLog])

  return {
    connected,
    portName,
    logs,
    seqRunning,
    setSeqRunning,
    seqWaiting,
    batteryPercent,
    batteryVoltage,
    connect,
    disconnect,
    sendCommand,
  }
}
