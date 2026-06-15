const http = require('http')
const net = require('net')
const tls = require('tls')
const crypto = require('crypto')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const envPath = path.join(ROOT, '.env')
const encryptedEnvPath = path.join(ROOT, '.env.enc')
const ignorePlainEnv = process.env.BACKEND_IGNORE_PLAIN_ENV === '1'
if (!ignorePlainEnv && fs.existsSync(envPath)) {
  loadEnv(envPath)
} else {
  loadEncryptedEnv(encryptedEnvPath)
}

const config = {
  port: Number(process.env.PORT || 3001),
  dbName: process.env.DB_NAME || 'campus_trade',
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  dbHost: process.env.DB_HOST || '127.0.0.1',
  mysqlBin: process.env.MYSQL_BIN || 'mysql',
  codeSecret: process.env.CODE_SECRET || 'campus-trade-local-secret',
  mockEmail: String(process.env.MOCK_EMAIL || process.env.VIRTUAL_EMAIL || 'false') === 'true',
  mockVerify: String(process.env.MOCK_VERIFY || 'false') === 'true',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: String(process.env.SMTP_SECURE || 'true') !== 'false',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  smtpFromName: process.env.SMTP_FROM_NAME || '校园二手交易平台'
}

const mockVerificationCodes = new Map()

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  loadEnvText(fs.readFileSync(file, 'utf8'))
}

function loadEnvText(text) {
  const lines = text.split(/\r?\n/)
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const index = trimmed.indexOf('=')
    if (index < 0) return
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  })
}

function loadEncryptedEnv(file) {
  if (!fs.existsSync(file)) return
  const keyFile = path.join(ROOT, '.env.key')
  const keyMaterial = process.env.BACKEND_ENV_KEY
    || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8').trim() : '')
  if (!keyMaterial) {
    throw new Error('发现 backend/.env.enc，但缺少解密密钥。请设置 BACKEND_ENV_KEY 或保留 backend/.env.key')
  }
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (payload.version !== 1 || payload.algorithm !== 'aes-256-gcm') {
    throw new Error('不支持的 .env.enc 格式')
  }
  const salt = Buffer.from(payload.salt, 'base64')
  const iv = Buffer.from(payload.iv, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')
  const ciphertext = Buffer.from(payload.ciphertext, 'base64')
  const key = crypto.pbkdf2Sync(keyMaterial, salt, payload.iterations || 310000, 32, 'sha256')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  loadEnvText(plaintext)
}

function json(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization'
  })
  res.end(JSON.stringify(payload))
}

function ok(data) {
  return { code: 200, msg: 'success', data: data || {} }
}

function fail(msg, data) {
  return { code: 400, msg, data: data || {} }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1024 * 1024) {
        req.destroy()
        reject(new Error('request body too large'))
      }
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch (err) {
        reject(new Error('invalid json body'))
      }
    })
    req.on('error', reject)
  })
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function hashCode(email, code) {
  return crypto
    .createHash('sha256')
    .update(`${String(email).toLowerCase()}:${code}:${config.codeSecret}`)
    .digest('hex')
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

function mysql(args, input) {
  return new Promise((resolve, reject) => {
    const bin = fs.existsSync(config.mysqlBin) ? config.mysqlBin : 'mysql'
    const fullArgs = [
      '--batch',
      '--raw',
      '--skip-column-names',
      '-h',
      config.dbHost,
      '-u',
      config.dbUser
    ]
    if (config.dbPassword) fullArgs.push(`-p${config.dbPassword}`)
    if (config.dbName) fullArgs.push(config.dbName)
    fullArgs.push(...args)
    const child = spawn(bin, fullArgs, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8') })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8') })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `mysql exited with ${code}`))
      resolve(stdout)
    })
    if (input) child.stdin.write(input)
    child.stdin.end()
  })
}

async function query(sqlText) {
  return mysql(['-e', sqlText])
}

function parseRows(stdout) {
  return stdout
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split('\t'))
}

async function ensureDemoUser(userId) {
  await query(`
    INSERT INTO users
      (id, openid, nickname, username, role, status, is_verified, credit_score, balance, frozen_balance)
    VALUES
      (${Number(userId)}, ${sql(`mock-openid-${userId}`)}, '校园同学', ${sql(userId === 1 ? 'campus_user' : `user_${userId}`)}, 'user', 'active', 0, 100, 128.60, 0.00)
    ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
  `)
}

function assertCampusEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!/^[a-z0-9._%+-]+@cau\.edu\.cn$/.test(normalized)) {
    throw new Error('请使用 @cau.edu.cn 学校邮箱')
  }
  return normalized
}

async function handleSendCode(data) {
  const email = assertCampusEmail(data.email)
  const userId = Number(data.userId || 1)
  const code = randomCode()
  const codeHash = hashCode(email, code)
  if (config.mockVerify) {
    // 本地演示模式：只在内存中保存验证码，避免依赖 mysql.exe 子进程。
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
  const code = String(data.emailCode || '').trim()
  if (!/^\d{6}$/.test(code)) throw new Error('请输入6位邮箱验证码')
  if (!data.studentId || !data.realName || !data.college) throw new Error('请补全学号、姓名和学院')
  if (!/^\d{8,12}$/.test(String(data.studentId).trim())) throw new Error('学号应为8-12位数字')
  if (!/^[\u4e00-\u9fa5A-Za-z·]{2,20}$/.test(String(data.realName).trim())) throw new Error('姓名格式不正确')
  if (config.mockVerify) {
    const key = `${userId}:${email}`
    const record = mockVerificationCodes.get(key)
    if (!record) throw new Error('请先获取邮箱验证码')
    if (record.expiresAt < Date.now()) {
      mockVerificationCodes.delete(key)
      throw new Error('验证码已过期，请重新获取')
    }
    if (record.attemptCount >= 5) throw new Error('验证码尝试次数过多，请重新获取')
    if (hashCode(email, code) !== record.codeHash) {
      record.attemptCount += 1
      throw new Error('邮箱验证码错误')
    }
    mockVerificationCodes.delete(key)
    return ok({ status: 'approved', email, mode: 'mock' })
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
  if (!rows.length) throw new Error('请先获取邮箱验证码')
  const [id, codeHash, attemptsText, expiredText] = rows[0]
  const attempts = Number(attemptsText || 0)
  if (Number(expiredText) === 1) {
    await query(`UPDATE email_verification_codes SET status = 'expired' WHERE id = ${Number(id)};`)
    throw new Error('验证码已过期，请重新获取')
  }
  if (attempts >= 5) {
    await query(`UPDATE email_verification_codes SET status = 'locked' WHERE id = ${Number(id)};`)
    throw new Error('验证码尝试次数过多，请重新获取')
  }
  if (hashCode(email, code) !== codeHash) {
    const nextStatus = attempts + 1 >= 5 ? 'locked' : 'pending'
    await query(`
      UPDATE email_verification_codes
      SET attempt_count = attempt_count + 1, status = ${sql(nextStatus)}
      WHERE id = ${Number(id)};
    `)
    throw new Error('邮箱验证码错误')
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
        phone_enc = ${sql(data.phone || '')},
        is_verified = 1,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId};
  `)
  return ok({ status: 'approved', email })
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function foldBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n')
}

async function sendVerificationEmail(email, code) {
  // 本地演示可开启虚拟邮箱模式，不依赖真实 SMTP 授权码。
  if (config.mockEmail) {
    console.log(`[mock-email] ${email} verification code: ${code}`)
    return { mode: 'mock', demoCode: code }
  }
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !config.smtpFrom) {
    throw new Error('邮件服务未配置，请填写 backend/.env 中的 SMTP_HOST、SMTP_USER、SMTP_PASS、SMTP_FROM')
  }
  const subject = '校园二手交易平台邮箱验证码'
  const body = [
    '你好：',
    '',
    `你的学校邮箱验证码是：${code}`,
    '验证码 5 分钟内有效，请勿转发给他人。',
    '',
    '如果不是你本人操作，请忽略这封邮件。'
  ].join('\n')
  const message = [
    `From: ${encodeHeader(config.smtpFromName)} <${config.smtpFrom}>`,
    `To: <${email}>`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    foldBase64(body)
  ].join('\r\n')
  await smtpSend(email, message)
}

function smtpSend(to, message) {
  return new Promise((resolve, reject) => {
    let socket
    let buffer = ''
    const timeout = setTimeout(() => {
      if (socket) socket.destroy()
      reject(new Error('SMTP连接超时'))
    }, 20000)

    function cleanup(err) {
      clearTimeout(timeout)
      if (socket) socket.end()
      if (err) reject(err)
      else resolve()
    }

    function readResponse() {
      return new Promise((resolveRead, rejectRead) => {
        function onData(chunk) {
          buffer += chunk.toString('utf8')
          const lines = buffer.split(/\r?\n/)
          const lastComplete = lines.slice(0, -1).reverse().find((line) => /^\d{3} /.test(line))
          if (lastComplete) {
            socket.off('data', onData)
            const response = buffer.trim()
            buffer = ''
            resolveRead(response)
          }
        }
        socket.on('data', onData)
        socket.once('error', rejectRead)
      })
    }

    async function command(line, expectPrefix) {
      socket.write(`${line}\r\n`)
      const response = await readResponse()
      if (expectPrefix && !String(response).startsWith(expectPrefix)) {
        throw new Error(`SMTP命令失败：${line} -> ${response}`)
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
      socket.setEncoding('utf8')
      await new Promise((resolveConnect, rejectConnect) => {
        socket.once('secureConnect', resolveConnect)
        socket.once('connect', resolveConnect)
        socket.once('error', rejectConnect)
      })
      let greeting = await readResponse()
      if (!greeting.startsWith('220')) throw new Error(`SMTP连接失败：${greeting}`)
      await command(`EHLO ${config.smtpHost}`, '250')
      if (!config.smtpSecure && config.smtpPort === 587) {
        await command('STARTTLS', '220')
        socket = tls.connect({ socket, servername: config.smtpHost })
        socket.setEncoding('utf8')
        await new Promise((resolveTls, rejectTls) => {
          socket.once('secureConnect', resolveTls)
          socket.once('error', rejectTls)
        })
        await command(`EHLO ${config.smtpHost}`, '250')
      }
      await command('AUTH LOGIN', '334')
      await command(Buffer.from(config.smtpUser).toString('base64'), '334')
      await command(Buffer.from(config.smtpPass).toString('base64'), '235')
      await command(`MAIL FROM:<${config.smtpFrom}>`, '250')
      await command(`RCPT TO:<${to}>`, '250')
      await command('DATA', '354')
      socket.write(`${message}\r\n.\r\n`)
      const sent = await readResponse()
      if (!sent.startsWith('250')) throw new Error(`邮件发送失败：${sent}`)
      await command('QUIT')
      cleanup()
    }

    run().catch(cleanup)
  })
}

async function route(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, ok())
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  if (req.method === 'GET' && url.pathname === '/api/status') {
    return json(res, 200, ok({
      service: 'campus-trade-backend',
      mysql: config.dbName,
      emailMode: config.mockEmail ? 'mock' : 'smtp',
      verifyMode: config.mockVerify ? 'mock' : 'mysql',
      smtpConfigured: Boolean(config.smtpHost && config.smtpUser && config.smtpPass)
    }))
  }
  if (req.method !== 'POST') return json(res, 404, fail('接口不存在'))
  try {
    const data = await readJson(req)
    if (url.pathname === '/api/user/email-code') return json(res, 200, await handleSendCode(data))
    if (url.pathname === '/api/user/verify') return json(res, 200, await handleVerify(data))
    return json(res, 404, fail('接口不存在'))
  } catch (err) {
    return json(res, 200, fail(err.message || '服务器处理失败'))
  }
}

http.createServer(route).listen(config.port, () => {
  console.log(`campus-trade backend listening on http://127.0.0.1:${config.port}`)
})
