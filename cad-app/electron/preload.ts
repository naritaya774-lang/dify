import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (defaultName: string, data: string) =>
    ipcRenderer.invoke('save-file', { defaultName, data }),
  openFile: () => ipcRenderer.invoke('open-file'),
})
