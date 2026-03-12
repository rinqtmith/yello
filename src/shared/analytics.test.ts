import { describe, expect, it } from 'vitest'
import { summarizeSessions } from './analytics'
import type { SessionRecord } from './types'

describe('analytics summary', () => {
  it('summarizes focus and break totals inside the range', () => {
    const now = new Date(2026, 2, 12, 12, 0, 0)
    const history: SessionRecord[] = [
      { completedAt: new Date(2026, 2, 12, 8, 0, 0).toISOString(), mode: 'work', durationSeconds: 1500 },
      { completedAt: new Date(2026, 2, 12, 9, 0, 0).toISOString(), mode: 'shortBreak', durationSeconds: 300 },
      { completedAt: new Date(2026, 2, 10, 14, 0, 0).toISOString(), mode: 'work', durationSeconds: 1500 },
      { completedAt: new Date(2026, 1, 28, 14, 0, 0).toISOString(), mode: 'work', durationSeconds: 1500 }
    ]

    const summary = summarizeSessions(history, now, 7)

    expect(summary.focusMinutes).toBe(50)
    expect(summary.breakMinutes).toBe(5)
    expect(summary.focusSessions).toBe(2)
    expect(summary.totalSessions).toBe(3)
  })

  it('counts active days and current streak based on focus sessions', () => {
    const now = new Date(2026, 2, 12, 7, 0, 0)
    const history: SessionRecord[] = [
      { completedAt: new Date(2026, 2, 12, 6, 0, 0).toISOString(), mode: 'work', durationSeconds: 1500 },
      { completedAt: new Date(2026, 2, 11, 6, 0, 0).toISOString(), mode: 'work', durationSeconds: 1500 },
      { completedAt: new Date(2026, 2, 9, 6, 0, 0).toISOString(), mode: 'work', durationSeconds: 1500 }
    ]

    const summary = summarizeSessions(history, now, 7)

    expect(summary.activeDays).toBe(3)
    expect(summary.currentStreak).toBe(2)
  })
})
