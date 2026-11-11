#!/usr/bin/env node
import http from "node:http";
import https from "node:https";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const listenHost = arg("--listen", "127.0.0.1");
const listenPort = Number(arg("--port", "18789"));
const target = new URL(arg("--target"));
if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535) throw new Error("--port must be 1..65535");
if (!["http:", "https:"].includes(target.protocol)) throw new Error("--target must use http or https");
if (target.username || target.password || target.search || target.hash || target.pathname !== "/") throw new Error("--target must be an origin-only URL without credentials, path, query or fragment");
if (!["127.0.0.1", "localhost", "::1"].includes(listenHost)) throw new Error("D10 relay may bind only to loopback");

const HOP_BY_HOP = new Set([
  "connection", "proxy-connection", "keep-alive", "proxy-authenticate",
  "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade",
]);

function cleanRequestHeaders(headers) {
  const out = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || HOP_BY_HOP.has(name.toLowerCase())) continue;
    out[name] = value;
  }
  out.host = target.host;
  return out;
}

function cleanResponseHeaders(headers) {
  const out = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || HOP_BY_HOP.has(name.toLowerCase())) continue;
    out[name] = value;
  }
  return out;
}

const transport = target.protocol === "https:" ? https : http;
const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/__open_immune_d10_relay") {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true, service: "open-immune-d10-control-relay", targetOrigin: target.origin }));
    return;
  }

  const upstream = transport.request({
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || undefined,
    method: request.method,
    path: request.url || "/",
    headers: cleanRequestHeaders(request.headers),
    timeout: 20_000,
    ...(target.protocol === "https:" ? { servername: target.hostname, rejectUnauthorized: true } : {}),
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, cleanResponseHeaders(upstreamResponse.headers));
    upstreamResponse.pipe(response);
  });

  upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
  upstream.on("error", (error) => {
    if (response.headersSent) {
      if (!response.writableEnded) response.destroy(error);
      return;
    }
    response.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ error: "control_relay_unavailable" }));
  });
  request.on("aborted", () => upstream.destroy());
  request.pipe(upstream);
});

server.listen(listenPort, listenHost, () => {
  process.stdout.write(`D10 control relay listening http://${listenHost}:${listenPort} -> ${target.origin}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
