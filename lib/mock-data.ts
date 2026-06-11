import type { AssistantSection, ChatSession } from './types'

let seed = 1
function uid(prefix = 'id') {
  seed += 1
  return `${prefix}-${Date.now().toString(36)}-${seed}`
}

export const newId = uid

/**
 * Generates a mock structured clinical pharmacist response.
 * No real AI — deterministic-ish content derived from the prompt.
 */
export function generateMockResponse(prompt: string): AssistantSection {
  const trimmed = prompt.trim()
  const focus = trimmed.length > 0 ? trimmed.slice(0, 80) : 'the presented case'

  return {
    caseSummary: `Based on the information provided regarding ${focus.toLowerCase()}${
      focus.length >= 80 ? '…' : ''
    }, this appears to be a patient case requiring medication therapy review. The summary below consolidates the reported history, current pharmacotherapy, and presenting concerns into a single clinical picture for assessment.`,
    clinicalAssessment: [
      'Current medication regimen reviewed against documented indications and renal/hepatic function.',
      'No immediately life-threatening interactions detected, though dose-related cautions apply.',
      'Adherence appears to be a contributing factor to suboptimal therapeutic response.',
      'Monitoring parameters (BP, electrolytes, renal panel) should be re-evaluated at next visit.',
    ],
    drugRelatedProblems: [
      {
        problem:
          'Potential additive QT-prolongation risk from concurrent agents; recommend ECG review.',
        severity: 'High',
      },
      {
        problem:
          'Dose not adjusted for estimated renal function — consider reduction.',
        severity: 'Moderate',
      },
      {
        problem:
          'Therapeutic duplication within the same pharmacologic class identified.',
        severity: 'Moderate',
      },
      {
        problem: 'Missing gastroprotection while on chronic NSAID therapy.',
        severity: 'Low',
      },
    ],
    missingInformation: [
      'Most recent renal function (eGFR / serum creatinine).',
      'Complete allergy and intolerance history.',
      'Over-the-counter and herbal supplement use.',
      'Baseline vital signs and relevant lab trends.',
    ],
    recommendations: [
      'Obtain an ECG to evaluate baseline QTc before continuing interacting agents.',
      'Adjust renally-cleared medication dosing per current eGFR.',
      'Discontinue the duplicate therapy and consolidate to a single agent.',
      'Initiate a proton-pump inhibitor for gastroprotection.',
      'Schedule pharmacist-led follow-up within 2 weeks to assess response.',
    ],
    patientCounseling: [
      'Explain the purpose of each medication and the importance of consistent timing.',
      'Review common and serious side effects, and when to seek urgent care.',
      'Reinforce avoidance of OTC NSAIDs without prior consultation.',
      'Provide a written, simplified medication schedule to support adherence.',
    ],
    confidence: trimmed.length > 120 ? 'High' : trimmed.length > 40 ? 'Moderate' : 'Low',
  }
}

export const SAMPLE_HISTORY: ChatSession[] = [
  {
    id: 'sample-1',
    title: 'Polypharmacy review — 74F CKD',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    messages: [],
  },
  {
    id: 'sample-2',
    title: 'Warfarin & antibiotic interaction',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    messages: [],
  },
  {
    id: 'sample-3',
    title: 'Insulin titration counseling',
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    messages: [],
  },
]
