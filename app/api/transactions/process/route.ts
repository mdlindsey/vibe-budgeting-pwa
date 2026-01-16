import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"

export interface TransactionItem {
  merchant: string
  date: string // ISO date string
  category: string
  item: string
  cost: number
}

export interface ProcessTransactionResponse {
  success: boolean
  items: TransactionItem[]
  error?: string
}

interface OpenAIMessage {
  role: "system" | "user"
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}


// Zod schema for structured output
const TransactionItemSchema = z.object({
  merchant: z.string().describe("Store/merchant name"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("ISO 8601 date YYYY-MM-DD"),
  category: z.string().describe("Category (e.g., Groceries, Dining, Transport, Entertainment, Health, Home, Pet supplies, Donations)"),
  item: z.string().describe("Item name/description"),
  cost: z.number().describe("Numeric value, no currency symbols"),
})

const TransactionResponseSchema = z.object({
  items: z.array(TransactionItemSchema).describe("Array of transaction items"),
})

// Type inferred from Zod schema
type ParsedTransactionContent = z.infer<typeof TransactionResponseSchema>

/**
 * Process images and/or text with OpenAI to extract transaction data
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    // Support both single image (backward compatibility) and multiple images
    const image = formData.get("image") as File | null
    const images = formData.getAll("images") as File[]
    const text = formData.get("text") as string | null

    // Combine single image and multiple images into one array
    const allImages: File[] = []
    if (image) {
      allImages.push(image)
    }
    allImages.push(...images)

    if (allImages.length === 0 && !text) {
      return NextResponse.json(
        { success: false, error: "Either an image or text is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      )
    }

    // Prepare messages for OpenAI
    const todayDate = new Date().toISOString().split('T')[0]
    const messages: OpenAIMessage[] = [
      {
        role: "system",
        content: `You are a transaction data extraction assistant. Extract itemized purchase information from receipts, images, or text descriptions.

Rules:
- If multiple items are in one transaction, include multiple objects in the "items" array with the same merchant and date
- If the date is not specified, use ${todayDate}
- If the merchant is not clear, make a reasonable inference
- Categories should be consistent and descriptive
- Cost must be a number (not a string)
- Always return the "items" array, even if there's only one item`,
      },
    ]

    // Add user message with text and/or images
    if (allImages.length > 0) {
      // Build content array with text and images
      const contentArray: Array<{ type: string; text?: string; image_url?: { url: string } }> = []

      // Add text if provided
      if (text) {
        contentArray.push({
          type: "text",
          text: `Extract transaction data from ${allImages.length === 1 ? "this image" : "these images"} and use the following additional context: ${text}`,
        })
      } else {
        contentArray.push({
          type: "text",
          text: `Extract transaction data from ${allImages.length === 1 ? "this receipt/image" : "these receipts/images"}.`,
        })
      }

      // Add all images to the content
      for (const img of allImages) {
        try {
          const imageBase64 = await imageToBase64(img)
          contentArray.push({
            type: "image_url",
            image_url: {
              url: `data:${img.type};base64,${imageBase64}`,
            },
          })
        } catch (error) {
          console.error("Error processing image:", error)
          return NextResponse.json(
            { success: false, error: "Image failed to upload" },
            { status: 400 }
          )
        }
      }

      messages.push({
        role: "user",
        content: contentArray,
      })
    } else if (text) {
      // Text only
      messages.push({
        role: "user",
        content: `Extract transaction data from this description: ${text}`,
      })
    }

    // Call OpenAI API with structured outputs
    // Use gpt-4o-2024-08-06 for structured outputs support (or gpt-4o-mini-2024-07-18)
    const model = allImages.length > 0 ? "gpt-4o-2024-08-06" : "gpt-4o-2024-08-06"
    
    const openai = new OpenAI({ apiKey })

    let parsedContent: ParsedTransactionContent
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        response_format: zodResponseFormat(TransactionResponseSchema, "transaction_response"),
        temperature: 1,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        return NextResponse.json(
          { success: false, error: "OpenAI failed to respond" },
          { status: 500 }
        )
      }

      // Parse and validate with Zod schema
      const json = JSON.parse(content)
      parsedContent = TransactionResponseSchema.parse(json)
    } catch (error) {
      console.error("OpenAI API error:", error)
      // Check if it's a specific OpenAI error
      if (error instanceof OpenAI.APIError) {
        return NextResponse.json(
          {
            success: false,
            error: "OpenAI failed to respond",
          },
          { status: error.status || 500 }
        )
      }
      // Check if it's a Zod validation error (schema mismatch)
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.issues)
        return NextResponse.json(
          {
            success: false,
            error: "OpenAI failed to respond",
          },
          { status: 500 }
        )
      }
      // Generic error
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI failed to respond",
        },
        { status: 500 }
      )
    }

    // Extract and validate items
    const validatedItems: TransactionItem[] = parsedContent.items
      .map((item) => {
        // Ensure all required fields are present
        if (!item.merchant || !item.item || item.cost === undefined) {
          return null
        }

        return {
          merchant: String(item.merchant).trim(),
          date: item.date || new Date().toISOString().split("T")[0],
          category: String(item.category || "Other").trim(),
          item: String(item.item).trim(),
          cost: typeof item.cost === "number" ? item.cost : parseFloat(String(item.cost)) || 0,
        }
      })
      .filter((item: TransactionItem | null): item is TransactionItem => item !== null)

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "No receipt detected" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      items: validatedItems,
    })
  } catch (error) {
    console.error("Error processing transaction:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to process transaction"
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

/**
 * Convert image file to base64 string
 */
async function imageToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString("base64")
}
