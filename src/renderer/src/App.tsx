import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_CONFIG, createInitialTimerState } from '@shared/defaults'
import { rehydrateTimerState } from '@shared/timer'
import type { SessionRecord, StorageShape, TimerConfig, TimerMode, TimerState } from '@shared/types'
import { applyMode, completeCurrentMode, getDurationSeconds, pauseTimer, resetTimer, startTimer, syncTimer } from '@shared/timer'

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

      setSettings(storage.settings)
      setTimerState(rehydrateTimerState(storage.timerState, storage.settings, Date.now()))
      setHistory(storage.history)
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
    if (!hydrated || timerState.status !== 'running') {
      return
    }

    const interval = window.setInterval(() => {
      setTimerState((current) => {
        const synced = syncTimer(current, Date.now())

        if (synced.remainingSeconds > 0) {
          return synced
        }

        const completion = completeCurrentMode(synced, settings, Date.now())

        if (settings.soundEnabled) {
          playChime()
        }

        if (settings.notificationsEnabled) {
          void window.yello.notifications.notifySessionChange({
            completedMode: synced.mode,
            nextMode: completion.nextMode
          })
        }

        setHistory((existing) => [completion.sessionRecord, ...existing].slice(0, 30))
        return completion.nextState
      })
    }, 250)

    return () => window.clearInterval(interval)
  }, [hydrated, settings, timerState.status])

  const totalSecondsForMode = getDurationSeconds(settings, timerState.mode)
  const progress = totalSecondsForMode === 0 ? 0 : timerState.remainingSeconds / totalSecondsForMode

  const streakLabel = useMemo(() => {
    if (timerState.completedWorkSessions === 0) {
      return 'Fresh slate'
    }

    if (timerState.completedWorkSessions === 1) {
      return '1 focus round done'
    }

    return `${timerState.completedWorkSessions} focus rounds done`
  }, [timerState.completedWorkSessions])

  const handleModeChange = (mode: TimerMode) => {
    setTimerState(applyMode(mode, settings, timerState.completedWorkSessions))
  }

  const handleStartPause = () => {
    setTimerState((current) => {
      if (current.status === 'running') {
        return pauseTimer(current, Date.now())
      }

      return startTimer(current, Date.now())
    })
  }

  const handleReset = () => {
    setTimerState((current) => resetTimer(current, settings))
  }

  const updateSetting = <K extends keyof TimerConfig>(key: K, value: TimerConfig[K]) => {
    setSettings((current) => {
      const next = { ...current, [key]: value }
      setTimerState((currentTimer) => {
        if (currentTimer.status === 'running') {
          return currentTimer
        }

        return applyMode(currentTimer.mode, next, currentTimer.completedWorkSessions)
      })
      return next
    })
  }

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
            <div className="pulse-core">
              <span className="mode-pill">{MODES.find((item) => item.mode === timerState.mode)?.label}</span>
              <div className="time-readout">{formatSeconds(timerState.remainingSeconds)}</div>
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
            <span>{history.length} stored events</span>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <p className="empty">Finish a session to start building your rhythm log.</p>
            ) : (
              history.map((entry) => (
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
    </main>
  )
}
