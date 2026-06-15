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
  dbPassword: process.env.DB_PASSWORD || "",
  dbHost: process.env.DB_HOST || "127.0.0.1",
  mysqlBin: process.env.MYSQL_BIN || "mysql",
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
    throw new Error("Missing BACKEND_ENV_KEY or backend/.env.key for encrypted env")
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
    const fullArgs = ["--batch", "--raw", "--skip-column-names", "-h", config.dbHost, "-u", config.dbUser]
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
  const message = {
    id: `msg_${Date.now()}`,
    mine: true,
    content,
    time: formatDateTime(Date.now())
  }
  state.messageMap[sessionId].push(message)
  return message
}

function handleApiGet(pathname, searchParams) {
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
  if (pathname === "/api/user/email-code") return handleSendCode(data)
  if (pathname === "/api/user/verify") return handleVerify(data)

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
    const content = String(data.content || "").trim()
    if (!content) throw new Error("消息内容不能为空")
    return ok(addConversationMessage(data.sessionId || "default", content))
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
    if (req.method === "GET") {
      const payload = handleApiGet(url.pathname, url.searchParams)
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

http.createServer(route).listen(config.port, () => {
  console.log(`campus-trade backend listening on http://127.0.0.1:${config.port}`)
})
