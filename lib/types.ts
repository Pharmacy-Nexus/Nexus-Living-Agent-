export type Confidence = 'High' | 'Moderate' | 'Low'

export interface AssistantSection {
  caseSummary: string
  clinicalAssessment: string[]
  drugRelatedProblems: { problem: string; severity: 'High' | 'Moderate' | 'Low' }[]
  missingInformation: string[]
  recommendations: string[]
  patientCounseling: string[]
  confidence: Confidence
}

export interface Attachment {
  name: string
  size: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content?: string
  attachments?: Attachment[]
  structured?: AssistantSection
  createdAt: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}
