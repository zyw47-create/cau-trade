const http = require("http")
const fs = require("fs")
const path = require("path")

const ROOT = __dirname

if (process.env.ENABLE_LEGACY_NODE !== "1") {
  console.error("backend/server.js is legacy-only. Set ENABLE_LEGACY_NODE=1 to start it; use admin_web/app.py for the Flask API.")
  process.exit(1)
}

const envPath = path.join(ROOT, ".env")
const ignorePlainEnv = process.env.BACKEND_IGNORE_PLAIN_ENV === "1"

if (!ignorePlainEnv && fs.existsSync(envPath)) {
  loadEnv(envPath)
}

const allowLegacyMutations = process.env.LEGACY_ALLOW_MUTATIONS === "1"

const config = {
  port: Number(process.env.PORT || 3001),
  dbName: process.env.DB_NAME || "campus_trade",
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  dbHost: process.env.DB_HOST || "127.0.0.1",
  codeSecret: process.env.CODE_SECRET || "",
}

function loadEnv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#") || !line.includes("=")) continue
    const index = line.indexOf("=")
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "")
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

function ok(data) {
  return { code: 200, msg: "success", data }
}

function fail(msg, code = 400) {
  return { code, msg, data: {} }
}

function json(res, httpStatus, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(httpStatus, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  })
  res.end(body)
}

function legacyStatus() {
  return ok({
    service: "campus-trade-legacy-node",
    mysql: config.dbName,
    dbHost: config.dbHost,
    dbUser: config.dbUser,
    dbPasswordConfigured: Boolean(config.dbPassword),
    codeSecretConfigured: Boolean(config.codeSecret),
    legacyOnly: true,
    readOnly: !allowLegacyMutations,
    legacyMutationsEnabled: allowLegacyMutations,
    currentBackend: "admin_web/app.py",
  })
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } catch (error) {
    throw new Error("invalid JSON body")
  }
}

async function route(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, ok({}))

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)

  try {
    if (req.method === "GET" && url.pathname === "/api/status") {
      return json(res, 200, legacyStatus())
    }

    if (req.method === "GET") {
      return json(res, 410, fail("legacy Node service is not a query backend; use Flask /api or /v1/api", 410))
    }

    if (req.method === "POST" && url.pathname === "/api/files/upload") {
      return json(res, 409, fail("legacy Node service does not handle uploads; use Flask /api/files/upload with uploadToken", 409))
    }

    if (req.method === "POST") {
      await readJson(req)
      if (allowLegacyMutations) {
        return json(
          res,
          501,
          fail(
            "legacy mutation mode is enabled only as an old compatibility experiment, but this boundary service has no write implementation; use Flask API for real writes",
            501
          )
        )
      }
      return json(
        res,
        409,
        fail(
          "legacy Node service is read-only by default; use Flask API for writes or set LEGACY_ALLOW_MUTATIONS=1 for old compatibility experiments",
          409
        )
      )
    }

    return json(res, 405, fail("method not allowed", 405))
  } catch (error) {
    return json(res, 400, fail(error.message || "server error"))
  }
}

const server = http.createServer(route)

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${config.port} is already in use.`)
    process.exit(0)
  }
  throw error
})

server.listen(config.port, () => {
  console.log(`campus-trade legacy Node boundary listening on http://127.0.0.1:${config.port}`)
})
