const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

// Explicit "-" avoids certificate discovery and never accesses a private key.
// Developer ID builds retain electron-builder's normal signing/notarization flow.
module.exports = async ({ electronPlatformName, appOutDir, packager }) => {
  if (electronPlatformName !== 'darwin' || process.env.CSC_LINK) return;
  const app = join(appOutDir, `${packager.appInfo.productFilename}.app`);
  execFileSync('/usr/bin/codesign', [
    '--force', '--deep', '--sign', '-', '--timestamp=none', app,
  ], { stdio: 'inherit' });
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
};
