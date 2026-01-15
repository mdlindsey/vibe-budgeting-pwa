"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Copy, Receipt } from "lucide-react"

interface NewUserSetupProps {
  onComplete: (url: string) => void
}

export function NewUserSetup({ onComplete }: NewUserSetupProps) {
  const [sheetUrl, setSheetUrl] = useState("")
  const [copied, setCopied] = useState(false)
  // Use GCP_SA_EMAIL from environment variable (NEXT_PUBLIC_ prefix required for client components)
  const email = process.env.NEXT_PUBLIC_GCP_SA_EMAIL || "expensetracking@gmail.com"

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (sheetUrl.trim()) {
      onComplete(sheetUrl.trim())
    }
  }

  const isValidUrl = sheetUrl.includes("docs.google.com/spreadsheets")

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Receipt className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Welcome to ExpenseTracker</h1>
          <p className="text-muted-foreground leading-relaxed">
            Connect your Google Sheet to start tracking expenses with AI-powered receipt scanning.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                1
              </div>
              <span className="font-medium text-foreground">Add editor access</span>
            </div>
            <p className="text-sm text-muted-foreground">Add this email as an editor to your Google Sheet:</p>
            <button
              onClick={handleCopyEmail}
              className="flex items-center gap-3 bg-muted hover:bg-muted/80 transition-colors rounded-xl px-4 py-3 w-full min-h-[48px]"
            >
              <code className="text-sm font-mono text-foreground flex-1 text-left truncate">{email}</code>
              {copied ? (
                <Check className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>
          </div>

          <div className="h-px bg-border" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                  2
                </div>
                <span className="font-medium text-foreground">Paste your Sheet URL</span>
              </div>
              <Input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="h-12 text-base rounded-xl bg-background w-full"
              />
            </div>

            <Button type="submit" disabled={!isValidUrl} className="w-full h-12 text-base font-medium rounded-xl">
              Connect Sheet
            </Button>
          </form>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Your data stays in your Google Sheet. We never store your financial information.
        </p>
      </div>
    </div>
  )
}
