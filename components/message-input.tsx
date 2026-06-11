'use client'

import { useRef, useState } from 'react'
import { Paperclip, ArrowUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Attachment } from '@/lib/types'

interface MessageInputProps {
  onSend: (text: string, attachments: Attachment[]) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const canSend = (value.trim().length > 0 || files.length > 0) && !disabled

  const submit = () => {
    if (!canSend) return
    onSend(value.trim(), files)
    setValue('')
    setFiles([])
  }

  const handleFiles = (list: FileList | null) => {
    if (!list) return
    const next = Array.from(list).map((f) => ({ name: f.name, size: f.size }))
    setFiles((prev) => [...prev, ...next])
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="border-t border-border bg-background px-3 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto max-w-3xl">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs text-secondary-foreground"
              >
                <Paperclip className="size-3.5" />
                <span className="max-w-40 truncate">{f.name}</span>
                <button
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  aria-label={`Remove ${f.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 focus-within:ring-2 focus-within:ring-ring/50">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            accept=".pdf,.txt,.csv,.doc,.docx,.png,.jpg,.jpeg"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach file"
          >
            <Paperclip className="size-5" />
          </Button>

          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder="Describe the patient case, medications, and clinical question…"
            className="max-h-40 min-h-10 resize-none border-0 bg-transparent px-1 py-2 text-sm shadow-none focus-visible:ring-0"
          />

          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send message"
          >
            <ArrowUp className="size-5" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Mock responses for demonstration. Not for use in actual patient care.
        </p>
      </div>
    </div>
  )
}
