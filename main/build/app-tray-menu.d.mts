export interface TrayMenuDeps {
  overlayKey: string
  serverPort: number
  sendUserAction?: (action: 'check-for-update') => void
  showSettings?: () => void
  openBrowser?: () => void
  openConfigFolder?: () => void
  quit?: () => void
}

export function buildTrayMenuTemplate(deps: TrayMenuDeps): Electron.MenuItemConstructorOptions[]
