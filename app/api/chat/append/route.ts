import { NextRequest, NextResponse } from "next/server"
import { extractSpreadsheetId, getSheetsClient } from "@/lib/google-sheets"

/**
 * Append chat messages to the Chat History sheet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sheetUrl, role, message } = body as {
      sheetUrl: string
      role: "user" | "assistant"
      message: string
    }

    if (!sheetUrl) {
      return NextResponse.json({ error: "Sheet URL is required" }, { status: 400 })
    }

    if (!role || !message) {
      return NextResponse.json({ error: "Role and message are required" }, { status: 400 })
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl)
    if (!spreadsheetId) {
      return NextResponse.json({ error: "Invalid Google Sheets URL" }, { status: 400 })
    }

    const sheets = await getSheetsClient()

    // Verify the Chat History sheet exists
    try {
      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Chat History!A1:A1",
      })
    } catch (error: any) {
      console.error("Error verifying Chat History sheet:", error)
      return NextResponse.json({ error: "Chat History sheet not found" }, { status: 404 })
    }

    // Get current data to find the next empty row
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Chat History!A:C",
    })

    const existingRows = existingData.data.values || []
    const timestamp = new Date().toISOString()

    // Append the new message
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Chat History!A:C",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[role, message, timestamp]],
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error("Error appending chat message:", error)
    return NextResponse.json(
      {
        error: "Failed to append chat message",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
