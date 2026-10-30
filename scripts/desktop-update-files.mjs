import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export function publicInstallers(version) {
  return [
    `Thinkly-${version}-arm64.dmg`,
    `Thinkly-${version}-x64-setup.exe`,
    `Thinkly-${version}.AppImage`,
  ];
}

export function updateChannelFiles(version) {
  return [
    `Thinkly-${version}-arm64-mac.zip`,
    `Thinkly-${version}-arm64-mac.zip.blockmap`,
    `Thinkly-${version}-arm64.dmg.blockmap`,
    `Thinkly-${version}-x64-setup.exe.blockmap`,
    `Thinkly-${version}.AppImage.blockmap`,
    "latest-mac.yml",
    "latest.yml",
    "latest-linux.yml",
  ];
}

export function publishedPayloads(version) {
  return [...publicInstallers(version), ...updateChannelFiles(version)];
}

export function releaseAssets(version) {
  return [...publishedPayloads(version), "SHA256SUMS.txt"].sort();
}

function platformSpec(platform, version) {
  if (platform === "mac") {
    return {
      yml: "latest-mac.yml",
      payload: `Thinkly-${version}-arm64-mac.zip`,
      blockmapFor: [`Thinkly-${version}-arm64-mac.zip`, `Thinkly-${version}-arm64.dmg`],
    };
  }
  if (platform === "win") {
    return {
      yml: "latest.yml",
      payload: `Thinkly-${version}-x64-setup.exe`,
      blockmapFor: [`Thinkly-${version}-x64-setup.exe`],
    };
  }
  if (platform === "linux") {
    return {
      yml: "latest-linux.yml",
      payload: `Thinkly-${version}.AppImage`,
      blockmapFor: [`Thinkly-${version}.AppImage`],
    };
  }
  throw new Error(`No update channel for ${platform}`);
}

function quoteYaml(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function renderLatestYaml({ version, fileName, sha512, size, blockMapSize, releaseDate }) {
  return [
    `version: ${quoteYaml(version)}`,
    "files:",
    `  - url: ${quoteYaml(fileName)}`,
    `    sha512: ${quoteYaml(sha512)}`,
    `    size: ${size}`,
    `    blockMapSize: ${blockMapSize}`,
    `path: ${quoteYaml(fileName)}`,
    `sha512: ${quoteYaml(sha512)}`,
    `releaseDate: ${quoteYaml(releaseDate)}`,
    "",
  ].join("\n");
}

function appBuilderBin(root) {
  const req = createRequire(resolve(root, "node_modules/electron-builder/package.json"));
  const exported = req("app-builder-bin");
  const candidates = [exported, exported?.default, exported?.appBuilderPath].filter((value) => typeof value === "string");
  const found = candidates.find((value) => existsSync(value));
  if (found) return found;
  throw new Error(`app-builder binary is missing (${candidates.join(", ") || typeof exported})`);
}

function writeBlockMap(root, file) {
  const output = `${file}.blockmap`;
  execFileSync(appBuilderBin(root), ["blockmap", "--input", file, "--output", output], { stdio: "inherit" });
  if (!existsSync(output)) throw new Error(`blockmap was not written for ${file}`);
}

export function writePlatformUpdateFiles({ root, outputDir, platform, version, releaseDate }) {
  const spec = platformSpec(platform, version);
  for (const name of spec.blockmapFor) {
    const file = resolve(outputDir, name);
    if (!existsSync(file)) throw new Error(`Missing update payload: ${name}`);
    writeBlockMap(root, file);
  }
  const payload = resolve(outputDir, spec.payload);
  const blockMap = `${payload}.blockmap`;
  writeFileSync(resolve(outputDir, spec.yml), renderLatestYaml({
    version,
    fileName: spec.payload,
    sha512: createHash("sha512").update(readFileSync(payload)).digest("base64"),
    size: statSync(payload).size,
    blockMapSize: statSync(blockMap).size,
    releaseDate,
  }));
  return [spec.yml, ...spec.blockmapFor.map((name) => `${name}.blockmap`)];
}
