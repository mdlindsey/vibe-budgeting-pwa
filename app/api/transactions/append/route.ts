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

    const existingRows = existingData.data.values || []
    const startRowIndex = existingRows.length // This will be the first row we append (0-indexed, so row 1 = header, row 2 = first data)

    // Check for duplicate receipts
    // Compare new items against existing transactions
    // A duplicate is defined as: same merchant, same date, and similar total cost (within 5% or $1)
    
    // Group existing transactions (handle merged cells - merchant/date only in first row)
    const existingTransactions = new Map<string, number>() // key: "merchant|date", value: total cost
    
    let currentMerchant = ""
    let currentDate = ""
    let currentTotal = 0
    
    for (let i = 1; i < existingRows.length; i++) {
      const row = existingRows[i]
      if (!row || row.length < 5) continue
      
      const merchant = String(row[0] || "").trim()
      const dateStr = String(row[1] || "").trim()
      const costStr = String(row[4] || "0").trim()
      
      // If merchant is present, this is the start of a new transaction
      if (merchant) {
        // Save previous transaction if it exists
        if (currentMerchant && currentDate) {
          const key = `${currentMerchant.toLowerCase()}|${currentDate}`
          existingTransactions.set(key, currentTotal)
        }
        // Start new transaction
        currentMerchant = merchant
        currentDate = dateStr
        currentTotal = parseFloat(costStr.replace(/[$,]/g, "")) || 0
      } else {
        // This is a continuation of the current transaction (merged cell)
        currentTotal += parseFloat(costStr.replace(/[$,]/g, "")) || 0
      }
    }
    
    // Save the last transaction
    if (currentMerchant && currentDate) {
      const key = `${currentMerchant.toLowerCase()}|${currentDate}`
      existingTransactions.set(key, currentTotal)
    }
    
    // Check new transactions against existing ones
    for (const [_key, groupItems] of transactionGroups.entries()) {
      const firstItem = groupItems[0]
      const newTotal = groupItems.reduce((sum, item) => sum + item.cost, 0)
      
      // Normalize date to YYYY-MM-DD format for comparison
      const newDate = firstItem.date
      const comparisonKey = `${firstItem.merchant.toLowerCase()}|${newDate}`
      
      // Check if a transaction with this merchant and date exists
      for (const [existingKey, existingTotal] of existingTransactions.entries()) {
        const [existingMerchant, existingDateStr] = existingKey.split("|")
        
        // Check merchant match
        if (existingMerchant !== firstItem.merchant.toLowerCase()) continue
        
        // Normalize and compare dates
        let existingDate = existingDateStr
        try {
          // If it's already in YYYY-MM-DD format, use it
          if (/^\d{4}-\d{2}-\d{2}$/.test(existingDate)) {
            existingDate = existingDate
          } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(existingDate)) {
            // Convert M/D/YYYY to YYYY-MM-DD
            const [month, day, year] = existingDate.split("/")
            existingDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
          }
        } catch {
          // If date parsing fails, skip this transaction
          continue
        }
        
        if (existingDate !== newDate) continue
        
        // Compare costs (within 5% or $1 tolerance)
        const costDifference = Math.abs(newTotal - existingTotal)
        const costTolerance = Math.max(newTotal * 0.05, 1) // 5% or $1, whichever is larger
        
        if (costDifference <= costTolerance) {
          return NextResponse.json(
            { success: false, error: "Duplicate receipt detected" },
            { status: 409 } // 409 Conflict
          )
        }
      }
    }

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
