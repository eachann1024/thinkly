const { execFileSync } = require('node:child_process');
const { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

function run(command, args) {
  try {
    execFileSync(command, args, {
      stdio: process.env.GOOSE_DEBUG === '1' ? 'inherit' : 'pipe',
    });
  } catch (error) {
    const detail = error.stderr?.toString() || error.stdout?.toString() || error.message;
    throw new Error(detail.trim() || error.message);
  }
}

function removeSoftwareVulkan(app) {
  const libraries = join(app, 'Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries');
  rmSync(join(libraries, 'libvk_swiftshader.dylib'), { force: true });
  rmSync(join(libraries, 'vk_swiftshader_icd.json'), { force: true });
  const helpers = join(app, 'Contents/Frameworks/Electron Framework.framework/Versions/A/Helpers');
  rmSync(join(helpers, 'chrome_crashpad_handler'), { force: true });
}

function stripChromiumSoundBanks(app) {
  const pakPath = join(
    app,
    'Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/resources.pak',
  );
  if (!existsSync(pakPath)) return;
  const data = readFileSync(pakPath);
  if (data.readUInt32LE(0) !== 5) return;
  const resourceCount = data.readUInt16LE(8);
  const aliasCount = data.readUInt16LE(10);
  let cursor = 12;
  const entries = [];
  for (let index = 0; index < resourceCount + 1; index += 1) {
    entries.push({
      id: data.readUInt16LE(cursor),
      fileOffset: data.readUInt32LE(cursor + 2),
      index,
    });
    cursor += 6;
  }
  const aliases = [];
  for (let index = 0; index < aliasCount; index += 1) {
    aliases.push({
      resourceId: data.readUInt16LE(cursor),
      entryIndex: data.readUInt16LE(cursor + 2),
    });
    cursor += 4;
  }
  const real = entries.slice(0, resourceCount);
  const kept = real.filter((entry) => {
    const end = entries[entry.index + 1].fileOffset;
    return data.subarray(entry.fileOffset, entry.fileOffset + 4).toString('latin1') !== 'fLaC';
  });
  if (kept.length === real.length) return;
  const indexMap = new Map(kept.map((entry, index) => [entry.index, index]));
  const keptAliases = aliases
    .filter((alias) => indexMap.has(alias.entryIndex))
    .map((alias) => ({ resourceId: alias.resourceId, entryIndex: indexMap.get(alias.entryIndex) }));
  const payloads = kept.map((entry) => data.subarray(entry.fileOffset, entries[entry.index + 1].fileOffset));
  const headerSize = 12 + (kept.length + 1) * 6 + keptAliases.length * 4;
  const total = headerSize + payloads.reduce((sum, payload) => sum + payload.length, 0);
  const out = Buffer.allocUnsafe(total);
  out.writeUInt32LE(5, 0);
  out.writeUInt32LE(data.readUInt32LE(4), 4);
  out.writeUInt16LE(kept.length, 8);
  out.writeUInt16LE(keptAliases.length, 10);
  let entryCursor = 12;
  let dataCursor = headerSize;
  for (let index = 0; index < payloads.length; index += 1) {
    out.writeUInt16LE(kept[index].id, entryCursor);
    out.writeUInt32LE(dataCursor, entryCursor + 2);
    entryCursor += 6;
    dataCursor += payloads[index].length;
  }
  out.writeUInt16LE(0, entryCursor);
  out.writeUInt32LE(total, entryCursor + 2);
  entryCursor += 6;
  for (const alias of keptAliases) {
    out.writeUInt16LE(alias.resourceId, entryCursor);
    out.writeUInt16LE(alias.entryIndex, entryCursor + 2);
    entryCursor += 4;
  }
  let writeAt = headerSize;
  for (const payload of payloads) {
    payload.copy(out, writeAt);
    writeAt += payload.length;
  }
  writeFileSync(pakPath, out);
}

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
  run('/usr/bin/plutil', [
    '-replace', 'LSHasLocalizedDisplayName', '-bool', 'true',
    join(app, 'Contents', 'Info.plist'),
  ]);
}

function installMarkdownDocumentTypes(app) {
  const documentTypes = [{
    CFBundleTypeName: 'Markdown',
    CFBundleTypeExtensions: ['md', 'markdown'],
    CFBundleTypeRole: 'Editor',
    CFBundleTypeIconFile: 'icon',
    LSItemContentTypes: ['net.daringfireball.markdown'],
    LSHandlerRank: 'Default',
  }];
  run('/usr/bin/plutil', ['-replace', 'CFBundleDocumentTypes', '-json',
    JSON.stringify(documentTypes), join(app, 'Contents', 'Info.plist')]);
}

module.exports = async ({ electronPlatformName, appOutDir, packager }) => {
  if (electronPlatformName !== 'darwin') return;
  const app = join(appOutDir, `${packager.appInfo.productFilename}.app`);
  removeSoftwareVulkan(app);
  stripChromiumSoundBanks(app);
  run('/usr/bin/swift', [
    join(__dirname, 'set-file-icon.swift'),
    join(__dirname, 'dmg-assets', 'authorization-icon.png'),
    join(__dirname, 'dmg-assets', '安装指令.command'),
  ]);
  installLocalizedDisplayName(join(appOutDir, `${packager.appInfo.productFilename}.app`));
  const contents = packager.config.dmg?.contents;
  if (contents) {
    for (const [index, name] of ['.background.tiff', '.VolumeIcon.icns', '.DS_Store'].entries()) {
      if (!contents.some(item => item.type === 'position' && item.path === name)) {
        contents.push({ type: 'position', path: name, x: 10000 + index * 180, y: 10000 });
      }
    }
  }
  // File associations must be finalized before either ad-hoc or Developer ID signing.
  installMarkdownDocumentTypes(app);
  if (process.env.CSC_LINK) return;
  run('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', '--timestamp=none', app]);
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
};

if (require.main === module) {
  const app = process.argv[2];
  if (!app) throw new Error('usage: node scripts/mac-adhoc-sign.cjs <app>');
  removeSoftwareVulkan(app);
  stripChromiumSoundBanks(app);
}
