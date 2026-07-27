const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('luoguApp', {
  version: '1.0.0'
})