import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { DEFAULT_STORAGE } from '../shared/defaults'
import { sanitizeStorage } from '../shared/storage'
import type { SessionRecord, StorageShape, TimerConfig, TimerState } from '../shared/types'

const STORE_PATH = join(app.getPath('userData'), 'yello-store.json')

const ensureStoreDir = async () => {
  await mkdir(dirname(STORE_PATH), { recursive: true })
}

export class AppStore {
  async load(): Promise<StorageShape> {
    await ensureStoreDir()

    try {
      const raw = await readFile(STORE_PATH, 'utf8')
      return sanitizeStorage(JSON.parse(raw))
    } catch {
      await this.write(DEFAULT_STORAGE)
      return DEFAULT_STORAGE
    }
  }

  async saveSettings(settings: TimerConfig) {
    const current = await this.load()
    await this.write({
      ...current,
      settings
    })
  }

  async saveTimerState(timerState: TimerState) {
    const current = await this.load()
    await this.write({
      ...current,
      timerState
    })
  }

  async saveHistory(history: SessionRecord[]) {
    const current = await this.load()
    await this.write({
      ...current,
      history
    })
  }

  private async write(storage: StorageShape) {
    await ensureStoreDir()
    await writeFile(STORE_PATH, JSON.stringify(storage, null, 2), 'utf8')
  }
}
