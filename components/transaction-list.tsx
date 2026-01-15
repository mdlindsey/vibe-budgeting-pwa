"use client"

import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ShoppingBag, Utensils, Car, Gamepad2, Heart, Home, ChevronRight } from "lucide-react"

interface LineItem {
  name: string
  price: number
}

interface Transaction {
  id: string
  merchant: string
  date: string
  category: string
  categoryIcon: typeof ShoppingBag
  itemCount: number
  total: number
  items: LineItem[]
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

export function TransactionList() {
  const [expandedId, setExpandedId] = useState<string>("")
  const [fullyExpandedIds, setFullyExpandedIds] = useState<Set<string>>(new Set())

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Recent Transactions</h2>
        <span className="text-xs text-muted-foreground">{mockTransactions.length} transactions</span>
      </div>

      <Accordion type="single" collapsible value={expandedId} onValueChange={setExpandedId} className="space-y-2">
        {mockTransactions.map((transaction) => {
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
