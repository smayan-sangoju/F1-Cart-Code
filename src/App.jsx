import { useSerial } from './hooks/useSerial'
import { useSpeedProfiles } from './hooks/useSpeedProfiles'
import ConnectionBar from './components/ConnectionBar'
import MotionControls from './components/MotionControls'
import SequenceBuilder from './components/SequenceBuilder'
import SerialLog from './components/SerialLog'

export default function App() {
  const serial = useSerial()
  const speedProfiles = useSpeedProfiles()

  return (
    <div className="app">
      <ConnectionBar serial={serial} />
      <div className="main-layout">
        <div className="left-column">
          <MotionControls serial={serial} speedProfiles={speedProfiles} />
          <SerialLog logs={serial.logs} />
        </div>
        <div className="right-column">
          <SequenceBuilder serial={serial} speedProfiles={speedProfiles} />
        </div>
      </div>
    </div>
  )
}
