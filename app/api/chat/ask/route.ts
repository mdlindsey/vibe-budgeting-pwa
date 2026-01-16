import { NextRequest, NextResponse } from "next/server"
import { extractSpreadsheetId, getSheetsClient } from "@/lib/google-sheets"
import OpenAI from "openai"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"

export interface ChatResponse {
  content: string
  chart?: {
    type: "bar" | "line"
    data: { name: string; value: number }[]
  }
  suggestedPrompts?: string[]
}

// Zod schema for structured output
const ChatResponseSchema = z.object({
  content: z.string().describe("Your response in markdown format, can include **bold**, numbered lists, emojis"),
  chart: z.object({
    type: z.enum(["bar", "line"]).describe("Chart type"),
    data: z.array(
      z.object({
        name: z.string().describe("Data point name"),
        value: z.number().describe("Data point value"),
      })
    ).describe("Chart data array"),
  }).optional().describe("Optional chart visualization"),
  suggestedPrompts: z.array(z.string()).optional().describe("Optional array of 3-4 follow-up question suggestions"),
})

interface Transaction {
  merchant: string
  date: string
  category: string
  item: string
  cost: number
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant"
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}


// Type inferred from Zod schema
type ParsedChatContent = z.infer<typeof ChatResponseSchema>

/**
 * Process chat questions about spending using OpenAI
 * Fetches transactions and sends them to OpenAI for analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sheetUrl, question, conversationHistory } = body as {
      sheetUrl: string
      question: string
      conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
    }

    if (!sheetUrl) {
      return NextResponse.json({ error: "Sheet URL is required" }, { status: 400 })
    }

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      )
    }

    // Fetch transactions from the spreadsheet
    const spreadsheetId = extractSpreadsheetId(sheetUrl)
    if (!spreadsheetId) {
      return NextResponse.json({ error: "Invalid Google Sheets URL" }, { status: 400 })
    }

    const sheets = await getSheetsClient()

    // Read transactions
    let transactions: Transaction[] = []
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Transactions!A2:E",
      })

      const rows = response.data.values || []
      for (const row of rows) {
        if (!row || row.length === 0 || !row[0]) continue

        const merchant = row[0]?.toString().trim() || ""
        const dateStr = row[1]?.toString().trim() || ""
        const category = row[2]?.toString().trim() || ""
        const item = row[3]?.toString().trim() || ""
        const costStr = row[4]?.toString().trim() || "0"

        if (merchant && dateStr && item) {
          const cost = parseFloat(costStr.replace(/[$,]/g, "")) || 0
          transactions.push({
            merchant,
            date: dateStr,
            category,
            item,
            cost,
          })
        }
      }
    } catch (error) {
      console.error("Error reading transactions:", error)
      // Continue even if we can't read transactions - OpenAI can still answer general questions
    }

    // Prepare messages for OpenAI
    const messages: OpenAIMessage[] = [
      {
        role: "system",
        content: `You are a helpful financial assistant that analyzes spending data. You help users understand their spending patterns, find savings opportunities, and answer questions about their transactions.

Be concise, helpful, and data-driven. Use the transaction data to provide specific insights.`,
      },
    ]

    // Add transaction data context if available
    if (transactions.length > 0) {
      messages.push({
        role: "user",
        content: `Here is the user's transaction data (${transactions.length} items):

${JSON.stringify(transactions.slice(0, 100), null, 2)}${transactions.length > 100 ? `\n\n(Showing first 100 of ${transactions.length} transactions)` : ""}

Now answer the user's question about their spending.`,
      })
    }

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      // Add recent history (last 10 messages to avoid token limits)
      const recentHistory = conversationHistory.slice(-10)
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // Add the current question
    messages.push({
      role: "user",
      content: question,
    })

    // Call OpenAI API with structured outputs
    const openai = new OpenAI({ apiKey })

    let parsedContent: ParsedChatContent
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        response_format: zodResponseFormat(ChatResponseSchema, "chat_response"),
        temperature: 0.7,
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
      parsedContent = ChatResponseSchema.parse(json)
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

    // Extract response components
    const chatResponse: ChatResponse = {
      content: parsedContent.content || "I'm sorry, I couldn't generate a response.",
      chart: parsedContent.chart || undefined,
      suggestedPrompts: parsedContent.suggestedPrompts || undefined,
    }

    return NextResponse.json({
      success: true,
      response: chatResponse,
    })
  } catch (error) {
    console.error("Error processing chat question:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to process question"
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
