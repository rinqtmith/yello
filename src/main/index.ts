import { app, BrowserWindow, Notification, ipcMain } from 'electron'
import { join } from 'node:path'
import { AppStore } from './store'
import type { SessionNotificationPayload, SessionRecord, TimerConfig, TimerState } from '../shared/types'

const store = new AppStore()

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#0d1321',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    await window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const registerIpc = () => {
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('notifications:notifySessionChange', (_event, payload: SessionNotificationPayload) => {
    if (!Notification.isSupported()) {
      return
    }

    new Notification({
      title: payload.completedMode === 'work' ? 'Work session complete' : 'Break complete',
      body: payload.nextMode === 'work' ? 'Time to focus again.' : 'Time to take a breather.'
    }).show()
  })
  ipcMain.handle('store:load', () => store.load())
  ipcMain.handle('store:saveSettings', (_event, settings: TimerConfig) => store.saveSettings(settings))
  ipcMain.handle('store:saveTimerState', (_event, timerState: TimerState) => store.saveTimerState(timerState))
  ipcMain.handle('store:saveHistory', (_event, history: SessionRecord[]) => store.saveHistory(history))
}

app.whenReady().then(async () => {
  registerIpc()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
