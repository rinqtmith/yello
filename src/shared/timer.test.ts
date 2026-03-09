import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, createInitialTimerState } from './defaults'
import { completeCurrentMode, getNextMode, rehydrateTimerState, startTimer } from './timer'

describe('timer transitions', () => {
  it('moves from work to short break before the long-break interval', () => {
    expect(getNextMode('work', 1, DEFAULT_CONFIG)).toBe('shortBreak')
  })

  it('moves from work to long break at the configured interval', () => {
    expect(getNextMode('work', 4, DEFAULT_CONFIG)).toBe('longBreak')
  })

  it('restores an in-progress running timer with updated remaining seconds', () => {
    const started = startTimer(createInitialTimerState(DEFAULT_CONFIG), 1_000)
    const rehydrated = rehydrateTimerState(started, DEFAULT_CONFIG, 10_000)

    expect(rehydrated.status).toBe('running')
    expect(rehydrated.remainingSeconds).toBe(1491)
  })

  it('advances expired running sessions to the next mode in paused state', () => {
    const state = {
      ...createInitialTimerState(DEFAULT_CONFIG),
      status: 'running' as const,
      remainingSeconds: 1,
      endsAt: 1_000
    }
    const rehydrated = rehydrateTimerState(state, DEFAULT_CONFIG, 2_000)

    expect(rehydrated.mode).toBe('shortBreak')
    expect(rehydrated.status).toBe('paused')
    expect(rehydrated.remainingSeconds).toBe(DEFAULT_CONFIG.shortBreakMinutes * 60)
  })

  it('records completed work sessions and schedules the next mode', () => {
    const { nextState, sessionRecord } = completeCurrentMode(createInitialTimerState(DEFAULT_CONFIG), DEFAULT_CONFIG, 100)

    expect(sessionRecord.mode).toBe('work')
    expect(nextState.mode).toBe('shortBreak')
    expect(nextState.completedWorkSessions).toBe(1)
  })
})
