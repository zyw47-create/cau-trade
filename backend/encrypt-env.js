const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const envPath = path.join(ROOT, '.env')
const encryptedPath = path.join(ROOT, '.env.enc')
const keyPath = path.join(ROOT, '.env.key')

if (!fs.existsSync(envPath)) {
  console.error('找不到 backend/.env，无法加密。')
  process.exit(1)
}

let keyMaterial = process.env.BACKEND_ENV_KEY || ''
if (!keyMaterial && fs.existsSync(keyPath)) {
  keyMaterial = fs.readFileSync(keyPath, 'utf8').trim()
}
if (!keyMaterial) {
  keyMaterial = crypto.randomBytes(32).toString('base64url')
  fs.writeFileSync(keyPath, `${keyMaterial}\n`, { encoding: 'utf8', flag: 'wx' })
}

const plaintext = fs.readFileSync(envPath)
const salt = crypto.randomBytes(16)
const iv = crypto.randomBytes(12)
const iterations = 310000
const key = crypto.pbkdf2Sync(keyMaterial, salt, iterations, 32, 'sha256')
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
const tag = cipher.getAuthTag()

const payload = {
  version: 1,
  algorithm: 'aes-256-gcm',
  kdf: 'pbkdf2-sha256',
  iterations,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  tag: tag.toString('base64'),
  ciphertext: ciphertext.toString('base64')
}

fs.writeFileSync(encryptedPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log('已生成 backend/.env.enc')
console.log('解密密钥保存在 backend/.env.key，请不要分享这个文件。')
console.log('backend/.env 明文仍在本机，请确认它被 .gitignore 忽略。')
