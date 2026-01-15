"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Sparkles, TrendingUp, ArrowRight, PiggyBank, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useKeyboardScroll } from "@/hooks/use-keyboard-scroll"

function renderMarkdown(content: string) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []

  lines.forEach((line, lineIndex) => {
    if (line.trim() === "") {
      elements.push(<br key={`br-${lineIndex}`} />)
      return
    }

    // Process inline formatting
    const processInline = (text: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = []
      let remaining = text
      let partIndex = 0

      while (remaining.length > 0) {
        // Bold with **text**
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
        if (boldMatch && boldMatch.index !== undefined) {
          if (boldMatch.index > 0) {
            parts.push(<span key={`text-${partIndex++}`}>{remaining.slice(0, boldMatch.index)}</span>)
          }
          parts.push(
            <strong key={`bold-${partIndex++}`} className="font-semibold">
              {boldMatch[1]}
            </strong>,
          )
          remaining = remaining.slice(boldMatch.index + boldMatch[0].length)
          continue
        }

        // No more matches, add remaining text
        parts.push(<span key={`text-${partIndex++}`}>{remaining}</span>)
        break
      }

      return parts
    }

    // Numbered list items
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (numberedMatch) {
      elements.push(
        <div key={`li-${lineIndex}`} className="flex gap-2 my-1">
          <span className="text-primary font-medium">{numberedMatch[1]}.</span>
          <span>{processInline(numberedMatch[2])}</span>
        </div>,
      )
      return
    }

    // Lines starting with emoji (bullet-like)
    const emojiMatch = line.match(/^(📈|📉|💡)\s+(.+)$/)
    if (emojiMatch) {
      elements.push(
        <div key={`emoji-${lineIndex}`} className="flex gap-2 my-1">
          <span>{emojiMatch[1]}</span>
          <span>{processInline(emojiMatch[2])}</span>
        </div>,
      )
      return
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${lineIndex}`} className="my-1">
        {processInline(line)}
      </p>,
    )
  })

  return <div className="space-y-0.5">{elements}</div>
}

interface Message {
  role: "user" | "assistant"
  content: string
  chart?: {
    type: "bar"
    data: { name: string; value: number }[]
  }
  suggestedPrompts?: string[]
}

const initialPrompts = [
  { label: "Top 3 insights", icon: Sparkles },
  { label: "What changed?", icon: TrendingUp },
  { label: "Where can I save?", icon: PiggyBank },
]

const initialPromptLabels = initialPrompts.map((p) => p.label)

const STORAGE_KEYS = {
  messages: "expense-tracker-chat-messages",
  prompts: "expense-tracker-chat-prompts",
}

const mockResponses: Record<string, Message> = {
  "Top 3 insights": {
    role: "assistant",
    content:
      "Here are your top 3 spending insights this month:\n\n1. **Dining out** is your largest category at $487, up 23% from last month\n2. **Subscriptions** total $156/month across 8 services\n3. **Groceries** spending is consistent at ~$320/month",
    chart: {
      type: "bar",
      data: [
        { name: "Dining", value: 487 },
        { name: "Groceries", value: 320 },
        { name: "Transport", value: 245 },
        { name: "Subs", value: 156 },
      ],
    },
    suggestedPrompts: ["Which subscriptions should I cancel?", "Compare to last month", "Set a dining budget"],
  },
  "What changed?": {
    role: "assistant",
    content:
      "Compared to last month:\n\n📈 **Increased:** Dining (+$89), Entertainment (+$45)\n📉 **Decreased:** Groceries (-$32), Transport (-$18)\n\nYour overall spending is up 8% this month.",
    suggestedPrompts: ["Why did dining increase?", "Show monthly trends", "Predict next month"],
  },
  "Where can I save?": {
    role: "assistant",
    content:
      "Based on your spending patterns, here are opportunities to save:\n\n💡 **Subscriptions:** You have 3 overlapping streaming services ($42/month)\n💡 **Dining:** Cooking 2 more meals/week could save ~$120/month\n💡 **Coffee:** Your daily coffee habit costs ~$95/month",
    suggestedPrompts: ["Help me meal plan", "Which subscriptions overlap?", "Set savings goals"],
  },
}

export function AskTab() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.messages)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState("")
  const [prompts, setPrompts] = useState<string[]>(() => {
    if (typeof window === "undefined") return initialPromptLabels
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.prompts)
      return stored ? JSON.parse(stored) : initialPromptLabels
    } catch {
      return initialPromptLabels
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { handleFocus, handleBlur } = useKeyboardScroll()

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages))
    } else {
      localStorage.removeItem(STORAGE_KEYS.messages)
    }
  }, [messages])

  useEffect(() => {
    if (prompts !== initialPromptLabels) {
      localStorage.setItem(STORAGE_KEYS.prompts, JSON.stringify(prompts))
    }
  }, [prompts])

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    setTimeout(
      () => {
        const response = mockResponses[text] || {
          role: "assistant" as const,
          content: `I analyzed your spending related to "${text}". Based on your data, you've spent an average of $45 in this category over the past 3 months. Would you like me to dive deeper into any specific transactions?`,
          suggestedPrompts: ["Show me the transactions", "Compare to average", "Set a budget alert"],
        }

        setMessages((prev) => [...prev, response])
        if (response.suggestedPrompts) {
          setPrompts(response.suggestedPrompts)
        }
        setIsLoading(false)
      },
      1500 + Math.random() * 500,
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
  }

  return (
    <div className="space-y-4">
      {messages.length > 0 && (
        <div ref={messagesContainerRef} className="space-y-4 max-h-[300px] overflow-y-auto scroll-smooth">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "rounded-2xl p-4",
                message.role === "user"
                  ? "bg-primary text-primary-foreground ml-8"
                  : "bg-card border border-border mr-4",
              )}
            >
              {message.role === "assistant" ? (
                <div className="text-sm">{renderMarkdown(message.content)}</div>
              ) : (
                <p className="text-sm">{message.content}</p>
              )}

              {message.chart && (
                <div className="mt-4 h-[150px]">
                  <ChartContainer
                    config={{
                      value: { label: "Amount", color: "var(--color-primary)" },
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={message.chart.data}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="var(--color-primary)" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="bg-card border border-border rounded-2xl p-4 mr-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing your spending...</span>
              </div>
            </div>
          )}
        </div>
      )}
      {messages.length === 0 && isLoading && (
        <div ref={messagesContainerRef} className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 mr-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Analyzing your spending...</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {prompts.map((prompt, index) => {
            const InitialIcon = initialPrompts[index]?.icon
            return (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
                className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2.5 text-sm whitespace-nowrap hover:bg-accent transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {InitialIcon && messages.length === 0 && <InitialIcon className="w-4 h-4 text-primary" />}
                <span>{prompt}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            placeholder="Ask about your spending..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend(input)
              }
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={isLoading}
            className="min-h-[56px] max-h-[120px] text-base rounded-xl pr-14 bg-card resize-none py-4 disabled:opacity-50"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 h-10 w-10 rounded-lg"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
