const INIT = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

export function createSha1State() {
  return { h: INIT.slice(), tail: Buffer.alloc(0), bytes: 0 };
}

function processBlock(h, block) {
  const w = new Uint32Array(80);
  for (let index = 0; index < 16; index += 1) w[index] = block.readUInt32BE(index * 4);
  for (let index = 16; index < 80; index += 1) {
    const value = (w[index - 3] ^ w[index - 8] ^ w[index - 14] ^ w[index - 16]) >>> 0;
    w[index] = ((value << 1) | (value >>> 31)) >>> 0;
  }
  let a = h[0];
  let b = h[1];
  let c = h[2];
  let d = h[3];
  let e = h[4];
  for (let index = 0; index < 80; index += 1) {
    let f = 0;
    let k = 0;
    if (index < 20) {
      f = (b & c) | (~b & d);
      k = 0x5a827999;
    } else if (index < 40) {
      f = b ^ c ^ d;
      k = 0x6ed9eba1;
    } else if (index < 60) {
      f = (b & c) | (b & d) | (c & d);
      k = 0x8f1bbcdc;
    } else {
      f = b ^ c ^ d;
      k = 0xca62c1d6;
    }
    const temp = ((((a << 5) | (a >>> 27)) >>> 0) + (f >>> 0) + e + k + w[index]) >>> 0;
    e = d;
    d = c;
    c = ((b << 30) | (b >>> 2)) >>> 0;
    b = a;
    a = temp;
  }
  h[0] = (h[0] + a) >>> 0;
  h[1] = (h[1] + b) >>> 0;
  h[2] = (h[2] + c) >>> 0;
  h[3] = (h[3] + d) >>> 0;
  h[4] = (h[4] + e) >>> 0;
}

export function sha1Write(state, data) {
  const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
  let input = state.tail.length ? Buffer.concat([state.tail, chunk]) : chunk;
  state.tail = Buffer.alloc(0);
  const full = input.length - (input.length % 64);
  for (let offset = 0; offset < full; offset += 64) processBlock(state.h, input.subarray(offset, offset + 64));
  if (full < input.length) state.tail = Buffer.from(input.subarray(full));
  state.bytes += chunk.length;
}

export function sha1Context(state) {
  const bits = state.bytes * 8;
  const payload = {
    hash_type: "sha1",
    h0: String(state.h[0] >>> 0),
    h1: String(state.h[1] >>> 0),
    h2: String(state.h[2] >>> 0),
    h3: String(state.h[3] >>> 0),
    h4: String(state.h[4] >>> 0),
    Nl: String(bits >>> 0),
    Nh: String(Math.floor(bits / 4294967296)),
    data: state.tail.length ? state.tail.toString("base64") : "",
    num: String(state.tail.length),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
