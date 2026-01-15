# Backlog

Review `PRD.md` and the existing repo as needed to understand context for each task. Feel free to ask clarifying questions if necessary.

## Task

Implement the loading, scaffolding, and reading data from the spreadsheet according to the **authoritative format and logging contract** below; treat this file as the source of truth when creating, formatting, or appending to the sheet.

Don't worry about allowing the "Add" tab functionality yet. 

---

## 1. Spreadsheet Overview

The spreadsheet must contain **two tabs**:

1. `Transactions`
2. `Chat History`

If a tab does not exist, it must be created.  
Formatting must be applied in an **idempotent** way (safe to re-run without damaging data).

---

## 2. Transactions Tab

### 2.1 Sheet Name
`Transactions`

---

### 2.2 Header Row (Row 1)

Row 1 must contain **exactly** the following headers in columns A–E:

| Column | Header     |
|------|------------|
| A    | Merchant   |
| B    | Date       |
| C    | Category   |
| D    | Item       |
| E    | Cost       |

Headers must always be present and formatted even if the sheet is empty.

---

### 2.3 Header Formatting

Apply to range `A1:E1`:

- Bold text
- Horizontal alignment: LEFT
- Vertical alignment: MIDDLE
- Freeze row 1

---

### 2.4 Column Formatting

Apply formatting to the **entire column** starting from row 2:

| Column | Type      | Format / Behavior |
|------|-----------|------------------|
| A    | Text      | Left aligned |
| B    | Date      | `MMMM d, yyyy` (e.g. January 14, 2026) |
| C    | Text      | Left aligned |
| D    | Text      | Wrap text ON |
| E    | Currency  | `$#,##0.00`, right aligned |

Notes:
- Cost must be numeric (not a string with `$`)
- Date must be a date-like value so formatting applies

---

### 2.5 Table Styling

Apply to a reasonable range (e.g. `A1:E2000`):

- Thin light-gray borders
  - Inner borders
  - Outer borders
- No background fill required (keep clean spreadsheet look)

---

### 2.6 Column Widths (Suggested)

| Column | Width (px) |
|------|------------|
| A    | 140 |
| B    | 140 |
| C    | 160 |
| D    | 360 |
| E    | 110 |

Exact values do not need to be perfect; D should be widest.

---

### 2.7 Appending Transactions

#### Input Object
```ts
{
  merchant: string
  date: Date | ISO string
  category: string
  item: string
  cost: number
}
