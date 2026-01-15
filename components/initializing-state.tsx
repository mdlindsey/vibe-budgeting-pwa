"use client"

import { useState, useEffect } from "react"
import { Receipt, Loader2 } from "lucide-react"

interface InitializingStateProps {
  onComplete: () => void
}

const loadingMessages = [
  "Looking at your spreadsheet...",
  "Creating scaffolding...",
  "Setting up categories...",
  "Loading your data...",
  "Almost ready...",
]

export function InitializingState({ onComplete }: InitializingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev >= loadingMessages.length - 1) {
          return prev
        }
        return prev + 1
      })
    }, 1500)

    const completeTimeout = setTimeout(() => {
      onComplete()
    }, loadingMessages.length * 1500)

    return () => {
      clearInterval(messageInterval)
      clearTimeout(completeTimeout)
    }
  }, [onComplete])

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
