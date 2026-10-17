const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

// Explicit "-" avoids certificate discovery and never accesses a private key.
// Developer ID builds retain electron-builder's normal signing/notarization flow.
module.exports = async ({ electronPlatformName, appOutDir, packager }) => {
  if (electronPlatformName !== 'darwin') return;
  // dmgbuild supports position-only entries, but electron-builder 26's schema
  // omits that type. Add them after config validation, before DMG construction.
  // These resources remain available to Finder, outside the 960×640 viewport,
  // including when the user enables Show Hidden Files.
  const contents = packager.config.dmg?.contents;
  if (contents) {
    for (const [index, name] of ['.background.png', '.VolumeIcon.icns', '.DS_Store'].entries()) {
      if (!contents.some(item => item.type === 'position' && item.path === name)) {
        contents.push({ type: 'position', path: name, x: 1200 + index * 180, y: 100 });
      }
    }
  }
  if (process.env.CSC_LINK) return;
  const app = join(appOutDir, `${packager.appInfo.productFilename}.app`);
  execFileSync('/usr/bin/codesign', [
    '--force', '--deep', '--sign', '-', '--timestamp=none', app,
  ], { stdio: 'inherit' });
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
};
