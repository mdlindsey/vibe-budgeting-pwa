"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Camera, ImageIcon, Send, X, Loader2 } from "lucide-react"
import { useKeyboardScroll } from "@/hooks/use-keyboard-scroll"
import { useToast } from "@/hooks/use-toast"

interface AddTabProps {
  sheetUrl: string
  onTransactionAdded?: () => void
}

interface ImageWithPreview {
  file: File
  preview: string
}

export function AddTab({ sheetUrl, onTransactionAdded }: AddTabProps) {
  const [details, setDetails] = useState("")
  const [images, setImages] = useState<ImageWithPreview[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enlargedImageIndex, setEnlargedImageIndex] = useState<number | null>(null)
  const { toast } = useToast()

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { handleFocus, handleBlur } = useKeyboardScroll()

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        URL.revokeObjectURL(img.preview)
      })
    }
  }, [images])

  const handleScanReceipt = () => {
    // Trigger camera capture
    cameraInputRef.current?.click()
  }

  const handleSelectPhoto = () => {
    // Trigger photo library
    photoInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const newImages: ImageWithPreview[] = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      setImages((prev) => [...prev, ...newImages])
    }
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  const handleRemoveImage = (indexToRemove: number, e?: React.MouseEvent) => {
    e?.stopPropagation() // Prevent opening modal when removing
    setImages((prev) => {
      const imageToRemove = prev[indexToRemove]
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter((_, index) => index !== indexToRemove)
    })
    // Close modal if the enlarged image is being removed
    if (enlargedImageIndex === indexToRemove) {
      setEnlargedImageIndex(null)
    }
  }

  const handleImageClick = (index: number) => {
    setEnlargedImageIndex(index)
  }

  const handleCloseModal = () => {
    setEnlargedImageIndex(null)
  }

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && enlargedImageIndex !== null) {
        setEnlargedImageIndex(null)
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [enlargedImageIndex])

  const handleSubmit = async () => {
    if (!details.trim() && images.length === 0) {
      return
    }

    setIsSubmitting(true)

    try {
      // Step 1: Process with OpenAI
      const formData = new FormData()
      images.forEach((img) => {
        formData.append("images", img.file)
      })
      if (details.trim()) {
        formData.append("text", details.trim())
      }

      const processResponse = await fetch("/api/transactions/process", {
        method: "POST",
        body: formData,
      })

      if (!processResponse.ok) {
        let errorMessage = "Failed to process transaction"
        try {
          const errorData = await processResponse.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          // If response is not JSON, use status text
          errorMessage = processResponse.statusText || errorMessage
        }
        throw new Error(errorMessage)
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
        let errorMessage = "Failed to add transaction to spreadsheet"
        try {
          const errorData = await appendResponse.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          // If response is not JSON, use status text
          errorMessage = appendResponse.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      // Success!
      toast({
        title: "Transaction added!",
        description: `Added ${processData.items.length} item(s) to your spreadsheet.`,
      })

      // Clear form
      setDetails("")
      images.forEach((img) => {
        URL.revokeObjectURL(img.preview)
      })
      setImages([])

      // Refresh transaction list
      if (onTransactionAdded) {
        onTransactionAdded()
      }
    } catch (error) {
      console.error("Error submitting transaction:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to add transaction"
      console.log("Showing toast with error:", errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.log("Toast called")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = (details.trim() || images.length > 0) && !isSubmitting

  return (
    <div className="space-y-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
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

      {images.length > 0 && (
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-3 justify-center min-w-max">
            {images.map((img, index) => (
              <div key={index} className="relative bg-card rounded-xl border border-border flex-shrink-0 cursor-pointer" onClick={() => handleImageClick(index)}>
                <div className="relative h-48 p-3">
                  <img
                    src={img.preview}
                    alt={`Receipt preview ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={(e) => handleRemoveImage(index, e)}
                    disabled={isSubmitting}
                    className="absolute top-1 right-1 bg-background/90 hover:bg-background text-foreground rounded-full p-1.5 shadow-sm transition-colors disabled:opacity-50 z-10"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-3 py-1.5 border-t border-border">
                  <span className="text-xs text-muted-foreground truncate block max-w-[200px]">{img.file.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {enlargedImageIndex !== null && images[enlargedImageIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
          onClick={handleCloseModal}
        >
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 bg-background/90 hover:bg-background text-foreground rounded-full p-2 shadow-lg transition-colors z-10"
            aria-label="Close image"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[enlargedImageIndex].preview}
              alt={`Receipt ${enlargedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-background/90 px-4 py-2 rounded-b-lg">
              <p className="text-sm text-muted-foreground text-center truncate">
                {images[enlargedImageIndex].file.name}
              </p>
            </div>
          </div>
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
