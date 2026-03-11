import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { ServerEvents } from './server'
import type { UpdateInfo, UpstreamUpdateInfo } from '../../ipc/types'

const UPSTREAM_RELEASES_URL = 'https://github.com/SnosMe/awakened-poe-trade/releases/latest'
const UPSTREAM_RELEASE_API_URL = 'https://api.github.com/repos/SnosMe/awakened-poe-trade/releases/latest'

interface GitHubRelease {
  tag_name: string
  html_url?: string
}

export class AppUpdater {
  private _checkedAtStartup = false
  private _info: UpdateInfo = { state: 'initial' }
  private _upstreamInfo: UpstreamUpdateInfo = { state: 'initial' }

  public readonly noAutoUpdatesReason:
    Extract<UpdateInfo, { state: 'update-available' }>['noDownloadReason'] = null

  get info () { return this._info }
  set info (info: UpdateInfo) {
    this._info = info
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->CLIENT::updater-state',
      payload: info
    })
  }

  get upstreamInfo () { return this._upstreamInfo }
  set upstreamInfo (info: UpstreamUpdateInfo) {
    this._upstreamInfo = info
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->CLIENT::upstream-version-state',
      payload: info
    })
  }

  constructor (
    private server: ServerEvents
  ) {
    setInterval(this.check, 16 * 60 * 60 * 1000)

    this.server.onEventAnyClient('CLIENT->MAIN::user-action', ({ action }) => {
      if (action === 'check-for-update') {
        this.check()
      } else if (action === 'update-and-restart') {
        autoUpdater.quitAndInstall(false)
      }
    })

    // https://www.electron.build/configuration/nsis.html#portable
    autoUpdater.autoDownload = !process.env.PORTABLE_EXECUTABLE_DIR

    if (!autoUpdater.autoDownload || process.platform === 'darwin') {
      this.noAutoUpdatesReason = 'not-supported'
    } else if (process.argv.includes('--no-updates')) {
      autoUpdater.autoDownload = false
      this.noAutoUpdatesReason = 'disabled-by-flag'
    }

    autoUpdater.on('checking-for-update', () => {
      this.info = { state: 'checking-for-update' }
    })
    autoUpdater.on('update-available', (info: { version: string }) => {
      this.info = { state: 'update-available', version: info.version, noDownloadReason: this.noAutoUpdatesReason }
    })
    autoUpdater.on('update-not-available', () => {
      this.info = { state: 'update-not-available', checkedAt: Date.now() }
    })
    autoUpdater.on('error', () => {
      this.info = { state: 'error', checkedAt: Date.now() }
    })
    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      this.info = { state: 'update-downloaded', version: info.version }
    })
    // on('download-progress') https://github.com/electron-userland/electron-builder/issues/2521
  }

  checkAtStartup () {
    if (!this._checkedAtStartup) {
      this._checkedAtStartup = true
      this.check()
    }
  }

  private check = async () => {
    void this.checkUpstreamVersion()
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // handled by event
    }
  }

  private checkUpstreamVersion = async () => {
    this.upstreamInfo = { state: 'checking' }

    try {
      const release = await fetchLatestUpstreamRelease()
      const checkedAt = Date.now()

      if (compareVersions(release.version, app.getVersion()) > 0) {
        this.upstreamInfo = {
          state: 'update-available',
          checkedAt,
          version: release.version,
          url: release.url
        }
      } else {
        this.upstreamInfo = {
          state: 'update-not-available',
          checkedAt
        }
      }
    } catch {
      this.upstreamInfo = {
        state: 'error',
        checkedAt: Date.now()
      }
    }
  }
}

async function fetchLatestUpstreamRelease () {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(UPSTREAM_RELEASE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'awakened-poe-trade'
      },
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`)
    }

    const release = await response.json() as GitHubRelease
    return {
      version: normalizeVersion(release.tag_name),
      url: release.html_url || UPSTREAM_RELEASES_URL
    }
  } finally {
    clearTimeout(timeout)
  }
}

function compareVersions (left: string, right: string) {
  const leftVersion = parseVersion(left)
  const rightVersion = parseVersion(right)
  const length = Math.max(leftVersion.main.length, rightVersion.main.length)

  for (let idx = 0; idx < length; idx++) {
    const diff = (leftVersion.main[idx] ?? 0) - (rightVersion.main[idx] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }

  if (leftVersion.pre === rightVersion.pre) return 0
  if (!leftVersion.pre.length) return 1
  if (!rightVersion.pre.length) return -1
  return leftVersion.pre.localeCompare(rightVersion.pre)
}

function parseVersion (version: string) {
  const [main, pre = ''] = normalizeVersion(version).split('-', 2)
  return {
    main: main.split('.').map(part => Number.parseInt(part, 10) || 0),
    pre
  }
}

function normalizeVersion (version: string) {
  return version.replace(/^v/i, '').trim()
}
