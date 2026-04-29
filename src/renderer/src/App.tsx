import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_CONFIG, createInitialTimerState } from '@shared/defaults'
import { getLocalDateKey, summarizeSessions } from '@shared/analytics'
import { trimHistory } from '@shared/history'
import { rehydrateTimerState } from '@shared/timer'
import type { SessionRecord, StorageShape, TimerConfig, TimerMode, TimerState } from '@shared/types'
import {
  applyMode,
  completeCurrentMode,
  getDurationSeconds,
  getRemainingSeconds,
  pauseTimer,
  resetTimer,
  startTimer
} from '@shared/timer'

const pad = (value: number) => value.toString().padStart(2, '0')

const formatSeconds = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${pad(minutes)}:${pad(seconds)}`
}

const MODES: { label: string; mode: TimerMode }[] = [
  { label: 'Focus', mode: 'work' },
  { label: 'Short break', mode: 'shortBreak' },
  { label: 'Long break', mode: 'longBreak' }
]

const clampSeconds = (value: number, max: number) => Math.min(Math.max(0, value), max)
const HISTORY_RETENTION_DAYS = 30
const HISTORY_MAX_ENTRIES = 1500
const HISTORY_DISPLAY_LIMIT = 50

const playChime = () => {
  const context = new AudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.value = 660
  gain.gain.value = 0.03

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.18)
}

export const App = () => {
  const [settings, setSettings] = useState<TimerConfig>(DEFAULT_CONFIG)
  const [timerState, setTimerState] = useState<TimerState>(createInitialTimerState(DEFAULT_CONFIG))
  const [history, setHistory] = useState<SessionRecord[]>([])
  const [appVersion, setAppVersion] = useState('0.1.0')
  const [hydrated, setHydrated] = useState(false)
  const [displayRemainingSeconds, setDisplayRemainingSeconds] = useState(
    createInitialTimerState(DEFAULT_CONFIG).remainingSeconds
  )
  const [activeTab, setActiveTab] = useState<'timer' | 'analytics'>('timer')
  const [analyticsDayKey, setAnalyticsDayKey] = useState(() => getLocalDateKey(new Date()))
  const timerStateRef = useRef<TimerState>(createInitialTimerState(DEFAULT_CONFIG))
  const settingsRef = useRef<TimerConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      const [storage, version] = await Promise.all([
        window.yello.store.load(),
        window.yello.app.getVersion()
      ] as const)

      if (!mounted) {
        return
      }

      const restoredTimerState = rehydrateTimerState(storage.timerState, storage.settings, Date.now())
      const trimmedHistory = trimHistory(storage.history, Date.now(), {
        retentionDays: HISTORY_RETENTION_DAYS,
        maxEntries: HISTORY_MAX_ENTRIES
      })

      setSettings(storage.settings)
      setTimerState(restoredTimerState)
      setDisplayRemainingSeconds(
        clampSeconds(restoredTimerState.remainingSeconds, getDurationSeconds(storage.settings, restoredTimerState.mode))
      )
      setHistory(trimmedHistory)
      setAppVersion(version)
      setHydrated(true)
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    void window.yello.store.saveSettings(settings)
  }, [hydrated, settings])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    void window.yello.store.saveTimerState(timerState)
  }, [hydrated, timerState])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    void window.yello.store.saveHistory(history)
  }, [hydrated, history])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    timerStateRef.current = timerState
  }, [timerState])

  useEffect(() => {
    if (!hydrated || timerState.status !== 'running') {
      const duration = getDurationSeconds(settings, timerState.mode)
      setDisplayRemainingSeconds(clampSeconds(timerState.remainingSeconds, duration))
      return
    }

    const duration = getDurationSeconds(settings, timerState.mode)
    setDisplayRemainingSeconds(clampSeconds(getRemainingSeconds(timerState, Date.now()), duration))
    const interval = window.setInterval(() => {
      const current = timerStateRef.current
      const total = getDurationSeconds(settings, current.mode)
      setDisplayRemainingSeconds(clampSeconds(getRemainingSeconds(current, Date.now()), total))
    }, 250)

    return () => window.clearInterval(interval)
  }, [hydrated, settings, timerState.status, timerState.mode, timerState.remainingSeconds])

  useEffect(() => {
    if (
      !hydrated ||
      timerState.status !== 'running' ||
      timerState.endsAt === null ||
      displayRemainingSeconds > 0
    ) {
      return
    }

    setTimerState((current) => {
      if (current.status !== 'running' || current.endsAt === null || current.endsAt > Date.now()) {
        return current
      }

      const completion = completeCurrentMode(current, settings, Date.now())

      if (settings.soundEnabled) {
        playChime()
      }

      if (settings.notificationsEnabled) {
        void window.yello.notifications.notifySessionChange({
          completedMode: current.mode,
          nextMode: completion.nextMode
        })
      }

      setHistory((existing) => {
        return trimHistory([completion.sessionRecord, ...existing], Date.now(), {
          retentionDays: HISTORY_RETENTION_DAYS,
          maxEntries: HISTORY_MAX_ENTRIES
        })
      })
      return completion.nextState
    })
  }, [displayRemainingSeconds, hydrated, settings, timerState.endsAt, timerState.status])

  const totalSecondsForMode = getDurationSeconds(settings, timerState.mode)
  const progress = useMemo(() => {
    if (totalSecondsForMode === 0) {
      return 0
    }

    const seconds = timerState.status === 'running' ? displayRemainingSeconds : timerState.remainingSeconds
    return Math.max(0, Math.min(1, seconds / totalSecondsForMode))
  }, [displayRemainingSeconds, timerState.remainingSeconds, timerState.status, totalSecondsForMode])

  const streakLabel = useMemo(() => {
    if (timerState.completedWorkSessions === 0) {
      return 'Fresh slate'
    }

    if (timerState.completedWorkSessions === 1) {
      return '1 focus round done'
    }

    return `${timerState.completedWorkSessions} focus rounds done`
  }, [timerState.completedWorkSessions])

  const toggleTimer = () => {
    setTimerState((current) => {
      const activeSettings = settingsRef.current

      if (current.status === 'running') {
        const pausedTimerState = pauseTimer(current, Date.now())
        setDisplayRemainingSeconds(pausedTimerState.remainingSeconds)
        return pausedTimerState
      }

      const duration = getDurationSeconds(activeSettings, current.mode)
      const nextRemainingSeconds =
        current.status === 'idle' ? duration : clampSeconds(current.remainingSeconds, duration)
      const nextState = startTimer({ ...current, remainingSeconds: nextRemainingSeconds }, Date.now())

      setDisplayRemainingSeconds(nextRemainingSeconds)
      return nextState
    })
  }

  const resetTimerState = () => {
    setTimerState((current) => {
      const resetTimerStateValue = resetTimer(current, settingsRef.current)
      setDisplayRemainingSeconds(resetTimerStateValue.remainingSeconds)
      return resetTimerStateValue
    })
  }

  useEffect(() => {
    if (!window.yello?.tray?.onCommand) {
      return
    }

    const unsubscribe = window.yello.tray.onCommand((command) => {
      if (command === 'toggle') {
        toggleTimer()
        return
      }

      if (command === 'reset') {
        resetTimerState()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleModeChange = (mode: TimerMode) => {
    const updatedTimerState = applyMode(mode, settings, timerState.completedWorkSessions)
    setDisplayRemainingSeconds(updatedTimerState.remainingSeconds)
    setTimerState(updatedTimerState)
  }

  const handleStartPause = () => {
    toggleTimer()
  }

  const handleReset = () => {
    resetTimerState()
  }

  const updateSetting = <K extends keyof TimerConfig>(key: K, value: TimerConfig[K]) => {
    setSettings((current) => {
      const next = { ...current, [key]: value }
      setTimerState((currentTimer) => {
        if (currentTimer.status === 'running') {
          return currentTimer
        }

        const updatedTimerState = applyMode(currentTimer.mode, next, currentTimer.completedWorkSessions)
        setDisplayRemainingSeconds(updatedTimerState.remainingSeconds)
        return updatedTimerState
      })
      return next
    })
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextKey = getLocalDateKey(new Date())
      setAnalyticsDayKey((current) => (current === nextKey ? current : nextKey))
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

  const analytics = useMemo(() => summarizeSessions(history, new Date(), 7), [history, analyticsDayKey])
  const visibleHistory = useMemo(() => history.slice(0, HISTORY_DISPLAY_LIMIT), [history])

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Yello v{appVersion}</span>
          <h1>Build rhythm, not pressure.</h1>
          <p>
            A bright local-first Pomodoro desk companion with notifications, persistence, and
            enough personality to feel alive.
          </p>
          <div className="tab-switch">
            <button
              className={activeTab === 'timer' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('timer')}
            >
              Timer
            </button>
            <button
              className={activeTab === 'analytics' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>
        <div className="pulse-card">
          <div
            className="pulse-ring"
            style={{
              background: `conic-gradient(from 180deg, rgba(255,255,255,0.12) ${Math.max(
                0,
                progress * 360
              )}deg, rgba(255,255,255,0.03) 0deg)`
            }}
          >
            <div className={timerState.status === 'running' ? 'pulse-core running' : 'pulse-core'}>
              <span className="mode-pill">{MODES.find((item) => item.mode === timerState.mode)?.label}</span>
              <div className="time-readout">{formatSeconds(displayRemainingSeconds)}</div>
              <div className={timerState.status === 'running' ? 'status-chip running' : 'status-chip'}>
                {timerState.status === 'running' ? 'Live now' : timerState.status}
              </div>
              <div className="streak">{streakLabel}</div>
            </div>
          </div>
          <div className="controls">
            <button className="primary" onClick={handleStartPause}>
              {timerState.status === 'running' ? 'Pause' : 'Start'}
            </button>
            <button className="secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
          <div className="mode-switches">
            {MODES.map((item) => (
              <button
                key={item.mode}
                className={item.mode === timerState.mode ? 'mode-button active' : 'mode-button'}
                onClick={() => handleModeChange(item.mode)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeTab === 'timer' ? (
        <section className="workspace">
          <article className="panel settings-panel">
            <div className="panel-head">
              <h2>Session setup</h2>
              <span>Stored on this machine</span>
            </div>
            <div className="settings-grid">
              <label>
                Focus
                <input
                  type="number"
                  min={1}
                  value={settings.workMinutes}
                  onChange={(event) => updateSetting('workMinutes', Number(event.target.value))}
                />
              </label>
              <label>
                Short
                <input
                  type="number"
                  min={1}
                  value={settings.shortBreakMinutes}
                  onChange={(event) => updateSetting('shortBreakMinutes', Number(event.target.value))}
                />
              </label>
              <label>
                Long
                <input
                  type="number"
                  min={1}
                  value={settings.longBreakMinutes}
                  onChange={(event) => updateSetting('longBreakMinutes', Number(event.target.value))}
                />
              </label>
              <label>
                Long break every
                <input
                  type="number"
                  min={2}
                  value={settings.longBreakInterval}
                  onChange={(event) => updateSetting('longBreakInterval', Number(event.target.value))}
                />
              </label>
            </div>
            <div className="toggle-list">
              <label>
                <input
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(event) => updateSetting('autoStartBreaks', event.target.checked)}
                />
                Auto-start breaks
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.autoStartWork}
                  onChange={(event) => updateSetting('autoStartWork', event.target.checked)}
                />
                Auto-start focus rounds
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(event) => updateSetting('notificationsEnabled', event.target.checked)}
                />
                Desktop notifications
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(event) => updateSetting('soundEnabled', event.target.checked)}
                />
                Chime on transition
              </label>
            </div>
          </article>

          <article className="panel history-panel">
            <div className="panel-head">
              <h2>Recent rounds</h2>
              <span>
                Showing {visibleHistory.length} of {history.length} stored events
              </span>
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="empty">Finish a session to start building your rhythm log.</p>
              ) : (
                visibleHistory.map((entry) => (
                  <div className="history-item" key={`${entry.completedAt}-${entry.mode}`}>
                    <div>
                      <strong>{MODES.find((item) => item.mode === entry.mode)?.label}</strong>
                      <span>{new Date(entry.completedAt).toLocaleString()}</span>
                    </div>
                    <span>{formatSeconds(entry.durationSeconds)}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : (
        <section className="workspace analytics">
          <article className="panel analytics-panel">
            <div className="panel-head">
              <h2>Analytics</h2>
              <span>{analytics.rangeLabel}</span>
            </div>
            <div className="analytics-grid">
              <div className="metric-card">
                <div className="metric-label">Focus minutes</div>
                <div className="metric-value">{analytics.focusMinutes}</div>
                <div className="metric-meta">Total focus time</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Break minutes</div>
                <div className="metric-value">{analytics.breakMinutes}</div>
                <div className="metric-meta">Recovery time</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Focus sessions</div>
                <div className="metric-value">{analytics.focusSessions}</div>
                <div className="metric-meta">Completed rounds</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Total sessions</div>
                <div className="metric-value">{analytics.totalSessions}</div>
                <div className="metric-meta">Work + breaks</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Active days</div>
                <div className="metric-value">{analytics.activeDays}</div>
                <div className="metric-meta">Days with focus</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Current streak</div>
                <div className="metric-value">{analytics.currentStreak}</div>
                <div className="metric-meta">Consecutive days</div>
              </div>
            </div>
          </article>
        </section>
      )}
    </main>
  )
}
