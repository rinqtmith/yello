import { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage } from 'electron'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { AppStore } from './store'
import type { SessionNotificationPayload, SessionRecord, TimerConfig, TimerState, TrayCommand } from '../shared/types'

const store = new AppStore()
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const DEFAULT_TRAY_SVG = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="56" fill="#ffffff"/>
  <circle cx="128" cy="128" r="72" fill="none" stroke="#000000" stroke-width="18"/>
  <path d="M128 72v62l40 24" fill="none" stroke="#000000" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

const loadTrayIconSvg = () => {
  const candidates = [
    join(app.getAppPath(), 'assets', 'tray-icon.template.svg'),
    join(process.cwd(), 'assets', 'tray-icon.template.svg')
  ]

  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, 'utf8')
    } catch {
      // Ignore and try the next candidate.
    }
  }

  return DEFAULT_TRAY_SVG
}

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#0d1321',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.on('close', (event) => {
    if (isQuitting) {
      return
    }

    event.preventDefault()
    window.hide()
  })

  window.on('minimize', () => {
    if (isQuitting) {
      return
    }

    window.hide()
  })

  const devServerUrl = process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL

  if (devServerUrl) {
    await window.loadURL(devServerUrl)
  } else {
    await window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

const sendTrayCommand = (command: TrayCommand) => {
  if (!mainWindow) {
    return
  }

  mainWindow.webContents.send('tray:command', command)
}

const buildTrayMenu = () => {
  const isVisible = mainWindow?.isVisible() ?? false

  return Menu.buildFromTemplate([
    {
      label: isVisible ? 'Hide Yello' : 'Show Yello',
      click: () => toggleWindowVisibility()
    },
    { type: 'separator' },
    {
      label: 'Start/Pause',
      click: () => sendTrayCommand('toggle')
    },
    {
      label: 'Reset',
      click: () => sendTrayCommand('reset')
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
}

const toggleWindowVisibility = () => {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }

  tray?.setContextMenu(buildTrayMenu())
}

const createTray = () => {
  if (tray) {
    return
  }

  const svg = loadTrayIconSvg()
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`)

  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }

  tray = new Tray(icon)
  tray.setToolTip('Yello')
  tray.setContextMenu(buildTrayMenu())
  tray.on('click', () => toggleWindowVisibility())
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
  mainWindow = await createWindow()
  createTray()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createWindow()
      tray?.setContextMenu(buildTrayMenu())
      return
    }

    mainWindow?.show()
    mainWindow?.focus()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (isQuitting && process.platform !== 'darwin') {
    app.quit()
  }
})
