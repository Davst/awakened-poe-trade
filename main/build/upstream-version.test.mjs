import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canAutoDownloadUpdate,
  compareVersions,
  deriveUpstreamBaselineVersion
} from './upstream-version.mjs'

test('deriveUpstreamBaselineVersion keeps upstream release versions unchanged', () => {
  assert.equal(deriveUpstreamBaselineVersion('3.29.102'), '3.29.102')
})

test('deriveUpstreamBaselineVersion maps fork release versions back to their upstream base', () => {
  assert.equal(deriveUpstreamBaselineVersion('3.29.103-dav.1'), '3.29.102')
  assert.equal(deriveUpstreamBaselineVersion('3.29.102-dav.4'), '3.29.101')
})

test('compareVersions uses the derived upstream baseline for advisory checks', () => {
  const currentVersion = deriveUpstreamBaselineVersion('3.29.103-dav.1')
  assert.equal(compareVersions('3.29.102', currentVersion) > 0, false)
  assert.equal(compareVersions('3.29.103', currentVersion) > 0, true)
})
test('a fork release on the same upstream patch is current', () => {
  const baseline = deriveUpstreamBaselineVersion('3.29.108-dav.1')
  assert.equal(compareVersions('3.29.108', baseline), 0)
  assert.ok(compareVersions('3.29.109', baseline) > 0)
})
test('only installed Windows and Linux AppImage builds download automatically', () => {
  assert.equal(canAutoDownloadUpdate('win32', {}), true)
  assert.equal(canAutoDownloadUpdate('win32', { PORTABLE_EXECUTABLE_DIR: 'C:/Games' }), false)
  assert.equal(canAutoDownloadUpdate('darwin', {}), false)
  assert.equal(canAutoDownloadUpdate('linux', { APPIMAGE: '/opt/apt.AppImage' }), true)
  assert.equal(canAutoDownloadUpdate('linux', {}), false)
})
