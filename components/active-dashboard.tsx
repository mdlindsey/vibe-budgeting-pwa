"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { AddTab } from "@/components/add-tab"
import { AskTab } from "@/components/ask-tab"
import { TransactionList } from "@/components/transaction-list"
import { cn } from "@/lib/utils"

interface ActiveDashboardProps {
  sheetUrl: string
  onReset: () => void
}

export function ActiveDashboard({ sheetUrl, onReset }: ActiveDashboardProps) {
  const [activeTab, setActiveTab] = useState<"add" | "ask">("add")

  return (
    <div className="min-h-dvh flex flex-col pb-safe">
      <AppHeader sheetUrl={sheetUrl} onReset={onReset} />

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Left Side: Tab Switcher + Content (Add/Ask) */}
        <div className="flex flex-col lg:w-1/2 lg:border-r lg:border-border lg:overflow-y-auto">
          {/* Tab Switcher */}
          <div className="px-4 pt-4 lg:sticky lg:top-0 lg:z-10 lg:bg-background lg:pb-2">
            <div className="bg-muted rounded-xl p-1 flex">
              <button
                onClick={() => setActiveTab("add")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all min-h-[48px]",
                  activeTab === "add" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Add
              </button>
              <button
                onClick={() => setActiveTab("ask")}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all min-h-[48px]",
                  activeTab === "ask" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Ask
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-4 py-4 lg:flex-1">
            {activeTab === "add" ? (
              <AddTab
                sheetUrl={sheetUrl}
                onTransactionAdded={() => {
                  // Trigger a refresh of the transaction list
                  // The TransactionList component will handle the refresh via its useEffect
                  window.dispatchEvent(new Event("transaction-added"))
                }}
              />
            ) : (
              <AskTab sheetUrl={sheetUrl} />
            )}
          </div>
        </div>

        {/* Right Side: Recent Transactions */}
        <div className="flex-1 px-4 pb-4 lg:w-1/2 lg:overflow-y-auto lg:pb-4">
          <TransactionList sheetUrl={sheetUrl} />
        </div>
      </div>
    </div>
  )
}
