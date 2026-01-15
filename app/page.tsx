"use client"

import { useState, useEffect } from "react"
import { NewUserSetup } from "@/components/new-user-setup"
import { InitializingState } from "@/components/initializing-state"
import { ActiveDashboard } from "@/components/active-dashboard"

type AppState = "new-user" | "initializing" | "active"

export default function Home() {
  const [appState, setAppState] = useState<AppState>("new-user")
  const [sheetUrl, setSheetUrl] = useState<string>("")

  useEffect(() => {
    const storedUrl = localStorage.getItem("expense-tracker-sheet-url")
    if (storedUrl) {
      setSheetUrl(storedUrl)
      setAppState("active")
    }
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  const handleSetupComplete = (url: string) => {
    localStorage.setItem("expense-tracker-sheet-url", url)
    setSheetUrl(url)
    setAppState("initializing")
  }

  const handleInitializationComplete = () => {
    setAppState("active")
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "instant" })
      })
    })
  }

  const handleReset = () => {
    localStorage.removeItem("expense-tracker-sheet-url")
    setSheetUrl("")
    setAppState("new-user")
  }

  return (
    <main className="min-h-dvh bg-background">
      {appState === "new-user" && <NewUserSetup onComplete={handleSetupComplete} />}
      {appState === "initializing" && <InitializingState onComplete={handleInitializationComplete} />}
      {appState === "active" && <ActiveDashboard sheetUrl={sheetUrl} onReset={handleReset} />}
    </main>
  )
}
