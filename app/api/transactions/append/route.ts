import { NextRequest, NextResponse } from "next/server"
import { extractSpreadsheetId, getSheetsClient, getSheetId } from "@/lib/google-sheets"
import { TransactionItem } from "../process/route"

interface GoogleSheetsError extends Error {
  code?: number
  message: string
}

type SheetRowValue = string | number

/**
 * Append transactions to the Transactions sheet
 * Handles merged cells for merchant and date when there are multiple items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sheetUrl, items } = body as { sheetUrl: string; items: TransactionItem[] }

    if (!sheetUrl) {
      return NextResponse.json({ error: "Sheet URL is required" }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 })
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl)
    if (!spreadsheetId) {
      return NextResponse.json({ error: "Invalid Google Sheets URL" }, { status: 400 })
    }

    const sheets = await getSheetsClient()
    
    // Verify the Transactions sheet exists by trying to read from it
    // We don't actually need the sheetId for appending, but we should verify it exists
    try {
      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Transactions!A1:A1", // Just check if the sheet exists
      })
    } catch (error) {
      console.error("Error verifying Transactions sheet:", error)
      // Check if it's a "sheet not found" error
      const sheetsError = error as GoogleSheetsError
      const errorMessage = sheetsError.message?.toLowerCase() || ""
      if (
        sheetsError.code === 400 ||
        errorMessage.includes("unable to parse range") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("does not exist")
      ) {
        return NextResponse.json({ error: "Transactions sheet not found" }, { status: 404 })
      }
      // Re-throw other errors
      throw error
    }

    // Get sheetId for merge operations (if needed)
    const sheetId = await getSheetId(sheets, spreadsheetId, "Transactions")

    // Group items by merchant and date to form transactions
    const transactionGroups = new Map<string, TransactionItem[]>()
    for (const item of items) {
      const key = `${item.merchant}|${item.date}`
      if (!transactionGroups.has(key)) {
        transactionGroups.set(key, [])
      }
      transactionGroups.get(key)!.push(item)
    }

    // Get current data to find the next empty row (before appending)
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Transactions!A:E",
    })

    const startRowIndex = (existingData.data.values || []).length // This will be the first row we append (0-indexed, so row 1 = header, row 2 = first data)

    // Prepare rows to append
    // For each transaction group, we'll append rows and then merge the merchant/date cells
    const allRows: SheetRowValue[][] = []
    const mergeRanges: Array<{ startRow: number; endRow: number }> = []

    let currentRowOffset = 0

    for (const [_key, groupItems] of transactionGroups.entries()) {
      const firstItem = groupItems[0]
      const transactionStartRow = startRowIndex + currentRowOffset
      const transactionEndRow = transactionStartRow + groupItems.length - 1

      // Add rows for all items in this transaction
      for (const item of groupItems) {
        // Convert ISO date string (YYYY-MM-DD) to a format Google Sheets recognizes
        // Using USER_ENTERED, Google Sheets will parse date strings like "7/29/2014" or "2014-07-29"
        // Parse the ISO date and format it as M/D/YYYY for better compatibility
        const dateParts = item.date.split("-")
        const formattedDate = dateParts.length === 3 
          ? `${parseInt(dateParts[1], 10)}/${parseInt(dateParts[2], 10)}/${dateParts[0]}` 
          : item.date

        allRows.push([
          item === firstItem ? item.merchant : "", // Only first row has merchant
          item === firstItem ? formattedDate : "", // Only first row has date (as formatted string)
          item.category,
          item.item,
          item.cost, // Numeric value
        ])
      }

      // If there are multiple items, record the merge range
      if (groupItems.length > 1) {
        mergeRanges.push({
          startRow: transactionStartRow,
          endRow: transactionEndRow,
        })
      }

      currentRowOffset += groupItems.length
    }

    // Append all rows
    if (allRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Transactions!A:E",
        valueInputOption: "USER_ENTERED", // Use USER_ENTERED so dates are interpreted correctly
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: allRows,
        },
      })

      // Then apply merges if needed
      if (mergeRanges.length > 0 && sheetId !== null) {
        const mergeRequests = mergeRanges.flatMap((range) => [
          // Merge merchant column (column A, index 0)
          {
            mergeCells: {
              range: {
                sheetId,
                startRowIndex: range.startRow, // 0-indexed
                endRowIndex: range.endRow + 1, // 0-indexed, exclusive
                startColumnIndex: 0, // Column A
                endColumnIndex: 1, // Column A only
              },
              mergeType: "MERGE_ALL",
            },
          },
          // Merge date column (column B, index 1)
          {
            mergeCells: {
              range: {
                sheetId,
                startRowIndex: range.startRow, // 0-indexed
                endRowIndex: range.endRow + 1, // 0-indexed, exclusive
                startColumnIndex: 1, // Column B
                endColumnIndex: 2, // Column B only
              },
              mergeType: "MERGE_ALL",
            },
          },
        ])

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: mergeRequests,
          },
        })
      } else if (mergeRanges.length > 0 && sheetId === null) {
        console.warn("Cannot merge cells: sheetId is null. Rows were added but cells were not merged.")
      }
    }

    return NextResponse.json({
      success: true,
      rowsAdded: allRows.length,
      transactionsAdded: transactionGroups.size,
    })
  } catch (error) {
    console.error("Error appending transactions:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: "Failed to append transactions",
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
