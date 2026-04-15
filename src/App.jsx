import { useSerial } from './hooks/useSerial'
import ConnectionBar from './components/ConnectionBar'
import MotionControls from './components/MotionControls'
import SequenceBuilder from './components/SequenceBuilder'
import SerialLog from './components/SerialLog'

export default function App() {
  const serial = useSerial()

  return (
    <div className="app">
      <ConnectionBar serial={serial} />
      <div className="main-layout">
        <div className="left-column">
          <MotionControls serial={serial} />
          <SerialLog logs={serial.logs} />
        </div>
        <div className="right-column">
          <SequenceBuilder serial={serial} />
        </div>
      </div>
    </div>
  )
}
