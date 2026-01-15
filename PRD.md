# Product Brief

## App Description
A simple, mobile-first PWA that tracks itemized purchases and uses a Google Sheet as a per-user database allowing the user to easily switch back and forth from the app to the spreadsheet depending on their needs/preferences. The extraction of line items from receipts and/or natural language descriptions will be done on the backend via LLM.

### State 1: "New User"
On your first visit start off with a screen saying "Add the email expensetracking@gmail.com as editor to your Google Sheet and paste the URL below"; the email should be easy to copy. Once they have included the sheet URL it saves the URL in local storage to know which app state to show (ie: "New User" or "Active User")

### State 2: "Initializing"
Fetching the spreadsheet on the backend and setting it up from scratch and/or reading data from it will probably take a while, so have a graceful loading state for this time. Ideally have it cycle through a few messages such as "Looking at your spreadsheet", "Creating scaffolding", "Loading your data", etc.

### State 3: "Active User"
After including your Google Sheet URL you see 3 distinct sections stacked vertically:
1. A small header at the top with a logo/brand name (eg: "ExpenseTracker") and tagline (eg: "Making budgeting easy") to the left and a button on the right that takes you directly to your Google Sheet
2. A center section with 2 tabs for "Add" and "Ask" which are described below
3. A lower section with recent transactions which are summarized into rows including merchant, date (eg: "2 days ago"), category (eg: "Dining"), number of line items (eg: "7 items"), and total spent. Clicking on a row expands that row accordion-style to show the line items within and clicking on it again collapses.

The "Add" tab should include a "Scan Receipt" and "Select Photo" button with a textarea below allowing the user to add additional details about the transaction. The user can add transactions via text only as well, photo/scan is not required.

The "Ask" tab allows the user to ask the LLM questions about their spending or particular purchases and/or line items; eg: "am I paying too much this dog food from Petsmart?" There should also be a row of horizontal-scroll suggested prompts to get the conversation started. The starting prompts could be "Top 3 insights", "What changed?", and "Where can I save without sacrificing?" When the LLM responds it will do so in a structured json format which may include data visualization (bar/line charts, etc) and new suggested prompts to replace the starter prompts with and keep the conversation going. 

## Spreadsheet Formatting

The Google Sheet must contain 2 tabs for "Transactions" and "Chat History"

### Transactions

Each purchase should include, merchant, date, category, items, and cost.

Merchant and date will be the same for all items in the transaction but category and cost should be per-item and be on separate rows.

Each transaction will usually require multiple rows given there are usually multiple line items per purchase. When this is the case the per-transaction fields (merchant and date) should use merged cells so they span all the subsequent item rows detailing category, item name/description, and item cost.

Cost/amounts are always formatted with exactly 2 decimals places. 

Example:
```
--------------------------------------------------------------
Merchant | Date  | Category     | Items              | Cost
--------------------------------------------------------------
PetSmart | Today | Pet supplies | Okocat Litter 20lb | $28.99
         |       | Pet supplies | Okocat Litter 20lb | $28.99
         |       | Pet supplies | Okocat Litter 20lb | $28.99
         |       | Donations    | Humane Society     | $5.00
--------------------------------------------------------------
```

### Chat History

Each message the user sends and each response the LLM provides should be tracked in a separate tab.

