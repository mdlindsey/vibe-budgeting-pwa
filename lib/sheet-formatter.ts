import { google } from "googleapis"

/**
 * Format the Transactions sheet according to the specification
 */
export async function formatTransactionsSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetId: number
) {
  const requests: any[] = []

  // 1. Set header row (A1:E1)
  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 5,
      },
      rows: [
        {
          values: [
            { userEnteredValue: { stringValue: "Merchant" } },
            { userEnteredValue: { stringValue: "Date" } },
            { userEnteredValue: { stringValue: "Category" } },
            { userEnteredValue: { stringValue: "Item" } },
            { userEnteredValue: { stringValue: "Cost" } },
          ],
        },
      ],
      fields: "userEnteredValue",
    },
  })

  // 2. Format header row (A1:E1): Bold, left aligned, middle vertical
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 5,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            bold: true,
          },
          horizontalAlignment: "LEFT",
          verticalAlignment: "MIDDLE",
        },
      },
      fields: "userEnteredFormat.textFormat.bold,userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment",
    },
  })

  // 3. Freeze row 1
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
      fields: "gridProperties.frozenRowCount",
    },
  })

  // 4. Format columns starting from row 2
  // Column A (Merchant): Text, left aligned
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: "LEFT",
        },
      },
      fields: "userEnteredFormat.horizontalAlignment",
    },
  })

  // Column B (Date): Date format "mmmm d, yyyy" (e.g. January 14, 2026), left aligned
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: {
            type: "DATE",
            pattern: "mmmm d, yyyy",
          },
          horizontalAlignment: "LEFT",
        },
      },
      fields: "userEnteredFormat.numberFormat,userEnteredFormat.horizontalAlignment",
    },
  })

  // Column C (Category): Text, left aligned
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 2,
        endColumnIndex: 3,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: "LEFT",
        },
      },
      fields: "userEnteredFormat.horizontalAlignment",
    },
  })

  // Column D (Item): Text, wrap text ON, left aligned
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 3,
        endColumnIndex: 4,
      },
      cell: {
        userEnteredFormat: {
          wrapStrategy: "WRAP",
          horizontalAlignment: "LEFT",
        },
      },
      fields: "userEnteredFormat.wrapStrategy,userEnteredFormat.horizontalAlignment",
    },
  })

  // Column E (Cost): Currency format "$#,##0.00", right aligned
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 4,
        endColumnIndex: 5,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: {
            type: "CURRENCY",
            pattern: '"$"#,##0.00',
          },
          horizontalAlignment: "RIGHT",
        },
      },
      fields: "userEnteredFormat.numberFormat,userEnteredFormat.horizontalAlignment",
    },
  })

  // 5. Set column widths (suggested)
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 0,
        endIndex: 1,
      },
      properties: {
        pixelSize: 140,
      },
      fields: "pixelSize",
    },
  })

  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 1,
        endIndex: 2,
      },
      properties: {
        pixelSize: 140,
      },
      fields: "pixelSize",
    },
  })

  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 2,
        endIndex: 3,
      },
      properties: {
        pixelSize: 160,
      },
      fields: "pixelSize",
    },
  })

  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 3,
        endIndex: 4,
      },
      properties: {
        pixelSize: 360,
      },
      fields: "pixelSize",
    },
  })

  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 4,
        endIndex: 5,
      },
      properties: {
        pixelSize: 110,
      },
      fields: "pixelSize",
    },
  })

  // 6. Add borders to range A1:E2000
  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 2000,
        startColumnIndex: 0,
        endColumnIndex: 5,
      },
      top: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      bottom: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      left: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      right: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      innerHorizontal: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      innerVertical: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
    },
  })

  // Execute all formatting requests
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  })
}

/**
 * Format the Chat History sheet
 */
export async function formatChatHistorySheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetId: number
) {
  const requests: any[] = []

  // 1. Set header row (A1:C1)
  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 3,
      },
      rows: [
        {
          values: [
            { userEnteredValue: { stringValue: "Role" } },
            { userEnteredValue: { stringValue: "Message" } },
            { userEnteredValue: { stringValue: "Timestamp" } },
          ],
        },
      ],
      fields: "userEnteredValue",
    },
  })

  // 2. Format header row: Bold, left aligned, middle vertical
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 3,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            bold: true,
          },
          horizontalAlignment: "LEFT",
          verticalAlignment: "MIDDLE",
        },
      },
      fields: "userEnteredFormat.textFormat.bold,userEnteredFormat.horizontalAlignment,userEnteredFormat.verticalAlignment",
    },
  })

  // 3. Freeze row 1
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
      fields: "gridProperties.frozenRowCount",
    },
  })

  // 4. Format columns starting from row 2
  // Column A (Role): Text, left aligned
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: "LEFT",
        },
      },
      fields: "userEnteredFormat.horizontalAlignment",
    },
  })

  // Column B (Message): Text, wrap text ON, left aligned
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredFormat: {
          wrapStrategy: "WRAP",
          horizontalAlignment: "LEFT",
        },
      },
      fields: "userEnteredFormat.wrapStrategy,userEnteredFormat.horizontalAlignment",
    },
  })

  // Column C (Timestamp): Date/Time format, left aligned
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: 2,
        endColumnIndex: 3,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: "LEFT",
        },
      },
      fields: "userEnteredFormat.horizontalAlignment",
    },
  })

  // 5. Set column widths
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 0,
        endIndex: 1,
      },
      properties: {
        pixelSize: 100,
      },
      fields: "pixelSize",
    },
  })

  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 1,
        endIndex: 2,
      },
      properties: {
        pixelSize: 500,
      },
      fields: "pixelSize",
    },
  })

  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 2,
        endIndex: 3,
      },
      properties: {
        pixelSize: 180,
      },
      fields: "pixelSize",
    },
  })

  // 6. Add borders to range A1:C2000
  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 2000,
        startColumnIndex: 0,
        endColumnIndex: 3,
      },
      top: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      bottom: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      left: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      right: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      innerHorizontal: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
      innerVertical: {
        style: "SOLID",
        width: 1,
        color: { red: 0.8, green: 0.8, blue: 0.8 },
      },
    },
  })

  // Execute all formatting requests
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  })
}

