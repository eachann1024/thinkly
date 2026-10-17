const { execFileSync } = require('node:child_process');
const { cpSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

function installLocalizedDisplayName(app) {
  const src = join(__dirname, 'macos-l10n');
  if (!existsSync(src)) return;
  const resources = join(app, 'Contents', 'Resources');
  const chinese = join(src, 'zh-Hans.lproj', 'InfoPlist.strings');
  const english = join(src, 'en.lproj', 'InfoPlist.strings');
  for (const lang of ['zh-Hans', 'zh_CN', 'zh-Hans-CN']) {
    const dir = join(resources, `${lang}.lproj`);
    mkdirSync(dir, { recursive: true });
    cpSync(chinese, join(dir, 'InfoPlist.strings'));
  }
  const en = join(resources, 'en.lproj');
  mkdirSync(en, { recursive: true });
  cpSync(english, join(en, 'InfoPlist.strings'));
  execFileSync('/usr/bin/plutil', [
    '-replace', 'LSHasLocalizedDisplayName', '-bool', 'true',
    join(app, 'Contents', 'Info.plist'),
  ]);
}

// Explicit "-" avoids certificate discovery and never accesses a private key.
// Developer ID builds retain electron-builder's normal signing/notarization flow.
module.exports = async ({ electronPlatformName, appOutDir, packager }) => {
  if (electronPlatformName !== 'darwin') return;
  installLocalizedDisplayName(join(appOutDir, `${packager.appInfo.productFilename}.app`));
  // dmgbuild supports position-only entries, but electron-builder 26's schema
  // omits that type. Add them after config validation, before DMG construction.
  // Keep these resources beyond common enlarged Finder windows as well as the
  // initial 960×640 viewport, including when Show Hidden Files is enabled.
  const contents = packager.config.dmg?.contents;
  if (contents) {
    for (const [index, name] of ['.background.tiff', '.VolumeIcon.icns', '.DS_Store'].entries()) {
      if (!contents.some(item => item.type === 'position' && item.path === name)) {
        contents.push({ type: 'position', path: name, x: 10000 + index * 180, y: 10000 });
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
