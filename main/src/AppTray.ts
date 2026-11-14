import path from 'path'
import { app, Tray, Menu, shell, nativeImage, dialog } from 'electron'
import type { ServerEvents } from './server'
import { buildTrayMenuTemplate } from '../build/app-tray-menu.mjs'

export class AppTray {
  public overlayKey = 'Shift + Space'
  private tray: Tray
  serverPort = 0

  constructor (
    server: ServerEvents,
    private readonly checkForUpdates: () => void
  ) {
    let trayImage = nativeImage.createFromPath(
      path.join(
        __dirname,
        process.env.STATIC!,
        process.platform === "win32" ? "icon.ico" : "icon.png"
      )
    )

    if (process.platform === 'darwin') {
      // Mac image size needs to be smaller, or else it looks huge. Size
      // guideline is from https://iconhandbook.co.uk/reference/chart/osx/
      trayImage = trayImage.resize({ width: 22, height: 22 })
    }

    this.tray = new Tray(trayImage)
    this.tray.setToolTip(`Awakened PoE Trade v${app.getVersion()}`)
    this.rebuildMenu()

    server.onEventAnyClient('CLIENT->MAIN::user-action', ({ action }) => {
      if (action === 'quit') {
        app.quit()
      }
    })
  }

  rebuildMenu () {
    const contextMenu = Menu.buildFromTemplate(buildTrayMenuTemplate({
      overlayKey: this.overlayKey,
      serverPort: this.serverPort,
      sendUserAction: (action) => {
        if (action === 'check-for-update') {
          this.checkForUpdates()
        }
      },
      showSettings: () => {
        dialog.showMessageBox({
          title: 'Settings',
          message: `Open Path of Exile and press "${this.overlayKey}". Click on the button with cog icon there.`
        })
      },
      openBrowser: () => {
        shell.openExternal(`http://localhost:${this.serverPort}`)
      },
      openConfigFolder: () => {
        shell.openPath(path.join(app.getPath('userData'), 'apt-data'))
      },
      quit: () => {
        app.quit()
      }
    }))

    this.tray.setContextMenu(contextMenu)
  }
}
