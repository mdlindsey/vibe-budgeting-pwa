"use client"

import { useRef, useCallback } from "react"

export function useKeyboardScroll() {
  const scrollPositionRef = useRef<number | null>(null)

  const handleFocus = useCallback(() => {
    // Save current scroll position when keyboard opens
    scrollPositionRef.current = window.scrollY
  }, [])

  const handleBlur = useCallback(() => {
    // Restore scroll position with animation when keyboard closes
    if (scrollPositionRef.current !== null) {
      const savedPosition = scrollPositionRef.current
      // Small delay to let keyboard close animation start
      setTimeout(() => {
        window.scrollTo({
          top: savedPosition,
          behavior: "smooth",
        })
      }, 100)
      scrollPositionRef.current = null
    }
  }, [])

  return { handleFocus, handleBlur }
}
