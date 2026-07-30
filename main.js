const { app, BrowserWindow, Menu, clipboard, shell, Tray, nativeImage, dialog, globalShortcut, session, net, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const configPath = path.join(app.getPath('userData'), 'config.json')

let tray = null
let searchWin = null

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (_) {}
  return {
    searchOpenMode: 'external' // external | new | current
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (_) {}
}
let config = loadConfig()

function createWindow(url = 'https://www.luogu.com.cn') {
  const statePath = path.join(app.getPath('userData'), 'window-state.json')
  let state = { width: 1280, height: 800 }

  try {
    if (fs.existsSync(statePath)) {
      state = { ...state, ...JSON.parse(fs.readFileSync(statePath, 'utf-8')) }
    }
  } catch (_) {}

  const win = new BrowserWindow({
    ...state,
    title: '洛谷',
    icon: nativeImage.createFromPath(path.join(__dirname, 'luogu.ico')),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (state.isMaximized) win.maximize()
  win.loadURL(url)

  win.webContents.on('did-start-loading', () => win.setTitle('洛谷'))
  win.webContents.on('did-finish-load', () => win.setTitle('洛谷'))

  let offlineShown = false
  win.webContents.on('did-fail-load', () => {
    if (!net.isOnline() && !offlineShown) {
      offlineShown = true
      dialog.showMessageBox(win, {
        type: 'warning',
        title: '网络异常',
        message: '当前处于离线状态，部分功能不可用。',
        buttons: ['确定']
      })
    }
  })

  const onlineTimer = setInterval(() => {
    if (net.isOnline()) {
      if (offlineShown) {
        offlineShown = false
        win.webContents.reload()
        clearInterval(onlineTimer)
      }
    } else {
      offlineShown = true
    }
  }, 5000)

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://www.luogu.com.cn')) {
      createWindow(url)
    } else if (url.startsWith('https://')) {
      win.loadURL(url)
    }
    return { action: 'deny' }
  })

  // 右键菜单
  win.webContents.on('context-menu', (_e, params) => {
    const template = []

    if (params.selectionText && params.selectionText.trim()) {
      template.push(
        { label: '复制', role: 'copy' },
        { type: 'separator' },
        {
          label: `使用百度搜索“${params.selectionText.slice(0, 12)}…”`,
          click: () => shell.openExternal(
            'https://www.baidu.com/s?wd=' + encodeURIComponent(params.selectionText)
          )
        }
      )
    }

    if (params.linkURL && params.linkURL.startsWith('https://www.luogu.com.cn')) {
      template.push(
        { type: 'separator' },
        { label: '在新窗口打开', click: () => createWindow(params.linkURL) },
        { label: '复制链接地址', click: () => clipboard.writeText(params.linkURL) }
      )
    }

    if (params.mediaType === 'image') {
      template.push(
        { type: 'separator' },
        { label: '复制图片', click: () => win.webContents.copyImageAt(params.x, params.y) },
        { label: '复制图片地址', click: () => clipboard.writeText(params.srcURL) }
      )
    }

    if (params.isEditable) {
      template.push(
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { type: 'separator' },
        { label: '全选', role: 'selectAll' }
      )
    }

    if (template.length === 0) {
      template.push(
        { label: '刷新', role: 'reload' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' }
      )
    }

    template.push(
      { type: 'separator' },
      { label: '检查元素', click: () => win.webContents.inspectElement(params.x, params.y) }
    )

    Menu.buildFromTemplate(template).popup({ window: win })
  })

  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      win.hide()
      return
    }
    try {
      fs.writeFileSync(statePath, JSON.stringify({
        width: win.getBounds().width,
        height: win.getBounds().height,
        x: win.getBounds().x,
        y: win.getBounds().y,
        isMaximized: win.isMaximized()
      }, null, 2))
    } catch (_) {}
  })

  return win
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'tray-icon.ico'))
  tray = new Tray(icon)
  tray.setToolTip('洛谷客户端')

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        const w = BrowserWindow.getAllWindows()[0]
        if (w) { w.show(); w.focus() }
      }
    },
    {
      label: '新建窗口',
      click: () => createWindow()
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ]))

  tray.on('double-click', () => {
    const w = BrowserWindow.getAllWindows()[0]
    if (w) { w.show(); w.focus() }
  })
}

function openSearchDialog() {
  if (searchWin) {
    searchWin.focus()
    return
  }

  searchWin = new BrowserWindow({
    width: 420,
    height: 260,
    resizable: false,
    modal: true,
    parent: BrowserWindow.getFocusedWindow(),
    autoHideMenuBar: true, // 关键：无菜单栏
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: nativeImage.createFromPath(path.join(__dirname, 'luogu.ico'))
  })

  searchWin.loadFile('search.html')

  searchWin.on('closed', () => {
    searchWin = null
  })
}

ipcMain.on('show-search-context-menu', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return

  const template = [
    { label: '撤销', role: 'undo' },
    { label: '重做', role: 'redo' },
    { type: 'separator' },
    { label: '剪切', role: 'cut' },
    { label: '复制', role: 'copy' },
    { label: '粘贴', role: 'paste' },
    { type: 'separator' },
    { label: '全选', role: 'selectAll' }
  ]

  const menu = Menu.buildFromTemplate(template)
  menu.popup({ window: win })
})

ipcMain.on('open-search-url', (_, url) => {
  const mode = config.searchOpenMode || 'external'

  if (mode === 'external') {
    shell.openExternal(url)
  }
  else if (mode === 'new') {
    // 1先关搜题窗口（避免它抢焦点）
    if (searchWin) {
      searchWin.close()
      searchWin = null
    }

    // 2创建新窗口
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      title: '洛谷',
      icon: nativeImage.createFromPath(path.join(__dirname, 'luogu.ico')),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      },
      show: false // 关键：先不显示
    })

    // 3页面准备好后再显示 + 强制聚焦
    win.once('ready-to-show', () => {
      win.show()
      win.focus()
      win.moveTop()
    })

    win.loadURL(url)
  }
  else if (mode === 'current') {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.loadURL(url)
      win.show()
      win.focus()
    }
  }
})

ipcMain.on('close-search-window', () => {
  if (searchWin) {
    searchWin.close()
  }
})

function buildMenu() {
  const isPrerelease = app.getVersion().includes('-')

  const template = [
    {
      label: '文件',
      submenu: [
        { label: '新建窗口', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
        { type: 'separator' },
        {
          label: '在默认浏览器中打开当前页面',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: (_, fw) => { if (fw) shell.openExternal(fw.webContents.getURL()) }
        },
        {
          label: '复制当前网址链接',
          accelerator: 'CmdOrCtrl+L',
          click: (_, fw) => { if (fw) clipboard.writeText(fw.webContents.getURL()) }
        },
        { type: 'separator' },
        { label: '关闭窗口', role: 'close' },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            app.isQuitting = true
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        {
          label: '搜题',
          accelerator: 'CmdOrCtrl+K',
          click: () => openSearchDialog()
        },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '刷新', role: 'reload' },
        { label: '强制刷新', role: 'forceReload' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换开发者工具', role: 'toggleDevTools' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于',
              message: '洛谷客户端（非官方）',
              detail: `版本：${app.getVersion()}\n基于 Electron\n仅供学习使用`,
              buttons: ['确定'],
              icon: nativeImage.createFromPath(path.join(__dirname, 'luogu.ico'))
            })
          }
        },
        { type: 'separator' },
        {
          label: '检查更新',
          accelerator: 'Ctrl+Alt+U',
          click: () => {
            const { autoUpdater } = require('electron-updater')
            autoUpdater.autoDownload = false
            autoUpdater.allowPrerelease = isPrerelease
            autoUpdater.checkForUpdates().then(info => {
              if (!info || !info.updateInfo) {
                dialog.showMessageBox({ type: 'info', title: '检查更新', message: '当前已是最新版本', buttons: ['确定'] })
                return
              }
              dialog.showMessageBox({
                type: 'info',
                title: '发现新版本',
                message: `新版本：${info.updateInfo.version}\n是否打开发布页？`,
                buttons: ['取消', '打开']
              }).then(res => {
                if (res.response === 1) shell.openExternal('https://github.com/A42BSB/luogu-electron/releases')
              })
            }).catch(() => {
              dialog.showMessageBox({ type: 'error', title: '检查更新失败', message: '无法连接更新服务器', buttons: ['确定'] })
            })
          }
        },
        ...(!isPrerelease ? [
          { type: 'separator' },
          {
            label: '更新至测试版',
            click: () => {
              const { autoUpdater } = require('electron-updater')
              autoUpdater.autoDownload = false
              autoUpdater.allowPrerelease = true
              autoUpdater.checkForUpdates().then(info => {
                if (!info || !info.updateInfo) {
                  dialog.showMessageBox({ type: 'info', title: '更新至测试版', message: '暂无测试版本', buttons: ['确定'] })
                  return
                }
                dialog.showMessageBox({
                  type: 'info',
                  title: '发现测试版本',
                  message: `测试版本：${info.updateInfo.version}\n是否打开发布页？`,
                  buttons: ['取消', '打开']
                }).then(res => {
                  if (res.response === 1) shell.openExternal('https://github.com/A42BSB/luogu-electron/releases')
                })
              }).catch(() => {
                dialog.showMessageBox({ type: 'error', title: '更新失败', message: '无法连接更新服务器', buttons: ['确定'] })
              })
            }
          }
        ] : []),
        { type: 'separator' },
        {
          label: 'GitHub 仓库',
          click: () => shell.openExternal('https://github.com/A42BSB/luogu-electron')
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  app.isQuitting = false
  buildMenu()
  createTray()

  globalShortcut.register('CmdOrCtrl+R', () => {
    const w = BrowserWindow.getFocusedWindow()
    if (w) w.webContents.reload()
  })

  // Cookie 长期化
  let refreshed = false
  session.defaultSession.webRequest.onResponseStarted(details => {
    if (refreshed || !details.url.includes('luogu.com.cn')) return
    refreshed = true
    session.defaultSession.cookies.get({ domain: '.luogu.com.cn' }).then(cookies => {
      const exp = Date.now() / 1000 + 10 * 365 * 24 * 3600
      cookies.forEach(c => {
        session.defaultSession.cookies.set({
          url: `https://${c.domain.startsWith('.') ? c.domain.slice(1) : c.domain}${c.path}`,
          name: c.name,
          value: c.value,
          expirationDate: exp,
          httpOnly: c.httpOnly,
          secure: c.secure,
          sameSite: c.sameSite
        }).catch(() => {})
      })
    }).catch(() => {})
  })

  createWindow()

  if (app.isPackaged) {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.autoDownload = false
    autoUpdater.allowPrerelease = isPrerelease
    autoUpdater.checkForUpdates().catch(() => {})
    autoUpdater.on('update-available', info => {
      dialog.showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `新版本：${info.updateInfo.version}\n是否打开发布页？`,
        buttons: ['Cancel', '打开']
      }).then(res => {
        if (res.response === 1) shell.openExternal('https://github.com/A42BSB/luogu-electron/releases')
      })
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})