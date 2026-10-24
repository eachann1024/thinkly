
function unavailable(method: string): never {
  throw new Error(`node:fs.${method} is not available in the browser`);
}

export function readFileSync(): never {
  return unavailable("readFileSync");
}

export function existsSync(): boolean {
  return false;
}

export function writeFileSync(): never {
  return unavailable("writeFileSync");
}

export default {
  readFileSync,
  existsSync,
  writeFileSync,
};
