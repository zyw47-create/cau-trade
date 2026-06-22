const store = require('./store')

const IDEMPOTENCY_ENDPOINTS = {
  '/api/account/recharge': true,
  '/api/rider/withdraw': true,
  '/api/ai/generate': true,
  '/api/ai/listing/generate': true,
  '/api/ai/goods/title': true,
  '/api/ai/goods/desc': true,
  '/api/ai/goods/tags': true,
  '/api/auth/bind': true,
  '/api/user/profile': true,
  '/api/user/role': true,
  '/api/user/email-code': true,
  '/api/user/verify': true,
  '/api/goods/favorite': true,
  '/api/goods': true,
  '/api/services': true,
  '/api/errands': true,
  '/api/orders': true,
  '/api/comment': true,
  '/api/chats/messages': true,
  '/api/admin/reconciliations': true,
  '/api/admin/ai/rules': true,
  '/api/admin/backups': true
}

function normalizedApiUrl(url) {
  return String(url || '').replace(/^\/v1(?=\/api\/)/, '')
}

function makeIdempotencyKey() {
  return `mp-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function requiresIdempotency(url) {
  const normalized = normalizedApiUrl(url)
  if (IDEMPOTENCY_ENDPOINTS[normalized]) return true
  return /^\/api\/goods\/\d+$/.test(normalized)
    || /^\/api\/goods\/\d+\/status$/.test(normalized)
    || /^\/api\/services\/\d+\/orders$/.test(normalized)
    || /^\/api\/orders\/[^/]+\/(pay|cancel|receive|refunds|confirm|ship|complaints)$/.test(normalized)
    || /^\/api\/errands\/\d+\/(accept|status)$/.test(normalized)
    || /^\/api\/admin\/goods\/\d+\/audit$/.test(normalized)
    || /^\/api\/admin\/refunds\/\d+\/arbitration$/.test(normalized)
    || /^\/api\/admin\/withdraws\/\d+\/audit$/.test(normalized)
    || /^\/api\/admin\/users\/\d+\/status$/.test(normalized)
}

function getApiBaseUrl() {
  const app = typeof getApp === 'function' ? getApp() : null
  return (app && app.globalData && app.globalData.baseUrl) || 'http://127.0.0.1:5000'
}

function requestBaseUrl(options, app) {
  if (options.baseUrl) return options.baseUrl
  const normalized = normalizedApiUrl(options.url)
  if (normalized === '/api/status' || normalized === '/api/user/email-code' || normalized === '/api/user/verify') {
    return (app.globalData && app.globalData.verifyBaseUrl) || getApiBaseUrl()
  }
  return (app.globalData && app.globalData.baseUrl) || getApiBaseUrl()
}

function absoluteAssetUrl(value, baseUrl) {
  if (typeof value !== 'string') return value
  if (!value || value.indexOf('/uploads/') !== 0) return value
  return `${baseUrl || getApiBaseUrl()}${value}`
}

function normalizeAssetUrls(payload, baseUrl) {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeAssetUrls(item, baseUrl))
  }
  if (!payload || typeof payload !== 'object') {
    return absoluteAssetUrl(payload, baseUrl)
  }
  Object.keys(payload).forEach((key) => {
    payload[key] = normalizeAssetUrls(payload[key], baseUrl)
  })
  return payload
}

function withLoginPayload(options) {
  if (!options || normalizedApiUrl(options.url) !== '/api/auth/login') return Promise.resolve(options)
  const app = getApp()
  const data = Object.assign({}, options.data || {})
  const configuredDevOpenid = app && app.globalData && app.globalData.devOpenid
  const allowDevLogin = app && app.globalData && app.globalData.allowDevLogin === true
  const devOpenid = allowDevLogin ? configuredDevOpenid : ''
  if (devOpenid && !data.code && !data.devOpenid) {
    data.devOpenid = devOpenid
    return Promise.resolve(Object.assign({}, options, { data }))
  }
  if (!wx.login) return Promise.resolve(Object.assign({}, options, { data }))
  return new Promise((resolve) => {
    wx.login({
      success(res) {
        if (res && res.code) data.code = res.code
        resolve(Object.assign({}, options, { data }))
      },
      fail() {
        resolve(Object.assign({}, options, { data }))
      }
    })
  })
}

function validateAuthPayload(url, payload) {
  if (normalizedApiUrl(url) !== '/api/auth/login' || !payload || payload.code !== 200) return payload
  const session = payload.data || {}
  if (!session.token) {
    return {
      code: 500,
      msg: '登录响应缺少 token，请检查后端登录接口。',
      data: {}
    }
  }
  return payload
}

function applySuccessfulSideEffects(url, payload, method) {
  if (!payload || payload.code !== 200) return
  const normalized = normalizedApiUrl(url)
  const baseUrl = requestBaseUrl({ url }, getApp())
  if (normalized === '/api/auth/login') {
    const session = payload.data || {}
    if (session.token) store.setSession(session.token, normalizeAssetUrls(session.user || session, baseUrl))
  } else if (normalized === '/api/auth/logout') {
    store.logout()
  } else if (normalized === '/api/user/profile') {
    const data = normalizeAssetUrls(Object.assign({}, payload.data || {}), baseUrl)
    if ((method || 'GET').toUpperCase() === 'GET') {
      const current = store.getState().user || {}
      if (!data.phone && current.phone) data.phone = current.phone
      if (!data.address && current.address) data.address = current.address
    }
    store.updateUser(data)
  } else if (normalized === '/api/user/verify') {
    const data = payload.data || {}
    const patch = Object.assign({}, data)
    patch.verificationStatus = data.status || data.verificationStatus || 'pending'
    patch.verified = data.verified === true || data.status === 'approved'
    delete patch.status
    store.updateUser(patch)
  } else if (normalized === '/api/user/role') {
    const data = payload.data || {}
    if (data.role) store.setRoleCertification(data.role, data)
  } else if (normalized === '/api/user/avatar') {
    const data = normalizeAssetUrls(payload.data || {}, baseUrl)
    if (data.avatar) store.updateUser({ avatar: data.avatar })
  } else if (normalized === '/api/account/recharge') {
    const data = payload.data || {}
    if (data.balance !== undefined) store.updateUser({ balance: data.balance })
  }
}

function request(options) {
  options = options || {}
  const app = getApp()
  const baseUrl = requestBaseUrl(options, app)
  const method = (options.method || 'GET').toUpperCase()
  const headers = Object.assign({}, options.header || {}, {
    Authorization: store.getState().token ? `Bearer ${store.getState().token}` : '',
    'content-type': 'application/json'
  })
  if ((method === 'POST' || method === 'PUT' || method === 'DELETE') && requiresIdempotency(options.url)) {
    headers['X-Idempotency-Key'] = headers['X-Idempotency-Key']
      || (options.data && options.data.idempotencyKey)
      || makeIdempotencyKey()
  }

  return withLoginPayload(options).then((finalOptions) => new Promise((resolve) => {
    const requestOptions = finalOptions || options
    wx.request({
      url: `${baseUrl}${requestOptions.url}`,
      method,
      data: requestOptions.data || {},
      timeout: requestOptions.timeout || 8000,
      header: headers,
      success(res) {
        const payload = res.data || {}
        const normalized = payload && typeof payload === 'object' && payload.code === 0
          ? Object.assign({}, payload, { code: 200 })
          : payload
        const checkedPayload = validateAuthPayload(requestOptions.url, normalized)
        applySuccessfulSideEffects(requestOptions.url, checkedPayload, method)
        resolve(normalizeAssetUrls(checkedPayload, baseUrl))
      },
      fail(err) {
        resolve({
          code: 500,
          msg: err && err.errMsg && err.errMsg.indexOf('timeout') >= 0
            ? '网络请求超时，请检查 Flask 后端服务是否启动。'
            : '网络请求失败，请检查 Flask 后端服务是否启动。',
          data: {}
        })
      }
    })
  }))
}

function api(options) {
  return request(options)
}

module.exports = {
  api
}
