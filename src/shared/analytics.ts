import type { AnalyticsSummary, SessionRecord } from './types'

const MINUTE = 60

export const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date: Date, delta: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + delta)
  return next
}

export const getDateRangeKeys = (now: Date, days: number) => {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = addDays(end, -(days - 1))
  const keys: string[] = []

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    keys.push(getLocalDateKey(cursor))
  }

  return { start, end, keys }
}

export const summarizeSessions = (history: SessionRecord[], now: Date, days = 7): AnalyticsSummary => {
  const { keys } = getDateRangeKeys(now, days)
  const keySet = new Set(keys)
  let focusSeconds = 0
  let breakSeconds = 0
  let focusSessions = 0
  let totalSessions = 0

  const dayTotals = new Map<string, number>()

  for (const record of history) {
    const completedAt = new Date(record.completedAt)
    const key = getLocalDateKey(completedAt)
    if (!keySet.has(key)) {
      continue
    }

    totalSessions += 1
    if (record.mode === 'work') {
      focusSessions += 1
      focusSeconds += record.durationSeconds
      dayTotals.set(key, (dayTotals.get(key) ?? 0) + record.durationSeconds)
    } else {
      breakSeconds += record.durationSeconds
    }
  }

  const activeDays = [...dayTotals.values()].filter((value) => value > 0).length

  let currentStreak = 0
  for (let index = keys.length - 1; index >= 0; index -= 1) {
    const key = keys[index]
    if ((dayTotals.get(key) ?? 0) <= 0) {
      break
    }
    currentStreak += 1
  }

  return {
    rangeLabel: `Last ${days} days`,
    focusMinutes: Math.round(focusSeconds / MINUTE),
    breakMinutes: Math.round(breakSeconds / MINUTE),
    focusSessions,
    totalSessions,
    activeDays,
    currentStreak
  }
}
