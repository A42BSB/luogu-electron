const { app, BrowserWindow, Menu, clipboard, shell, Tray, nativeImage, dialog, globalShortcut, session, net } = require('electron')
const path = require('path')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')
const { checkForUpdates, switchToPrerelease } = require('./updater')
let tray = null

function createWindow(url = 'https://www.luogu.com.cn') {
  const checkOnline = () => net.isOnline()
  const statePath = path.join(app.getPath('userData'), 'window-state.json')
  let state = {
    width: 1280,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false
  }
  try {
    if (fs.existsSync(statePath)) {
      state = { ...state, ...JSON.parse(fs.readFileSync(statePath, 'utf-8')) }
    }
  } catch (_) {}

  const appIcon = nativeImage.createFromPath(path.join(__dirname, 'luogu.ico'))
  const win = new BrowserWindow({
    ...state,
    title: '洛谷 - 加载中…',
    icon: appIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (state.isMaximized) win.maximize()
  win.loadURL(url)

  win.webContents.on('did-start-loading', () => win.setTitle('洛谷 - 加载中…'))
  win.webContents.on('did-finish-load', () => win.setTitle('洛谷'))

  let offlineShown = false
  win.webContents.on('did-fail-load', () => {
    if (!checkOnline() && !offlineShown) {
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
    if (checkOnline()) {
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
  const trayIcon = nativeImage.createFromPath(
    path.join(__dirname, 'tray-icon.ico')
  )
  tray = new Tray(trayIcon)
  tray.setToolTip('洛谷客户端')
  const trayMenu = Menu.buildFromTemplate([
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
  ])
  tray.setContextMenu(trayMenu)
  tray.on('double-click', () => {
    const w = BrowserWindow.getAllWindows()[0]
    if (w) { w.show(); w.focus() }
  })
}

function buildChineseMenu() {
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
          click: (item, focusedWindow) => {
            if (focusedWindow) shell.openExternal(focusedWindow.webContents.getURL())
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
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
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
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '最大化', role: 'zoom' },
        { type: 'separator' },
        { label: '关闭', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于洛谷客户端（非官方版）',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于洛谷（非官方版）',
              message: '洛谷桌面客户端',
              detail: `版本：${app.getVersion()}\n\n你正在使用测试版本，稳定性不佳，出现bug请前往GitHub仓库提交Issue！\n基于 Electron 43\n\n本项目为非官方客户端，仅供学习使用。`,
              buttons: ['确定'],
              icon: nativeImage.createFromPath(path.join(__dirname, 'luogu.ico'))
            })
          }
        },
        { label: '访问 Electron 官网', click: async () => shell.openExternal('https://electronjs.org') },
        { type: 'separator' },
        {
          label: '访问本应用的 GitHub 仓库页面',
          click: () => shell.openExternal('https://github.com/A42BSB/luogu-electron')
        },
        { type: 'separator' },
        {
          label: '检查更新',
          accelerator: 'Ctrl+Alt+U',
          click: () => checkForUpdates(isPrerelease)
        },
        // ✅ 仅稳定版显示
        ...(!isPrerelease ? [
          { type: 'separator' },
          {
            label: '更新至测试版',
            click: () => switchToPrerelease()
          }
        ] : []),
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            app.isQuitting = true
            app.quit()
          }
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: '洛谷',
      submenu: [
        { label: '关于', role: 'about' },
        { type: 'separator' },
        { label: '隐藏', role: 'hide' },
        { label: '隐藏其他', role: 'hideOthers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            app.isQuitting = true
            app.quit()
          }
        }
      ]
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  app.isQuitting = false
  buildChineseMenu()
  createTray()

  globalShortcut.register('CommandOrControl+R', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.webContents.reload()
  })

  // Cookie 长期化
  let cookieRefreshed = false
  session.defaultSession.webRequest.onResponseStarted((details) => {
    if (cookieRefreshed || !details.url.includes('luogu.com.cn')) return
    cookieRefreshed = true
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

  createWindow('https://www.luogu.com.cn')

  // ✅ 启动时静默检查（按当前通道）
  if (app.isPackaged) {
    autoUpdater.autoDownload = false
    autoUpdater.allowPrerelease = app.getVersion().includes('-')
    autoUpdater.checkForUpdates().catch(() => {})

    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `检测到新版本 ${info.version}\n是否打开发布页？`,
        buttons: ['取消', '打开']
      }).then(({ response }) => {
        if (response === 1) {
          shell.openExternal('https://github.com/A42BSB/luogu-electron/releases')
        }
      })
    })

    autoUpdater.on('error', () => {})
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})