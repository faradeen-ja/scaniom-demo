import { BlockList } from "node:net";

const blockedRemote = new BlockList();
const privateNetworks = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as Array<[string, number]>) blockedRemote.addSubnet(network, prefix, "ipv4");

for (const [network, prefix] of [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32],
] as Array<[string, number]>) blockedRemote.addSubnet(network, prefix, "ipv6");

for (const [network, prefix] of [
  ["10.0.0.0", 8], ["100.64.0.0", 10], ["172.16.0.0", 12], ["192.168.0.0", 16],
] as Array<[string, number]>) privateNetworks.addSubnet(network, prefix, "ipv4");
privateNetworks.addSubnet("fc00::", 7, "ipv6");

export function loopbackAddress(address: string, family: number): boolean {
  if (family === 4) return address.startsWith("127.");
  return family === 6 && address === "::1";
}

export function remoteAddressAllowed(address: string, family: number, allowPrivate: boolean): boolean {
  if (family === 6 && address.toLowerCase().startsWith("::ffff:")) return false;
  if (family !== 4 && family !== 6) return false;
  const kind = family === 4 ? "ipv4" : "ipv6";
  if (!blockedRemote.check(address, kind)) return true;
  if (!allowPrivate) return false;
  // Explicit private-enterprise access permits routable private/CGNAT/ULA ranges,
  // never loopback, link-local/cloud-metadata, multicast, unspecified or docs ranges.
  return privateNetworks.check(address, kind);
}
