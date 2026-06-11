'use client'

import { Stethoscope, User, Paperclip } from 'lucide-react'
import { StructuredResponse } from './structured-response'
import type { Message } from '@/lib/types'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className="flex w-full gap-3 sm:gap-4">
      <div
        className={
          'flex size-8 shrink-0 items-center justify-center rounded-lg ' +
          (isUser
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-primary text-primary-foreground')
        }
      >
        {isUser ? (
          <User className="size-4" />
        ) : (
          <Stethoscope className="size-4" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {isUser ? 'You' : 'Nexus Clinical Pharmacist'}
        </p>

        {message.content && (
          <p className="text-pretty text-sm leading-relaxed text-foreground">
            {message.content}
          </p>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs text-secondary-foreground"
              >
                <Paperclip className="size-3.5" />
                <span className="max-w-40 truncate">{a.name}</span>
                <span className="text-muted-foreground">{formatSize(a.size)}</span>
              </span>
            ))}
          </div>
        )}

        {message.structured && <StructuredResponse data={message.structured} />}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex w-full gap-3 sm:gap-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Stethoscope className="size-4" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Nexus Clinical Pharmacist
        </p>
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-3">
          <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="size-2 animate-bounce rounded-full bg-primary" />
          <span className="ml-2 text-xs text-muted-foreground">
            Analyzing case…
          </span>
        </div>
      </div>
    </div>
  )
}
