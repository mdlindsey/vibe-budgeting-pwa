import { NextRequest, NextResponse } from "next/server"
import { extractSpreadsheetId, getSheetsClient, getOrCreateSheet } from "@/lib/google-sheets"
import { formatTransactionsSheet, formatChatHistorySheet } from "@/lib/sheet-formatter"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sheetUrl } = body

    if (!sheetUrl) {
      return NextResponse.json({ error: "Sheet URL is required" }, { status: 400 })
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl)
    if (!spreadsheetId) {
      return NextResponse.json({ error: "Invalid Google Sheets URL" }, { status: 400 })
    }

    const sheets = await getSheetsClient()

    // Get or create Transactions sheet
    const transactionsSheetId = await getOrCreateSheet(sheets, spreadsheetId, "Transactions")
    await formatTransactionsSheet(sheets, spreadsheetId, transactionsSheetId)

    // Get or create Chat History sheet
    const chatHistorySheetId = await getOrCreateSheet(sheets, spreadsheetId, "Chat History")
    await formatChatHistorySheet(sheets, spreadsheetId, chatHistorySheetId)

    return NextResponse.json({
      success: true,
      spreadsheetId,
      transactionsSheetId,
      chatHistorySheetId,
    })
  } catch (error: any) {
    console.error("Error initializing spreadsheet:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize spreadsheet",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
