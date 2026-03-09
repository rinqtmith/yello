export type TimerMode = 'work' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface TimerConfig {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartWork: boolean
  notificationsEnabled: boolean
  soundEnabled: boolean
}

export interface TimerState {
  mode: TimerMode
  status: TimerStatus
  remainingSeconds: number
  completedWorkSessions: number
  endsAt: number | null
}

export interface SessionRecord {
  completedAt: string
  mode: TimerMode
  durationSeconds: number
}

export interface StorageShape {
  version: number
  settings: TimerConfig
  timerState: TimerState
  history: SessionRecord[]
}

export interface SessionNotificationPayload {
  completedMode: TimerMode
  nextMode: TimerMode
}

export interface YelloApi {
  app: {
    getVersion: () => Promise<string>
  }
  notifications: {
    notifySessionChange: (payload: SessionNotificationPayload) => Promise<void>
  }
  store: {
    load: () => Promise<StorageShape>
    saveSettings: (settings: TimerConfig) => Promise<void>
    saveTimerState: (timerState: TimerState) => Promise<void>
    saveHistory: (history: SessionRecord[]) => Promise<void>
  }
}
