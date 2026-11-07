import assert from "node:assert/strict";
import test from "node:test";
import { loopbackAddress, remoteAddressAllowed } from "../lib/open-ii/network-policy";

test("public addresses remain available to normal remote profiles", () => {
  assert.equal(remoteAddressAllowed("8.8.8.8", 4, false), true);
  assert.equal(remoteAddressAllowed("2606:4700:4700::1111", 6, false), true);
});

test("browser/public remote profiles cannot reach private or reserved networks", () => {
  assert.equal(remoteAddressAllowed("10.1.2.3", 4, false), false);
  assert.equal(remoteAddressAllowed("192.168.1.10", 4, false), false);
  assert.equal(remoteAddressAllowed("fc00::1234", 6, false), false);
  assert.equal(remoteAddressAllowed("169.254.169.254", 4, false), false);
  assert.equal(remoteAddressAllowed("127.0.0.1", 4, false), false);
});

test("server private-network opt-in permits enterprise ranges but never metadata or loopback", () => {
  assert.equal(remoteAddressAllowed("10.1.2.3", 4, true), true);
  assert.equal(remoteAddressAllowed("172.20.1.2", 4, true), true);
  assert.equal(remoteAddressAllowed("192.168.100.20", 4, true), true);
  assert.equal(remoteAddressAllowed("100.64.1.2", 4, true), true);
  assert.equal(remoteAddressAllowed("fc00::1234", 6, true), true);
  assert.equal(remoteAddressAllowed("169.254.169.254", 4, true), false);
  assert.equal(remoteAddressAllowed("127.0.0.1", 4, true), false);
  assert.equal(remoteAddressAllowed("fe80::1", 6, true), false);
  assert.equal(remoteAddressAllowed("::ffff:127.0.0.1", 6, true), false);
});

test("local Control accepts only loopback addresses at transport resolution", () => {
  assert.equal(loopbackAddress("127.0.0.1", 4), true);
  assert.equal(loopbackAddress("::1", 6), true);
  assert.equal(loopbackAddress("10.0.0.1", 4), false);
});
