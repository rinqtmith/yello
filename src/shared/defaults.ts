import type { StorageShape, TimerConfig, TimerState } from './types'

export const DEFAULT_CONFIG: TimerConfig = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  notificationsEnabled: true,
  soundEnabled: true
}

export const createInitialTimerState = (config: TimerConfig = DEFAULT_CONFIG): TimerState => ({
  mode: 'work',
  status: 'idle',
  remainingSeconds: config.workMinutes * 60,
  completedWorkSessions: 0,
  endsAt: null
})

export const DEFAULT_STORAGE: StorageShape = {
  version: 1,
  settings: DEFAULT_CONFIG,
  timerState: createInitialTimerState(DEFAULT_CONFIG),
  history: []
}
