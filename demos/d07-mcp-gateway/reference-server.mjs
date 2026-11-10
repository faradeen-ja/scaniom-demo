#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

const host = String(process.env.OPEN_II_D07_MCP_HOST || "127.0.0.1").trim();
const port = Number(process.env.OPEN_II_D07_MCP_PORT || "3001");
const ledger = path.resolve(process.env.OPEN_II_D07_LEDGER || ".demo/d07/reference-mcp-ledger.jsonl");
const maxBodyBytes = Math.max(16 * 1024, Math.min(1024 * 1024, Number(process.env.OPEN_II_D07_MAX_BODY_BYTES || 256 * 1024)));
const serverName = "open-immune-d07-reference-mcp";
const serverVersion = "1.0.0";
const modernProtocol = "2026-07-28";
const legacyProtocol = "2025-11-25";
const allowedHosts = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("OPEN_II_D07_MCP_PORT must be 1..65535");
if (!["127.0.0.1", "localhost", "::1"].includes(host)) throw new Error("D07 reference MCP server is intentionally loopback-only");

fs.mkdirSync(path.dirname(ledger), { recursive: true, mode: 0o700 });
let toolCalls = 0;
let records = 0;

function hostNameOnly(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    return end >= 0 ? raw.slice(0, end + 1) : raw;
  }
  return raw.split(":", 1)[0];
}

function transportAllowed(req) {
  const hostHeader = String(req.headers.host || "").trim().toLowerCase();
  const bare = hostNameOnly(hostHeader);
  if (!allowedHosts.has(hostHeader) && !allowedHosts.has(bare)) return false;
  const origin = String(req.headers.origin || "").trim();
  if (!origin) return true;
  try {
    return allowedHosts.has(new URL(origin).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function json(res, status, payload, extra = {}) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  for (const [key, value] of Object.entries(extra)) res.setHeader(key, value);
  res.end(JSON.stringify(payload));
}

function rpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > maxBodyBytes) throw Object.assign(new Error("request body too large"), { status: 413 });
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

function normalizeMessage(value) {
  if (typeof value !== "string") throw new Error("message must be a string");
  const text = value.trim();
  if (!text || text.length > 2000) throw new Error("message must contain 1..2000 characters");
  return text;
}

function recordToolCall(message) {
  const bytes = Buffer.from(message, "utf8");
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  const row = {
    version: 1,
    recordId: `oii_mcp_${randomUUID()}`,
    recordedAt: new Date().toISOString(),
    tool: "open_immune_record",
    messageDigest: digest,
    messageBytes: bytes.length,
    contentStored: false,
  };
  fs.appendFileSync(ledger, `${JSON.stringify(row)}\n`, { encoding: "utf8", mode: 0o600 });
  records += 1;
  return row;
}

function discoveryResult() {
  return {
    protocolVersion: modernProtocol,
    serverInfo: { name: serverName, version: serverVersion },
    capabilities: { tools: { listChanged: false } },
    instructions: "Open Immune D07 safe reference MCP server. Tool payload content is hashed before local audit recording.",
  };
}

function toolDefinition() {
  return {
    name: "open_immune_record",
    title: "Open Immune Record",
    description: "Create a harmless local privacy-minimized audit record so D07 can prove a real MCP tool consequence.",
    inputSchema: {
      type: "object",
      properties: { message: { type: "string", minLength: 1, maxLength: 2000 } },
      required: ["message"],
      additionalProperties: false,
    },
  };
}

function handleRpc(rpc) {
  const id = rpc?.id ?? null;
  const method = String(rpc?.method || "");
  if (rpc?.jsonrpc !== "2.0" || !method) return { status: 400, body: rpcError(id, -32600, "Invalid Request") };

  if (method === "server/discover") return { status: 200, body: { jsonrpc: "2.0", id, result: discoveryResult() } };
  if (method === "initialize") {
    return {
      status: 200,
      body: {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: legacyProtocol,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: serverName, version: serverVersion },
          instructions: "Open Immune D07 safe reference MCP server.",
        },
      },
    };
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") return { status: 202, body: null };
  if (method === "ping") return { status: 200, body: { jsonrpc: "2.0", id, result: {} } };
  if (method === "tools/list") return { status: 200, body: { jsonrpc: "2.0", id, result: { tools: [toolDefinition()] } } };
  if (method === "tools/call") {
    const name = String(rpc?.params?.name || "");
    if (name !== "open_immune_record") return { status: 200, body: rpcError(id, -32602, `Unknown tool: ${name || "(missing)"}`) };
    let message;
    try {
      message = normalizeMessage(rpc?.params?.arguments?.message);
    } catch (error) {
      return { status: 200, body: { jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: error.message }] } } };
    }
    toolCalls += 1;
    const row = recordToolCall(message);
    return {
      status: 200,
      body: {
        jsonrpc: "2.0",
        id,
        result: {
          isError: false,
          content: [{ type: "text", text: `Open Immune D07 record accepted: ${row.recordId}` }],
          structuredContent: {
            recordId: row.recordId,
            messageDigest: row.messageDigest,
            messageBytes: row.messageBytes,
            contentStored: false,
          },
        },
      },
    };
  }
  return { status: 200, body: rpcError(id, -32601, `Method not found: ${method}`) };
}

const server = http.createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        ok: true,
        service: serverName,
        version: serverVersion,
        transport: "streamable_http",
        endpoint: `http://${host}:${port}/mcp`,
        protocolVersions: [modernProtocol, legacyProtocol],
        tools: ["open_immune_record"],
        toolCalls,
        records,
        ledger,
      });
    }
    if (!transportAllowed(req)) return json(res, 403, { error: { type: "transport_rejected", message: "Host/Origin rejected" } });
    if (url.pathname !== "/mcp") return json(res, 404, { error: { type: "not_found", message: "Use /mcp" } });
    if (req.method !== "POST") return json(res, 405, { error: { type: "method_not_allowed", message: "D07 reference MCP accepts POST /mcp" } }, { allow: "POST" });

    const raw = await readBody(req);
    if (!raw.length) return json(res, 400, rpcError(null, -32600, "Empty request"));
    let rpc;
    try {
      rpc = JSON.parse(raw.toString("utf8"));
    } catch {
      return json(res, 400, rpcError(null, -32700, "Parse error"));
    }
    if (Array.isArray(rpc)) return json(res, 400, rpcError(null, -32600, "JSON-RPC batches are not supported"));

    const result = handleRpc(rpc);
    if (result.body === null) {
      res.statusCode = result.status;
      res.setHeader("cache-control", "no-store");
      res.end();
      return;
    }
    return json(res, result.status, result.body, { "mcp-protocol-version": String(req.headers["mcp-protocol-version"] || modernProtocol) });
  })().catch((error) => json(res, Number(error?.status) || 500, { error: { type: "reference_mcp_error", message: error instanceof Error ? error.message : String(error) } }));
});

server.listen(port, host, () => {
  console.log("OPEN IMMUNE / D07 / REFERENCE MCP SERVER");
  console.log(`✓ http://${host}:${port}/mcp`);
  console.log("✓ Streamable HTTP · current stateless tools/call path");
  console.log("✓ safe tool open_immune_record · digest-only local ledger");
});

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
