function normalizeVersion (version) {
  return version.replace(/^v/i, '').trim()
}

function parseVersion (version) {
  const [main, pre = ''] = normalizeVersion(version).split('-', 2)
  return {
    main: main.split('.').map(part => Number.parseInt(part, 10) || 0),
    pre
  }
}

export function compareVersions (left, right) {
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

export function deriveUpstreamBaselineVersion (version) {
  const normalized = normalizeVersion(version)
  const [base, revision] = normalized.split('-', 2)
  if (!/^dav\.\d+$/.test(revision ?? '')) return normalized

  // These releases used the next upstream patch number for the fork.
  if (base === '3.29.103') return '3.29.102'
  if (base === '3.29.102') return '3.29.101'
  return base
}

export { normalizeVersion }

export function canAutoDownloadUpdate (platform, env) {
  if (platform === 'win32') return !env.PORTABLE_EXECUTABLE_DIR
  return platform === 'linux' && Boolean(env.APPIMAGE)
}
