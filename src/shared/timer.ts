import { createInitialTimerState } from './defaults'
import type { SessionRecord, TimerConfig, TimerMode, TimerState } from './types'

export const getDurationSeconds = (config: TimerConfig, mode: TimerMode) => {
  if (mode === 'work') {
    return config.workMinutes * 60
  }

  if (mode === 'longBreak') {
    return config.longBreakMinutes * 60
  }

  return config.shortBreakMinutes * 60
}

export const startTimer = (state: TimerState, now: number): TimerState => ({
  ...state,
  status: 'running',
  endsAt: now + state.remainingSeconds * 1000
})

export const pauseTimer = (state: TimerState, now: number): TimerState => {
  if (state.status !== 'running' || state.endsAt === null) {
    return { ...state, status: 'paused', endsAt: null }
  }

  const remainingSeconds = Math.max(0, Math.ceil((state.endsAt - now) / 1000))

  return {
    ...state,
    status: 'paused',
    remainingSeconds,
    endsAt: null
  }
}

export const resetTimer = (state: TimerState, config: TimerConfig): TimerState => ({
  ...state,
  status: 'idle',
  remainingSeconds: getDurationSeconds(config, state.mode),
  endsAt: null
})

export const syncTimer = (state: TimerState, now: number): TimerState => {
  if (state.status !== 'running' || state.endsAt === null) {
    return state
  }

  return {
    ...state,
    remainingSeconds: Math.max(0, Math.ceil((state.endsAt - now) / 1000))
  }
}

export const getNextMode = (currentMode: TimerMode, completedWorkSessions: number, config: TimerConfig): TimerMode => {
  if (currentMode === 'work') {
    return completedWorkSessions > 0 && completedWorkSessions % config.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
  }

  return 'work'
}

export const completeCurrentMode = (
  state: TimerState,
  config: TimerConfig,
  now: number
): { nextState: TimerState; sessionRecord: SessionRecord; nextMode: TimerMode } => {
  const completedWorkSessions = state.mode === 'work' ? state.completedWorkSessions + 1 : state.completedWorkSessions
  const nextMode = getNextMode(state.mode, completedWorkSessions, config)
  const shouldAutoStart = state.mode === 'work' ? config.autoStartBreaks : config.autoStartWork
  const nextDuration = getDurationSeconds(config, nextMode)

  return {
    nextState: {
      mode: nextMode,
      status: shouldAutoStart ? 'running' : 'paused',
      remainingSeconds: nextDuration,
      completedWorkSessions,
      endsAt: shouldAutoStart ? now + nextDuration * 1000 : null
    },
    sessionRecord: {
      completedAt: new Date(now).toISOString(),
      mode: state.mode,
      durationSeconds: getDurationSeconds(config, state.mode)
    },
    nextMode
  }
}

export const rehydrateTimerState = (state: TimerState, config: TimerConfig, now: number): TimerState => {
  if (state.status !== 'running' || state.endsAt === null) {
    return {
      ...state,
      remainingSeconds: Math.max(0, state.remainingSeconds)
    }
  }

  if (state.endsAt > now) {
    return syncTimer(state, now)
  }

  const { nextState } = completeCurrentMode(state, config, now)

  return {
    ...nextState,
    status: 'paused',
    endsAt: null
  }
}

export const applyMode = (mode: TimerMode, config: TimerConfig, completedWorkSessions = 0): TimerState => ({
  mode,
  status: 'idle',
  remainingSeconds: getDurationSeconds(config, mode),
  completedWorkSessions,
  endsAt: null
})

export const createFreshTimerState = (config: TimerConfig) => createInitialTimerState(config)
