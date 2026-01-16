"use client"

import { Button } from "@/components/ui/button"
import { ExternalLink, Receipt, Settings, Moon, Sun } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"

interface AppHeaderProps {
  sheetUrl: string
  onReset: () => void
}

export function AppHeader({ sheetUrl, onReset }: AppHeaderProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    // Read from localStorage after hydration to avoid hydration mismatch
    // This is necessary because localStorage is only available on the client
    /* eslint-disable react-hooks/set-state-in-effect */
    const stored = localStorage.getItem("expense-tracker-theme") as "light" | "dark" | null
    if (stored) {
      setTheme(stored)
      document.documentElement.classList.toggle("dark", stored === "dark")
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (prefersDark) {
        setTheme("dark")
        document.documentElement.classList.add("dark")
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("expense-tracker-theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const handleOpenSheet = () => {
    window.open(sheetUrl, "_blank")
  }

  return (
    <header className="px-4 py-3 flex items-center justify-between border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Receipt className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-semibold text-foreground leading-tight">ExpenseTracker</h1>
          <p className="text-xs text-muted-foreground">Making budgeting easy</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenSheet}
          className="h-10 px-3 rounded-xl gap-2 bg-transparent"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline">Open Sheet</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
              <Settings className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === "light" ? (
                <>
                  <Moon className="w-4 h-4 mr-2" />
                  Dark Mode
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 mr-2" />
                  Light Mode
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onReset} className="text-destructive">
              Disconnect Sheet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
