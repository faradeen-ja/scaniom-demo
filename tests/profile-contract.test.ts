import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CLOUD_PROFILE, inferProfileType, normalizeControlUrl, normalizeProfileName, profileCliCommands } from "../lib/open-ii/profile-contract";

test("cloud is the canonical default Control profile", () => {
  assert.equal(DEFAULT_CLOUD_PROFILE.name, "cloud");
  assert.equal(DEFAULT_CLOUD_PROFILE.type, "cloud");
  assert.equal(DEFAULT_CLOUD_PROFILE.controlUrl, "https://control.scaniom.com");
  assert.equal(inferProfileType(DEFAULT_CLOUD_PROFILE.controlUrl), "cloud");
});

test("remote profiles require HTTPS and an origin-only URL", () => {
  assert.equal(normalizeControlUrl("https://control.company.com/", "self-hosted"), "https://control.company.com");
  assert.throws(() => normalizeControlUrl("http://control.company.com", "self-hosted"), /require HTTPS/);
  assert.throws(() => normalizeControlUrl("https://control.company.com/path", "self-hosted"), /must be an origin/);
  assert.throws(() => normalizeControlUrl("https://user:pass@control.company.com", "self-hosted"), /embedded credentials/);
});

test("local profiles are loopback-only", () => {
  assert.equal(normalizeControlUrl("http://localhost:3000", "local"), "http://localhost:3000");
  assert.throws(() => normalizeControlUrl("http://192.168.1.10:3000", "local"), /localhost/);
});

test("profile names match the released CLI contract", () => {
  assert.equal(normalizeProfileName("acme-private_1"), "acme-private_1");
  assert.throws(() => normalizeProfileName(" bad profile "), /1-48 characters/);
  assert.throws(() => normalizeProfileName("a".repeat(49)), /1-48 characters/);
});

test("CLI parity uses the selected Control profile", () => {
  assert.deepEqual(profileCliCommands(DEFAULT_CLOUD_PROFILE), [
    "scaniom profile use cloud",
    "scaniom profile test cloud",
    "scaniom login",
    "scaniom auth status",
    "scaniom whoami",
  ]);
  const privateCommands = profileCliCommands({ name: "acme", type: "private-enterprise", controlUrl: "https://control.acme.example", customTrust: true });
  assert.match(privateCommands[0], /profile add acme/);
  assert.match(privateCommands[0], /--type private-enterprise/);
  assert.match(privateCommands[0], /--ca-file/);
});
