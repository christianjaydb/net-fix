// Core IPv4 helpers + the "correct" baseline network the game is built from.

export function ipToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isValidIp(ip) {
  return typeof ip === "string" && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip.trim()) && ipToInt(ip.trim()) !== null;
}

export function isValidMask(mask) {
  if (!isValidIp(mask)) return false;
  const n = ipToInt(mask);
  // Valid masks are a contiguous run of 1 bits from the left.
  const inverted = (~n) >>> 0;
  return ((inverted + 1) & inverted) === 0;
}

export function networkAddress(ip, mask) {
  const i = ipToInt(ip);
  const m = ipToInt(mask);
  if (i === null || m === null) return null;
  return (i & m) >>> 0;
}

export function sameSubnet(sourceIp, sourceMask, otherIp) {
  const net = networkAddress(sourceIp, sourceMask);
  const m = ipToInt(sourceMask);
  const o = ipToInt(otherIp);
  if (net === null || m === null || o === null) return false;
  return (o & m) >>> 0 === net;
}

const OCTET_POOL = [4, 8, 12, 16, 22, 30, 44, 55, 64, 77, 88, 99, 101, 120, 133, 144, 168, 200];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Builds a fresh, fully-correct baseline network. Randomized each call so every
 * scenario plays out on slightly different addressing. */
export function buildBaseline() {
  const oct = pick(OCTET_POOL);
  const base = `192.168.${oct}`;
  const mask = "255.255.255.0";

  const devices = {
    router: {
      type: "router",
      name: "R1",
      lanIp: `${base}.1`,
      wanIp: "203.0.113.5",
      wanGateway: "203.0.113.1",
      dhcpEnabled: true,
      dhcpRange: `${base}.100 – ${base}.200`,
    },
    switch: {
      type: "switch",
      name: "SW1",
      ports: {
        pcA: { enabled: true, vlan: 10 },
        pcB: { enabled: true, vlan: 10 },
        server: { enabled: true, vlan: 10 },
      },
      trunk: { allowedVlans: [10, 20] },
    },
    pcA: {
      type: "pc",
      name: "PC-A",
      ip: `${base}.130`,
      mask,
      gateway: `${base}.1`,
      dns: `${base}.1`,
      dhcpMode: "static",
    },
    pcB: {
      type: "pc",
      name: "PC-B",
      ip: `${base}.20`,
      mask,
      gateway: `${base}.1`,
      dns: `${base}.1`,
      dhcpMode: "static",
    },
    server: {
      type: "server",
      name: "SRV1",
      ip: `${base}.140`,
      mask,
      gateway: `${base}.1`,
      dns: `${base}.1`,
      dhcpMode: "static",
    },
  };

  return { base, mask, devices };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function getSwitchPort(state, key) {
  return state.devices.switch.ports[key];
}

export const LAN_HOST_KEYS = ["pcA", "pcB", "server"];

export function findDuplicateIpKeys(state) {
  const seen = {};
  const dupes = new Set();
  for (const key of LAN_HOST_KEYS) {
    const ip = state.devices[key].ip;
    if (!ip) continue;
    if (seen[ip]) {
      dupes.add(seen[ip]);
      dupes.add(key);
    } else {
      seen[ip] = key;
    }
  }
  return dupes;
}

export const EXTERNAL_TARGETS = {
  internet: { ip: "203.0.113.10", label: "Public host (203.0.113.10)" },
  website: { ip: "203.0.113.20", host: "www.netfix-status.io", label: "www.netfix-status.io" },
};

export const DEVICE_LABELS = {
  pcA: "PC-A",
  pcB: "PC-B",
  server: "SRV1",
  gateway: "Gateway / R1",
  router: "R1",
  internet: "Internet",
  website: "www.netfix-status.io",
};
