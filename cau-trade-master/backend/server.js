const http = require("http")
const net = require("net")
const tls = require("tls")
const crypto = require("crypto")
const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

const ROOT = __dirname
const envPath = path.join(ROOT, ".env")
const encryptedEnvPath = path.join(ROOT, ".env.enc")
const ignorePlainEnv = process.env.BACKEND_IGNORE_PLAIN_ENV === "1"

if (!ignorePlainEnv && fs.existsSync(envPath)) {
  loadEnv(envPath)
} else if (fs.existsSync(encryptedEnvPath)) {
  loadEncryptedEnv(encryptedEnvPath)
}

const config = {
  port: Number(process.env.PORT || 3001),
  dbName: process.env.DB_NAME || "campus_trade",
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "123456",
  dbHost: process.env.DB_HOST || "127.0.0.1",
  mysqlBin: process.env.MYSQL_BIN || "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe",
  codeSecret: process.env.CODE_SECRET || "campus-trade-local-secret",
  mockEmail: String(process.env.MOCK_EMAIL || "true") === "true",
  mockVerify: String(process.env.MOCK_VERIFY || "true") === "true",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: String(process.env.SMTP_SECURE || "true") !== "false",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || "",
  smtpFromName: process.env.SMTP_FROM_NAME || "校园二手交易平台"
}

const mockVerificationCodes = new Map()
const sourceMock = require(path.join(__dirname, "..", "miniprogram", "utils", "mock.js"))
const mockData = {
  categories: (sourceMock.categories || []).map((name, index) => ({ id: `c${index + 1}`, name })),
  goodsList: (sourceMock.goods || []).map((item) => ({
    id: `g${item.id}`,
    title: item.title,
    summary: item.desc,
    images: item.image ? [item.image] : ["https://dummyimage.com/640x480/f8bbd0/ffffff&text=Campus+Trade"],
    categoryId: item.category,
    categoryName: item.category,
    price: Number(item.price || 0),
    originalPrice: Number(item.price || 0),
    conditionLabel: item.condition || "正常使用",
    location: item.location || "校内交易",
    sellerName: item.sellerName || "校园同学",
    sellerCollege: "",
    creditScore: item.sellerCreditScore || item.creditScore || 98,
    likes: Number(item.favoriteCount || 0),
    views: 0,
    comments: (item.comments || []).length,
    isAiAudit: String(item.auditNote || "").indexOf("通过") >= 0,
    isFav: !!item.favorite
  })),
  serviceList: (sourceMock.services || []).filter((item) => item.type !== "errand").map((item) => ({
    id: `s${item.id}`,
    title: item.title,
    description: item.desc,
    category: item.type === "service" ? "校园服务" : "其他",
    price: Number(item.price || 0),
    unit: "次",
    provider: item.provider || "校园服务者",
    rating: 5,
    completedOrders: 0,
    tags: [item.status || "可预约"]
  })),
  errandList: (sourceMock.services || []).filter((item) => item.type === "errand").map((item) => ({
    id: `e${item.id}`,
    title: item.title,
    type: "help",
    reward: Number(item.price || 0),
    from: item.pickupLocation || "",
    to: item.deliveryLocation || "",
    deadline: "待沟通",
    status: item.status || "waiting_accept",
    publisher: item.provider || "当前用户"
  })),
  conversations: sourceMock.conversations || [],
  orderList: (sourceMock.orders || []).map((item) => ({
    id: `o_${item.orderSn}`,
    orderSn: item.orderSn,
    role: item.role === "seller" ? "sell" : "buy",
    goodsId: item.itemId ? `g${item.itemId}` : "",
    goodsTitle: item.title,
    price: Number(item.amount || 0),
    otherParty: item.counterpartyName || item.sellerName || "校园同学",
    statusLabel: item.statusLabel || item.status || "待处理",
    createdAt: item.createdAt || formatDateTime(Date.now())
  }))
}

const state = {
  goodsList: clone(mockData.goodsList || []),
  serviceList: clone(mockData.serviceList || []),
  errandList: clone(mockData.errandList || []),
  conversations: clone(mockData.conversations || []),
  orderList: seedOrders(mockData.orderList || []),
  timelineMap: {},
  messageMap: {}
}

const sessionState = {
  user: Object.assign({
    id: 1,
    nickname: "校园同学",
    username: "campus_user",
    role: "user",
    status: "active",
    verified: false,
    creditScore: 100,
    balance: 128.6
  }, clone((sourceMock.users || [])[0] || {}))
}

state.orderList.forEach((order) => {
  state.timelineMap[order.id] = buildTimeline(order)
  state.messageMap[`order_${order.id}`] = [
    {
      id: `seed_msg_${order.id}_1`,
      mine: false,
      content: `${order.otherParty || "对方"}：这笔订单我已经看到啦，我们按约定时间沟通。`,
      time: order.createdAt
    }
  ]
})

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function nowText() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${mm}-${dd} ${hh}:${mi}`
}

async function withMockFallback(loader, fallback) {
  try {
    return await loader()
  } catch (error) {
    console.warn(`[mock-fallback] ${error.message || error}`)
    return typeof fallback === "function" ? fallback() : fallback
  }
}

function mockGoodsList() {
  return {
    list: clone(sourceMock.goods || []),
    categories: ["全部"].concat(sourceMock.categories || [])
  }
}

function mockGoodsDetail(id) {
  const item = (sourceMock.goods || []).find((goods) => Number(goods.id) === Number(id)) || (sourceMock.goods || [])[0]
  if (!item) throw new Error("商品不存在")
  const seller = (sourceMock.users || []).find((user) => Number(user.id) === Number(item.sellerId)) || {}
  const reviews = (sourceMock.userReviews || []).filter((review) => Number(review.toUserId) === Number(seller.id))
  return Object.assign({}, clone(item), {
    sellerAvatar: seller.avatar || "",
    sellerInitial: String(seller.nickname || item.sellerName || "同").charAt(0),
    owner: Object.assign({}, seller),
    ownerReviews: reviews
  })
}

function mockServiceList() {
  return { list: clone(sourceMock.services || []) }
}

function mockServiceDetail(id) {
  const item = (sourceMock.services || []).find((service) => Number(service.id) === Number(id)) || (sourceMock.services || [])[0]
  if (!item) throw new Error("服务不存在")
  const owner = (sourceMock.users || []).find((user) => user.username === item.username || user.username === item.riderUsername || user.nickname === item.provider) || {}
  return Object.assign({}, clone(item), {
    owner: Object.assign({}, owner),
    ownerReviews: (sourceMock.userReviews || []).filter((review) => Number(review.toUserId) === Number(owner.id))
  })
}

function mockOrderList() {
  return {
    list: clone(sourceMock.orders || []).map((order) => Object.assign({}, order, {
      amount: Number(order.amount || 0).toFixed(2),
      statusLabel: order.statusLabel || order.status || "处理中",
      latestTime: order.completedAt || order.paidAt || order.createdAt || "",
      summaryEvents: order.summaryEvents || (order.timeline || []).slice(0, 3).map((item) => item.title)
    }))
  }
}

function mockOrderDetail(orderSn) {
  const order = (mockOrderList().list || []).find((item) => item.orderSn === orderSn)
  if (!order) throw new Error("订单不存在")
  return order
}

function publicUser(id) {
  const user = (sourceMock.users || []).find((item) => Number(item.id) === Number(id)) || sessionState.user
  return Object.assign({}, clone(user), {
    reviews: (sourceMock.userReviews || []).filter((review) => Number(review.toUserId) === Number(user.id)),
    goods: (sourceMock.goods || []).filter((goods) => Number(goods.sellerId) === Number(user.id) && goods.status === "on_sale"),
    services: (sourceMock.services || []).filter((service) => service.username === user.username && service.status === "on_sale")
  })
}

function addAudit(action, target, operator) {
  ;(sourceMock.auditLogs || []).unshift({
    id: Date.now(),
    action,
    target,
    operator: operator || "system",
    time: nowText()
  })
}

function compatibilityGet(pathname, searchParams) {
  if (pathname === "/api/user/credit") {
    return ok({
      score: sessionState.user.creditScore || 100,
      level: "优秀",
      tips: ["实名认证已完成", "交易评价会影响信用分", "违规与仲裁失败会扣分"]
    })
  }
  if (pathname === "/api/user/public") return ok(publicUser(searchParams.get("id")))
  if (pathname === "/api/goods/favorites") return ok({ list: clone(sourceMock.goods || []).filter((item) => item.favorite) })
  if (pathname === "/api/goods/mine") return ok({ list: clone(sourceMock.goods || []).filter((item) => Number(item.sellerId) === Number(sessionState.user.id)) })
  if (pathname === "/api/account/logs") return ok({ list: clone(sourceMock.walletLogs || []) })
  if (pathname === "/api/rider/earnings") {
    const accepted = (sourceMock.services || []).filter((item) => item.type === "errand" && item.riderUsername === sessionState.user.username)
    return ok({
      total: accepted.reduce((sum, item) => sum + Number(item.price || 0), 0),
      available: Number(sessionState.user.balance || 0),
      completedCount: accepted.length,
      withdraws: clone(sourceMock.withdraws || [])
    })
  }
  if (pathname === "/api/admin/stats") return ok(clone(sourceMock.stats || {}))
  if (pathname === "/api/admin/stats/export") {
    const stats = sourceMock.stats || {}
    return ok({
      fileName: `campus_trade_stats_${Date.now()}.csv`,
      rows: [["指标", "数值"], ["在售商品", stats.goodsOnSale || 0], ["待审商品", stats.pendingGoods || 0], ["售后订单", stats.refundingOrders || 0], ["交易金额", stats.todayAmount || 0]]
    })
  }
  if (pathname === "/api/admin/ops/health") return ok(clone(sourceMock.opsHealth || {}))
  if (pathname === "/api/admin/security/checks") return ok({ list: clone(sourceMock.securityChecks || []) })
  if (pathname === "/api/admin/users") return ok({ list: clone(sourceMock.users || []) })
  if (pathname === "/api/admin/ai/rules") return ok(clone(sourceMock.aiRules || {}))
  if (pathname === "/api/admin/goods/pending") return ok({ list: clone(sourceMock.goods || []).filter((item) => item.status === "pending") })
  if (pathname === "/api/admin/orders/refunding") return ok({ list: clone(sourceMock.orders || []).filter((item) => item.status === "refunding") })
  if (pathname === "/api/admin/withdraws") return ok({ list: clone(sourceMock.withdraws || []) })
  if (pathname === "/api/admin/audit/logs") return ok({ list: clone(sourceMock.auditLogs || []) })
  return null
}

function compatibilityPost(pathname, data) {
  if (pathname === "/api/auth/login") {
    if (!sessionState.user.nickname || String(sessionState.user.nickname).indexOf("?") >= 0) {
      sessionState.user.nickname = "校园同学"
    }
    return remoteOk({ token: "remote-demo-token", user: sessionState.user })
  }
  if (pathname === "/api/auth/logout") return remoteOk({ status: "logged_out" })
  if (pathname === "/api/user/profile/update") {
    sessionState.user = Object.assign({}, sessionState.user, data || {})
    return remoteOk(sessionState.user)
  }
  if (pathname === "/api/user/role") {
    const role = data.role || "user"
    sessionState.user = Object.assign({}, sessionState.user, { role })
    return ok({ role, status: "approved", user: sessionState.user })
  }
  if (pathname === "/api/account/recharge") {
    const amount = Number(data.amount || 0)
    if (amount <= 0) return fail("充值金额必须大于 0")
    sessionState.user.balance = Number((Number(sessionState.user.balance || 0) + amount).toFixed(2))
    ;(sourceMock.walletLogs || []).unshift({ id: Date.now(), type: "recharge", title: "账户充值", amount, balanceAfter: sessionState.user.balance, time: nowText() })
    return ok({ balance: sessionState.user.balance })
  }
  if (pathname === "/api/rider/withdraw") {
    const amount = Number(data.amount || 0)
    if (amount <= 0) return fail("提现金额必须大于 0")
    const record = { id: Date.now(), applicant: sessionState.user.nickname, role: sessionState.user.role, amount, status: "pending", reason: data.reason || "收益提现" }
    ;(sourceMock.withdraws || []).unshift(record)
    addAudit("提交提现申请", `${amount}`, sessionState.user.nickname)
    return ok(record)
  }
  if (pathname === "/api/oss/sts" || pathname === "/api/files/upload-credential") {
    return ok({ host: `http://127.0.0.1:${config.port}/uploads`, uploadUrl: "/api/files/upload", url: `http://127.0.0.1:${config.port}/uploads/${Date.now()}.jpg` })
  }
  if (pathname === "/api/goods/remove" || pathname === "/api/goods/relist") {
    const item = (sourceMock.goods || []).find((goods) => Number(goods.id) === Number(data.id))
    if (item) item.status = pathname === "/api/goods/remove" ? "removed" : "pending"
    return ok({ status: item ? item.status : "missing" })
  }
  if (pathname === "/api/order/complaint") {
    const order = (sourceMock.orders || []).find((item) => item.orderSn === data.orderSn)
    if (order) order.status = "refunding"
    addAudit("用户提交投诉", data.orderSn, sessionState.user.nickname)
    return ok({ status: "submitted" })
  }
  if (pathname === "/api/comment") {
    ;(sourceMock.userReviews || []).unshift({ id: Date.now(), toUserId: Number(data.toUserId || 1), fromName: sessionState.user.nickname, fromUsername: sessionState.user.username, score: Number(data.score || 5), content: data.content || "", time: nowText() })
    return ok({ status: "created" })
  }
  if (pathname === "/api/admin/backup/run") {
    sourceMock.opsHealth.latestBackup = { fileName: `campus_trade-full-${Date.now()}.sql`, sizeBytes: 89732, sha256: `SHA256-${Date.now()}`, time: nowText() }
    sourceMock.opsHealth.checkedAt = nowText()
    return ok(sourceMock.opsHealth.latestBackup)
  }
  if (pathname === "/api/admin/user/status") {
    const item = (sourceMock.users || []).find((user) => Number(user.id) === Number(data.id))
    if (item) item.status = data.status || item.status
    return ok({ status: item ? item.status : "missing" })
  }
  if (pathname === "/api/admin/ai/rules/update") {
    Object.assign(sourceMock.aiRules, data || {}, { updatedAt: nowText() })
    return ok(sourceMock.aiRules)
  }
  if (pathname === "/api/admin/goods/audit") {
    const item = (sourceMock.goods || []).find((goods) => Number(goods.id) === Number(data.id))
    if (item) item.status = data.result === "reject" ? "rejected" : "on_sale"
    return ok({ status: item ? item.status : "missing" })
  }
  if (pathname === "/api/admin/order/arbitrate") {
    const order = (sourceMock.orders || []).find((item) => item.orderSn === data.orderSn)
    if (order) order.status = data.result === "buyer" ? "refunded" : "completed"
    return ok({ status: order ? order.status : "missing" })
  }
  if (pathname === "/api/admin/withdraw/audit") {
    const item = (sourceMock.withdraws || []).find((withdraw) => Number(withdraw.id) === Number(data.id))
    if (item) item.status = data.result === "reject" ? "rejected" : "approved"
    return ok({ status: item ? item.status : "missing" })
  }
  return null
}

function seedOrders(source) {
  return source.map((item, index) => ({
    id: item.id || `o${index + 1}`,
    orderSn: item.orderSn || `ORD${Date.now()}${index}`,
    role: item.role || "buy",
    goodsId: item.goodsId || "",
    goodsTitle: item.goodsTitle || "未命名订单",
    otherParty: item.otherParty || "校园同学",
    price: Number(item.price || 0),
    createdAt: item.createdAt || formatDateTime(Date.now()),
    status: mapStatus(item.statusLabel),
    statusLabel: item.statusLabel || "待处理",
    escrowStatus: item.statusLabel === "已完成" ? "已结算" : "托管中",
    tradeType: "goods",
    tradeLocation: "图书馆南门",
    canCancel: false,
    canConfirm: false
  }))
}

function mapStatus(statusLabel) {
  if (statusLabel === "待付款") return "pending_payment"
  if (statusLabel === "待收货") return "shipped"
  if (statusLabel === "待发货") return "paid"
  if (statusLabel === "已取消") return "cancelled"
  if (statusLabel === "已完成") return "completed"
  return "processing"
}

function enrichOrder(order) {
  const statusTextMap = {
    pending_payment: "待付款",
    paid: "待发货",
    shipped: "待收货",
    delivering: "配送中",
    in_service: "服务进行中",
    completed: "已完成",
    cancelled: "已取消"
  }
  const status = order.status || "processing"
  return Object.assign({}, order, {
    statusLabel: order.statusLabel || statusTextMap[status] || "处理中",
    canCancel: ["pending_payment", "paid"].includes(status),
    canConfirm: ["shipped", "delivering", "in_service"].includes(status)
  })
}

function buildTimeline(order) {
  const createdAt = order.createdAt || formatDateTime(Date.now())
  const list = [
    { id: `${order.id}_1`, title: "订单创建", time: createdAt, desc: "订单已生成，等待后续处理。" }
  ]
  if (order.status !== "pending_payment") {
    list.push({ id: `${order.id}_2`, title: "资金托管", time: createdAt, desc: "付款后资金进入平台托管。" })
  }
  if (["paid", "shipped", "delivering", "in_service", "completed"].includes(order.status)) {
    list.push({ id: `${order.id}_3`, title: "订单推进", time: createdAt, desc: "卖家或服务方已接单并开始处理。" })
  }
  if (["completed"].includes(order.status)) {
    list.push({ id: `${order.id}_4`, title: "订单完成", time: createdAt, desc: "已确认收货或服务完成，资金结算完成。" })
  }
  if (["cancelled"].includes(order.status)) {
    list.push({ id: `${order.id}_5`, title: "订单取消", time: createdAt, desc: "订单已取消，托管资金按规则处理。" })
  }
  return list
}

function loadEnv(file) {
  loadEnvText(fs.readFileSync(file, "utf8"))
}

function loadEnvText(text) {
  const lines = String(text || "").split(/\r?\n/)
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const index = trimmed.indexOf("=")
    if (index < 0) return
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  })
}

function loadEncryptedEnv(file) {
  const keyFile = path.join(ROOT, ".env.key")
  const keyMaterial = process.env.BACKEND_ENV_KEY
    || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8").trim() : "")
  if (!keyMaterial) {
    console.warn("Encrypted env exists but BACKEND_ENV_KEY/backend/.env.key is missing; using process env/defaults.")
    return
  }
  const payload = JSON.parse(fs.readFileSync(file, "utf8"))
  const salt = Buffer.from(payload.salt, "base64")
  const iv = Buffer.from(payload.iv, "base64")
  const tag = Buffer.from(payload.tag, "base64")
  const ciphertext = Buffer.from(payload.ciphertext, "base64")
  const key = crypto.pbkdf2Sync(keyMaterial, salt, payload.iterations || 310000, 32, "sha256")
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
  loadEnvText(plaintext)
}

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-trace-id, x-idempotency-key"
  })
  res.end(JSON.stringify(payload))
}

function ok(data) {
  return { code: 200, msg: "success", data: data || {} }
}

function remoteOk(data) {
  return { code: 0, msg: "success", data: data || {} }
}

function fail(msg, code = 400) {
  return { code, msg: msg || "request failed", data: {} }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
      if (body.length > 1024 * 1024) {
        req.destroy()
        reject(new Error("request body too large"))
      }
    })
    req.on("end", () => {
      if (!body) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error("invalid json body"))
      }
    })
    req.on("error", reject)
  })
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function hashCode(email, code) {
  return crypto
    .createHash("sha256")
    .update(`${String(email).toLowerCase()}:${code}:${config.codeSecret}`)
    .digest("hex")
}

function sql(value) {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL"
  return `'${String(value).replace(/'/g, "''")}'`
}

function mysql(args, input) {
  return new Promise((resolve, reject) => {
    const bin = fs.existsSync(config.mysqlBin) ? config.mysqlBin : "mysql"
    const fullArgs = ["--batch", "--raw", "--skip-column-names", "--default-character-set=utf8mb4", "-h", config.dbHost, "-u", config.dbUser]
    if (config.dbPassword) fullArgs.push(`-p${config.dbPassword}`)
    if (config.dbName) fullArgs.push(config.dbName)
    fullArgs.push(...args)
    const child = spawn(bin, fullArgs, { windowsHide: true })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8") })
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8") })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || `mysql exited with ${code}`))
      resolve(stdout)
    })
    if (input) child.stdin.write(input)
    child.stdin.end()
  })
}

async function query(sqlText) {
  return mysql(["-e", sqlText])
}

function parseRows(stdout) {
  return String(stdout || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split("\t"))
}

async function queryRows(sqlText, columns) {
  const rows = parseRows(await query(sqlText))
  return rows.map((values) => {
    return (columns || []).reduce((row, key, index) => {
      row[key] = values[index] === "\\N" ? null : values[index]
      return row
    }, {})
  })
}

async function queryJson(sqlText) {
  const rows = parseRows(await query(sqlText))
  return rows.map((row) => {
    try {
      return JSON.parse(row[0] || "{}")
    } catch (error) {
      return {}
    }
  })
}

async function ensureDemoUser(userId) {
  await query(`
    INSERT INTO users
      (id, openid, nickname, username, role, status, is_verified, credit_score, balance, frozen_balance)
    VALUES
      (${Number(userId)}, ${sql(`mock-openid-${userId}`)}, '校园同学', ${sql(userId === 1 ? "campus_user" : `user_${userId}`)}, 'user', 'active', 0, 100, 128.60, 0.00)
    ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
  `)
}

function assertCampusEmail(email) {
  const normalized = String(email || "").trim().toLowerCase()
  if (!/^[a-z0-9._%+-]+@cau\.edu\.cn$/.test(normalized)) {
    throw new Error("请使用 @cau.edu.cn 学校邮箱")
  }
  return normalized
}

async function handleSendCode(data) {
  const email = assertCampusEmail(data.email)
  const userId = Number(data.userId || 1)
  const code = randomCode()
  const codeHash = hashCode(email, code)

  if (config.mockVerify) {
    mockVerificationCodes.set(`${userId}:${email}`, {
      codeHash,
      attemptCount: 0,
      expiresAt: Date.now() + 5 * 60 * 1000
    })
    const emailResult = await sendVerificationEmail(email, code)
    return ok(Object.assign({ sent: true, expiresIn: 300 }, emailResult))
  }

  await ensureDemoUser(userId)
  await query(`
    UPDATE email_verification_codes
    SET status = 'expired'
    WHERE user_id = ${userId}
      AND email = ${sql(email)}
      AND purpose = 'campus_verify'
      AND status = 'pending';

    INSERT INTO email_verification_codes
      (user_id, email, code_hash, purpose, status, attempt_count, expires_at)
    VALUES
      (${userId}, ${sql(email)}, ${sql(codeHash)}, 'campus_verify', 'pending', 0, DATE_ADD(NOW(), INTERVAL 5 MINUTE));
  `)
  const emailResult = await sendVerificationEmail(email, code)
  return ok(Object.assign({ sent: true, expiresIn: 300 }, emailResult))
}

async function handleVerify(data) {
  const email = assertCampusEmail(data.email)
  const userId = Number(data.userId || 1)
  const code = String(data.emailCode || "").trim()
  if (!/^\d{6}$/.test(code)) throw new Error("请输入 6 位邮箱验证码")
  if (!data.studentId || !data.realName || !data.college) throw new Error("请补全学号、姓名和学院")
  if (!/^\d{8,12}$/.test(String(data.studentId).trim())) throw new Error("学号应为 8-12 位数字")
  if (!/^[\u4e00-\u9fa5A-Za-z·]{2,20}$/.test(String(data.realName).trim())) throw new Error("姓名格式不正确")

  if (config.mockVerify) {
    const key = `${userId}:${email}`
    const record = mockVerificationCodes.get(key)
    if (!record) throw new Error("请先获取邮箱验证码")
    if (record.expiresAt < Date.now()) {
      mockVerificationCodes.delete(key)
      throw new Error("验证码已过期，请重新获取")
    }
    if (record.attemptCount >= 5) throw new Error("验证码尝试次数过多，请重新获取")
    if (hashCode(email, code) !== record.codeHash) {
      record.attemptCount += 1
      throw new Error("邮箱验证码错误")
    }
    mockVerificationCodes.delete(key)
    return ok({ status: "approved", email, mode: "mock" })
  }

  await ensureDemoUser(userId)
  const rows = parseRows(await query(`
    SELECT id, code_hash, attempt_count, IF(expires_at < NOW(), 1, 0) AS expired
    FROM email_verification_codes
    WHERE user_id = ${userId}
      AND email = ${sql(email)}
      AND purpose = 'campus_verify'
      AND status = 'pending'
    ORDER BY id DESC
    LIMIT 1;
  `))

  if (!rows.length) throw new Error("请先获取邮箱验证码")

  const [id, codeHash, attemptsText, expiredText] = rows[0]
  const attempts = Number(attemptsText || 0)
  if (Number(expiredText) === 1) {
    await query(`UPDATE email_verification_codes SET status = 'expired' WHERE id = ${Number(id)};`)
    throw new Error("验证码已过期，请重新获取")
  }
  if (attempts >= 5) {
    await query(`UPDATE email_verification_codes SET status = 'locked' WHERE id = ${Number(id)};`)
    throw new Error("验证码尝试次数过多，请重新获取")
  }
  if (hashCode(email, code) !== codeHash) {
    const nextStatus = attempts + 1 >= 5 ? "locked" : "pending"
    await query(`
      UPDATE email_verification_codes
      SET attempt_count = attempt_count + 1, status = ${sql(nextStatus)}
      WHERE id = ${Number(id)};
    `)
    throw new Error("邮箱验证码错误")
  }

  await query(`
    UPDATE email_verification_codes
    SET status = 'verified', verified_at = NOW(), attempt_count = attempt_count + 1
    WHERE id = ${Number(id)};

    INSERT INTO user_verifications
      (user_id, student_id_enc, real_name_enc, college, school_email, email_verified_at, status, reviewed_at)
    VALUES
      (${userId}, ${sql(data.studentId)}, ${sql(data.realName)}, ${sql(data.college)}, ${sql(email)}, NOW(), 'approved', NOW());

    UPDATE users
    SET student_id_enc = ${sql(data.studentId)},
        real_name_enc = ${sql(data.realName)},
        college = ${sql(data.college)},
        phone_enc = ${sql(data.phone || "")},
        is_verified = 1,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId};
  `)
  return ok({ status: "approved", email })
}

function formatDateTime(value) {
  const date = new Date(value)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function queryGoods(params) {
  const pageNo = Number(params.pageNo || 1)
  const pageSize = Number(params.pageSize || 6)
  const keyword = String(params.keyword || "").trim()
  const categoryId = params.categoryId || "all"
  const sortType = params.sortType || "latest"
  const condition = params.condition || ""
  const aiOnly = String(params.aiOnly || "") === "true" || params.aiOnly === true

  let list = state.goodsList.filter((item) => {
    const matchCategory = categoryId === "all" || item.categoryId === categoryId
    const matchKeyword = !keyword
      || item.title.includes(keyword)
      || item.summary.includes(keyword)
      || item.categoryName.includes(keyword)
    const matchCondition = !condition || item.conditionLabel === condition
    const matchAiOnly = !aiOnly || !!item.isAiAudit
    return matchCategory && matchKeyword && matchCondition && matchAiOnly
  })

  if (sortType === "price_asc") {
    list = list.slice().sort((a, b) => a.price - b.price)
  } else if (sortType === "price_desc") {
    list = list.slice().sort((a, b) => b.price - a.price)
  } else if (sortType === "popular") {
    list = list.slice().sort((a, b) => (b.likes + b.views) - (a.likes + a.views))
  } else {
    list = list.slice().sort((a, b) => String(b.id).localeCompare(String(a.id)))
  }

  const start = (pageNo - 1) * pageSize
  const pageList = list.slice(start, start + pageSize)
  return {
    list: pageList,
    pageNo,
    pageSize,
    total: list.length,
    hasMore: start + pageSize < list.length
  }
}

function createPublishItem(data) {
  const category = (mockData.categories || []).find((item) => item.id === data.categoryId)
  return {
    id: `g${Date.now()}`,
    title: data.title,
    summary: data.description,
    images: data.images && data.images.length ? data.images : ["https://dummyimage.com/640x480/f8bbd0/ffffff&text=Campus+Trade"],
    categoryId: data.categoryId,
    categoryName: category ? category.name : "其他",
    price: Number(data.price || 0),
    originalPrice: Number(data.price || 0),
    conditionLabel: data.conditionLabel || "正常使用",
    location: data.tradeLocation || data.deliveryLocation || data.serviceTime || "校内交易",
    sellerName: "当前用户",
    sellerCollege: "信息学院",
    creditScore: 98,
    likes: 0,
    views: 0,
    comments: 0,
    isAiAudit: true,
    isFav: false
  }
}

function createOrderFromPayload(data) {
  const id = `o${Date.now()}`
  const item = enrichOrder({
    id,
    orderSn: `ORD${Date.now()}`,
    role: "buy",
    goodsId: data.goodsId || data.serviceId || data.errandId || "",
    goodsTitle: data.goodsTitle || data.title || "新订单",
    otherParty: data.otherParty || "校园同学",
    price: Number(data.price || 0),
    createdAt: formatDateTime(Date.now()),
    status: "pending_payment",
    escrowStatus: "待支付",
    tradeType: data.tradeType || "goods",
    tradeLocation: data.tradeLocation || "",
    serviceTime: data.serviceTime || "",
    pickupLocation: data.pickupLocation || "",
    deliveryLocation: data.deliveryLocation || ""
  })
  state.timelineMap[id] = buildTimeline(item)
  state.messageMap[`order_${id}`] = [
    { id: `${id}_msg_1`, mine: false, content: "订单已创建，后续可在此处沟通细节。", time: item.createdAt }
  ]
  state.orderList.unshift(item)
  return item
}

function handleFavorite(data) {
  const target = state.goodsList.find((item) => item.id === data.goodsId)
  if (target) {
    target.isFav = !!data.favorite
  }
  return { favorite: !!data.favorite }
}

function handleOrderConfirm(orderId) {
  const target = state.orderList.find((item) => item.id === orderId)
  if (!target) throw new Error("订单不存在")
  target.status = "completed"
  target.statusLabel = "已完成"
  target.escrowStatus = "已结算"
  state.timelineMap[orderId] = buildTimeline(target)
  return enrichOrder(target)
}

function handleOrderCancel(orderId) {
  const target = state.orderList.find((item) => item.id === orderId)
  if (!target) throw new Error("订单不存在")
  target.status = "cancelled"
  target.statusLabel = "已取消"
  target.escrowStatus = "已关闭"
  state.timelineMap[orderId] = buildTimeline(target)
  return enrichOrder(target)
}

function getConversationMessages(sessionId) {
  return state.messageMap[sessionId] || [
    { id: `${sessionId}_hello`, mine: false, content: "你好，这里是当前会话。", time: formatDateTime(Date.now()) }
  ]
}

function addConversationMessage(sessionId, content) {
  if (!state.messageMap[sessionId]) {
    state.messageMap[sessionId] = []
  }
  const current = sessionState.user || {}
  const message = {
    id: `msg_${Date.now()}`,
    from: "me",
    mine: true,
    senderName: current.nickname || "我",
    senderUsername: current.username || "campus_user",
    content,
    time: nowText().slice(6),
    hash: `SHA256-${Date.now()}`
  }
  state.messageMap[sessionId].push(message)
  return message
}

function mockChatMessages(searchParams) {
  const id = searchParams.get("conversationId") || searchParams.get("sessionId")
  const businessId = searchParams.get("businessId") || searchParams.get("goodsId") || ""
  const sessionId = id || businessId || "default"
  const conversation = (sourceMock.conversations || []).find((item) => String(item.id) === String(id) || String(item.businessId) === String(businessId)) || {
    id: sessionId,
    title: searchParams.get("title") || "交易沟通",
    peer: searchParams.get("peerName") || "交易对象",
    peerUsername: searchParams.get("peerUsername") || "user",
    businessType: searchParams.get("businessType") || "goods",
    businessId
  }
  const seedMessages = clone(conversation.messages || [])
  const pendingMessages = clone(state.messageMap[sessionId] || [])
  return {
    conversation: Object.assign({}, conversation, { id: sessionId }),
    list: seedMessages.concat(pendingMessages)
  }
}

function normalizeId(value) {
  const raw = String(value || "")
  const match = raw.match(/\d+/)
  return match ? Number(match[0]) : 0
}

function collectText(payload) {
  if (!payload || typeof payload !== "object") return String(payload || "")
  return Object.keys(payload).map((key) => {
    const value = payload[key]
    if (Array.isArray(value)) return value.join(" ")
    if (value && typeof value === "object") return collectText(value)
    return String(value || "")
  }).join(" ")
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex")
}

async function getAuditKeywords() {
  const rows = await queryJson(`
    SELECT JSON_OBJECT('keywords', COALESCE(keywords, '')) AS json
    FROM ai_rules
    ORDER BY updated_at DESC, id DESC
    LIMIT 1;
  `)
  const configured = rows[0] && rows[0].keywords ? rows[0].keywords : "违规,仿冒,危险品"
  return configured.split(/[,，、\s]+/).map((item) => item.trim()).filter(Boolean)
}

async function auditPayload(payload) {
  const text = collectText(payload)
  const blocked = ["违禁", "危险品", "仿冒", "代考", "作弊", "校园贷", "网贷"].filter((keyword) => text.indexOf(keyword) >= 0)
  if (blocked.length) {
    const error = new Error(`内容包含违禁词：${blocked.join("、")}`)
    error.statusCode = 400
    throw error
  }
  const keywords = await getAuditKeywords()
  return keywords.filter((keyword) => text.indexOf(keyword) >= 0)
}

function orderStatusText(status) {
  return {
    unpaid: "待支付",
    paid: "已托管",
    confirmed: "已确认",
    shipped: "履约中",
    completed: "已完成",
    refunding: "售后中",
    refunded: "已退款",
    cancelled: "已取消",
    disputed: "申诉中"
  }[status] || status || ""
}

function fundStatusText(status) {
  return {
    none: "未托管",
    frozen: "资金托管中",
    refunding: "退款处理中",
    settled: "已结算",
    refunded: "已退款"
  }[status || "none"] || status || ""
}

function itemTypeText(type) {
  return {
    goods: "二手闲置",
    service: "校园服务",
    errand: "跑腿任务"
  }[type] || "订单"
}

async function loadDbGoodsList() {
  const rows = await queryJson(`
    SELECT JSON_OBJECT(
      'id', id,
      'sellerId', seller_id,
      'title', title,
      'category', category_name,
      'condition', condition_level,
      'price', price,
      'desc', description,
      'image', JSON_UNQUOTE(JSON_EXTRACT(COALESCE(images, JSON_ARRAY()), '$[0]')),
      'images', COALESCE(images, JSON_ARRAY()),
      'location', location,
      'status', 'on_sale',
      'sellerName', seller_name,
      'username', seller_username,
      'sellerCreditScore', seller_credit_score,
      'favoriteCount', favorite_count,
      'viewCount', view_count,
      'auditNote', 'AI审核通过',
      'comments', JSON_ARRAY()
    ) AS json
    FROM v_goods_public_list
    ORDER BY created_at DESC
    LIMIT 100;
  `)
  const categoryRows = await queryJson(`
    SELECT JSON_OBJECT('name', name) AS json
    FROM categories
    WHERE type = 'goods' AND status = 'active'
    ORDER BY sort_order, id;
  `)
  return {
    list: rows,
    categories: ["全部"].concat(categoryRows.map((item) => item.name).filter(Boolean))
  }
}

async function loadDbGoodsDetail(id) {
  const rows = await queryJson(`
    SELECT JSON_OBJECT(
      'id', g.id,
      'sellerId', g.seller_id,
      'title', g.title,
      'category', c.name,
      'condition', g.condition_level,
      'price', g.price,
      'desc', g.description,
      'image', JSON_UNQUOTE(JSON_EXTRACT(COALESCE(g.images, JSON_ARRAY()), '$[0]')),
      'images', COALESCE(g.images, JSON_ARRAY()),
      'location', g.location,
      'status', g.status,
      'sellerName', u.nickname,
      'username', u.username,
      'sellerCreditScore', u.credit_score,
      'favoriteCount', g.favorite_count,
      'viewCount', g.view_count,
      'auditNote', COALESCE(g.audit_note, 'AI审核通过'),
      'comments', JSON_ARRAY()
    ) AS json
    FROM goods g
    JOIN categories c ON c.id = g.category_id
    JOIN users u ON u.id = g.seller_id
    WHERE g.id = ${normalizeId(id)}
    LIMIT 1;
  `)
  if (!rows.length) throw new Error("商品不存在")
  return rows[0]
}

async function loadDbServiceList() {
  const services = await queryJson(`
    SELECT JSON_OBJECT(
      'id', id,
      'type', 'service',
      'title', title,
      'price', price,
      'provider', provider_name,
      'username', provider_username,
      'status', 'on_sale',
      'desc', description,
      'images', COALESCE(images, JSON_ARRAY()),
      'avgScore', avg_score,
      'category', category_name
    ) AS json
    FROM v_service_public_list
    ORDER BY created_at DESC
    LIMIT 100;
  `)
  const errands = await queryJson(`
    SELECT JSON_OBJECT(
      'id', id,
      'type', 'errand',
      'title', title,
      'price', fee,
      'provider', COALESCE(rider_name, publisher_name),
      'username', publisher_username,
      'status', status,
      'desc', description,
      'pickupLocation', pickup_location,
      'deliveryLocation', delivery_location,
      'location', CONCAT(pickup_location, ' -> ', delivery_location),
      'category', '跑腿'
    ) AS json
    FROM v_errand_hall
    ORDER BY created_at DESC
    LIMIT 100;
  `)
  return { list: services.concat(errands) }
}

async function loadDbServiceDetail(id) {
  const numericId = normalizeId(id)
  let rows = await queryJson(`
    SELECT JSON_OBJECT(
      'id', s.id,
      'type', 'service',
      'title', s.title,
      'price', s.price,
      'provider', u.nickname,
      'username', u.username,
      'status', s.status,
      'desc', s.description,
      'images', COALESCE(s.images, JSON_ARRAY()),
      'owner', JSON_OBJECT(
        'id', u.id,
        'nickname', u.nickname,
        'username', u.username,
        'role', u.role,
        'verified', u.is_verified = 1,
        'creditScore', u.credit_score,
        'college', u.college
      ),
      'ownerReviews', JSON_ARRAY()
    ) AS json
    FROM services s
    JOIN users u ON u.id = s.provider_id
    WHERE s.id = ${numericId}
    LIMIT 1;
  `)
  if (rows.length) return rows[0]
  rows = await queryJson(`
    SELECT JSON_OBJECT(
      'id', e.id,
      'type', 'errand',
      'title', e.title,
      'price', e.fee,
      'provider', publisher.nickname,
      'username', publisher.username,
      'status', e.status,
      'desc', e.description,
      'pickupLocation', e.pickup_location,
      'deliveryLocation', e.delivery_location,
      'location', CONCAT(e.pickup_location, ' -> ', e.delivery_location),
      'owner', JSON_OBJECT(
        'id', publisher.id,
        'nickname', publisher.nickname,
        'username', publisher.username,
        'role', publisher.role,
        'verified', publisher.is_verified = 1,
        'creditScore', publisher.credit_score,
        'college', publisher.college
      ),
      'ownerReviews', JSON_ARRAY()
    ) AS json
    FROM errand_orders e
    JOIN users publisher ON publisher.id = e.publisher_id
    WHERE e.id = ${numericId}
    LIMIT 1;
  `)
  if (!rows.length) throw new Error("服务不存在")
  return rows[0]
}

function decorateDbOrder(row) {
  const isErrandWaiting = row.item_type === "errand" && (row.order_status === "unpaid" || row.order_status === "paid")
  const order = {
    orderSn: row.order_sn,
    itemId: Number(row.item_id || 0),
    itemType: row.item_type,
    itemTypeText: itemTypeText(row.item_type),
    title: row.item_title || "校园交易订单",
    amount: Number(row.amount || 0).toFixed(2),
    status: row.order_status,
    statusLabel: orderStatusText(row.order_status),
    role: "buyer",
    counterpartyName: isErrandWaiting ? "待接单" : row.seller_name,
    counterpartyUsername: "",
    counterpartyLabel: row.item_type === "service" ? "服务者" : row.item_type === "errand" ? "骑手" : "卖家",
    fundText: fundStatusText(row.fund_status),
    progressText: orderStatusText(row.order_status),
    latestTime: row.completed_at || row.paid_at || row.created_at || "",
    hasRefund: row.order_status === "refunding" || row.order_status === "refunded",
    refundStatusText: row.order_status === "refunding" ? "售后处理中" : "",
    summaryEvents: []
  }
  order.counterpartyLine = `${order.counterpartyLabel}：${order.counterpartyName || "同校用户"}`
  order.canChat = !isErrandWaiting
  return order
}

async function loadDbOrders() {
  const rows = await queryRows(`
    SELECT order_sn,item_type,item_id,item_title,amount,order_status,fund_status,created_at,paid_at,completed_at,buyer_name,seller_name
    FROM v_admin_order_summary
    ORDER BY created_at DESC
    LIMIT 100;
  `, ["order_sn", "item_type", "item_id", "item_title", "amount", "order_status", "fund_status", "created_at", "paid_at", "completed_at", "buyer_name", "seller_name"])
  return { list: rows.map(decorateDbOrder) }
}

async function loadDbOrderDetail(orderSn) {
  const rows = await queryRows(`
    SELECT order_sn,item_type,item_id,item_title,amount,order_status,fund_status,created_at,paid_at,completed_at,buyer_name,seller_name
    FROM v_admin_order_summary
    WHERE order_sn = ${sql(orderSn)}
    LIMIT 1;
  `, ["order_sn", "item_type", "item_id", "item_title", "amount", "order_status", "fund_status", "created_at", "paid_at", "completed_at", "buyer_name", "seller_name"])
  if (!rows.length) throw new Error("订单不存在")
  const order = decorateDbOrder(rows[0])
  const events = await queryRows(`
    SELECT event_type, from_status, to_status, note, created_at
    FROM order_events
    WHERE order_sn = ${sql(orderSn)}
    ORDER BY created_at, id;
  `, ["event_type", "from_status", "to_status", "note", "created_at"])
  order.timeline = events.map((event, index) => ({
    id: `${orderSn}-${index}`,
    title: event.event_type || event.to_status,
    desc: event.note || `${event.from_status || ""} -> ${event.to_status || ""}`,
    time: event.created_at,
    done: true,
    className: "timeline-dot done"
  }))
  order.summaryEvents = order.timeline.slice(0, 3).map((item) => item.title)
  return order
}

async function loadDbChatList() {
  const rows = await queryJson(`
    SELECT JSON_OBJECT(
      'id', c.id,
      'title', CONCAT(c.business_type, '#', c.business_id),
      'peer', ub.nickname,
      'peerUsername', ub.username,
      'businessType', c.business_type,
      'businessId', c.business_id,
      'messages', COALESCE((
        SELECT JSON_ARRAYAGG(JSON_OBJECT(
          'id', m.id,
          'from', IF(m.sender_id = 1, 'me', 'other'),
          'senderName', us.nickname,
          'senderUsername', us.username,
          'content', m.content,
          'hash', m.content_hash,
          'previousHash', m.previous_hash,
          'time', DATE_FORMAT(m.created_at, '%m-%d %H:%i')
        ))
        FROM messages m
        JOIN users us ON us.id = m.sender_id
        WHERE m.conversation_id = c.id
      ), JSON_ARRAY())
    ) AS json
    FROM conversations c
    JOIN users ub ON ub.id = c.user_b_id
    WHERE c.user_a_id = 1 OR c.user_b_id = 1
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    LIMIT 50;
  `)
  return { list: rows }
}

async function loadDbChatMessages(searchParams) {
  const conversationId = normalizeId(searchParams.get("sessionId") || searchParams.get("conversationId"))
  let rows = []
  if (conversationId) {
    rows = await queryJson(`
      SELECT JSON_OBJECT(
        'id', c.id,
        'title', CONCAT(c.business_type, '#', c.business_id),
        'peer', IF(c.user_a_id = 1, ub.nickname, ua.nickname),
        'peerUsername', IF(c.user_a_id = 1, ub.username, ua.username),
        'businessType', c.business_type,
        'businessId', c.business_id
      ) AS json
      FROM conversations c
      JOIN users ua ON ua.id = c.user_a_id
      JOIN users ub ON ub.id = c.user_b_id
      WHERE c.id = ${conversationId}
      LIMIT 1;
    `)
  }
  const conversation = rows[0] || {
    id: conversationId || "default",
    title: "会话",
    peer: searchParams.get("peerName") || "同校用户",
    peerUsername: searchParams.get("peerUsername") || "user",
    businessType: searchParams.get("businessType") || "goods",
    businessId: searchParams.get("businessId") || searchParams.get("goodsId") || ""
  }
  if (!conversationId) return { conversation, list: getConversationMessages("default") }
  const messages = await queryJson(`
    SELECT JSON_OBJECT(
      'id', m.id,
      'from', IF(m.sender_id = 1, 'me', 'other'),
      'senderName', sender.nickname,
      'senderUsername', sender.username,
      'content', m.content,
      'hash', m.content_hash,
      'previousHash', m.previous_hash,
      'time', DATE_FORMAT(m.created_at, '%m-%d %H:%i')
    ) AS json
    FROM messages m
    JOIN users sender ON sender.id = m.sender_id
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.id;
  `)
  return { conversation, list: messages }
}

async function callProcedure(sqlText) {
  await query(sqlText)
}

async function sendDbChatMessage(data) {
  await auditPayload({ content: data.content })
  const content = String(data.content || "").trim()
  if (!content) throw new Error("消息内容不能为空")
  const businessType = data.businessType || (data.goodsId ? "goods" : "service")
  const businessId = normalizeId(data.businessId || data.goodsId || data.id)
  let conversationId = normalizeId(data.conversationId || data.sessionId)
  let peerId = 2
  if (!conversationId && businessType === "goods" && businessId) {
    const goodsRows = await queryRows(`SELECT seller_id FROM goods WHERE id = ${businessId} LIMIT 1;`, ["seller_id"])
    peerId = goodsRows[0] ? Number(goodsRows[0].seller_id) : peerId
  } else if (!conversationId && businessType === "service" && businessId) {
    const serviceRows = await queryRows(`SELECT provider_id FROM services WHERE id = ${businessId} LIMIT 1;`, ["provider_id"])
    peerId = serviceRows[0] ? Number(serviceRows[0].provider_id) : peerId
  } else if (!conversationId && businessType === "errand" && businessId) {
    const errandRows = await queryRows(`SELECT publisher_id FROM errand_orders WHERE id = ${businessId} LIMIT 1;`, ["publisher_id"])
    peerId = errandRows[0] ? Number(errandRows[0].publisher_id) : peerId
  }
  if (peerId === 1) peerId = 2
  const sessionType = businessType === "errand" ? "task_chat" : `${businessType}_chat`
  await ensureDemoUser(1)
  await ensureDemoUser(peerId)
  if (!conversationId) {
    await query(`
      INSERT INTO conversations
        (session_type, business_type, business_id, user_a_id, user_b_id, last_message_at)
      VALUES
        (${sql(sessionType)}, ${sql(businessType)}, ${businessId || 0}, 1, ${peerId}, NOW())
      ON DUPLICATE KEY UPDATE last_message_at = NOW();
    `)
    const rows = await queryRows(`
      SELECT id
      FROM conversations
      WHERE business_type = ${sql(businessType)}
        AND business_id = ${businessId || 0}
        AND user_a_id = 1
        AND user_b_id = ${peerId}
      LIMIT 1;
    `, ["id"])
    conversationId = rows[0] ? Number(rows[0].id) : 0
  }
  const peerRows = await queryRows(`
    SELECT IF(user_a_id = 1, user_b_id, user_a_id) AS peer_id
    FROM conversations
    WHERE id = ${conversationId}
    LIMIT 1;
  `, ["peer_id"])
  const receiverId = peerRows[0] ? Number(peerRows[0].peer_id) : peerId
  const prevRows = await queryRows(`
    SELECT content_hash
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY id DESC
    LIMIT 1;
  `, ["content_hash"])
  const previousHash = prevRows[0] ? prevRows[0].content_hash : null
  const contentHash = sha256(`${conversationId}:${previousHash || ""}:${content}`)
  await query(`
    INSERT INTO messages
      (conversation_id, sender_id, receiver_id, message_type, content, content_hash, previous_hash, status)
    VALUES
      (${conversationId}, 1, ${receiverId}, 'text', ${sql(content)}, ${sql(contentHash)}, ${sql(previousHash)}, 'normal');
    UPDATE conversations
    SET last_message_at = NOW()
    WHERE id = ${conversationId};
  `)
  return {
    id: Date.now(),
    conversationId,
    from: "me",
    content,
    hash: contentHash,
    previousHash
  }
}

async function createGoodsOrder(data) {
  const goodsId = normalizeId(data.goodsId || data.id)
  const sellerRows = await queryRows(`
    SELECT seller_id
    FROM goods
    WHERE id = ${goodsId}
    LIMIT 1;
  `, ["seller_id"])
  if (!sellerRows.length) throw new Error("商品不存在")
  if (Number(sellerRows[0].seller_id) === 1) throw new Error("不能购买自己发布的商品")
  const orderSn = `CT${Date.now()}`
  await callProcedure(`CALL sp_create_goods_order(${sql(orderSn)}, 1, ${goodsId}, ${sql(data.remark || "")});`)
  return { orderSn, status: "unpaid" }
}

async function publishGoods(data) {
  const hitKeywords = await auditPayload(data)
  const categoryName = data.category || data.categoryName || "教材资料"
  const status = hitKeywords.length ? "pending" : "on_sale"
  const images = JSON.stringify(data.images || [])
  await ensureDemoUser(1)
  await query(`
    INSERT INTO categories (name, type, sort_order, status)
    VALUES (${sql(categoryName)}, 'goods', 99, 'active')
    ON DUPLICATE KEY UPDATE status = 'active';
  `)
  const rows = await queryRows(`
    INSERT INTO goods
      (seller_id, category_id, title, price, condition_level, description, images, location, status, audit_note, is_ai_generated)
    VALUES
      (1,
       (SELECT id FROM categories WHERE name = ${sql(categoryName)} AND type = 'goods' LIMIT 1),
       ${sql(data.title || "未命名闲置")},
       ${Number(data.price || 0) || 0.01},
       ${sql(data.condition || "八成新")},
       ${sql(data.desc || data.description || "")},
       CAST(${sql(images)} AS JSON),
       ${sql(data.location || "校内自提")},
       ${sql(status)},
       ${sql(status === "pending" ? `命中AI复核关键词：${hitKeywords.join("、")}` : "AI审核通过")},
       ${data.isAiGenerated ? 1 : 0});
    SELECT LAST_INSERT_ID();
  `, ["id"])
  return { goodsId: rows[0] ? Number(rows[0].id) : 0, status }
}

async function createServiceOrder(data) {
  const serviceId = normalizeId(data.serviceId || data.id)
  const rows = await queryRows(`
    SELECT provider_id
    FROM services
    WHERE id = ${serviceId}
    LIMIT 1;
  `, ["provider_id"])
  if (!rows.length) throw new Error("链尾服务不存在")
  if (Number(rows[0].provider_id) === 1) throw new Error("不能预约自己发布的服务")
  const orderSn = `SV${Date.now()}`
  await ensureDemoUser(1)
  await query(`
    INSERT INTO orders
      (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark)
    SELECT
      ${sql(orderSn)}, 1, s.provider_id, 'service', s.id,
      JSON_OBJECT('title', s.title, 'price', s.price),
      s.price, 'unpaid', ${sql(data.remark || "服务预约")}
    FROM services s
    WHERE s.id = ${serviceId} AND s.status = 'on_sale';
  `)
  const countRows = await queryRows(`SELECT COUNT(*) FROM orders WHERE order_sn = ${sql(orderSn)};`, ["count"])
  if (!countRows[0] || Number(countRows[0].count || 0) === 0) throw new Error("服务不可预约")
  await query(`
    INSERT INTO order_events (order_sn, from_status, to_status, operator_id, event_type, note)
    VALUES (${sql(orderSn)}, NULL, 'unpaid', 1, 'create', '创建服务预约订单');
  `)
  return { orderSn, status: "unpaid" }
}

async function publishService(data) {
  const hitKeywords = await auditPayload(data)
  const categoryName = data.category || data.categoryName || "学习辅导"
  const status = hitKeywords.length ? "pending" : "on_sale"
  const images = JSON.stringify(data.images || [])
  await ensureDemoUser(1)
  await query(`
    INSERT INTO categories (name, type, sort_order, status)
    VALUES (${sql(categoryName)}, 'service', 99, 'active')
    ON DUPLICATE KEY UPDATE status = 'active';
  `)
  const rows = await queryRows(`
    INSERT INTO services
      (provider_id, category_id, title, price, description, images, status)
    VALUES
      (1,
       (SELECT id FROM categories WHERE name = ${sql(categoryName)} AND type = 'service' LIMIT 1),
       ${sql(data.title || "校园服务")},
       ${Number(data.price || 0) || 0.01},
       ${sql(data.desc || data.description || "")},
       CAST(${sql(images)} AS JSON),
       ${sql(status)});
    SELECT LAST_INSERT_ID();
  `, ["id"])
  return { id: rows[0] ? Number(rows[0].id) : 0, status }
}

async function publishErrand(data) {
  await auditPayload(data)
  const fee = Number(data.price || data.fee || 0) || 0.01
  const orderSn = `ER${Date.now()}`
  await ensureDemoUser(1)
  await ensureDemoUser(99)
  const rows = await queryRows(`
    INSERT INTO errand_orders
      (publisher_id, title, description, pickup_location, delivery_location, fee, status)
    VALUES
      (1,
       ${sql(data.title || "跑腿任务")},
       ${sql(data.desc || data.description || "")},
       ${sql(data.pickupLocation || data.pickup_location || "校内取件点")},
       ${sql(data.deliveryLocation || data.delivery_location || "校内送达点")},
       ${fee},
        'unpaid');
    SELECT LAST_INSERT_ID();
  `, ["id"])
  const errandId = rows[0] ? Number(rows[0].id) : 0
  await query(`
    INSERT INTO errand_events (errand_id, operator_id, event_type, from_status, to_status, remark)
    VALUES (${errandId}, 1, 'publish', NULL, 'unpaid', '用户发布跑腿任务，等待支付');
  `)
  await query(`
    INSERT INTO orders
      (order_sn, buyer_id, seller_id, item_type, item_id, item_snapshot, amount, status, remark)
    VALUES
      (${sql(orderSn)}, 1, 99, 'errand', ${errandId},
       JSON_OBJECT('title', ${sql(data.title || "跑腿任务")}, 'price', ${fee}, 'pickup_location', ${sql(data.pickupLocation || "")}, 'delivery_location', ${sql(data.deliveryLocation || "")}),
       ${fee}, 'unpaid', ${sql(data.desc || data.description || "")});
  `)
  await query(`
    INSERT INTO order_events (order_sn, from_status, to_status, operator_id, event_type, note)
    VALUES (${sql(orderSn)}, NULL, 'unpaid', 1, 'create', '创建跑腿支付订单');
  `)
  return { id: errandId, orderSn, status: "unpaid" }
}

async function mutateOrder(action, data) {
  const orderSn = data.orderSn
  if (!orderSn) throw new Error("缺少订单号")
  if (action === "pay") await callProcedure(`CALL sp_pay_order(${sql(orderSn)}, 1);`)
  else if (action === "ship") {
    const rows = await queryRows(`SELECT seller_id FROM orders WHERE order_sn = ${sql(orderSn)} LIMIT 1;`, ["seller_id"])
    await callProcedure(`CALL sp_ship_order(${sql(orderSn)}, ${rows[0] ? Number(rows[0].seller_id) : 1});`)
  }
  else if (action === "receive") await callProcedure(`CALL sp_confirm_receive(${sql(orderSn)}, 1);`)
  else if (action === "refund") await callProcedure(`CALL sp_apply_refund(${sql(orderSn)}, 1, ${sql(data.reason || "申请售后")}, ${sql("[]")});`)
  else throw new Error("不支持的订单操作")
  return { status: action }
}

async function cancelOrder(data) {
  const orderSn = data.orderSn
  if (!orderSn) throw new Error("缺少订单号")
  const rows = await queryRows(`
    SELECT item_type, item_id, status
    FROM orders
    WHERE order_sn = ${sql(orderSn)}
    LIMIT 1;
  `, ["item_type", "item_id", "status"])
  if (!rows.length) throw new Error("订单不存在")
  if (rows[0].status !== "unpaid") throw new Error("只有未付款订单可以直接取消")
  await query(`
    UPDATE orders
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE order_sn = ${sql(orderSn)}
      AND status = 'unpaid';
    INSERT INTO order_events (order_sn, from_status, to_status, operator_id, event_type, note)
    VALUES (${sql(orderSn)}, 'unpaid', 'cancelled', 1, 'cancel', ${sql(data.reason || "用户主动取消")});
  `)
  if (rows[0].item_type === "goods") {
    await query(`
      UPDATE goods
      SET status = 'on_sale',
          updated_at = NOW()
      WHERE id = ${normalizeId(rows[0].item_id)}
        AND status = 'reserved';
    `)
  } else if (rows[0].item_type === "errand") {
    await query(`
      UPDATE errand_orders
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE id = ${normalizeId(rows[0].item_id)}
        AND status IN ('unpaid','waiting_accept');
    `)
  }
  return { status: "cancelled" }
}

async function takeErrand(data) {
  const errandId = normalizeId(data.id)
  const rows = await queryRows(`
    SELECT publisher_id
    FROM errand_orders
    WHERE id = ${errandId}
    LIMIT 1;
  `, ["publisher_id"])
  if (!rows.length) throw new Error("跑腿任务不存在")
  if (Number(rows[0].publisher_id) === 6) throw new Error("不能抢自己发布的跑腿任务")
  await callProcedure(`CALL sp_take_errand(${errandId}, 6);`)
  const orderRows = await queryRows(`
    SELECT order_sn
    FROM orders
    WHERE item_type = 'errand' AND item_id = ${errandId}
    ORDER BY created_at DESC
    LIMIT 1;
  `, ["order_sn"])
  return { status: "accepted", orderSn: orderRows[0] ? orderRows[0].order_sn : "" }
}

async function handleApiGet(pathname, searchParams) {
  if (pathname === "/api/status") {
    return ok({
      service: "campus-trade-backend",
      mysql: config.dbName,
      emailMode: config.mockEmail ? "mock" : "smtp",
      verifyMode: config.mockVerify ? "mock" : "mysql",
      smtpConfigured: Boolean(config.smtpHost && config.smtpUser && config.smtpPass),
      demoApiReady: true
    })
  }
  if (pathname === "/api/goods/list") return ok(await withMockFallback(() => loadDbGoodsList(), mockGoodsList))
  if (pathname === "/api/goods/detail") return ok(await withMockFallback(() => loadDbGoodsDetail(searchParams.get("id")), () => mockGoodsDetail(searchParams.get("id"))))
  if (pathname === "/api/order/list" || pathname === "/api/orders/list") return ok(await withMockFallback(() => loadDbOrders(), mockOrderList))
  if (pathname === "/api/order/detail" || pathname === "/api/orders/detail") {
    return ok(await withMockFallback(() => loadDbOrderDetail(searchParams.get("orderSn") || searchParams.get("orderId")), () => mockOrderDetail(searchParams.get("orderSn") || searchParams.get("orderId"))))
  }
  if (pathname === "/api/chat/list") return ok(await withMockFallback(() => loadDbChatList(), () => ({ list: clone(sourceMock.conversations || []) })))
  if (pathname === "/api/chat/messages") return ok(await withMockFallback(() => loadDbChatMessages(searchParams), () => mockChatMessages(searchParams)))
  if (pathname === "/api/service/list" || pathname === "/api/services/list" || pathname === "/api/errands/list") return ok(await withMockFallback(() => loadDbServiceList(), mockServiceList))
  if (pathname === "/api/service/detail") return ok(await withMockFallback(() => loadDbServiceDetail(searchParams.get("id")), () => mockServiceDetail(searchParams.get("id"))))
  const compatiblePayload = compatibilityGet(pathname, searchParams)
  if (compatiblePayload) return compatiblePayload
  if (pathname === "/api/goods/list") {
    return ok(queryGoods(Object.fromEntries(searchParams.entries())))
  }
  if (pathname === "/api/goods/detail") {
    const item = state.goodsList.find((goods) => goods.id === searchParams.get("id"))
    if (!item) throw new Error("商品不存在")
    return ok(item)
  }
  if (pathname === "/api/orders/list") {
    return ok({ list: state.orderList.map(enrichOrder) })
  }
  if (pathname === "/api/orders/detail") {
    const order = state.orderList.find((item) => item.id === searchParams.get("orderId"))
    if (!order) throw new Error("订单不存在")
    return ok(enrichOrder(order))
  }
  if (pathname === "/api/orders/timeline") {
    const orderId = searchParams.get("orderId")
    return ok({ list: state.timelineMap[orderId] || [] })
  }
  if (pathname === "/api/chat/messages") {
    const sessionId = searchParams.get("sessionId") || "default"
    return ok({ list: getConversationMessages(sessionId) })
  }
  if (pathname === "/api/services/list") {
    return ok({ list: state.serviceList })
  }
  if (pathname === "/api/errands/list") {
    return ok({ list: state.errandList })
  }
  return null
}

async function handleApiPost(pathname, data) {
  const compatiblePayload = compatibilityPost(pathname, data)
  if (compatiblePayload) return compatiblePayload

  if (pathname === "/api/user/email-code") return handleSendCode(data)
  if (pathname === "/api/user/verify") return handleVerify(data)

  if (pathname === "/api/goods/save" || pathname === "/api/goods/publish") return ok(await withMockFallback(() => publishGoods(data), () => {
    const item = Object.assign({
      id: Date.now(),
      sellerId: sessionState.user.id,
      sellerName: sessionState.user.nickname,
      username: sessionState.user.username,
      status: "pending",
      favorite: false,
      favoriteCount: 0,
      comments: []
    }, data || {})
    ;(sourceMock.goods || []).unshift(item)
    return { id: item.id, status: item.status }
  }))
  if (pathname === "/api/service/save") {
    return ok(await withMockFallback(() => data.type === "errand" ? publishErrand(data) : publishService(data), () => {
      const item = Object.assign({
        id: Date.now(),
        provider: sessionState.user.nickname,
        username: sessionState.user.username,
        status: data.type === "errand" ? "unpaid" : "on_sale"
      }, data || {})
      ;(sourceMock.services || []).unshift(item)
      return { id: item.id, status: item.status, orderSn: data.type === "errand" ? `ER${Date.now()}` : undefined }
    }))
  }
  if (pathname === "/api/service/order" || pathname === "/api/services/orders/create") return ok(await withMockFallback(() => createServiceOrder(data), () => ({ orderSn: `SV${Date.now()}`, status: "unpaid" })))
  if (pathname === "/api/order/create" || pathname === "/api/orders/create") return ok(await withMockFallback(() => createGoodsOrder(data), () => ({ orderSn: `CT${Date.now()}`, status: "unpaid" })))
  if (pathname === "/api/order/pay") return ok(await withMockFallback(() => mutateOrder("pay", data), () => ({ status: "paid" })))
  if (pathname === "/api/order/cancel" || pathname === "/api/orders/cancel") return ok(await withMockFallback(() => cancelOrder(data), () => ({ status: "cancelled" })))
  if (pathname === "/api/order/ship") return ok(await withMockFallback(() => mutateOrder("ship", data), () => ({ status: "shipped" })))
  if (pathname === "/api/order/receive" || pathname === "/api/orders/confirm") return ok(await withMockFallback(() => mutateOrder("receive", data), () => ({ status: "completed" })))
  if (pathname === "/api/order/refund") return ok(await withMockFallback(() => mutateOrder("refund", data), () => ({ status: "refunding" })))
  if (pathname === "/api/rider/take" || pathname === "/api/errands/accept") return ok(await withMockFallback(() => takeErrand(data), () => ({ status: "accepted", orderSn: `ER${Date.now()}` })))

  if (pathname === "/api/goods/favorite") return ok(handleFavorite(data))
  if (pathname === "/api/goods/publish") {
    const item = createPublishItem(data)
    state.goodsList.unshift(item)
    return ok({ id: item.id, auditStatus: "pending" })
  }
  if (pathname === "/api/files/upload-credential") {
    return ok({
      uploadUrl: "/api/files/upload",
      url: `https://mock.local/${Date.now()}.jpg`
    })
  }
  if (pathname === "/api/ai/generate") {
    return ok({
      title: data.title || "AI 推荐标题",
      description: data.description || "AI 已生成基础描述，可继续手动修改。"
    })
  }
  if (pathname === "/api/orders/create") {
    const goods = state.goodsList.find((item) => item.id === data.goodsId)
    const order = createOrderFromPayload({
      goodsId: data.goodsId,
      goodsTitle: goods ? goods.title : "商品订单",
      price: goods ? goods.price : 0,
      otherParty: goods ? goods.sellerName : "校园同学",
      tradeType: "goods",
      tradeLocation: goods ? goods.location : ""
    })
    return ok(order)
  }
  if (pathname === "/api/orders/cancel") {
    return ok(handleOrderCancel(data.orderId))
  }
  if (pathname === "/api/orders/confirm") {
    return ok(handleOrderConfirm(data.orderId))
  }
  if (pathname === "/api/chat/send") {
    return ok(await withMockFallback(() => sendDbChatMessage(data), () => {
      const content = String(data.content || "").trim()
      if (!content) throw new Error("消息内容不能为空")
      const sessionId = data.conversationId || data.sessionId || data.businessId || data.goodsId || "default"
      const message = addConversationMessage(sessionId, content)
      return Object.assign({ status: "sent", conversationId: sessionId }, message)
    }))
  }
  if (pathname === "/api/services/publish") {
    const service = {
      id: `s${Date.now()}`,
      title: data.title,
      description: data.description,
      category: data.categoryId || "其他",
      price: Number(data.price || 0),
      unit: "次",
      provider: "当前用户",
      rating: 5,
      completedOrders: 0,
      tags: [data.serviceTime || "可预约"]
    }
    state.serviceList.unshift(service)
    return ok({ id: service.id })
  }
  if (pathname === "/api/services/orders/create") {
    const order = createOrderFromPayload({
      serviceId: data.serviceId,
      title: data.title || "服务预约订单",
      price: data.price || 0,
      tradeType: "service",
      serviceTime: data.serviceTime || "待沟通"
    })
    return ok(order)
  }
  if (pathname === "/api/errands/publish") {
    const errand = {
      id: `e${Date.now()}`,
      title: data.title,
      type: "help",
      reward: Number(data.price || 0),
      from: data.pickupLocation,
      to: data.deliveryLocation,
      deadline: "待沟通",
      status: "waiting_accept",
      publisher: "当前用户"
    }
    state.errandList.unshift(errand)
    const order = createOrderFromPayload({
      errandId: errand.id,
      title: data.title,
      price: data.price,
      tradeType: "errand",
      pickupLocation: data.pickupLocation,
      deliveryLocation: data.deliveryLocation
    })
    return ok({ id: errand.id, orderId: order.id })
  }
  if (pathname === "/api/errands/accept") {
    return ok({ accepted: true })
  }
  if (pathname === "/api/errands/status") {
    return ok({ updated: true })
  }
  return null
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
}

function foldBase64(value) {
  return Buffer.from(value, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n")
}

async function sendVerificationEmail(email, code) {
  if (config.mockEmail) {
    console.log(`[mock-email] ${email} verification code: ${code}`)
    return { mode: "mock", demoCode: code }
  }
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !config.smtpFrom) {
    throw new Error("SMTP not configured")
  }

  const subject = "校园交易邮箱验证码"
  const body = [
    "你好，",
    "",
    `你的学校邮箱验证码是：${code}`,
    "验证码 5 分钟内有效，请勿转发给他人。",
    "",
    "如果不是你本人操作，请忽略这封邮件。"
  ].join("\n")

  const message = [
    `From: ${encodeHeader(config.smtpFromName)} <${config.smtpFrom}>`,
    `To: <${email}>`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    foldBase64(body)
  ].join("\r\n")

  await smtpSend(email, message)
  return { mode: "smtp" }
}

function smtpSend(to, message) {
  return new Promise((resolve, reject) => {
    let socket
    let buffer = ""
    const timeout = setTimeout(() => {
      if (socket) socket.destroy()
      reject(new Error("SMTP timeout"))
    }, 20000)

    function cleanup(error) {
      clearTimeout(timeout)
      if (socket) socket.end()
      if (error) reject(error)
      else resolve()
    }

    function readResponse() {
      return new Promise((resolveRead, rejectRead) => {
        function onData(chunk) {
          buffer += chunk.toString("utf8")
          const lines = buffer.split(/\r?\n/)
          const lastComplete = lines.slice(0, -1).reverse().find((line) => /^\d{3} /.test(line))
          if (lastComplete) {
            socket.off("data", onData)
            const response = buffer.trim()
            buffer = ""
            resolveRead(response)
          }
        }
        socket.on("data", onData)
        socket.once("error", rejectRead)
      })
    }

    async function command(line, expectPrefix) {
      socket.write(`${line}\r\n`)
      const response = await readResponse()
      if (expectPrefix && !String(response).startsWith(expectPrefix)) {
        throw new Error(`SMTP command failed: ${line} -> ${response}`)
      }
      return response
    }

    async function run() {
      const secureConnect = () => tls.connect({
        host: config.smtpHost,
        port: config.smtpPort,
        servername: config.smtpHost
      })
      const plainConnect = () => net.connect({ host: config.smtpHost, port: config.smtpPort })

      socket = config.smtpSecure ? secureConnect() : plainConnect()
      socket.setEncoding("utf8")
      await new Promise((resolveConnect, rejectConnect) => {
        socket.once("secureConnect", resolveConnect)
        socket.once("connect", resolveConnect)
        socket.once("error", rejectConnect)
      })
      const greeting = await readResponse()
      if (!greeting.startsWith("220")) throw new Error(`SMTP connect failed: ${greeting}`)
      await command(`EHLO ${config.smtpHost}`, "250")
      if (!config.smtpSecure && config.smtpPort === 587) {
        await command("STARTTLS", "220")
        socket = tls.connect({ socket, servername: config.smtpHost })
        socket.setEncoding("utf8")
        await new Promise((resolveTls, rejectTls) => {
          socket.once("secureConnect", resolveTls)
          socket.once("error", rejectTls)
        })
        await command(`EHLO ${config.smtpHost}`, "250")
      }
      await command("AUTH LOGIN", "334")
      await command(Buffer.from(config.smtpUser).toString("base64"), "334")
      await command(Buffer.from(config.smtpPass).toString("base64"), "235")
      await command(`MAIL FROM:<${config.smtpFrom}>`, "250")
      await command(`RCPT TO:<${to}>`, "250")
      await command("DATA", "354")
      socket.write(`${message}\r\n.\r\n`)
      const sent = await readResponse()
      if (!sent.startsWith("250")) throw new Error(`SMTP send failed: ${sent}`)
      await command("QUIT")
      cleanup()
    }

    run().catch(cleanup)
  })
}

async function route(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, ok({}))

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)

  try {
    if (req.method === "POST" && url.pathname === "/api/files/upload") {
      return json(res, 200, ok({ url: `http://127.0.0.1:${config.port}/uploads/${Date.now()}.jpg` }))
    }

    if (req.method === "GET") {
      const payload = await handleApiGet(url.pathname, url.searchParams)
      if (payload) return json(res, 200, payload)
      return json(res, 404, fail("接口不存在", 404))
    }

    if (req.method === "POST") {
      const data = await readJson(req)
      const payload = await handleApiPost(url.pathname, data)
      if (payload) return json(res, 200, payload)
      return json(res, 404, fail("接口不存在", 404))
    }

    return json(res, 405, fail("method not allowed", 405))
  } catch (error) {
    return json(res, 200, fail(error.message || "server error"))
  }
}

const server = http.createServer(route)

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${config.port} is already in use. The backend is probably already running.`)
    console.error(`Open http://127.0.0.1:${config.port}/api/status to check it, or close the old Node window before restarting.`)
    process.exit(0)
  }
  throw error
})

server.listen(config.port, () => {
  console.log(`campus-trade backend listening on http://127.0.0.1:${config.port}`)
})
