import { NextRequest, NextResponse } from "next/server"

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

/**
 * Process images and/or text with OpenAI to extract transaction data
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File | null
    const text = formData.get("text") as string | null

    if (!image && !text) {
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
    const messages: any[] = [
      {
        role: "system",
        content: `You are a transaction data extraction assistant. Extract itemized purchase information from receipts, images, or text descriptions.

You must return a JSON object with this exact structure:
{
  "items": [
    {
      "merchant": "string (store/merchant name)",
      "date": "string (ISO 8601 date YYYY-MM-DD, use ${todayDate} if not specified)",
      "category": "string (e.g., Groceries, Dining, Transport, Entertainment, Health, Home, Pet supplies, Donations)",
      "item": "string (item name/description)",
      "cost": number (numeric value, no currency symbols)
    }
  ]
}

Rules:
- If multiple items are in one transaction, include multiple objects in the "items" array with the same merchant and date
- If the date is not specified, use ${todayDate}
- If the merchant is not clear, make a reasonable inference
- Categories should be consistent and descriptive
- Cost must be a number (not a string)
- Always return the "items" array, even if there's only one item`,
      },
    ]

    // Add user message with text and/or image
    if (image && text) {
      // Both image and text
      const imageBase64 = await imageToBase64(image)
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract transaction data from this image and use the following additional context: ${text}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${image.type};base64,${imageBase64}`,
            },
          },
        ],
      })
    } else if (image) {
      // Image only
      const imageBase64 = await imageToBase64(image)
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract transaction data from this receipt/image.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${image.type};base64,${imageBase64}`,
            },
          },
        ],
      })
    } else if (text) {
      // Text only
      messages.push({
        role: "user",
        content: `Extract transaction data from this description: ${text}`,
      })
    }

    // Call OpenAI API
    // Use gpt-4o for vision, or gpt-4-turbo-preview, or fallback to gpt-4
    const model = image ? "gpt-4o" : "gpt-4-turbo-preview"
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("OpenAI API error:", errorData)
      return NextResponse.json(
        {
          success: false,
          error: errorData.error?.message || "Failed to process with OpenAI",
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { success: false, error: "No response from OpenAI" },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let parsedContent: any
    try {
      parsedContent = JSON.parse(content)
    } catch (error) {
      console.error("Failed to parse OpenAI response:", content)
      return NextResponse.json(
        { success: false, error: "Invalid response format from OpenAI" },
        { status: 500 }
      )
    }

    // Extract items array - OpenAI might return it as "items" or "transactions" or directly as array
    // The response format should be a JSON object with an array of items
    let items: TransactionItem[] = []
    
    // OpenAI with json_object format typically returns a single object
    if (parsedContent.items && Array.isArray(parsedContent.items)) {
      items = parsedContent.items
    } else if (parsedContent.transactions && Array.isArray(parsedContent.transactions)) {
      items = parsedContent.transactions
    } else if (Array.isArray(parsedContent)) {
      items = parsedContent
    } else {
      // Try to find any array in the response
      const keys = Object.keys(parsedContent)
      for (const key of keys) {
        if (Array.isArray(parsedContent[key])) {
          items = parsedContent[key]
          break
        }
      }
      
      // If still no array found, try to create a single item from the object
      if (items.length === 0 && parsedContent.merchant && parsedContent.item) {
        items = [parsedContent]
      }
    }

    // Validate and normalize items
    const validatedItems: TransactionItem[] = items
      .map((item: any) => {
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
        { success: false, error: "No valid transaction items extracted" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      items: validatedItems,
    })
  } catch (error: any) {
    console.error("Error processing transaction:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process transaction",
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
