'use client'

import {
  FileText,
  Stethoscope,
  AlertTriangle,
  HelpCircle,
  ClipboardCheck,
  MessageCircleHeart,
  Gauge,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssistantSection } from '@/lib/types'

function SectionBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-l-2 border-primary/60 pl-3 sm:pl-4">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

const severityStyles: Record<string, string> = {
  High: 'bg-destructive/15 text-destructive border-destructive/30',
  Moderate: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
  Low: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
}

const confidenceStyles: Record<string, string> = {
  High: 'bg-chart-3/15 text-chart-3 border-chart-3/40',
  Moderate: 'bg-chart-4/15 text-chart-4 border-chart-4/40',
  Low: 'bg-destructive/15 text-destructive border-destructive/40',
}

export function StructuredResponse({ data }: { data: AssistantSection }) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4 sm:p-5">
      <SectionBlock icon={FileText} title="Case Summary">
        <p className="text-pretty">{data.caseSummary}</p>
      </SectionBlock>

      <SectionBlock icon={Stethoscope} title="Clinical Assessment">
        <ul className="flex flex-col gap-1.5">
          {data.clinicalAssessment.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock icon={AlertTriangle} title="Drug Related Problems">
        <ul className="flex flex-col gap-2">
          {data.drugRelatedProblems.map((item, i) => (
            <li
              key={i}
              className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3"
            >
              <span
                className={cn(
                  'inline-flex w-fit shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium',
                  severityStyles[item.severity],
                )}
              >
                {item.severity}
              </span>
              <span>{item.problem}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock icon={HelpCircle} title="Missing Information">
        <ul className="flex flex-col gap-1.5">
          {data.missingInformation.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock icon={ClipboardCheck} title="Recommendations">
        <ol className="flex flex-col gap-1.5">
          {data.recommendations.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </SectionBlock>

      <SectionBlock icon={MessageCircleHeart} title="Patient Counseling">
        <ul className="flex flex-col gap-1.5">
          {data.patientCounseling.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock icon={Gauge} title="Confidence Level">
        <span
          className={cn(
            'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
            confidenceStyles[data.confidence],
          )}
        >
          {data.confidence} Confidence
        </span>
      </SectionBlock>
    </div>
  )
}
