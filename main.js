const { app, BrowserWindow, Menu, clipboard, shell, globalShortcut } = require('electron')
const { session } = require('electron')

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '洛谷',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.loadURL(url)

  // 新标签页 → 新 Electron 窗口
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://www.luogu.com.cn')) {
      createWindow(url)
    } else {
      win.loadURL(url) // 非洛谷链接，不跳浏览器
    }
    return { action: 'deny' }
  })

  const { Menu, clipboard, shell } = require('electron')

win.webContents.on('context-menu', (_e, params) => {
  const template = []

  // 有选中文字
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

  // 点在链接上
  if (params.linkURL && params.linkURL.startsWith('https://www.luogu.com.cn')) {
    template.push(
      { type: 'separator' },
      { label: '在新窗口打开', click: () => createWindow(params.linkURL) },
      { label: '复制链接地址', click: () => clipboard.writeText(params.linkURL) }
    )
  }

  // 点在图片上
  if (params.mediaType === 'image') {
    template.push(
      { type: 'separator' },
      { label: '复制图片', click: () => win.webContents.copyImageAt(params.x, params.y) },
      { label: '复制图片地址', click: () => clipboard.writeText(params.srcURL) }
    )
  }

  // 可编辑区域（输入框/文本框）
  if (params.isEditable) {
    template.push(
      { label: '剪切', role: 'cut' },
      { label: '复制', role: 'copy' },
      { label: '粘贴', role: 'paste' },
      { type: 'separator' },
      { label: '全选', role: 'selectAll' }
    )
  }

  // 空白区域也至少给个刷新
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

  const menu = Menu.buildFromTemplate(template)
  menu.popup({ window: win })
})

  return win
}

function buildChineseMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '新建窗口', accelerator: 'CmdOrCtrl+N', click: () => createWindow('https://www.luogu.com.cn') },
        { type: 'separator' },
        { label: '关闭窗口', role: 'close' },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
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
        { label: '关于洛谷客户端', role: 'about' },
        { label: '访问 Electron 官网', click: async () => { const { shell } = require('electron'); await shell.openExternal('https://electronjs.org') } }
      ]
    }
  ]

  // macOS 顶部第一个菜单会变成 App 名，这里按平台兼容一下
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
        { label: '退出', role: 'quit' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  buildChineseMenu()

  // Ctrl+R 刷新当前聚焦窗口
  globalShortcut.register('CommandOrControl+R', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.webContents.reload()
  })

  // 把洛谷域下的 Cookie 过期时间改成 10 年后
session.defaultSession.webRequest.onResponseStarted((details) => {
  if (!details.url.includes('luogu.com.cn')) return
  session.defaultSession.cookies.get({ domain: '.luogu.com.cn' }).then(cookies => {
    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).toISOString()
    cookies.forEach(c => {
      const copy = {
        url: `https://${c.domain.startsWith('.') ? c.domain.slice(1) : c.domain}${c.path}`,
        name: c.name,
        value: c.value,
        expirationDate: Date.now() / 1000 + 10 * 365 * 24 * 3600,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite
      }
      session.defaultSession.cookies.set(copy).catch(() => {})
    })
  }).catch(() => {})
})

  createWindow('https://www.luogu.com.cn')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})