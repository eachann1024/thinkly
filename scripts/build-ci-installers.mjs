#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [platform, arch] = process.argv.slice(2);
const stage = process.argv.find(arg => arg.startsWith('--stage='))?.slice('--stage='.length) ?? 'all';
const targets = { win: ['nsis'], mac: ['dmg', 'zip'], linux: ['AppImage', 'deb', 'pacman'] };
const host = { win: 'win32', mac: 'darwin', linux: 'linux' };
if (process.platform !== host[platform] || !['x64', 'arm64'].includes(arch) || (platform === 'linux' && arch !== 'x64')) {
  throw new Error('Expected native host and win x64/arm64, mac arm64/x64, or linux x64');
}
if (!['all', 'unpacked', 'installer', 'collect'].includes(stage) || (stage !== 'all' && platform !== 'win')) {
  throw new Error(`Unsupported stage ${stage} for ${platform}`);
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const pack = resolve(root, 'dist-electron/app-pack');
const packaged = resolve(root, 'dist-electron/packaged');
const signDir = resolve(root, 'dist-signpath');
const unpacked = resolve(packaged, platform === 'win' ? (arch === 'arm64' ? 'win-arm64-unpacked' : 'win-unpacked') : 'linux-unpacked');
const appExe = 'Thinkly.exe';

function macNameArgs() {
  if (platform !== 'mac') return [];
  const archSuffix = arch === 'arm64' ? '-arm64' : '';
  return [
    `--config.dmg.artifactName=Thinkly-\${version}${archSuffix}.\${ext}`,
    `--config.mac.artifactName=Thinkly-\${version}${archSuffix}-mac.\${ext}`,
  ];
}

function builder(...args) {
  const command = [
    resolve(root, 'node_modules/electron-builder/out/cli/cli.js'), ...args, ...macNameArgs(), `--${arch}`, '--publish', 'never',
  ];
  const env = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' };
  if (platform !== 'mac') {
    execFileSync(process.execPath, command, { cwd: pack, stdio: 'inherit', env });
    return;
  }
  buildMacInstallers(command, env);
}

const MAC_DMG_ATTEMPTS = 3;

function isBusyDetach(output) {
  return output.includes('Unable to detach device cleanly')
    && /couldn't eject "?(disk\d+)"?[^\n]*Resource busy/.test(output);
}

function busyDetachReason(output) {
  const lines = output.split('\n').map(line => line.trim()).filter(Boolean);
  return lines.findLast(line => line.includes('Unable to detach device cleanly'))
    || lines.findLast(line => line.includes('Resource busy'))
    || 'hdiutil could not eject the DMG (Resource busy)';
}

function diskId(devEntry) {
  return /^\/dev\/(disk\d+)/.exec(devEntry || '')?.[1] || '';
}

function ownDmgBasename() {
  const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
  const archSuffix = arch === 'arm64' ? '-arm64' : '';
  return `Thinkly-${version}${archSuffix}.dmg`;
}

function busyImageDevices(images, output) {
  const named = new Set([...output.matchAll(/couldn't eject "?(disk\d+)"?[^\n]*Resource busy/g)].map(match => match[1]));
  const dmgName = ownDmgBasename();
  const devices = [];
  for (const image of images) {
    if (image['system-image'] === true) continue;
    const entities = Array.isArray(image['system-entities']) ? image['system-entities'] : [];
    const entries = entities
      .map(entity => entity?.['dev-entry'])
      .filter(entry => typeof entry === 'string' && named.has(diskId(entry)));
    if (entries.length === 0) continue;
    const mounts = entities.map(entity => entity?.['mount-point']).filter(mount => typeof mount === 'string' && mount !== '');
    const imagePath = typeof image['image-path'] === 'string' ? image['image-path'] : '';
    const ownPath = imagePath.endsWith(dmgName);
    const ownMount = mounts.length > 0 && mounts.every(mount => mount === '/Volumes/Thinkly');
    if (!ownPath && !ownMount) continue;
    devices.push(...entries);
  }
  return [...new Set(devices)].sort((a, b) => a.length - b.length);
}

function mountedDiskImages() {
  let plist = '';
  try {
    plist = execFileSync('hdiutil', ['info', '-plist'], { encoding: 'utf8' });
  } catch (error) {
    console.error(`hdiutil info failed: ${error.message}`);
    return [];
  }
  try {
    const json = execFileSync('plutil', ['-convert', 'json', '-o', '-', '-'], { encoding: 'utf8', input: plist });
    const parsed = JSON.parse(json);
    return Array.isArray(parsed.images) ? parsed.images : [];
  } catch (error) {
    console.error(`Could not parse hdiutil info: ${error.message}`);
    return [];
  }
}

function detachBusyVolumes(output) {
  const devices = busyImageDevices(mountedDiskImages(), output);
  if (devices.length === 0) {
    console.error('No disk image from this build was still mounted');
    return;
  }
  for (const device of devices) {
    try {
      execFileSync('hdiutil', ['detach', '-force', device], { stdio: 'inherit' });
      console.error(`Force-detached ${device}`);
    } catch (error) {
      console.error(`hdiutil detach -force ${device} failed: ${error.message}`);
    }
  }
}

function removePartialDmg() {
  if (!existsSync(packaged)) return;
  for (const name of readdirSync(packaged)) {
    if (!/\.dmg(?:\.blockmap)?$/.test(name)) continue;
    const file = resolve(packaged, name);
    try {
      if (!statSync(file).isFile()) continue;
      rmSync(file, { force: true });
      console.error(`Removed partial DMG output ${name}`);
    } catch (error) {
      console.error(`Could not remove partial DMG output ${name}: ${error.message}`);
    }
  }
}

function runMacBuilder(command, env) {
  const logDir = mkdtempSync(resolve(tmpdir(), 'thinkly-dmg-'));
  const logFile = resolve(logDir, 'electron-builder.log');
  try {
    const result = spawnSync('bash', [
      '-c', 'set -o pipefail; "$@" 2>&1 | tee "$LOG_FILE"', 'bash', process.execPath, ...command,
    ], { cwd: pack, env: { ...env, LOG_FILE: logFile }, stdio: 'inherit' });
    const output = existsSync(logFile) ? readFileSync(logFile, 'utf8') : '';
    if (result.error) {
      result.error.builderOutput = output;
      throw result.error;
    }
    if (result.status !== 0) {
      const error = new Error(`Command failed: electron-builder --mac (exit ${result.status ?? result.signal})`);
      error.builderOutput = output;
      throw error;
    }
  } finally {
    rmSync(logDir, { recursive: true, force: true });
  }
}

function buildMacInstallers(command, env) {
  let lastOutput = '';
  for (let attempt = 1; attempt <= MAC_DMG_ATTEMPTS; attempt++) {
    try {
      runMacBuilder(command, env);
      return;
    } catch (error) {
      lastOutput = error.builderOutput || '';
      if (!isBusyDetach(lastOutput) || attempt === MAC_DMG_ATTEMPTS) {
        if (!isBusyDetach(lastOutput)) throw error;
        const reason = busyDetachReason(lastOutput);
        throw new Error(`macOS DMG build failed after ${MAC_DMG_ATTEMPTS} attempts: ${reason}`);
      }
      console.error(`macOS DMG detach was Resource busy (attempt ${attempt}/${MAC_DMG_ATTEMPTS}): ${busyDetachReason(lastOutput)}`);
      console.error('Force-detaching this build\'s busy disk image and removing partial DMG output before retry');
      detachBusyVolumes(lastOutput);
      removePartialDmg();
      try {
        execFileSync('sleep', ['2']);
      } catch (sleepError) {
        console.error(`Wait before DMG retry failed: ${sleepError.message}`);
      }
    }
  }
}

function installerFiles() {
  return readdirSync(packaged).filter(name => /\.(exe|dmg|zip|AppImage|deb|pacman)$/.test(name));
}

function copyInto(fromDir, toDir, name) {
  const from = resolve(fromDir, name);
  if (!existsSync(from)) throw new Error(`Missing signed file: ${from}`);
  cpSync(from, resolve(toDir, name));
}

function assertAuthenticode(file) {
  const status = execFileSync('powershell', ['-NoProfile', '-Command',
    `(Get-AuthenticodeSignature -LiteralPath '${file.replaceAll("'", "''")}').Status`], { encoding: 'utf8' }).trim();
  if (status !== 'Valid') throw new Error(`Authenticode signature of ${file} is ${status}`);
}

if (stage === 'unpacked') {
  builder('--win', 'dir');
  rmSync(resolve(signDir, 'app'), { recursive: true, force: true });
  mkdirSync(resolve(signDir, 'app'), { recursive: true });
  cpSync(resolve(unpacked, appExe), resolve(signDir, 'app', appExe));
  console.log(`Unsigned ${appExe} staged for SignPath: ${resolve(signDir, 'app')}`);
  process.exit(0);
}
if (stage === 'installer') {
  copyInto(resolve(signDir, 'app-signed'), unpacked, appExe);
  assertAuthenticode(resolve(unpacked, appExe));
  builder('--win', 'nsis', '--prepackaged', unpacked);
  rmSync(resolve(signDir, 'installer'), { recursive: true, force: true });
  mkdirSync(resolve(signDir, 'installer'), { recursive: true });
  for (const file of installerFiles()) cpSync(resolve(packaged, file), resolve(signDir, 'installer', file));
  console.log(`Unsigned installer staged for SignPath: ${resolve(signDir, 'installer')}`);
  process.exit(0);
}
if (platform === 'mac') {
  for (const name of ['background.png', 'background-2x.png', 'background.tiff', 'authorization-icon.png', '安装指令.command']) {
    const asset = resolve(pack, 'dmg-assets', name);
    if (!existsSync(asset) || !readFileSync(asset).equals(readFileSync(resolve(root, 'electron/installer', name)))) {
      throw new Error(`DMG installation asset missing or outdated: ${name}`);
    }
  }
  if (!(statSync(resolve(pack, 'dmg-assets/安装指令.command')).mode & 0o111)) {
    throw new Error('DMG installation command must be executable');
  }
}
if (stage === 'all') builder(`--${platform}`, ...targets[platform]);
const signed = stage === 'collect';
if (signed) {
  for (const file of installerFiles()) {
    copyInto(resolve(signDir, 'installer-signed'), packaged, file);
    assertAuthenticode(resolve(packaged, file));
  }
  assertAuthenticode(resolve(unpacked, appExe));
}

const builderRequire = createRequire(resolve(root, 'node_modules/electron-builder/package.json'));
const appBuilderRequire = createRequire(builderRequire.resolve('app-builder-lib/package.json'));
const { extractFile } = appBuilderRequire('@electron/asar');
const appAsar = platform === 'mac'
  ? resolve(packaged, arch === 'arm64' ? 'mac-arm64' : 'mac', 'Thinkly.app/Contents/Resources/app.asar')
  : resolve(unpacked, 'resources/app.asar');
if (!extractFile(appAsar, 'icon.png').equals(readFileSync(resolve(root, 'electron/icons/icon.png')))) {
  throw new Error('Packaged BrowserWindow icon does not match the application icon');
}
console.log('Verified packaged BrowserWindow icon in app.asar');

const output = resolve(root, 'dist-desktop/ci');
mkdirSync(output, { recursive: true });
const files = installerFiles();
for (const ext of targets[platform].map(target => target === 'nsis' ? 'exe' : target)) {
  if (!files.some(name => name.endsWith(`.${ext}`))) throw new Error(`Missing ${ext} installer`);
}
for (const file of files) {
  const from = resolve(packaged, file);
  if (!statSync(from).isFile()) throw new Error(`Expected installer file: ${file}`);
  cpSync(from, resolve(output, file));
}
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
writeFileSync(resolve(output, 'BUILD.json'), JSON.stringify({
  commit, version: pkg.version, platform, arch,
  signed: platform === 'mac' ? Boolean(process.env.CSC_LINK) : signed,
  notarized: platform === 'mac' && Boolean(process.env.CSC_LINK && process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID),
  macInstallHelper: platform === 'mac' ? 1 : undefined,
  run: process.env.GITHUB_RUN_ID || null,
  sourceArtifact: `source-${commit}`, files,
}, null, 2) + '\n');
writeFileSync(resolve(output, 'SHA256SUMS.txt'), readdirSync(output).filter(name => name !== 'SHA256SUMS.txt').sort().map(name =>
  `${createHash('sha256').update(readFileSync(resolve(output, name))).digest('hex')}  ${name}`
).join('\n') + '\n');
console.log(`Verified ${files.length} installers: ${output}`);
