'use client'

import { Plus, MessageSquare, Stethoscope, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/lib/types'

interface SidebarProps {
  sessions: ChatSession[]
  activeId: string
  onSelect: (id: string) => void
  onNewChat: () => void
  open: boolean
  onClose: () => void
}

export function Sidebar({
  sessions,
  activeId,
  onSelect,
  onNewChat,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Nexus</p>
              <p className="text-xs text-muted-foreground">Clinical Pharmacist AI</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="px-3">
          <Button
            onClick={onNewChat}
            className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            New Chat
          </Button>
        </div>

        <p className="px-4 pb-2 pt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent Cases
        </p>

        <ScrollArea className="flex-1 px-3">
          <nav className="flex flex-col gap-1 pb-4">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  'flex items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  s.id === activeId
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                <MessageSquare className="mt-0.5 size-4 shrink-0" />
                <span className="line-clamp-2 leading-snug">{s.title}</span>
              </button>
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-pretty text-[11px] leading-relaxed text-muted-foreground">
            Decision support only. Always verify against current guidelines and
            patient-specific factors.
          </p>
        </div>
      </aside>
    </>
  )
}
