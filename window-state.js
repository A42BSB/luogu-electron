const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const statePath = path.join(app.getPath('userData'), 'window-state.json')

function defaultState() {
  return {
    width: 1280,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false
  }
}

function loadState() {
  try {
    if (fs.existsSync(statePath)) {
      const data = JSON.parse(fs.readFileSync(statePath, 'utf-8'))
      return { ...defaultState(), ...data }
    }
  } catch (_) {}
  return defaultState()
}

function saveState(win) {
  if (!win || win.isDestroyed()) return
  const state = {
    width: win.getBounds().width,
    height: win.getBounds().height,
    x: win.getBounds().x,
    y: win.getBounds().y,
    isMaximized: win.isMaximized()
  }
  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
  } catch (_) {}
}

module.exports = { loadState, saveState }