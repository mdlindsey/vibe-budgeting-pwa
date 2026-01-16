import { NextRequest, NextResponse } from "next/server"
import { extractSpreadsheetId, getSheetsClient } from "@/lib/google-sheets"

export interface TransactionRow {
  merchant: string
  date: string
  category: string
  item: string
  cost: number
}

interface GoogleSheetsError extends Error {
  code?: number
  status?: number
  message: string
}

/**
 * Read transactions from the Transactions sheet
 * Groups rows by merchant and date to form transactions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sheetUrl = searchParams.get("sheetUrl")

    if (!sheetUrl) {
      return NextResponse.json({ error: "Sheet URL is required" }, { status: 400 })
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl)
    if (!spreadsheetId) {
      return NextResponse.json({ error: "Invalid Google Sheets URL" }, { status: 400 })
    }

    const sheets = await getSheetsClient()

    // Try to read directly from the Transactions sheet
    // This will fail if the sheet doesn't exist, which is better than checking sheetId
    let response
    try {
      // Read all data from the Transactions sheet (starting from row 2 to skip header)
      response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Transactions!A2:E",
      })
    } catch (error) {
      console.error("Error reading Transactions sheet:", error)
      // Check if the error is about the sheet not existing
      const sheetsError = error as GoogleSheetsError
      const errorMessage = sheetsError.message?.toLowerCase() || ""
      const errorCode = sheetsError.code || sheetsError.status
      
      if (
        errorCode === 400 ||
        errorMessage.includes("unable to parse range") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("invalid range")
      ) {
        return NextResponse.json({ error: "Transactions sheet not found" }, { status: 404 })
      }
      // Re-throw other errors
      throw error
    }

    const rows = response.data.values || []
    const transactions: TransactionRow[] = []

    // Track the current merchant and date for handling merged cells
    // When merchant/date cells are merged, subsequent rows will have empty values
    let currentMerchant = ""
    let currentDate = ""

    // Parse rows into transaction objects
    for (const row of rows) {
      // Skip completely empty rows
      if (!row || row.length === 0) {
        continue
      }

      const merchant = row[0]?.toString().trim() || ""
      const dateStr = row[1]?.toString().trim() || ""
      const category = row[2]?.toString().trim() || ""
      const item = row[3]?.toString().trim() || ""
      const costStr = row[4]?.toString().trim() || "0"

      // Handle merged cells: if merchant/date is empty, use the previous row's values
      // This happens when cells are merged in the spreadsheet
      if (merchant) {
        currentMerchant = merchant
      }
      if (dateStr) {
        currentDate = dateStr
      }

      // Parse cost - remove currency symbols and commas
      const cost = parseFloat(costStr.replace(/[$,]/g, "")) || 0

      // Only add if we have essential data (merchant, date, and item)
      // Note: merchant and date might come from merged cells (currentMerchant/currentDate)
      if (currentMerchant && currentDate && item) {
        transactions.push({
          merchant: currentMerchant,
          date: currentDate,
          category,
          item,
          cost,
        })
      }
    }

    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length,
    })
  } catch (error) {
    console.error("Error reading transactions:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: "Failed to read transactions",
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
