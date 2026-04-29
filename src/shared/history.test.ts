import { describe, expect, it } from 'vitest'
import { trimHistory } from './history'
import type { SessionRecord } from './types'

describe('history retention', () => {
  it('drops entries outside the retention window and invalid timestamps', () => {
    const now = new Date(2026, 3, 29, 12, 0, 0).getTime()
    const history: SessionRecord[] = [
      { completedAt: new Date(2026, 3, 29, 11, 0, 0).toISOString(), mode: 'work', durationSeconds: 1500 },
      { completedAt: new Date(2026, 3, 2, 11, 0, 0).toISOString(), mode: 'shortBreak', durationSeconds: 300 },
      { completedAt: 'invalid', mode: 'work', durationSeconds: 1500 }
    ]

    const trimmed = trimHistory(history, now, { retentionDays: 7, maxEntries: 10 })

    expect(trimmed).toEqual([history[0]])
  })

  it('keeps the newest retained entries up to the hard cap', () => {
    const now = new Date(2026, 3, 29, 12, 0, 0).getTime()
    const history: SessionRecord[] = [
      { completedAt: new Date(2026, 3, 27, 10, 0, 0).toISOString(), mode: 'work', durationSeconds: 1500 },
      { completedAt: new Date(2026, 3, 29, 10, 0, 0).toISOString(), mode: 'longBreak', durationSeconds: 900 },
      { completedAt: new Date(2026, 3, 28, 10, 0, 0).toISOString(), mode: 'shortBreak', durationSeconds: 300 }
    ]

    const trimmed = trimHistory(history, now, { retentionDays: 30, maxEntries: 2 })

    expect(trimmed).toEqual([history[1], history[2]])
  })
})
