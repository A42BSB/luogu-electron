const { app, BrowserWindow, Menu, clipboard, shell, Tray, nativeImage, dialog, globalShortcut, session, net, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// ========================
// 配置 & 状态
// ========================
const StoreModule = require('electron-store')
const Store = StoreModule.default || StoreModule
const store = new Store({
  defaults: {
    useCfMirror: false,
    searchOpenMode: 'external'
  }
})

let tray = null
let searchWin = null
let mainWindow = null

// ========================
// Updater 核心
// ========================
function getAutoUpdater() {
  const { autoUpdater } = require('electron-updater')
  autoUpdater.autoDownload = false
  autoUpdater.allowPrerelease = app.getVersion().includes('-')
  return autoUpdater
}

function applyUpdaterFeed() {
  const autoUpdater = getAutoUpdater()
  const useCf = store.get('useCfMirror')

  if (useCf) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://luogu-electron-cdn.pages.dev'
    })
  } else {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'A42Null',
      repo: 'luogu-electron'
    })
  }
}

function checkForUpdates(silent = false) {
  const autoUpdater = getAutoUpdater()
  applyUpdaterFeed()

  autoUpdater.removeAllListeners('update-available')
  autoUpdater.removeAllListeners('update-not-available')
  autoUpdater.removeAllListeners('error')

  autoUpdater.once('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `新版本：${info.version}\n是否打开发布页？`,
      buttons: ['取消', '打开']
    }).then(res => {
      if (res.response === 1) {
        shell.openExternal('https://github.com/A42Null/luogu-electron/releases')
      }
    })
  })

  if (!silent) {
    autoUpdater.once('update-not-available', () => {
      dialog.showMessageBox({
        type: 'info',
        title: '检查更新',
        message: `当前已是最新版本（${app.getVersion()}）`,
        buttons: ['确定']
      })
    })
  }

  autoUpdater.once('error', () => {
    if (!silent) {
      dialog.showMessageBox({
        type: 'error',
        title: '检查更新失败',
        message: '无法连接更新服务器',
        buttons: ['确定']
      })
    }
  })

  autoUpdater.checkForUpdates().catch(() => {})
}

// ========================
// 窗口管理
// ========================
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
    icon: nativeImage.createFromPath(path.join(__dirname, 'icon.ico')),
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

  // 离线检测
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

  // 窗口打开控制
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'www.luogu.com.cn') {
        createWindow(url)
      } else if (parsedUrl.protocol === 'https:') {
        win.loadURL(url)
      }
    } catch (_) {}
    return { action: 'deny' }
  })

  // 右键菜单
  win.webContents.on('context-menu', (_e, params) => {
    const template = []

    if (params.selectionText) {
      template.push(
        { label: '复制', role: 'copy' },
        { type: 'separator' },
        {
          label: `使用百度搜索"${params.selectionText.slice(0, 12)}…"`,
          click: () => shell.openExternal(
            'https://www.baidu.com/s?wd=' + encodeURIComponent(params.selectionText)
          )
        }
      )
    }

    let isLuoguLink = false
    if (params.linkURL) {
      try {
        const u = new URL(params.linkURL)
        isLuoguLink = u.protocol === 'https:' && u.hostname === 'www.luogu.com.cn'
      } catch (_) {}
    }

    if (isLuoguLink) {
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

  // 第一次创建时赋值给 mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = win
  }

  return win
}

// ========================
// 托盘
// ========================
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'tray-icon.ico'))
  tray = new Tray(icon)
  tray.setToolTip('洛谷客户端')

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          mainWindow = createWindow()
        }
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// ========================
// 搜索窗口
// ========================
function openSearchDialog() {
  if (searchWin && !searchWin.isDestroyed()) {
    searchWin.focus()
    return
  }

  searchWin = new BrowserWindow({
    width: 420,
    height: 260,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: nativeImage.createFromPath(path.join(__dirname, 'icon.ico'))
  })

  searchWin.loadFile('search.html')

  searchWin.on('closed', () => {
    searchWin = null
  })
}

// ========================
// IPC
// ========================
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

  Menu.buildFromTemplate(template).popup({ window: win })
})

ipcMain.on('close-search-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.close()
  } else if (searchWin && !searchWin.isDestroyed()) {
    searchWin.close()
  }
})

ipcMain.on('open-search-url', (event, url) => {
  const mode = store.get('searchOpenMode', 'external')

  if (mode === 'external') {
    shell.openExternal(url)
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) win.close()
  } else if (mode === 'new') {
    if (searchWin && !searchWin.isDestroyed()) searchWin.close()
    createWindow(url)
  } else if (mode === 'current') {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(url)
      mainWindow.show()
      mainWindow.focus()
    } else {
      mainWindow = createWindow(url)
    }
    if (searchWin && !searchWin.isDestroyed()) searchWin.close()
  }
})

// ========================
// 菜单
// ========================
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
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              shell.openExternal(mainWindow.webContents.getURL())
            }
          }
        },
        {
          label: '复制当前网址链接',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              clipboard.writeText(mainWindow.webContents.getURL())
            }
          }
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
          click: openSearchDialog
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
        { label: '刷新', role: 'reload', accelerator: 'F5' },
        { label: '强制刷新', role: 'forceReload', accelerator: 'Ctrl+F5' },
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
              icon: nativeImage.createFromPath(path.join(__dirname, 'icon.ico'))
            })
          }
        },
        { type: 'separator' },
        {
          label: '检查更新',
          accelerator: 'Ctrl+Alt+U',
          click: () => checkForUpdates(false)
        },
        ...(!isPrerelease ? [
          { type: 'separator' },
          {
            label: '更新至测试版',
            click: () => {
              const autoUpdater = getAutoUpdater()
              autoUpdater.autoDownload = false
              autoUpdater.allowPrerelease = true
              applyUpdaterFeed()

              autoUpdater.checkForUpdates().then(info => {
                if (!info || !info.updateInfo) {
                  dialog.showMessageBox({
                    type: 'info',
                    title: '更新至测试版',
                    message: '暂无测试版本',
                    buttons: ['确定']
                  })
                  return
                }
                dialog.showMessageBox({
                  type: 'info',
                  title: '发现测试版本',
                  message: `测试版本：${info.updateInfo.version}\n是否打开发布页？`,
                  buttons: ['取消', '打开']
                }).then(res => {
                  if (res.response === 1) {
                    shell.openExternal('https://github.com/A42Null/luogu-electron/releases')
                  }
                })
              }).catch(() => {
                dialog.showMessageBox({
                  type: 'error',
                  title: '更新失败',
                  message: '无法连接更新服务器',
                  buttons: ['确定']
                })
              })
            }
          }
        ] : []),
        {
          label: '更新使用 Cloudflare 镜像源',
          type: 'checkbox',
          checked: store.get('useCfMirror'),
          click: (menuItem) => {
            store.set('useCfMirror', menuItem.checked)
            applyUpdaterFeed()
          }
        },
        { type: 'separator' },
        {
          label: 'GitHub 仓库',
          click: () => shell.openExternal('https://github.com/A42Null/luogu-electron')
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ========================
// App 生命周期
// ========================
app.whenReady().then(() => {
  app.isQuitting = false
  buildMenu()
  createTray()
  createWindow()
  applyUpdaterFeed()

  // F5 刷新
  globalShortcut.register('F5', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.reload()
    }
  })

  // Cookie 持久化
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

  // 打包后自动检查更新（静默）
  if (app.isPackaged) {
    const autoUpdater = getAutoUpdater()
    autoUpdater.autoDownload = false
    autoUpdater.allowPrerelease = isPrerelease
    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `新版本：${info.version}\n是否打开发布页？`,
        buttons: ['取消', '打开']
      }).then(res => {
        if (res.response === 1) {
          shell.openExternal('https://github.com/A42Null/luogu-electron/releases')
        }
      })
    })
    autoUpdater.checkForUpdates().catch(() => {})
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})