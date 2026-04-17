import { useState } from 'react'

const STORAGE_KEY = 'f1cart_speedProfiles'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
  catch { return [] }
}

export function useSpeedProfiles() {
  const [profiles, setProfilesState] = useState(load)

  const persist = (next) => {
    setProfilesState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const addProfile = (name, servoVal) => {
    persist([...profiles, { id: Date.now(), name: name.trim(), servoVal }])
  }

  const removeProfile = (id) => {
    persist(profiles.filter(p => p.id !== id))
  }

  return { profiles, addProfile, removeProfile }
}
