import { NextRequest, NextResponse } from "next/server"
import { extractSpreadsheetId, getSheetsClient } from "@/lib/google-sheets"
import OpenAI from "openai"

export interface ChatResponse {
  content: string
  chart?: {
    type: "bar" | "line"
    data: { name: string; value: number }[]
  }
  suggestedPrompts?: string[]
}

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


interface ParsedChatContent {
  content?: string
  chart?: ChatResponse["chart"]
  suggestedPrompts?: string[]
}

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

You will receive transaction data and user questions. Respond in a structured JSON format with:
- content: string (your response in markdown format, can include **bold**, numbered lists, emojis)
- chart: optional object with type ("bar" or "line") and data array with {name: string, value: number}
- suggestedPrompts: optional array of 3-4 follow-up question suggestions

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

    // Call OpenAI API
    const openai = new OpenAI({ apiKey })

    let content: string
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        response_format: { type: "json_object" },
        temperature: 0.7,
      })

      content = completion.choices[0]?.message?.content || ""
    } catch (error) {
      console.error("OpenAI API error:", error)
      const errorMessage =
        error instanceof OpenAI.APIError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to process question"
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: error instanceof OpenAI.APIError ? error.status : 500 }
      )
    }

    if (!content) {
      return NextResponse.json(
        { success: false, error: "No response from OpenAI" },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let parsedContent: ParsedChatContent
    try {
      parsedContent = JSON.parse(content) as ParsedChatContent
    } catch (_error) {
      console.error("Failed to parse OpenAI response:", content)
      return NextResponse.json(
        { success: false, error: "Invalid response format from OpenAI" },
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
