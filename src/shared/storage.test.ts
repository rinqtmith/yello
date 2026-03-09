import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './defaults'
import { sanitizeStorage } from './storage'

describe('storage sanitization', () => {
  it('falls back to defaults for invalid input', () => {
    const storage = sanitizeStorage(null)

    expect(storage.settings.workMinutes).toBe(DEFAULT_CONFIG.workMinutes)
    expect(storage.timerState.mode).toBe('work')
    expect(storage.history).toEqual([])
  })

  it('coerces incomplete values into safe persisted state', () => {
    const storage = sanitizeStorage({
      version: 2,
      settings: {
        workMinutes: 30,
        longBreakInterval: 1,
        notificationsEnabled: false
      },
      timerState: {
        mode: 'longBreak',
        status: 'running',
        remainingSeconds: -5,
        completedWorkSessions: 3,
        endsAt: 'oops'
      },
      history: [
        {
          completedAt: '2026-03-09T09:00:00.000Z',
          mode: 'work',
          durationSeconds: 1500
        },
        {
          broken: true
        }
      ]
    })

    expect(storage.version).toBe(2)
    expect(storage.settings.workMinutes).toBe(30)
    expect(storage.settings.longBreakInterval).toBe(2)
    expect(storage.settings.notificationsEnabled).toBe(false)
    expect(storage.timerState.remainingSeconds).toBe(0)
    expect(storage.timerState.endsAt).toBe(null)
    expect(storage.history).toHaveLength(1)
  })
})
