import { buildBaseline, cloneState, findDuplicateIpKeys, sameSubnet, isValidIp } from "./network";

const CORRECT_WAN_GATEWAY = "203.0.113.1";
const WRONG_WAN_GATEWAY = "203.0.113.254";

function withBase(state, fn) {
  const s = cloneState(state);
  fn(s.devices);
  return s;
}

const TEMPLATES = [
  // ---------------------------------------------------------------- EASY
  {
    id: "wrong-mask",
    difficulty: "Easy",
    topic: "Subnet Masks",
    title: "PC-A has dropped off the network",
    inject: (base) =>
      withBase(base, (d) => {
        d.pcA.mask = "255.255.255.128";
      }),
    symptom: (s) => `${s.devices.pcA.name} can't reach the gateway, the internet, or ${s.devices.pcB.name} — but oddly it can still ping ${s.devices.server.name}.`,
    clues: (s) => [
      `${s.devices.pcA.name}'s IPv4 address is ${s.devices.pcA.ip}, on the same 255.255.255.0 LAN as everything else.`,
      `Run ipconfig on ${s.devices.pcA.name} and compare its subnet mask against a known-good host like ${s.devices.pcB.name}.`,
      "A subnet mask that's too restrictive will make the host think part of its own LAN is a remote network.",
    ],
    isFixed: (s) => s.devices.pcA.mask === "255.255.255.0",
    explanation: (s) =>
      `${s.devices.pcA.name} was set to a /25 mask (255.255.255.128) instead of the LAN's /24 (255.255.255.0). Because ${s.devices.pcA.ip} falls in the upper half of the /24, the wrong mask made the gateway (${s.devices.router.lanIp}) look like it was on a different network entirely, so every off-segment request silently failed. Matching the mask to the rest of the LAN restored normal routing decisions.`,
    focus: "pcA",
  },
  {
    id: "wrong-gateway",
    difficulty: "Easy",
    topic: "Default Gateway",
    title: "PC-B can see the LAN but not the internet",
    inject: (base) =>
      withBase(base, (d) => {
        const parts = d.router.lanIp.split(".");
        parts[3] = "254";
        d.pcB.gateway = parts.join(".");
      }),
    symptom: (s) => `${s.devices.pcB.name} can ping ${s.devices.pcA.name} and ${s.devices.server.name} fine, but every trace toward the internet dies immediately.`,
    clues: (s) => [
      `${s.devices.pcB.name} reaches other local hosts without issue — Layer 2 and addressing on this segment look healthy.`,
      `Check ${s.devices.pcB.name}'s default gateway against R1's actual LAN address (${s.devices.router.lanIp}).`,
      "tracert to the internet from PC-B and see how far the first hop gets.",
    ],
    isFixed: (s) => s.devices.pcB.gateway === s.devices.router.lanIp,
    explanation: (s) =>
      `${s.devices.pcB.name}'s default gateway pointed at ${s.devices.router.lanIp.slice(0, s.devices.router.lanIp.lastIndexOf(".") + 1)}254, an address nothing was listening on. Local traffic worked because it never left the switch, but anything destined off-subnet had nowhere to go. Pointing the gateway back at R1's real LAN interface (${s.devices.router.lanIp}) restored off-network routing.`,
    focus: "pcB",
  },
  {
    id: "port-disabled",
    difficulty: "Easy",
    topic: "Switch Ports",
    title: "The file server has gone silent",
    inject: (base) =>
      withBase(base, (d) => {
        d.switch.ports.server.enabled = false;
      }),
    symptom: (s) => `Nobody can reach ${s.devices.server.name} — not ${s.devices.pcA.name}, not ${s.devices.pcB.name}, not even R1.`,
    clues: (s) => [
      `${s.devices.server.name}'s own IP configuration looks completely normal.`,
      "The problem is total and symmetric — every host loses the server at once, which points at the switch rather than any one host's settings.",
      "Open SW1 and check the port status for the server's connection.",
    ],
    isFixed: (s) => s.devices.switch.ports.server.enabled === true,
    explanation: () =>
      `The switchport connected to the server had been administratively shut down. With the port disabled, the physical link never comes up — the server's own configuration was never the issue. Re-enabling the port restored connectivity for every other device on the LAN.`,
    focus: "switch",
  },

  // -------------------------------------------------------------- MEDIUM
  {
    id: "duplicate-ip",
    difficulty: "Medium",
    topic: "IP Addressing",
    title: "Two hosts, one address",
    inject: (base) =>
      withBase(base, (d) => {
        d.pcB.ip = d.server.ip;
      }),
    symptom: (s) => `${s.devices.pcB.name} and ${s.devices.server.name} are both flaky — pings to either one intermittently fail with unreachable errors.`,
    clues: (s) => [
      `Run ipconfig on both ${s.devices.pcB.name} and ${s.devices.server.name} and compare their IPv4 addresses closely.`,
      "Intermittent, host-specific failures on an otherwise healthy LAN are a classic sign of an address conflict, not a routing problem.",
      `The subnet has plenty of free addresses above ${s.devices.pcA.ip.slice(0, s.devices.pcA.ip.lastIndexOf(".") + 1)}100.`,
    ],
    isFixed: (s) => {
      const dupes = findDuplicateIpKeys(s);
      if (dupes.size > 0) return false;
      const ip = s.devices.pcB.ip;
      if (!isValidIp(ip)) return false;
      if (!sameSubnet(s.devices.router.lanIp, s.devices.pcB.mask, ip)) return false;
      if (ip === s.devices.router.lanIp) return false;
      return true;
    },
    explanation: (s) => `${s.devices.pcB.name} had been assigned ${s.devices.server.name}'s exact address (${s.devices.server.ip}). Both hosts answered ARP requests for that IP, so replies came back from whichever device won the race — the classic symptom of a duplicate address. Giving ${s.devices.pcB.name} its own unique address on the same subnet cleared the conflict.`,
    focus: "pcB",
  },
  {
    id: "dns-misconfig",
    difficulty: "Medium",
    topic: "DNS",
    title: "The internet works, until you use a name",
    inject: (base) =>
      withBase(base, (d) => {
        d.pcA.dns = "0.0.0.0";
      }),
    symptom: (s) => `${s.devices.pcA.name} can ping the internet by address just fine, but browsing by hostname fails outright.`,
    clues: (s) => [
      `ping the raw internet address from ${s.devices.pcA.name} — routing and the gateway are clearly fine.`,
      `Now try tracert to ${"www.netfix-status.io"}. Where does it stop?`,
      `Check ${s.devices.pcA.name}'s DNS server setting — R1 (${s.devices.router.lanIp}) normally handles name resolution for this LAN.`,
    ],
    isFixed: (s) => s.devices.pcA.dns === s.devices.router.lanIp,
    explanation: (s) => `${s.devices.pcA.name}'s DNS server was set to ${"0.0.0.0"}, so hostname lookups had nowhere to go even though raw IP routing was completely healthy. Pointing DNS back at R1 (${s.devices.router.lanIp}) restored name resolution.`,
    focus: "pcA",
  },
  {
    id: "dhcp-fail",
    difficulty: "Medium",
    topic: "DHCP",
    title: "PC-B never got an address",
    inject: (base) =>
      withBase(base, (d) => {
        d.router.dhcpEnabled = false;
        d.pcB.dhcpMode = "dhcp";
        d.pcB.ip = "169.254.83.14";
        d.pcB.mask = "255.255.0.0";
        d.pcB.gateway = "";
        d.pcB.dns = "";
      }),
    symptom: () => `PC-B can't reach anything — local or remote.`,
    clues: (s) => [
      `ipconfig on ${s.devices.pcB.name} shows a 169.254.x.x address — that's a Windows self-assigned (APIPA) address, not a real DHCP lease.`,
      "An APIPA address means the host tried DHCP and got no reply in time.",
      "Check whether R1's DHCP service is actually running.",
    ],
    isFixed: (s) => s.devices.router.dhcpEnabled === true,
    explanation: (s) => `R1's DHCP service had been disabled, so ${s.devices.pcB.name} timed out waiting for a lease and fell back to a self-assigned 169.254.x.x address — useless outside its own segment. Turning DHCP back on at R1 let the host pull a real lease from the LAN's pool.`,
    focus: "router",
  },

  // ---------------------------------------------------------------- HARD
  {
    id: "vlan-mismatch",
    difficulty: "Hard",
    topic: "VLANs",
    title: "PC-A and PC-B can't see each other",
    inject: (base) =>
      withBase(base, (d) => {
        d.switch.ports.pcA.vlan = 20;
      }),
    symptom: (s) => `${s.devices.pcA.name} and ${s.devices.pcB.name} sit on the same subnet and the same switch, yet can't ping each other.`,
    clues: (s) => [
      "Identical IP configuration on both PCs rules out addressing as the cause.",
      "Both hosts are on the same physical switch, so a cabling or port-down issue would be unusual here — this feels like a segmentation problem.",
      "Open SW1 and compare the VLAN assigned to each access port.",
    ],
    isFixed: (s) => s.devices.switch.ports.pcA.vlan === 10,
    explanation: (s) => `${s.devices.pcA.name}'s switchport had been placed in VLAN 20 instead of VLAN 10 with the rest of the office PCs. IP addressing was never the problem; VLANs create separate broadcast domains regardless of subnet, so PC-A and PC-B were isolated at Layer 2 even though both had valid, matching IP settings. Returning the port to VLAN 10 reunited them.`,
    focus: "switch",
  },
  {
    id: "wan-route",
    difficulty: "Hard",
    topic: "Routing",
    title: "The whole office lost the internet",
    inject: (base) =>
      withBase(base, (d) => {
        d.router.wanGateway = WRONG_WAN_GATEWAY;
      }),
    symptom: () => `Every device on the LAN can reach the gateway and each other, but nothing gets past R1 to the internet.`,
    clues: () => [
      "Local connectivity between every host is completely normal — this isn't an addressing or switching issue.",
      "tracert from any PC reaches R1 on hop 1, then dies. That points squarely at R1's upstream configuration.",
      `R1's ISP hands off at ${CORRECT_WAN_GATEWAY} — check R1's configured WAN gateway against that.`,
    ],
    isFixed: (s) => s.devices.router.wanGateway === CORRECT_WAN_GATEWAY,
    explanation: () => `R1's WAN gateway was pointed at ${WRONG_WAN_GATEWAY}, an address the ISP never assigned, so every packet leaving the LAN had no valid next hop upstream. Local traffic was unaffected because it never needed to leave R1. Correcting the WAN gateway to ${CORRECT_WAN_GATEWAY} restored the default route to the internet.`,
    focus: "router",
  },
  {
    id: "trunk-prune",
    difficulty: "Hard",
    topic: "VLAN Trunking",
    title: "The server vanished from the network — for everyone",
    inject: (base) =>
      withBase(base, (d) => {
        d.switch.ports.server.vlan = 20;
        d.switch.trunk.allowedVlans = [10];
      }),
    symptom: (s) => `IT just moved ${s.devices.server.name} onto its own VLAN for segmentation. Now it can't be reached from R1 or the internet at all — but the server's own configuration checks out perfectly.`,
    clues: (s) => [
      `${s.devices.server.name} now sits in VLAN 20 instead of VLAN 10. Confirm its own IP settings are fine first — they are.`,
      "If a single VLAN is completely unreachable from the router while everything else works, suspect the trunk link between the switch and the router.",
      "Check which VLANs are actually permitted across SW1's trunk to R1.",
    ],
    isFixed: (s) => s.devices.switch.trunk.allowedVlans.includes(20),
    explanation: () => `The trunk link between SW1 and R1 had been pruned down to VLAN 10 only, so VLAN 20 — the server's VLAN — had no path across the uplink at all, even though the server's own configuration was flawless. Re-permitting VLAN 20 on the trunk restored the path between the server and everything upstream of the switch.`,
    focus: "switch",
  },
];

export function templatesFor(difficulty) {
  return TEMPLATES.filter((t) => t.difficulty === difficulty);
}

let lastId = null;

export function generateScenario(difficulty) {
  const pool = templatesFor(difficulty);
  let template = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && template.id === lastId) {
    template = pool[(pool.indexOf(template) + 1) % pool.length];
  }
  lastId = template.id;

  const baseline = buildBaseline();
  const state = template.inject(baseline);

  return {
    key: `${template.id}-${Date.now()}`,
    templateId: template.id,
    difficulty: template.difficulty,
    topic: template.topic,
    title: template.title,
    symptom: template.symptom(state),
    clues: template.clues(state),
    explanationFn: template.explanation,
    isFixedFn: template.isFixed,
    focus: template.focus,
    state,
  };
}

export { CORRECT_WAN_GATEWAY };
