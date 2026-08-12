import { sameSubnet, getSwitchPort, findDuplicateIpKeys, EXTERNAL_TARGETS, DEVICE_LABELS } from "./network";

const CORRECT_WAN_GATEWAY = "203.0.113.1";

function reachGateway(state, fromKey) {
  const from = state.devices[fromKey];
  const fromPort = getSwitchPort(state, fromKey);
  if (!fromPort.enabled) {
    return { ok: false, reason: "src-port-down", note: `${DEVICE_LABELS[fromKey]}'s switch port is administratively down — no link to the local segment.` };
  }
  if (!sameSubnet(from.ip, from.mask, state.devices.router.lanIp)) {
    return { ok: false, reason: "subnet-mismatch", note: `${DEVICE_LABELS[fromKey]}'s subnet mask places the default gateway outside its calculated network.` };
  }
  if (!state.devices.switch.trunk.allowedVlans.includes(fromPort.vlan)) {
    return { ok: false, reason: "trunk-pruned", note: `VLAN ${fromPort.vlan} is not permitted across the trunk link to R1 — traffic is being dropped at the switch uplink.` };
  }
  return { ok: true };
}

function targetIp(state, targetKey) {
  if (targetKey === "gateway") return state.devices.router.lanIp;
  if (targetKey === "internet") return EXTERNAL_TARGETS.internet.ip;
  if (targetKey === "website") return EXTERNAL_TARGETS.website.ip;
  return state.devices[targetKey]?.ip;
}

export function runIpconfig(state, fromKey) {
  const d = state.devices[fromKey];
  const port = getSwitchPort(state, fromKey);
  const media = port.enabled ? "Connected" : "Media disconnected";
  const lines = [
    `Ethernet adapter ${d.name}:`,
    "",
    `   Media State . . . . . . . . . . . : ${media}`,
  ];
  if (port.enabled) {
    lines.push(
      `   IPv4 Address. . . . . . . . . . . : ${d.ip || "0.0.0.0"}`,
      `   Subnet Mask . . . . . . . . . . . : ${d.mask || "0.0.0.0"}`,
      `   Default Gateway . . . . . . . . . : ${d.gateway || "0.0.0.0"}`,
      `   DNS Server . . . . . . . . . . . : ${d.dns || "0.0.0.0"}`
    );
    if (d.ip && d.ip.startsWith("169.254.")) {
      lines.push("", "   (Automatic Private IP Address — no DHCP server responded)");
    }
  }
  return { command: `ipconfig`, ranOn: d.name, lines, ok: true };
}

function pingLinesFor(result, targetLabel, ip) {
  if (result.ok) {
    return {
      lines: [
        `Pinging ${targetLabel} [${ip}] with 32 bytes of data:`,
        `Reply from ${ip}: bytes=32 time<1ms TTL=64`,
        `Reply from ${ip}: bytes=32 time<1ms TTL=64`,
        `Reply from ${ip}: bytes=32 time=1ms TTL=64`,
        `Reply from ${ip}: bytes=32 time<1ms TTL=64`,
        "",
        `Ping statistics for ${ip}:`,
        "    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)",
      ],
      ok: true,
    };
  }
  if (result.reason === "dns-fail") {
    return { lines: [`Ping request could not find host ${targetLabel}. Please check the name and try again.`], ok: false };
  }
  if (result.reason === "duplicate-ip") {
    return {
      lines: [
        `Pinging ${targetLabel} [${ip}] with 32 bytes of data:`,
        `Reply from ${ip}: bytes=32 time<1ms TTL=64`,
        `Reply from ${ip}: Destination host unreachable.`,
        "Warning: duplicate IP address detected on the network — replies received from more than one host.",
        "",
        `Ping statistics for ${ip}:`,
        "    Packets: Sent = 4, Received = 2, Lost = 2 (50% loss)",
      ],
      ok: false,
    };
  }
  if (result.reason === "subnet-mismatch" || result.reason === "subnet-mismatch-gateway") {
    return {
      lines: [`Pinging ${targetLabel} [${ip}] with 32 bytes of data:`, "Destination host unreachable.", "Destination host unreachable.", "Destination host unreachable.", "Destination host unreachable."],
      ok: false,
    };
  }
  return {
    lines: [
      `Pinging ${targetLabel} [${ip}] with 32 bytes of data:`,
      "Request timed out.",
      "Request timed out.",
      "Request timed out.",
      "Request timed out.",
      "",
      `Ping statistics for ${ip}:`,
      "    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)",
    ],
    ok: false,
  };
}

export function runPing(state, fromKey, targetKey) {
  const from = state.devices[fromKey];
  const ip = targetIp(state, targetKey);
  const label = targetKey === "website" ? EXTERNAL_TARGETS.website.host : ip;
  const fromPort = getSwitchPort(state, fromKey);

  let result = { ok: true };

  if (!fromPort.enabled) {
    result = { ok: false, reason: "src-port-down", note: `${from.name}'s own switch port is administratively down.` };
  } else if (["pcA", "pcB", "server"].includes(targetKey)) {
    const toPort = getSwitchPort(state, targetKey);
    const toDev = state.devices[targetKey];
    if (!sameSubnet(from.ip, from.mask, toDev.ip)) {
      result = { ok: false, reason: "subnet-mismatch", note: `${from.name}'s subnet mask excludes ${toDev.name} from its calculated network.` };
    } else if (!toPort.enabled) {
      result = { ok: false, reason: "dst-port-down", note: `${toDev.name}'s switch port is administratively down.` };
    } else if (fromPort.vlan !== toPort.vlan) {
      result = { ok: false, reason: "vlan-mismatch", note: `${from.name} (VLAN ${fromPort.vlan}) and ${toDev.name} (VLAN ${toPort.vlan}) are in different VLANs.` };
    }
  } else if (targetKey === "gateway") {
    const gw = reachGateway(state, fromKey);
    if (!gw.ok) result = gw;
  } else {
    const gw = reachGateway(state, fromKey);
    if (!gw.ok) {
      result = gw;
    } else if (state.devices.router.wanGateway !== CORRECT_WAN_GATEWAY) {
      result = { ok: false, reason: "wan-down", note: "R1 cannot forward beyond the gateway — its upstream route looks wrong." };
    } else if (targetKey === "website" && from.dns !== state.devices.router.lanIp) {
      result = { ok: false, reason: "dns-fail", note: `${from.name}'s DNS server setting can't resolve names.` };
    }
  }

  // Duplicate-IP conflicts override an otherwise-successful local ping.
  if (result.ok && ["pcA", "pcB", "server"].includes(targetKey)) {
    const dupes = findDuplicateIpKeys(state);
    if (dupes.has(targetKey)) {
      result = { ok: false, reason: "duplicate-ip", note: `${state.devices[targetKey].name} shares its IP address with another host on the network.` };
    }
  }

  const rendered = pingLinesFor(result, label, ip);
  return { command: `ping ${label}`, ranOn: from.name, ...rendered, reason: result.reason, note: result.note };
}

export function runTracert(state, fromKey, targetKey) {
  const from = state.devices[fromKey];
  const ip = targetIp(state, targetKey);
  const label = targetKey === "website" ? EXTERNAL_TARGETS.website.host : ip;
  const fromPort = getSwitchPort(state, fromKey);
  const lines = [`Tracing route to ${label} [${ip}] over a maximum of 30 hops:`, ""];
  let ok = false;
  let note = "";

  if (!fromPort.enabled) {
    lines.push("  1     *        *        *     Request timed out.");
    note = `${from.name}'s own switch port is administratively down — nothing leaves this host.`;
  } else if (["pcA", "pcB", "server"].includes(targetKey)) {
    const toPort = getSwitchPort(state, targetKey);
    const toDev = state.devices[targetKey];
    if (!sameSubnet(from.ip, from.mask, toDev.ip)) {
      lines.push("  1     *        *        *     Request timed out.");
      note = "Host appears to be on a different network due to the current subnet mask.";
    } else if (!toPort.enabled || fromPort.vlan !== toPort.vlan) {
      lines.push("  1     *        *        *     Request timed out.");
      note = !toPort.enabled ? `${toDev.name}'s switch port is down.` : "Hosts are isolated by a VLAN boundary at the switch.";
    } else {
      lines.push(`  1    <1 ms    <1 ms    <1 ms  ${ip}  (same subnet — delivered directly)`);
      ok = true;
    }
  } else {
    const gw = reachGateway(state, fromKey);
    if (!gw.ok) {
      lines.push("  1     *        *        *     Request timed out.");
      note = gw.note;
    } else {
      lines.push(`  1    <1 ms    <1 ms    <1 ms  ${state.devices.router.lanIp}  (R1 — default gateway)`);
      if (targetKey === "gateway") {
        ok = true;
      } else if (state.devices.router.wanGateway !== CORRECT_WAN_GATEWAY) {
        lines.push("  2     *        *        *     Request timed out.", "  3     *        *        *     Request timed out.");
        note = "Trace stops beyond the gateway — R1's upstream route looks incorrect.";
      } else if (targetKey === "website" && from.dns !== state.devices.router.lanIp) {
        lines.push("", "Unable to resolve target system name " + EXTERNAL_TARGETS.website.host + ".");
        note = `${from.name}'s DNS server setting can't resolve names.`;
      } else {
        lines.push(
          `  2     8 ms     7 ms     8 ms  203.0.113.1  (ISP edge)`,
          `  3     9 ms     9 ms     8 ms  ${ip}  (destination reached)`
        );
        ok = true;
      }
    }
  }

  lines.push("", ok ? "Trace complete." : "Trace did not complete.");
  return { command: `tracert ${label}`, ranOn: from.name, lines, ok, note };
}
