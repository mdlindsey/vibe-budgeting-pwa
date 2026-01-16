"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")
  const [mounted, setMounted] = useState(false)
  const [hasUserPreference, setHasUserPreference] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Read from localStorage after hydration
    const stored = localStorage.getItem("expense-tracker-theme") as Theme | null
    if (stored === "light" || stored === "dark") {
      setHasUserPreference(true)
      setResolvedTheme(stored)
    } else {
      // No stored preference - use system preference
      setHasUserPreference(false)
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setResolvedTheme(prefersDark ? "dark" : "light")
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const updateTheme = () => {
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    }

    updateTheme()

    // Listen for system theme changes only if user hasn't set a preference
    if (!hasUserPreference) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = () => {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        setResolvedTheme(prefersDark ? "dark" : "light")
      }
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [resolvedTheme, mounted, hasUserPreference])

  const setTheme = (newTheme: Theme) => {
    setResolvedTheme(newTheme)
    setHasUserPreference(true)
    localStorage.setItem("expense-tracker-theme", newTheme)
  }

  return (
    <ThemeContext.Provider value={{ resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
