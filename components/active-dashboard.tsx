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

      <div className="flex-1 flex flex-col">
        {/* Tab Switcher */}
        <div className="px-4 pt-4">
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
        <div className="px-4 py-4">{activeTab === "add" ? <AddTab /> : <AskTab />}</div>

        {/* Recent Transactions */}
        <div className="flex-1 px-4 pb-4">
          <TransactionList />
        </div>
      </div>
    </div>
  )
}
