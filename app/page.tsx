'use client'

import { useEffect, useRef, useState } from 'react'
import { Menu, Download, Stethoscope, FileText, Pill, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sidebar } from '@/components/sidebar'
import { ChatMessage, TypingIndicator } from '@/components/chat-message'
import { MessageInput } from '@/components/message-input'
import { newId, SAMPLE_HISTORY } from '@/lib/mock-data'
import { exportChatToPdf } from '@/lib/export-pdf'
import type { Attachment, ChatSession, Message } from '@/lib/types'

const SUGGESTIONS = [
  {
    icon: Pill,
    label: 'Polypharmacy review',
    prompt:
      '74-year-old female with CKD stage 3, hypertension, and atrial fibrillation on 9 medications. Please review for drug-related problems.',
  },
  {
    icon: ClipboardList,
    label: 'Interaction check',
    prompt:
      'Patient on warfarin started a course of ciprofloxacin for a UTI. Assess interaction risk and monitoring needs.',
  },
  {
    icon: FileText,
    label: 'Counseling plan',
    prompt:
      'New start on basal-bolus insulin for type 2 diabetes. Provide a patient counseling plan.',
  },
]

export default function Page() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => [
    {
      id: 'active',
      title: 'New consultation',
      messages: [],
      createdAt: Date.now(),
    },
    ...SAMPLE_HISTORY,
  ])
  const [activeId, setActiveId] = useState('active')
  const [isThinking, setIsThinking] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0]
  const messages = active.messages
  const isEmpty = messages.length === 0

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, isThinking])

  const updateActive = (updater: (s: ChatSession) => ChatSession) => {
    setSessions((prev) => prev.map((s) => (s.id === activeId ? updater(s) : s)))
  }

  const handleSend = async (text: string, attachments: Attachment[]) => {
    const userMsg: Message = {
      id: newId('msg'),
      role: 'user',
      content: text || undefined,
      attachments: attachments.length ? attachments : undefined,
      createdAt: Date.now(),
    }

    const targetSessionId = activeId
    const nextMessages = [...messages, userMsg]

    setSessions((prev) =>
      prev.map((s) =>
        s.id === targetSessionId
          ? {
              ...s,
              title: s.messages.length === 0 && text ? text.slice(0, 48) : s.title,
              messages: nextMessages,
            }
          : s,
      ),
    )

    setIsThinking(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'AI request failed')
      }

      const assistantMsg: Message = {
        id: newId('msg'),
        role: 'assistant',
        structured: data.structured,
        createdAt: Date.now(),
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, messages: [...s.messages, assistantMsg] }
            : s,
        ),
      )
    } catch (error) {
      const assistantMsg: Message = {
        id: newId('msg'),
        role: 'assistant',
        content:
          error instanceof Error
            ? `AI connection error: ${error.message}`
            : 'AI connection error. Please try again.',
        createdAt: Date.now(),
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, messages: [...s.messages, assistantMsg] }
            : s,
        ),
      )
    } finally {
      setIsThinking(false)
    }
  }

  const handleNewChat = () => {
    const id = newId('chat')
    const fresh: ChatSession = {
      id,
      title: 'New consultation',
      messages: [],
      createdAt: Date.now(),
    }
    setSessions((prev) => [fresh, ...prev])
    setActiveId(id)
    setSidebarOpen(false)
  }

  const handleExport = () => {
    if (messages.length === 0) return
    exportChatToPdf(active.title, messages)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id)
          setSidebarOpen(false)
        }}
        onNewChat={handleNewChat}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                {active.title}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Clinical decision support session
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={messages.length === 0}
            className="gap-2 border-border bg-transparent"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1" viewportRef={scrollRef}>
          <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center gap-6 pt-10 text-center sm:pt-20">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Stethoscope className="size-7" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-balance text-xl font-semibold text-foreground sm:text-2xl">
                    Nexus Clinical Pharmacist AI
                  </h2>
                  <p className="mx-auto max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
                    Submit a patient case for a structured medication therapy
                    review — including drug-related problems, recommendations,
                    and counseling points.
                  </p>
                </div>
                <div className="grid w-full gap-3 sm:grid-cols-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSend(s.prompt, [])}
                      className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                    >
                      <s.icon className="size-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {s.label}
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {s.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {messages.map((m) => (
                  <ChatMessage key={m.id} message={m} />
                ))}
                {isThinking && <TypingIndicator />}
              </div>
            )}
          </div>
        </ScrollArea>

        <MessageInput onSend={handleSend} disabled={isThinking} />
      </div>
    </div>
  )
}
