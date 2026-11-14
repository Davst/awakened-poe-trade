import test from 'node:test'
import assert from 'node:assert/strict'

import { buildTrayMenuTemplate } from './app-tray-menu.mjs'

test('buildTrayMenuTemplate includes a check for updates action', () => {
  let receivedAction = null

  const template = buildTrayMenuTemplate({
    overlayKey: 'Shift + Space',
    serverPort: 9001,
    sendUserAction: (action) => {
      receivedAction = action
    },
    showSettings: () => {},
    openBrowser: () => {},
    openConfigFolder: () => {},
    quit: () => {}
  })

  const entry = template.find(item => item.label === 'Check for updates')
  assert.ok(entry)
  entry.click()
  assert.equal(receivedAction, 'check-for-update')
})
