export function buildTrayMenuTemplate ({
  overlayKey,
  serverPort,
  sendUserAction,
  showSettings,
  openBrowser,
  openConfigFolder,
  quit
}) {
  return [
    {
      label: 'Settings/League',
      click: showSettings ?? (() => {})
    },
    {
      label: 'Open in Browser',
      click: openBrowser ?? (() => {})
    },
    {
      label: 'Check for updates',
      click: () => {
        sendUserAction?.('check-for-update')
      }
    },
    { type: 'separator' },
    {
      label: 'Open config folder',
      click: openConfigFolder ?? (() => {})
    },
    {
      label: 'Quit',
      click: quit ?? (() => {})
    }
  ]
}
