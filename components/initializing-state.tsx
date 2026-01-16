"use client"

import { useState, useEffect } from "react"
import { Receipt, Loader2, AlertCircle } from "lucide-react"

interface InitializingStateProps {
  sheetUrl: string
  onComplete: () => void
}

const loadingMessages = [
  "Looking at your spreadsheet...",
  "Creating scaffolding...",
  "Setting up categories...",
  "Loading your data...",
  "Almost ready...",
]

export function InitializingState({ sheetUrl, onComplete }: InitializingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let messageInterval: NodeJS.Timeout | null = null
    let isMounted = true

    const initializeSpreadsheet = async () => {
      try {
        // Update message index as we progress
        const updateMessage = (index: number) => {
          if (isMounted) {
            setMessageIndex(index)
          }
        }

        updateMessage(0) // "Looking at your spreadsheet..."

        // Call initialization API
        const response = await fetch("/api/sheets/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sheetUrl }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || errorData.error || "Failed to initialize spreadsheet")
        }

        updateMessage(1) // "Creating scaffolding..."
        await new Promise((resolve) => setTimeout(resolve, 800))

        updateMessage(2) // "Setting up categories..."
        await new Promise((resolve) => setTimeout(resolve, 800))

        updateMessage(3) // "Loading your data..."
        await new Promise((resolve) => setTimeout(resolve, 800))

        updateMessage(4) // "Almost ready..."
        await new Promise((resolve) => setTimeout(resolve, 500))

        if (isMounted) {
          onComplete()
        }
      } catch (err) {
        console.error("Initialization error:", err)
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : "Failed to initialize spreadsheet. Please check your sheet URL and permissions."
          setError(errorMessage)
        }
      }
    }

    initializeSpreadsheet()

    return () => {
      isMounted = false
      if (messageInterval) {
        clearInterval(messageInterval)
      }
    }
  }, [sheetUrl, onComplete])

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Initialization Failed</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center relative">
          <Receipt className="w-10 h-10 text-primary" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-card rounded-full border-2 border-background flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Setting things up</h2>
          <p className="text-muted-foreground h-6 transition-opacity duration-300">{loadingMessages[messageIndex]}</p>
        </div>

        <div className="flex justify-center gap-1.5">
          {loadingMessages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index <= messageIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
