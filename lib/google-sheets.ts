import { google } from "googleapis"

/**
 * Extract spreadsheet ID from a Google Sheets URL
 * Supports formats like:
 * - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
 * - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

/**
 * Get authenticated Google Sheets API client
 */
export async function getSheetsClient() {
  // Parse GCP_SA_CREDENTIALS from environment variable
  // It can be either a JSON string or already parsed
  let credentials: any = undefined
  
  if (process.env.GCP_SA_CREDENTIALS) {
    try {
      // Try parsing as JSON string first
      credentials = typeof process.env.GCP_SA_CREDENTIALS === 'string'
        ? JSON.parse(process.env.GCP_SA_CREDENTIALS)
        : process.env.GCP_SA_CREDENTIALS
    } catch (error) {
      console.error("Error parsing GCP_SA_CREDENTIALS:", error)
      throw new Error("Invalid GCP_SA_CREDENTIALS format. Expected valid JSON.")
    }
  }

  if (!credentials) {
    throw new Error("GCP_SA_CREDENTIALS environment variable is required")
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  const authClient = await auth.getClient()
  return google.sheets({ version: "v4", auth: authClient })
}

/**
 * Get or create a sheet (tab) in the spreadsheet
 */
export async function getOrCreateSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  try {
    // Get spreadsheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    // Find existing sheet
    const existingSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === sheetName
    )

    if (existingSheet?.properties?.sheetId !== undefined) {
      return existingSheet.properties.sheetId
    }

    // Create new sheet
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    })

    const newSheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId
    if (newSheetId === undefined) {
      throw new Error(`Failed to create sheet: ${sheetName}`)
    }

    return newSheetId
  } catch (error) {
    console.error(`Error getting/creating sheet ${sheetName}:`, error)
    throw error
  }
}

/**
 * Get sheet ID by name
 */
export async function getSheetId(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string
): Promise<number | null> {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    // Debug: log all sheet names to help diagnose issues
    const allSheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || []
    console.log(`Available sheets: ${JSON.stringify(allSheetNames)}`)
    console.log(`Looking for sheet: "${sheetName}"`)

    // Try exact match first
    let sheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === sheetName
    )

    // If not found, try case-insensitive match
    if (!sheet) {
      sheet = spreadsheet.data.sheets?.find(
        (sheet) => sheet.properties?.title?.toLowerCase() === sheetName.toLowerCase()
      )
    }

    // If still not found, try trimming whitespace
    if (!sheet) {
      sheet = spreadsheet.data.sheets?.find(
        (sheet) => sheet.properties?.title?.trim() === sheetName.trim()
      )
    }

    if (!sheet) {
      console.warn(`Sheet "${sheetName}" not found. Available sheets: ${allSheetNames.join(", ")}`)
      return null
    }

    const sheetId = sheet.properties?.sheetId
    if (sheetId === undefined || sheetId === null) {
      console.warn(`Sheet "${sheetName}" found but has no sheetId`)
      return null
    }

    console.log(`Found sheet "${sheetName}" with ID: ${sheetId}`)
    return sheetId
  } catch (error) {
    console.error(`Error getting sheet ID for ${sheetName}:`, error)
    return null
  }
}
