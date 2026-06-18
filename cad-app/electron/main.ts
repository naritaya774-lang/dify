import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Dify CAD',
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('save-file', async (_event, { defaultName, data }: { defaultName: string; data: string }) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'Dify CAD File', extensions: ['dcad'] }, { name: 'JSON', extensions: ['json'] }],
  })
  if (filePath) {
    fs.writeFileSync(filePath, data, 'utf-8')
    return { success: true, filePath }
  }
  return { success: false }
})

ipcMain.handle('open-file', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Dify CAD File', extensions: ['dcad', 'json'] }],
    properties: ['openFile'],
  })
  if (filePaths.length > 0) {
    const data = fs.readFileSync(filePaths[0], 'utf-8')
    return { success: true, data, filePath: filePaths[0] }
  }
  return { success: false }
})
