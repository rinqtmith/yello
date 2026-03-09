import { contextBridge, ipcRenderer } from 'electron'
import type { SessionNotificationPayload, SessionRecord, TimerConfig, TimerState, YelloApi } from '../shared/types'

const api: YelloApi = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },
  notifications: {
    notifySessionChange: (payload: SessionNotificationPayload) =>
      ipcRenderer.invoke('notifications:notifySessionChange', payload)
  },
  store: {
    load: () => ipcRenderer.invoke('store:load'),
    saveSettings: (settings: TimerConfig) => ipcRenderer.invoke('store:saveSettings', settings),
    saveTimerState: (timerState: TimerState) => ipcRenderer.invoke('store:saveTimerState', timerState),
    saveHistory: (history: SessionRecord[]) => ipcRenderer.invoke('store:saveHistory', history)
  }
}

contextBridge.exposeInMainWorld('yello', api)
