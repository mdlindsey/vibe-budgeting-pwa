"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Camera, ImageIcon, Send, X } from "lucide-react"
import { useKeyboardScroll } from "@/hooks/use-keyboard-scroll"

export function AddTab() {
  const [details, setDetails] = useState("")
  const [imageName, setImageName] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { handleFocus, handleBlur } = useKeyboardScroll()

  const handleScanReceipt = () => {
    // Trigger camera capture
    cameraInputRef.current?.click()
  }

  const handleSelectPhoto = () => {
    // Trigger photo library
    photoInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageName(file.name)
    }
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  const handleRemoveImage = () => {
    setImageName(null)
  }

  const handleSubmit = () => {
    // Mock submission
    alert("Transaction added! (mock)")
    setDetails("")
    setImageName(null)
  }

  const canSubmit = details.trim() || imageName

  return (
    <div className="space-y-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={handleScanReceipt}
          className="h-14 rounded-xl flex flex-col gap-1 items-center justify-center bg-transparent"
        >
          <Camera className="w-5 h-5" />
          <span className="text-xs">Scan Receipt</span>
        </Button>
        <Button
          variant="outline"
          onClick={handleSelectPhoto}
          className="h-14 rounded-xl flex flex-col gap-1 items-center justify-center bg-transparent"
        >
          <ImageIcon className="w-5 h-5" />
          <span className="text-xs">Select Photo</span>
        </Button>
      </div>

      {imageName && (
        <div className="bg-accent/50 rounded-xl p-3 flex items-center justify-between gap-3">
          <span className="text-sm text-accent-foreground truncate flex-1">{imageName}</span>
          <button
            onClick={handleRemoveImage}
            className="text-muted-foreground hover:text-foreground p-1 shrink-0"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative">
        <Textarea
          placeholder="Add details about your purchase... e.g., 'Groceries at Whole Foods' or '$45.50 for dinner with friends'"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="min-h-[100px] text-base rounded-xl resize-none pr-12 bg-card"
        />
        <Button
          size="icon"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="absolute bottom-3 right-3 h-10 w-10 rounded-xl"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">Add transactions via photo, text, or both</p>
    </div>
  )
}
