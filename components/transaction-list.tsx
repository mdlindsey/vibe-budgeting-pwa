"use client"

import { useState, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ShoppingBag, Utensils, Car, Gamepad2, Heart, Home, ChevronRight, Loader2 } from "lucide-react"
import { formatDistanceToNow, parseISO, isValid as isValidDate } from "date-fns"

interface LineItem {
  name: string
  price: number
}

interface Transaction {
  id: string
  merchant: string
  date: string
  originalDate: string // Store original date for sorting
  category: string
  categoryIcon: typeof ShoppingBag
  itemCount: number
  total: number
  items: LineItem[]
}

interface TransactionRow {
  merchant: string
  date: string
  category: string
  item: string
  cost: number
}

interface TransactionListProps {
  sheetUrl: string
}

// Category icon mapping
const categoryIcons: Record<string, typeof ShoppingBag> = {
  Groceries: ShoppingBag,
  Dining: Utensils,
  Transport: Car,
  Entertainment: Gamepad2,
  Health: Heart,
  Home: Home,
}

const getCategoryIcon = (category: string): typeof ShoppingBag => {
  return categoryIcons[category] || ShoppingBag
}

// Format date to relative time (e.g., "2 days ago")
const formatRelativeDate = (dateStr: string): string => {
  try {
    // Try parsing as ISO string first
    let date: Date
    if (dateStr.includes("T") || dateStr.includes("Z")) {
      date = parseISO(dateStr)
    } else {
      // Try parsing as regular date string
      date = new Date(dateStr)
    }

    if (!isValidDate(date)) {
      return dateStr
    }

    const distance = formatDistanceToNow(date, { addSuffix: true })
    // Capitalize first letter
    return distance.charAt(0).toUpperCase() + distance.slice(1)
  } catch {
    return dateStr
  }
}

// Group transaction rows by merchant and date
const groupTransactions = (rows: TransactionRow[]): Transaction[] => {
  const grouped = new Map<string, TransactionRow[]>()

  // Group by merchant + date
  for (const row of rows) {
    const key = `${row.merchant}|${row.date}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(row)
  }

  // Convert to Transaction objects
  const transactions: Transaction[] = []
  let idCounter = 1

  for (const [key, items] of grouped.entries()) {
    if (items.length === 0) continue

    const firstItem = items[0]
    const total = items.reduce((sum, item) => sum + item.cost, 0)
    
    // Get the most common category, or first one
    const categoryCounts = new Map<string, number>()
    for (const item of items) {
      categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1)
    }
    const mostCommonCategory = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || firstItem.category

    transactions.push({
      id: `transaction-${idCounter++}`,
      merchant: firstItem.merchant,
      date: formatRelativeDate(firstItem.date),
      originalDate: firstItem.date, // Store original for sorting
      category: mostCommonCategory,
      categoryIcon: getCategoryIcon(mostCommonCategory),
      itemCount: items.length,
      total,
      items: items.map((item) => ({
        name: item.item,
        price: item.cost,
      })),
    })
  }

  // Sort by date (most recent first)
  transactions.sort((a, b) => {
    try {
      const dateA = a.originalDate.includes("T") || a.originalDate.includes("Z") 
        ? parseISO(a.originalDate) 
        : new Date(a.originalDate)
      const dateB = b.originalDate.includes("T") || b.originalDate.includes("Z")
        ? parseISO(b.originalDate)
        : new Date(b.originalDate)
      if (isValidDate(dateA) && isValidDate(dateB)) {
        return dateB.getTime() - dateA.getTime()
      }
    } catch {
      // Fall through to string comparison
    }
    return b.originalDate.localeCompare(a.originalDate)
  })

  return transactions
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    merchant: "Whole Foods Market",
    date: "Today",
    category: "Groceries",
    categoryIcon: ShoppingBag,
    itemCount: 27,
    total: 187.43,
    items: [
      { name: "Organic Bananas", price: 2.49 },
      { name: "Almond Milk", price: 4.99 },
      { name: "Chicken Breast", price: 12.99 },
      { name: "Mixed Greens", price: 5.99 },
      { name: "Greek Yogurt", price: 6.49 },
      { name: "Sourdough Bread", price: 4.99 },
    ],
  },
  {
    id: "2",
    merchant: "Chipotle",
    date: "Yesterday",
    category: "Dining",
    categoryIcon: Utensils,
    itemCount: 3,
    total: 24.56,
    items: [
      { name: "Burrito Bowl", price: 11.25 },
      { name: "Chips & Guac", price: 5.95 },
      { name: "Drink", price: 3.25 },
    ],
  },
  {
    id: "3",
    merchant: "Shell Gas Station",
    date: "2 days ago",
    category: "Transport",
    categoryIcon: Car,
    itemCount: 1,
    total: 52.18,
    items: [{ name: "Regular Unleaded - 14.2 gal", price: 52.18 }],
  },
  {
    id: "4",
    merchant: "Steam",
    date: "3 days ago",
    category: "Entertainment",
    categoryIcon: Gamepad2,
    itemCount: 2,
    total: 49.98,
    items: [
      { name: "Elden Ring DLC", price: 39.99 },
      { name: "Indie Bundle", price: 9.99 },
    ],
  },
  {
    id: "5",
    merchant: "CVS Pharmacy",
    date: "4 days ago",
    category: "Health",
    categoryIcon: Heart,
    itemCount: 4,
    total: 32.47,
    items: [
      { name: "Vitamins", price: 14.99 },
      { name: "Allergy Medicine", price: 9.99 },
      { name: "Bandages", price: 4.49 },
      { name: "Hand Sanitizer", price: 3.0 },
    ],
  },
  {
    id: "6",
    merchant: "Home Depot",
    date: "1 week ago",
    category: "Home",
    categoryIcon: Home,
    itemCount: 5,
    total: 127.84,
    items: [
      { name: "LED Light Bulbs (4pk)", price: 24.99 },
      { name: "Drill Bit Set", price: 34.99 },
      { name: "Paint Brush Set", price: 18.99 },
      { name: "Caulk Gun", price: 12.99 },
      { name: "Mounting Hardware", price: 8.99 },
    ],
  },
]

const MAX_VISIBLE_ITEMS = 5

export function TransactionList({ sheetUrl }: TransactionListProps) {
  const [expandedId, setExpandedId] = useState<string>("")
  const [fullyExpandedIds, setFullyExpandedIds] = useState<Set<string>>(new Set())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/sheets/transactions?sheetUrl=${encodeURIComponent(sheetUrl)}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || errorData.error || "Failed to fetch transactions")
        }

        const data = await response.json()
        const grouped = groupTransactions(data.transactions || [])
        setTransactions(grouped)
      } catch (err: any) {
        console.error("Error fetching transactions:", err)
        setError(err.message || "Failed to load transactions")
      } finally {
        setLoading(false)
      }
    }

    if (sheetUrl) {
      fetchTransactions()
    }

    // Listen for transaction added events to refresh the list
    const handleTransactionAdded = () => {
      fetchTransactions()
    }

    window.addEventListener("transaction-added", handleTransactionAdded)

    return () => {
      window.removeEventListener("transaction-added", handleTransactionAdded)
    }
  }, [sheetUrl])

  const toggleFullExpand = (id: string) => {
    setFullyExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Transactions</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Transactions</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Transactions</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No transactions found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Recent Transactions</h2>
        <span className="text-xs text-muted-foreground">{transactions.length} transactions</span>
      </div>

      <Accordion type="single" collapsible value={expandedId} onValueChange={setExpandedId} className="space-y-2">
        {transactions.map((transaction) => {
          const Icon = transaction.categoryIcon
          const isFullyExpanded = fullyExpandedIds.has(transaction.id)
          const visibleItems = isFullyExpanded ? transaction.items : transaction.items.slice(0, MAX_VISIBLE_ITEMS)
          const remainingItemCount = transaction.itemCount - MAX_VISIBLE_ITEMS
          const hasMoreItems = remainingItemCount > 0 && !isFullyExpanded

          return (
            <AccordionItem
              key={transaction.id}
              value={transaction.id}
              className="border border-border rounded-xl bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-accent/50 [&[data-state=open]]:bg-accent/30">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground truncate">{transaction.merchant}</p>
                      <p className="font-semibold text-foreground shrink-0">${transaction.total.toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {transaction.date} · {transaction.category} · {transaction.itemCount} items
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <div className="pt-2 border-t border-border mt-1">
                  <div className="space-y-2">
                    {visibleItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="text-foreground font-medium">${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                    {hasMoreItems && (
                      <button
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors pt-2 w-full justify-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFullExpand(transaction.id)
                        }}
                      >
                        <span>View all {transaction.itemCount} items</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                    {isFullyExpanded && transaction.items.length > MAX_VISIBLE_ITEMS && (
                      <button
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2 w-full justify-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFullExpand(transaction.id)
                        }}
                      >
                        <span>Show less</span>
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </button>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
