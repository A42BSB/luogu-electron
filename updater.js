const { autoUpdater } = require('electron-updater')
const { dialog, app } = require('electron')

autoUpdater.autoDownload = false

/**
 * 检查更新（可指定是否允许 Pre-release）
 * @param {boolean} allowPrerelease
 */
function checkForUpdates(allowPrerelease = false) {
  autoUpdater.allowPrerelease = allowPrerelease

  autoUpdater.checkForUpdates()
    .then(info => {
      if (!info || !info.updateInfo) {
        dialog.showMessageBox({
          type: 'info',
          title: '检查更新',
          message: '当前已是最新版本。',
          buttons: ['确定']
        })
        return
      }

      dialog.showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `新版本：${info.updateInfo.version}\n是否打开发布页？`,
        buttons: ['取消', '打开']
      }).then(({ response }) => {
        if (response === 1) {
          require('electron').shell.openExternal(
            'https://github.com/A42Null/luogu-electron/releases'
          )
        }
      })
    })
    .catch(err => {
      dialog.showMessageBox({
        type: 'error',
        title: '检查更新失败',
        message: err.message,
        buttons: ['确定']
      })
    })
}

/**
 * 稳定版 → 测试版
 */
function switchToPrerelease() {
  checkForUpdates(true)
}

module.exports = {
  checkForUpdates,
  switchToPrerelease
}