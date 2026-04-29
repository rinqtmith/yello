import type { SessionRecord } from './types'

export interface HistoryRetentionOptions {
  retentionDays: number
  maxEntries: number
}

const getRetentionCutoff = (now: number, retentionDays: number) => {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (retentionDays - 1))
  return start.getTime()
}

export const trimHistory = (
  history: SessionRecord[],
  now: number,
  { retentionDays, maxEntries }: HistoryRetentionOptions
) => {
  const cutoff = getRetentionCutoff(now, retentionDays)

  return history
    .flatMap((entry) => {
      const timestamp = new Date(entry.completedAt).getTime()

      if (!Number.isFinite(timestamp) || timestamp < cutoff) {
        return []
      }

      return [{ entry, timestamp }]
    })
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, maxEntries)
    .map(({ entry }) => entry)
}
