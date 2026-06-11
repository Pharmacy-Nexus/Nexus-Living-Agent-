import { NextResponse } from 'next/server'
import type { AssistantSection, Message } from '@/lib/types'

export const runtime = 'nodejs'

type NvidiaChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

const SYSTEM_PROMPT = `
You are Nexus Clinical Pharmacist AI, a clinical decision-support assistant for pharmacists.

Your task is to help pharmacists understand patient cases, medication risks, missing information, counseling points, and monitoring needs.

Hard safety rules:
- Do NOT claim a definitive diagnosis.
- Do NOT invent drug doses, guidelines, references, or lab ranges.
- If patient-specific data is missing, state what is missing.
- If you are uncertain, lower the confidence level.
- Focus on pharmacist-relevant reasoning: drug-related problems, monitoring, contraindications, renal/hepatic considerations, interactions, counseling, and referral red flags.
- Keep recommendations practical and cautious.
- This is for pharmacist decision support, not a replacement for clinical judgment.

Return ONLY valid JSON. No markdown. No extra prose.

The JSON must match this exact TypeScript shape:
{
  "caseSummary": "string",
  "clinicalAssessment": ["string"],
  "drugRelatedProblems": [{ "problem": "string", "severity": "High" | "Moderate" | "Low" }],
  "missingInformation": ["string"],
  "recommendations": ["string"],
  "patientCounseling": ["string"],
  "confidence": "High" | "Moderate" | "Low"
}
`

function safeArray(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) return [fallback]
  const cleaned = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return cleaned.length ? cleaned : [fallback]
}

function safeSeverity(value: unknown): 'High' | 'Moderate' | 'Low' {
  return value === 'High' || value === 'Moderate' || value === 'Low' ? value : 'Moderate'
}

function safeConfidence(value: unknown): 'High' | 'Moderate' | 'Low' {
  return value === 'High' || value === 'Moderate' || value === 'Low' ? value : 'Low'
}

function coerceStructured(value: unknown): AssistantSection {
  const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const rawProblems = Array.isArray(obj.drugRelatedProblems) ? obj.drugRelatedProblems : []

  const drugRelatedProblems = rawProblems
    .map((item) => {
      const p = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      const problem = typeof p.problem === 'string' ? p.problem.trim() : ''
      if (!problem) return null
      return { problem, severity: safeSeverity(p.severity) }
    })
    .filter((item): item is { problem: string; severity: 'High' | 'Moderate' | 'Low' } => item !== null)

  return {
    caseSummary:
      typeof obj.caseSummary === 'string' && obj.caseSummary.trim().length > 0
        ? obj.caseSummary.trim()
        : 'The case was received, but the available details are limited.',
    clinicalAssessment: safeArray(
      obj.clinicalAssessment,
      'Insufficient data for a detailed clinical assessment. More patient-specific information is needed.',
    ),
    drugRelatedProblems: drugRelatedProblems.length
      ? drugRelatedProblems
      : [{ problem: 'No specific drug-related problem can be confirmed from the provided information alone.', severity: 'Low' }],
    missingInformation: safeArray(
      obj.missingInformation,
      'Diagnosis, full medication list, allergies, renal/hepatic function, relevant labs, and current symptoms.',
    ),
    recommendations: safeArray(
      obj.recommendations,
      'Verify the case details and review current guidelines or trusted drug information before clinical action.',
    ),
    patientCounseling: safeArray(
      obj.patientCounseling,
      'Provide counseling only after confirming the medication plan, patient factors, and clinician instructions.',
    ),
    confidence: safeConfidence(obj.confidence),
  }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    // continue
  }

  const withoutFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(withoutFences)
  } catch {
    // continue
  }

  const first = withoutFences.indexOf('{')
  const last = withoutFences.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    return JSON.parse(withoutFences.slice(first, last + 1))
  }

  throw new Error('Model did not return valid JSON')
}

function buildTranscript(messages: Message[]) {
  return messages
    .map((message) => {
      const attachmentText = message.attachments?.length
        ? `\nAttachments: ${message.attachments.map((a) => `${a.name} (${a.size} bytes)`).join(', ')}`
        : ''

      if (message.role === 'assistant' && message.structured) {
        return `ASSISTANT: ${JSON.stringify(message.structured)}`
      }

      return `${message.role.toUpperCase()}: ${message.content || '(file attached without extracted text)'}${attachmentText}`
    })
    .join('\n\n')
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.NVIDIA_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing NVIDIA_API_KEY. Add it to your Vercel Environment Variables.' },
        { status: 500 },
      )
    }

    const body = (await request.json()) as { messages?: Message[] }
    const messages = Array.isArray(body.messages) ? body.messages : []

    if (!messages.length) {
      return NextResponse.json({ error: 'No messages provided.' }, { status: 400 })
    }

    const model = process.env.NVIDIA_MODEL || 'moonshotai/kimi-k2.6'
    const endpoint = process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions'

    const nvidiaResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze this pharmacist consultation transcript and return the required JSON only.\n\n${buildTranscript(messages)}`,
          },
        ],
        max_tokens: 4096,
        temperature: 0.2,
        top_p: 0.9,
        stream: false,
      }),
    })

    const data = (await nvidiaResponse.json()) as NvidiaChatResponse

    if (!nvidiaResponse.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'NVIDIA API request failed.' },
        { status: nvidiaResponse.status },
      )
    }

    const rawText = data.choices?.[0]?.message?.content?.trim() || ''

    if (!rawText) {
      return NextResponse.json({ error: 'Empty model response.' }, { status: 502 })
    }

    const parsed = extractJson(rawText)
    const structured = coerceStructured(parsed)

    return NextResponse.json({ structured })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
