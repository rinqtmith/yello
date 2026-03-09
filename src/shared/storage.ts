import { DEFAULT_CONFIG, DEFAULT_STORAGE, createInitialTimerState } from './defaults'
import type { SessionRecord, StorageShape, TimerConfig, TimerState } from './types'

const asNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback

export const sanitizeConfig = (value: unknown): TimerConfig => {
  const raw = (value ?? {}) as Partial<TimerConfig>

  return {
    workMinutes: Math.max(1, Math.round(asNumber(raw.workMinutes, DEFAULT_CONFIG.workMinutes))),
    shortBreakMinutes: Math.max(1, Math.round(asNumber(raw.shortBreakMinutes, DEFAULT_CONFIG.shortBreakMinutes))),
    longBreakMinutes: Math.max(1, Math.round(asNumber(raw.longBreakMinutes, DEFAULT_CONFIG.longBreakMinutes))),
    longBreakInterval: Math.max(2, Math.round(asNumber(raw.longBreakInterval, DEFAULT_CONFIG.longBreakInterval))),
    autoStartBreaks: asBoolean(raw.autoStartBreaks, DEFAULT_CONFIG.autoStartBreaks),
    autoStartWork: asBoolean(raw.autoStartWork, DEFAULT_CONFIG.autoStartWork),
    notificationsEnabled: asBoolean(raw.notificationsEnabled, DEFAULT_CONFIG.notificationsEnabled),
    soundEnabled: asBoolean(raw.soundEnabled, DEFAULT_CONFIG.soundEnabled)
  }
}

export const sanitizeTimerState = (value: unknown, config: TimerConfig): TimerState => {
  const raw = (value ?? {}) as Partial<TimerState>
  const fallback = createInitialTimerState(config)
  const mode = raw.mode === 'shortBreak' || raw.mode === 'longBreak' || raw.mode === 'work' ? raw.mode : fallback.mode
  const status = raw.status === 'running' || raw.status === 'paused' || raw.status === 'idle' ? raw.status : fallback.status

  return {
    mode,
    status,
    remainingSeconds: Math.max(0, Math.round(asNumber(raw.remainingSeconds, fallback.remainingSeconds))),
    completedWorkSessions: Math.max(0, Math.round(asNumber(raw.completedWorkSessions, fallback.completedWorkSessions))),
    endsAt: raw.endsAt === null ? null : asNumber(raw.endsAt, null as unknown as number)
  }
}

export const sanitizeHistory = (value: unknown): SessionRecord[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    const raw = entry as Partial<SessionRecord>
    if (
      typeof raw.completedAt !== 'string' ||
      (raw.mode !== 'work' && raw.mode !== 'shortBreak' && raw.mode !== 'longBreak') ||
      typeof raw.durationSeconds !== 'number' ||
      !Number.isFinite(raw.durationSeconds)
    ) {
      return []
    }

    return [{
      completedAt: raw.completedAt,
      mode: raw.mode,
      durationSeconds: Math.max(0, Math.round(raw.durationSeconds))
    }]
  })
}

export const sanitizeStorage = (value: unknown): StorageShape => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_STORAGE
  }

  const raw = value as Partial<StorageShape>
  const settings = sanitizeConfig(raw.settings)

  return {
    version: asNumber(raw.version, DEFAULT_STORAGE.version),
    settings,
    timerState: sanitizeTimerState(raw.timerState, settings),
    history: sanitizeHistory(raw.history)
  }
}
