"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Camera, ImageIcon, Send, X, Loader2 } from "lucide-react"
import { useKeyboardScroll } from "@/hooks/use-keyboard-scroll"
import { useToast } from "@/hooks/use-toast"

interface AddTabProps {
  sheetUrl: string
  onTransactionAdded?: () => void
}

export function AddTab({ sheetUrl, onTransactionAdded }: AddTabProps) {
  const [details, setDetails] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

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
      setImageFile(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  const handleRemoveImage = () => {
    setImageFile(null)
  }

  const handleSubmit = async () => {
    if (!details.trim() && !imageFile) {
      return
    }

    setIsSubmitting(true)

    try {
      // Step 1: Process with OpenAI
      const formData = new FormData()
      if (imageFile) {
        formData.append("image", imageFile)
      }
      if (details.trim()) {
        formData.append("text", details.trim())
      }

      const processResponse = await fetch("/api/transactions/process", {
        method: "POST",
        body: formData,
      })

      if (!processResponse.ok) {
        const errorData = await processResponse.json()
        throw new Error(errorData.error || "Failed to process transaction")
      }

      const processData = await processResponse.json()

      if (!processData.success || !processData.items || processData.items.length === 0) {
        throw new Error(processData.error || "No transaction items extracted")
      }

      // Step 2: Append to spreadsheet
      const appendResponse = await fetch("/api/transactions/append", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sheetUrl,
          items: processData.items,
        }),
      })

      if (!appendResponse.ok) {
        const errorData = await appendResponse.json()
        throw new Error(errorData.error || "Failed to add transaction to spreadsheet")
      }

      // Success!
      toast({
        title: "Transaction added!",
        description: `Added ${processData.items.length} item(s) to your spreadsheet.`,
      })

      // Clear form
      setDetails("")
      setImageFile(null)

      // Refresh transaction list
      if (onTransactionAdded) {
        onTransactionAdded()
      }
    } catch (error) {
      console.error("Error submitting transaction:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to add transaction"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = (details.trim() || imageFile) && !isSubmitting

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

      {imageFile && (
        <div className="bg-accent/50 rounded-xl p-3 flex items-center justify-between gap-3">
          <span className="text-sm text-accent-foreground truncate flex-1">{imageFile.name}</span>
          <button
            onClick={handleRemoveImage}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground p-1 shrink-0 disabled:opacity-50"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative">
        <Textarea
          placeholder="Add details about your purchase... (optional if you've added a photo above)"
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
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Add receipts, screenshots, photos or just describe your purchase
      </p>
    </div>
  )
}
