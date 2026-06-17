const mock = require('./mock')
const store = require('./store')

const CACHE_TTL = 20000
const apiCache = {}
const READ_CACHE_URLS = {
  '/api/goods/list': true,
  '/api/service/list': true,
  '/api/chat/list': true,
  '/api/order/list': true,
  '/api/goods/favorites': true,
  '/api/goods/mine': true,
  '/api/account/logs': true,
  '/api/user/credit': true,
  '/api/rider/earnings': true
}

function ok(data) {
  return Promise.resolve({ code: 200, msg: 'success', data })
}

function fail(msg, data) {
  return Promise.resolve({ code: 400, msg, data: data || {} })
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function cacheKey(options) {
  return `${options.url}|${JSON.stringify(options.data || {})}`
}

function shouldUseCache(options) {
  const method = String(options.method || 'GET').toUpperCase()
  if (method !== 'GET') return false
  const url = options.url || ''
  return Boolean(READ_CACHE_URLS[url] || url === '/api/goods/detail' || url === '/api/service/detail' || url === '/api/user/public' || url === '/api/order/detail' || url === '/api/chat/messages')
}

function getCache(options) {
  if (!shouldUseCache(options)) return null
  const key = cacheKey(options)
  const cached = apiCache[key]
  if (!cached || Date.now() - cached.time > CACHE_TTL) {
    delete apiCache[key]
    return null
  }
  return cached.value
}

function setCache(options, value) {
  if (!shouldUseCache(options)) return value
  apiCache[cacheKey(options)] = { time: Date.now(), value }
  return value
}

function clearApiCache(prefixes) {
  const list = prefixes || []
  Object.keys(apiCache).forEach((key) => {
    if (!list.length || list.some((prefix) => key.indexOf(prefix) === 0)) delete apiCache[key]
  })
}

function clearTradeCache() {
  clearApiCache([
    '/api/goods/list',
    '/api/goods/detail',
    '/api/goods/favorites',
    '/api/goods/mine',
    '/api/service/list',
    '/api/service/detail',
    '/api/order/list',
    '/api/order/detail',
    '/api/user/public',
    '/api/account/logs',
    '/api/rider/earnings'
  ])
}

function nowText() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

const ORDER_STATUS_TEXT = {
  unpaid: '待支付',
  paid: '已托管',
  shipped: '履约中',
  completed: '已完成',
  refunding: '售后中',
  refunded: '已退款',
  cancelled: '已取消',
  disputed: '申诉中'
}

const FUND_STATUS_TEXT = {
  none: '未托管',
  frozen: '资金托管中',
  settled: '已结算',
  refunded: '已退款'
}

const ITEM_TYPE_TEXT = {
  goods: '二手闲置',
  service: '校园服务',
  errand: '跑腿任务'
}

const REFUND_STATUS_TEXT = {
  pending: '等待卖家处理',
  seller_agreed: '卖家同意',
  seller_rejected: '卖家拒绝',
  arbitrating: '平台介入中',
  buyer_win: '退款通过',
  seller_win: '维持交易',
  cancelled: '已取消'
}

function findUserByNickname(nickname) {
  return mock.users.find((item) => item.nickname === nickname)
}

function findUserByUsername(username) {
  return mock.users.find((item) => item.username === username)
}

function getCurrentUser() {
  return store.getState().user || {
    id: 1,
    nickname: '校园同学',
    username: 'campus_user',
    role: 'user',
    verified: true,
    creditScore: 100
  }
}

function timelineFromEvents(order) {
  return (order.events || []).map((text, index) => ({
    title: text,
    desc: text,
    time: index === 0 ? (order.createdAt || '刚刚') : '',
    done: true
  }))
}

function decorateTimeline(order) {
  const timeline = order.timeline && order.timeline.length ? order.timeline : timelineFromEvents(order)
  return timeline.map((step, index) => Object.assign({}, step, {
    id: `${order.orderSn || 'order'}-${index}`,
    className: step.done === false ? 'timeline-dot pending' : 'timeline-dot done'
  }))
}

function decorateRefund(order) {
  if (!order.refund) return null
  const progress = (order.refund.progress || []).map((step, index) => Object.assign({}, step, {
    id: `${order.orderSn || 'refund'}-refund-${index}`,
    className: step.done === false ? 'timeline-dot pending' : 'timeline-dot done'
  }))
  return Object.assign({}, order.refund, {
    statusText: order.refund.statusText || REFUND_STATUS_TEXT[order.refund.status] || '售后处理中',
    evidence: order.refund.evidence || [],
    progress
  })
}

function decorateOrder(order) {
  const timeline = decorateTimeline(order)
  const refund = decorateRefund(order)
  const rawCounterpartyName = order.counterpartyName || order.sellerName || ''
  const rawCounterpartyUsername = order.counterpartyUsername || order.sellerUsername || ''
  const isWaitingErrandPeer = order.itemType === 'errand' && (!rawCounterpartyUsername || rawCounterpartyName === '待接单')
  const counterpartyName = isWaitingErrandPeer ? '待接单' : rawCounterpartyName || '同校用户'
  const counterpartyUsername = isWaitingErrandPeer ? '' : rawCounterpartyUsername || 'user'
  const counterpartyLabel = order.counterpartyLabel || (order.itemType === 'service' ? '服务者' : order.itemType === 'errand' ? '骑手' : '卖家')
  return Object.assign({}, order, {
    amount: Number(order.amount || 0).toFixed(2),
    statusLabel: ORDER_STATUS_TEXT[order.status] || order.status,
    itemTypeText: ITEM_TYPE_TEXT[order.itemType] || '订单',
    fundText: FUND_STATUS_TEXT[order.fundStatus || 'none'] || '未托管',
    counterpartyName,
    counterpartyUsername,
    counterpartyLabel,
    counterpartyLine: isWaitingErrandPeer ? `${counterpartyLabel}：等待接单` : `${counterpartyLabel}：${counterpartyName} @${counterpartyUsername}`,
    canChat: !isWaitingErrandPeer,
    progressText: order.progressText || (timeline.length ? timeline[timeline.length - 1].desc : '订单已创建'),
    timeline,
    hasRefund: Boolean(refund),
    refund,
    refundStatusText: refund ? refund.statusText : '',
    summaryEvents: timeline.slice(0, 3).map((item) => item.title),
    latestTime: order.completedAt || order.paidAt || order.createdAt || ''
  })
}

function pushOrderTimeline(order, title, desc, time, pending) {
  order.events = order.events || []
  order.timeline = order.timeline || []
  order.events.push(title)
  order.timeline.push({
    title,
    desc: desc || title,
    time: time || nowText(),
    done: pending ? false : true
  })
}

function updatePendingTimeline(order, title, desc) {
  order.timeline = (order.timeline || []).map((step) => {
    if (step.done === false) return Object.assign({}, step, { title, desc, time: nowText(), done: true })
    return step
  })
}

function findAuditKeywords(payload) {
  if (!mock.aiRules || !mock.aiRules.textAudit) return []
  const keywords = String(mock.aiRules.keywords || '')
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!keywords.length) return []
  const text = [
    payload.title,
    payload.desc,
    payload.category,
    payload.condition,
    payload.location
  ].filter(Boolean).join(' ')
  return keywords.filter((keyword) => text.indexOf(keyword) >= 0)
}

const BLOCKED_KEYWORDS = [
  '违禁', '违规', '危险品', '仿冒', '代考', '作弊', '校园贷', '网贷',
  '烟草', '酒精', '管制刀具', '毒品', '枪支', '诈骗', '套现'
]

function findBlockedKeywords(payload) {
  const text = Object.keys(payload || {})
    .map((key) => payload[key])
    .filter((value) => value !== null && value !== undefined)
    .join(' ')
  return BLOCKED_KEYWORDS.filter((keyword) => text.indexOf(keyword) >= 0)
}

function buildErrandOrder(item, publisher, rider) {
  const orderSn = `ER${Date.now()}`
  return {
    orderSn,
    itemId: item.id,
    itemType: 'errand',
    title: item.title,
    amount: Number(item.price || 0),
    status: 'shipped',
    role: 'rider',
    sellerName: rider.nickname,
    sellerUsername: rider.username,
    counterpartyName: publisher.nickname,
    counterpartyUsername: publisher.username,
    counterpartyLabel: '发布者',
    riderName: rider.nickname,
    riderUsername: rider.username,
    fundStatus: 'frozen',
    createdAt: nowText(),
    paidAt: nowText(),
    remark: item.desc || '',
    progressText: '已接单，等待开始配送',
    events: ['骑手接单'],
    timeline: [
      { title: '抢单成功', desc: '系统已用行级锁确认任务未被他人接走，跑腿订单已生成。', time: nowText(), done: true },
      { title: '等待开始配送', desc: item.desc || '骑手确认取件后更新配送进度。', time: '待完成', done: false }
    ]
  }
}

function request(options) {
  const app = getApp()
  const baseUrl = options.baseUrl || app.globalData.baseUrl
  const token = store.getState().token

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: options.timeout || 8000,
      header: {
        Authorization: token ? `Bearer ${token}` : '',
        'content-type': 'application/json'
      },
      success(res) {
        resolve(res.data)
      },
      fail(err) {
        resolve({
          code: 500,
          msg: err && err.errMsg && err.errMsg.indexOf('timeout') >= 0 ? '网络请求超时，请检查后端服务是否启动' : '网络请求失败，请检查后端服务是否启动',
          data: {}
        })
      }
    })
  })
}

function verifyRequest(options) {
  const app = getApp()
  return request(Object.assign({}, options, {
    baseUrl: (app.globalData && app.globalData.verifyBaseUrl) || 'http://127.0.0.1:3001',
    timeout: options.timeout || 10000
  })).then((res) => {
    if (res.code === 200 && options.url === '/api/user/verify') {
      const data = options.data || {}
      store.updateUser({
        verified: true,
        status: 'active',
        studentId: data.studentId,
        realName: data.realName,
        college: data.college,
        schoolEmail: String(data.email || '').trim().toLowerCase(),
        emailVerified: true,
        phone: data.phone || ''
      })
    }
    return res
  })
}

function findOrder(orderSn) {
  return mock.orders.find((item) => item.orderSn === orderSn)
}

function findServiceById(id) {
  return mock.services.find((item) => Number(item.id) === Number(id))
}

function addWalletLog(type, title, amount) {
  const user = store.getState().user || { balance: 0 }
  mock.walletLogs.unshift({
    id: Date.now(),
    type,
    title,
    amount: Number(amount),
    balanceAfter: Number(user.balance || 0),
    time: nowText()
  })
}

function ensureConversation(data) {
  const parsed = data.conversationId && String(data.conversationId).split('-')
  const parsedType = parsed && parsed.length > 1 ? parsed[0] : ''
  const parsedId = parsed && parsed.length > 1 ? parsed[1] : ''
  const businessType = data.businessType || (data.goodsId ? 'goods' : '') || parsedType || 'goods'
  const businessId = Number(data.businessId || data.goodsId || data.serviceId || data.errandId || parsedId || 101)
  const conversationId = data.conversationId || `${businessType}-${businessId}`
  let conversation = mock.conversations.find((item) => item.id === conversationId)
  if (!conversation) {
    let title = data.title || '交易沟通'
    let peer = data.peerName || '交易对象'
    let peerUsername = data.peerUsername || 'user'
    if (businessType === 'goods') {
      const goods = mock.goods.find((item) => item.id === businessId) || mock.goods[0]
      title = data.title || goods.title
      peer = data.peerName || goods.sellerName
      peerUsername = data.peerUsername || goods.username
    } else {
      const service = findServiceById(businessId) || mock.services[0]
      const publisher = findUserByUsername(service.username) || { nickname: service.provider, username: service.username }
      const rider = findUserByUsername(service.riderUsername) || { nickname: service.riderName || service.provider, username: service.riderUsername || service.username }
      title = data.title || service.title
      peer = data.peerName || (service.type === 'errand' && service.riderUsername ? rider.nickname : publisher.nickname)
      peerUsername = data.peerUsername || (service.type === 'errand' && service.riderUsername ? rider.username : publisher.username)
    }
    conversation = {
      id: conversationId,
      title,
      peer,
      peerUsername,
      businessType,
      businessId,
      orderSn: data.orderSn || '',
      messages: []
    }
    mock.conversations.unshift(conversation)
  }
  if (data.orderSn && !conversation.orderSn) conversation.orderSn = data.orderSn
  return conversation
}

function getPublicUser(userId) {
  const id = Number(userId || 1)
  const user = mock.users.find((item) => item.id === id) || mock.users[0]
  const reviews = mock.userReviews.filter((item) => item.toUserId === user.id)
  const activeServices = mock.services.filter((item) => item.type !== 'errand'
    && item.status === 'on_sale'
    && (item.provider === user.nickname || item.username === user.username || item.riderUsername === user.username))
  const completedCount = mock.orders.filter((item) => {
    if (item.status !== 'completed') return false
    return item.sellerName === user.nickname
      || item.counterpartyName === user.nickname
      || item.sellerUsername === user.username
      || item.counterpartyUsername === user.username
      || item.riderUsername === user.username
  }).length + reviews.length
  const goodCount = reviews.filter((item) => Number(item.score) >= 4).length
  const goodRate = reviews.length ? Math.round((goodCount / reviews.length) * 100) : 100
  return {
    user: Object.assign({}, user, {
      reviewCount: reviews.length,
      completedCount,
      goodRate,
      activeGoodsCount: mock.goods.filter((item) => item.sellerId === user.id && item.status === 'on_sale').length,
      activeServiceCount: activeServices.length,
      soldCount: mock.orders.filter((item) => item.sellerUsername === user.username && item.status === 'completed').length
    }),
    reviews,
    goods: mock.goods.filter((item) => item.sellerId === user.id && item.status === 'on_sale'),
    services: activeServices
  }
}

function decorateServiceDetail(id) {
  const item = mock.services.find((svc) => svc.id === Number(id))
  if (!item) return null
  const owner = item.type === 'errand' && item.status === 'waiting_accept'
    ? findUserByUsername(item.username) || mock.users[0]
    : mock.users.find((user) => user.nickname === item.provider || user.username === item.riderUsername || user.username === item.username) || mock.users[0]
  const publicUser = getPublicUser(owner.id)
  return Object.assign({}, item, {
    owner: publicUser.user,
    ownerReviews: publicUser.reviews.slice(0, 3),
    typeText: item.type === 'errand' ? '跑腿任务' : '校园服务',
    statusText: item.status === 'on_sale' ? '可预约' : item.status === 'unpaid' ? '待支付' : item.status === 'waiting_accept' ? '待接单' : item.status === 'accepted' ? '已接单' : item.status === 'processing' ? '配送中' : item.status === 'completed' ? '已完成' : item.status === 'cancelled' ? '已取消' : item.status,
    detailItems: item.type === 'errand'
      ? ['发布者支付跑腿费后进入任务大厅', '骑手抢单使用状态校验避免重复接单', '配送过程可在订单与聊天中留痕，完成后发布者确认结算']
      : ['预约后先生成待支付订单', '付款后服务费进入平台托管', '服务完成后可对服务者进行评价']
  })
}

function api(options) {
  options = options || {}
  const app = getApp()
  if (options && (options.url === '/api/user/email-code' || options.url === '/api/user/verify')) {
    return verifyRequest(options)
  }
  if (app && app.globalData && app.globalData.useMock === false) return request(options)

  const url = options.url
  const data = options.data || {}
  const cached = getCache(options)
  if (cached) return Promise.resolve(cached)

  if (url && url.indexOf('/api/admin/') === 0 && store.getState().role !== 'admin') {
    return fail('无后台权限')
  }

  if (url === '/api/auth/login') {
    clearApiCache()
    return ok(store.login())
  }
  if (url === '/api/auth/logout') {
    store.logout()
    clearApiCache()
    return ok({})
  }

  if (url === '/api/user/profile') return ok(store.getState().user)
  if (url === '/api/user/public') return setCache(options, ok(getPublicUser(data.id)))
  if (url === '/api/user/profile/update') {
    const user = store.updateUser({
      nickname: data.nickname || '校园同学',
      username: data.username || (store.getState().user && store.getState().user.username) || 'campus_user',
      phone: data.phone || '',
      address: data.address || ''
    })
    const mockUser = mock.users.find((item) => item.id === user.id)
    if (mockUser) {
      mockUser.nickname = user.nickname
      mockUser.username = user.username
    }
    clearApiCache(['/api/user/public', '/api/chat/list'])
    return ok(user)
  }
  if (url === '/api/user/role') {
    const role = data.role || 'user'
    if (role === 'admin') {
      if (store.getState().role !== 'admin') return fail('后台权限由系统分配，不能申请')
      return ok({ role: 'admin' })
    }
    const user = store.setRoleCertification(role, {
      status: 'approved',
      campusArea: data.campusArea || '',
      availableTime: data.availableTime || '',
      emergencyContact: data.emergencyContact || '',
      serviceCategory: data.serviceCategory || '',
      experience: data.experience || '',
      agreement: Boolean(data.agreement)
    })
    clearApiCache(['/api/user/public', '/api/rider/earnings'])
    return ok({ role: user.role })
  }
  if (url === '/api/user/email-code') {
    const email = String(data.email || '').trim().toLowerCase()
    if (!/^[a-z0-9._%+-]+@cau\.edu\.cn$/.test(email)) return fail('请使用 @cau.edu.cn 学校邮箱')
    const code = randomCode()
    mock.emailCodes[email] = {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      tries: 0
    }
    mock.auditLogs.unshift({
      id: Date.now(),
      action: '发送学校邮箱验证码',
      target: email,
      operator: 'system',
      time: nowText()
    })
    return ok({ sent: true, demoCode: code, expiresIn: 300 })
  }
  if (url === '/api/user/verify') {
    const email = String(data.email || '').trim().toLowerCase()
    const code = String(data.emailCode || '').trim()
    if (!/^[a-z0-9._%+-]+@cau\.edu\.cn$/.test(email)) return fail('请使用 @cau.edu.cn 学校邮箱')
    const record = mock.emailCodes[email]
    if (!record) return fail('请先获取邮箱验证码')
    if (record.expiresAt < Date.now()) return fail('验证码已过期，请重新获取')
    record.tries += 1
    if (record.tries > 5) return fail('验证码尝试次数过多，请重新获取')
    if (record.code !== code) return fail('邮箱验证码错误')
    delete mock.emailCodes[email]
    store.updateUser({
      verified: true,
      status: 'active',
      studentId: data.studentId,
      realName: data.realName,
      college: data.college,
      schoolEmail: email,
      emailVerified: true,
      phone: data.phone || ''
    })
    return ok({ status: 'approved' })
  }
  if (url === '/api/user/credit') {
    const user = store.getState().user || {}
    return ok({
      score: user.creditScore || 100,
      records: [
        { id: 1, reason: '实名认证通过', change: '+5', time: '06-09' },
        { id: 2, reason: '完成交易', change: '+2', time: '06-10' }
      ]
    })
  }

  if (url === '/api/oss/sts') {
    return ok({
      host: 'mock://campus-upload',
      scene: data.scene || 'publish',
      expiresIn: 900
    })
  }

  if (url === '/api/account/recharge') {
    const amount = Number(data.amount || 0)
    if (!amount || amount <= 0) return fail('请输入有效充值金额')
    const user = store.addBalance(amount)
    addWalletLog('recharge', '账户充值', amount)
    return ok({ balance: user.balance })
  }
  if (url === '/api/account/logs') return setCache(options, ok({ list: mock.walletLogs }))
  if (url === '/api/rider/earnings') {
    const current = getCurrentUser()
    const accepted = mock.services.filter((item) => item.type === 'errand'
      && (item.riderUsername === current.username || item.provider === current.nickname))
    const amount = accepted.reduce((sum, item) => sum + Number(item.price || 0), 0)
    return ok({
      amount,
      acceptedCount: accepted.length,
      withdraws: mock.withdraws
    })
  }
  if (url === '/api/rider/withdraw') {
    const amount = Number(data.amount || 0)
    if (!amount || amount <= 0) return fail('请输入有效提现金额')
    mock.withdraws.unshift({
      id: Date.now(),
      applicant: '校园同学',
      role: store.getState().role,
      amount,
      status: 'pending',
      reason: data.reason || '收益提现'
    })
    return ok({ status: 'pending' })
  }

  if (url === '/api/goods/list') return setCache(options, ok({ list: mock.goods, categories: mock.categories }))
  if (url.indexOf('/api/goods/detail') === 0) {
    const item = mock.goods.find((g) => g.id === Number(data.id)) || mock.goods[0]
    return setCache(options, ok(item))
  }
  if (url === '/api/goods/save') {
    const goodsId = Date.now()
    const blockedKeywords = findBlockedKeywords(data)
    if (blockedKeywords.length) return fail(`内容包含违禁词：${blockedKeywords.join('、')}`)
    const hitKeywords = findAuditKeywords(data)
    const status = hitKeywords.length ? 'pending' : 'on_sale'
    mock.goods.unshift({
      id: goodsId,
      title: data.title,
      category: data.category,
      condition: data.condition,
      price: Number(data.price),
      status,
      sellerId: 1,
      sellerName: '校园同学',
      username: 'campus_user',
      image: (data.images && data.images[0]) || '',
      images: data.images || [],
      imageObjects: data.imageObjects || [],
      desc: data.desc,
      location: data.location || '校内自提',
      favorite: false,
      favoriteCount: 0,
      auditNote: status === 'pending' ? `命中AI复核关键词：${hitKeywords.join('、')}` : 'AI审核通过',
      comments: []
    })
    mock.auditLogs.unshift({
      id: Date.now(),
      action: status === 'pending' ? 'AI审核命中复核' : 'AI审核通过',
      target: data.title,
      operator: 'system',
      time: nowText()
    })
    clearTradeCache()
    return ok({ goodsId, status })
  }
  if (url === '/api/goods/favorite') {
    const item = mock.goods.find((g) => g.id === Number(data.id))
    if (item) {
      item.favorite = !item.favorite
      item.favoriteCount = Math.max(0, item.favoriteCount + (item.favorite ? 1 : -1))
    }
    clearTradeCache()
    return ok({ favorite: Boolean(item && item.favorite), favoriteCount: item ? item.favoriteCount : 0 })
  }
  if (url === '/api/goods/favorites') return setCache(options, ok({ list: mock.goods.filter((item) => item.favorite) }))
  if (url === '/api/goods/mine') return setCache(options, ok({ list: mock.goods.filter((item) => item.sellerId === 1) }))
  if (url === '/api/goods/remove') {
    const item = mock.goods.find((goods) => goods.id === Number(data.id))
    if (item) {
      item.status = 'removed'
      item.auditNote = '卖家主动下架'
    }
    clearTradeCache()
    return ok({ status: item ? item.status : 'missing' })
  }
  if (url === '/api/goods/relist') {
    const item = mock.goods.find((goods) => goods.id === Number(data.id))
    if (item) {
      item.status = 'pending'
      item.auditNote = '重新上架，等待复核'
    }
    clearTradeCache()
    return ok({ status: item ? item.status : 'missing' })
  }

  if (url === '/api/order/create') {
    const item = mock.goods.find((g) => g.id === Number(data.goodsId))
    const seller = item ? findUserByUsername(item.username) || findUserByNickname(item.sellerName) || mock.users[0] : mock.users[0]
    const orderSn = `CT${Date.now()}`
    mock.orders.unshift({
      orderSn,
      itemId: item ? item.id : data.goodsId,
      itemType: 'goods',
      title: item ? item.title : '校园交易订单',
      amount: item ? Number(item.price) : Number(data.amount || 0),
      status: 'unpaid',
      role: 'buyer',
      sellerName: item ? item.sellerName : '卖家',
      sellerUsername: item ? item.username : 'seller',
      counterpartyName: item ? item.sellerName : '卖家',
      counterpartyUsername: item ? item.username : 'seller',
      counterpartyLabel: '卖家',
      fundStatus: 'none',
      createdAt: nowText(),
      remark: data.remark || '',
      progressText: '订单已创建，等待支付',
      events: ['创建订单'],
      timeline: [
        { title: '创建订单', desc: `卖家 ${seller.nickname} 已收到订单，等待买家支付。`, time: nowText(), done: true },
        { title: '等待支付', desc: '支付后资金进入平台托管账户。', time: '待完成', done: false }
      ]
    })
    clearTradeCache()
    return ok({ orderSn, status: 'unpaid' })
  }
  if (url === '/api/order/pay') {
    const order = findOrder(data.orderSn)
    if (!order) return fail('订单不存在')
    if (order.status !== 'unpaid') return ok({ status: order.status })
    const user = store.reduceBalance(order.amount)
    if (!user) return fail('余额不足，请先充值')
    order.status = 'paid'
    order.fundStatus = 'frozen'
    order.paidAt = nowText()
    if (order.itemType === 'errand') {
      const task = findServiceById(order.itemId)
      if (task && task.status !== 'cancelled') {
        task.status = 'waiting_accept'
        task.provider = '待接单'
        task.riderName = ''
        task.riderUsername = ''
      }
      order.progressText = '跑腿费已托管，等待骑手抢单'
      updatePendingTimeline(order, '跑腿费托管', '发布者已支付跑腿费，资金进入平台托管账户。')
      pushOrderTimeline(order, '等待骑手接单', '任务已进入跑腿大厅，骑手抢单时会进行状态校验避免重复接单。', '待完成', true)
    } else {
      order.progressText = order.itemType === 'service' ? '服务费已托管，等待服务者履约' : '资金托管中，等待对方履约'
      updatePendingTimeline(order, '资金托管', '支付成功，资金进入平台托管账户。')
      pushOrderTimeline(order, '等待履约', '对方需按约定交付商品或服务。', '待完成', true)
    }
    addWalletLog('pay', `支付订单 ${order.orderSn}`, -order.amount)
    clearTradeCache()
    return ok({ status: 'paid', balance: user.balance })
  }
  if (url === '/api/order/cancel') {
    const order = findOrder(data.orderSn)
    if (!order) return fail('订单不存在')
    if (order.status === 'cancelled') return ok({ status: 'cancelled' })
    if (order.status === 'unpaid') {
      order.status = 'cancelled'
      order.fundStatus = 'none'
      order.progressText = '订单已取消，未产生资金流动'
      updatePendingTimeline(order, '订单取消', '用户主动取消，未付款订单不会产生资金冻结。')
      const related = order.itemType === 'errand' ? findServiceById(order.itemId) : null
      if (related && related.status !== 'completed') related.status = 'cancelled'
      clearTradeCache()
      return ok({ status: 'cancelled' })
    }
    if (order.status === 'paid' && (order.itemType === 'service' || order.itemType === 'errand')) {
      const related = findServiceById(order.itemId)
      if (order.itemType === 'errand' && related && related.status !== 'waiting_accept' && related.status !== 'unpaid') {
        return fail('骑手已接单，请通过售后协商取消')
      }
      const user = store.addBalance(order.amount)
      order.status = 'cancelled'
      order.fundStatus = 'refunded'
      order.progressText = '订单已取消，托管资金已退回'
      updatePendingTimeline(order, '取消并退款', '取消请求通过，平台将托管资金退回原账户。')
      if (order.itemType === 'errand' && related && related.status !== 'completed') related.status = 'cancelled'
      addWalletLog('refund', `取消退款 ${order.orderSn}`, order.amount)
      clearTradeCache()
      return ok({ status: 'cancelled', balance: user.balance })
    }
    return fail('当前状态不能直接取消，请走售后或投诉流程')
  }
  if (url === '/api/order/receive') {
    const order = findOrder(data.orderSn)
    if (order) {
      order.status = 'completed'
      order.fundStatus = 'settled'
      order.completedAt = nowText()
      order.progressText = order.itemType === 'errand' ? '发布者已确认完成，收益已结算' : '订单已完成，资金已结算'
      updatePendingTimeline(order, '确认完成', order.itemType === 'errand' ? '发布者确认任务完成，跑腿收益结算。' : '买家确认收货/服务完成，资金结算。')
      pushOrderTimeline(order, '可评价', '可以对交易对象发表评价，评价会展示在个人主页。', '待完成', true)
    }
    clearTradeCache()
    return ok({ status: 'completed' })
  }
  if (url === '/api/order/ship') {
    const order = findOrder(data.orderSn)
    if (order) {
      order.status = 'shipped'
      order.progressText = order.itemType === 'errand' ? '配送中，等待发布者确认完成' : '履约中，等待买家确认'
      updatePendingTimeline(order, order.itemType === 'errand' ? '开始配送' : '开始履约', order.itemType === 'errand' ? '骑手已开始配送，可在聊天中同步进度。' : '对方已确认开始交付。')
      pushOrderTimeline(order, '等待确认', order.itemType === 'errand' ? '发布者确认送达后结算收益。' : '买家验收后确认完成。', '待完成', true)
    }
    clearTradeCache()
    return ok({ status: 'shipped' })
  }
  if (url === '/api/order/refund') {
    const blockedKeywords = findBlockedKeywords({ reason: data.reason })
    if (blockedKeywords.length) return fail(`售后说明包含违禁词：${blockedKeywords.join('、')}`)
    const order = findOrder(data.orderSn)
    if (order) {
      order.status = 'refunding'
      order.progressText = '售后处理中，资金继续托管'
      updatePendingTimeline(order, '提交售后', data.reason || '买家提交售后申请，资金继续冻结。')
      order.refund = {
        status: 'pending',
        statusText: '等待卖家处理',
        reason: data.reason || '申请售后',
        sellerReply: '等待卖家回复',
        evidence: ['聊天记录将作为证据链自动关联'],
        progress: [
          { title: '买家提交售后', desc: data.reason || '申请售后', time: nowText(), done: true },
          { title: '等待卖家处理', desc: '卖家可同意、拒绝或补充说明。', time: '进行中', done: false }
        ]
      }
    }
    clearTradeCache()
    return ok({ status: 'refunding' })
  }
  if (url === '/api/order/complaint') {
    const blockedKeywords = findBlockedKeywords({ content: data.content })
    if (blockedKeywords.length) return fail(`投诉说明包含违禁词：${blockedKeywords.join('、')}`)
    const order = findOrder(data.orderSn)
    if (order) {
      order.status = 'refunding'
      order.progressText = '投诉已提交，平台介入处理中'
      const refund = order.refund || {
        status: 'arbitrating',
        reason: '申请平台介入',
        evidence: [],
        progress: []
      }
      refund.status = 'arbitrating'
      refund.statusText = '平台介入中'
      refund.evidence = (refund.evidence || []).concat([`投诉说明：${data.content || '已提交投诉'}`])
      refund.progress = (refund.progress || []).concat([
        { title: '投诉举证', desc: data.content || '用户提交投诉，聊天记录自动关联。', time: nowText(), done: true },
        { title: '平台仲裁中', desc: '管理员将根据证据链和资金流水处理。', time: '进行中', done: false }
      ])
      order.refund = refund
      mock.auditLogs.unshift({
        id: Date.now(),
        action: '用户提交投诉',
        target: order.orderSn,
        operator: '用户',
        time: nowText()
      })
    }
    clearTradeCache()
    return ok({ status: 'submitted' })
  }
  if (url === '/api/order/list') {
    const list = mock.orders.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    return setCache(options, ok({ list: list.map(decorateOrder) }))
  }
  if (url === '/api/order/detail') {
    const order = findOrder(data.orderSn)
    if (!order) return fail('订单不存在')
    return setCache(options, ok(decorateOrder(order)))
  }
  if (url === '/api/order/seller/list') {
    return ok({ list: mock.orders.filter((item) => item.sellerName === '校园同学' || item.role === 'seller').map(decorateOrder) })
  }
  if (url === '/api/comment') {
    const blockedKeywords = findBlockedKeywords({ content: data.content })
    if (blockedKeywords.length) return fail(`评价内容包含违禁词：${blockedKeywords.join('、')}`)
    const order = findOrder(data.orderSn)
    if (order) {
      const target = mock.users.find((item) => item.nickname === order.sellerName) || mock.users[0]
      mock.userReviews.unshift({
        id: Date.now(),
        toUserId: target.id,
        fromName: '校园同学',
        fromUsername: 'campus_user',
        score: data.score,
        content: data.content,
        time: nowText()
      })
      updatePendingTimeline(order, '评价完成', '买家已发表交易评价，评价会展示在对方主页。')
    }
    clearTradeCache()
    return ok({ status: 'created' })
  }

  if (url === '/api/service/list') return setCache(options, ok({ list: mock.services }))
  if (url === '/api/service/detail') {
    const detail = decorateServiceDetail(data.id)
    if (!detail) return fail('服务不存在')
    return setCache(options, ok(detail))
  }
  if (url === '/api/service/save') {
    const blockedKeywords = findBlockedKeywords(data)
    if (blockedKeywords.length) return fail(`内容包含违禁词：${blockedKeywords.join('、')}`)
    const id = Date.now()
    const current = getCurrentUser()
    if (data.type !== 'errand' && store.getState().role !== 'provider') {
      return fail('请先完成服务者认证后再发布校园服务')
    }
    if (data.type === 'errand') {
      const task = {
        id,
        type: 'errand',
        title: data.title,
        price: Number(data.price),
        provider: '待支付',
        username: current.username,
        publisherName: current.nickname,
        status: 'unpaid',
        desc: data.desc,
        pickupLocation: data.pickupLocation || '',
        deliveryLocation: data.deliveryLocation || '',
        location: data.location || [data.pickupLocation, data.deliveryLocation].filter(Boolean).join(' -> '),
        serviceTime: data.serviceTime || '',
        images: data.images || [],
        imageObjects: data.imageObjects || [],
        earnings: 0
      }
      const orderSn = `ER${Date.now()}`
      mock.services.unshift(task)
      mock.orders.unshift({
        orderSn,
        itemId: id,
        itemType: 'errand',
        title: data.title,
        amount: Number(data.price),
        status: 'unpaid',
        role: 'publisher',
        sellerName: '待接单',
        sellerUsername: '',
        counterpartyName: '待接单',
        counterpartyUsername: '',
        counterpartyLabel: '骑手',
        fundStatus: 'none',
        createdAt: nowText(),
        remark: data.desc || '',
        progressText: '跑腿订单已创建，支付后进入任务大厅',
        events: ['发起跑腿订单'],
        timeline: [
          { title: '发起跑腿订单', desc: `${task.location || '校内取送'}，等待发布者支付跑腿费。`, time: nowText(), done: true },
          { title: '等待支付', desc: '支付后跑腿费进入平台托管，任务才会出现在跑腿大厅。', time: '待完成', done: false }
        ]
      })
      clearTradeCache()
      return ok({ id, orderSn, status: 'unpaid' })
    }
    mock.services.unshift({
      id,
      type: 'service',
      title: data.title,
      price: Number(data.price),
      provider: current.nickname,
      username: current.username,
      status: 'on_sale',
      desc: data.desc,
      serviceTime: data.serviceTime || '',
      location: data.location || '',
      images: data.images || [],
      imageObjects: data.imageObjects || [],
      earnings: 0
    })
    clearTradeCache()
    return ok({ id, status: 'on_sale' })
  }
  if (url === '/api/service/order') {
    const item = findServiceById(data.id)
    if (!item) return fail('服务不存在')
    if (item.type === 'errand') return fail('跑腿任务请从抢单入口处理')
    if (item.status !== 'on_sale') return fail('服务当前不可预约')
    const provider = findUserByUsername(item.username) || findUserByNickname(item.provider) || mock.users[0]
    const orderSn = `SV${Date.now()}`
    mock.orders.unshift({
      orderSn,
      itemId: item.id,
      itemType: item.type,
      title: item.title,
      amount: item.price,
      status: 'unpaid',
      role: 'buyer',
      sellerName: item.provider,
      sellerUsername: item.username,
      counterpartyName: item.provider,
      counterpartyUsername: item.username,
      counterpartyLabel: '服务者',
      fundStatus: 'none',
      createdAt: nowText(),
      remark: item.desc || '',
      progressText: '预约已创建，等待支付服务费',
      events: ['预约服务'],
      timeline: [
        { title: '预约服务', desc: `已预约 ${provider.nickname} 的校园服务，可先聊天确认时间。`, time: nowText(), done: true },
        { title: '等待支付', desc: '支付后服务费冻结在平台托管账户，可在履约前取消。', time: '待完成', done: false }
      ]
    })
    clearTradeCache()
    return ok({ orderSn, status: 'unpaid' })
  }
  if (url === '/api/rider/take') {
    const item = findServiceById(data.id)
    if (!item) return fail('任务不存在')
    if (item.type !== 'errand') return fail('该项目不是跑腿任务')
    if (item.status !== 'waiting_accept') return fail('任务已被接单')
    const publisher = findUserByUsername(item.username) || mock.users[0]
    const rider = getCurrentUser()
    if (store.getState().role !== 'rider') return fail('请先完成骑手认证后再抢单')
    if (publisher.username === rider.username) return fail('不能抢自己发布的跑腿任务')
    item.status = 'accepted'
    item.provider = rider.nickname
    item.riderUsername = rider.username
    item.riderName = rider.nickname
    let order = mock.orders.find((orderItem) => orderItem.itemType === 'errand' && Number(orderItem.itemId) === Number(item.id))
    if (order) {
      order.status = 'shipped'
      order.role = 'publisher'
      order.sellerName = rider.nickname
      order.sellerUsername = rider.username
      order.counterpartyName = rider.nickname
      order.counterpartyUsername = rider.username
      order.counterpartyLabel = '骑手'
      order.riderName = rider.nickname
      order.riderUsername = rider.username
      order.fundStatus = 'frozen'
      order.progressText = '骑手已接单，等待开始配送'
      updatePendingTimeline(order, '骑手接单', `${rider.nickname} 抢单成功，任务状态已锁定。`)
      pushOrderTimeline(order, '等待开始配送', item.desc || '骑手确认取件后更新配送进度。', '待完成', true)
    } else {
      order = buildErrandOrder(item, publisher, rider)
      mock.orders.unshift(order)
    }
    mock.auditLogs.unshift({
      id: Date.now(),
      action: '跑腿抢单成功',
      target: order.orderSn,
      operator: rider.nickname,
      time: nowText()
    })
    clearTradeCache()
    return ok({ status: 'accepted', orderSn: order.orderSn })
  }
  if (url === '/api/rider/status') {
    const item = mock.services.find((svc) => svc.id === Number(data.id))
    const current = getCurrentUser()
    if (store.getState().role !== 'rider') return fail('请先切换到骑手身份')
    if (item && item.riderUsername && item.riderUsername !== current.username) return fail('只能更新自己接单的任务')
    if (item) {
      item.status = data.status || 'processing'
      const order = mock.orders.find((orderItem) => orderItem.itemType === 'errand' && Number(orderItem.itemId) === Number(item.id))
      if (order) {
        if (item.status === 'processing') {
          order.status = 'shipped'
          order.progressText = '配送中，等待发布者确认完成'
          updatePendingTimeline(order, '开始配送', '骑手已开始配送，过程可通过聊天同步。')
          pushOrderTimeline(order, '等待发布者确认', '送达后由发布者确认完成，收益结算给骑手。', '待完成', true)
        } else if (item.status === 'completed') {
          order.status = 'shipped'
          order.progressText = '骑手已送达，等待发布者确认'
          updatePendingTimeline(order, '骑手送达', '骑手已标记送达，等待发布者确认。')
          pushOrderTimeline(order, '等待结算', '发布者确认后平台结算跑腿收益。', '待完成', true)
        }
      }
    }
    return ok({ status: item ? item.status : 'missing' })
  }

  if (url === '/api/chat/list') return setCache(options, ok({ list: mock.conversations }))
  if (url === '/api/chat/messages') {
    const conversation = ensureConversation(data)
    return setCache(options, ok({ conversation, list: conversation.messages }))
  }
  if (url === '/api/chat/send') {
    const blockedKeywords = findBlockedKeywords({ content: data.content })
    if (blockedKeywords.length) return fail(`消息包含违禁词：${blockedKeywords.join('、')}`)
    const conversation = ensureConversation(data)
    conversation.messages.push({
      id: Date.now(),
      from: 'me',
      senderName: '校园同学',
      senderUsername: 'campus_user',
      content: data.content,
      time: nowText().slice(6),
      hash: `SHA256-${Date.now()}`
    })
    clearApiCache(['/api/chat/list', '/api/chat/messages'])
    return ok({ status: 'sent' })
  }

  if (url === '/api/admin/stats') {
    mock.stats.goodsOnSale = mock.goods.filter((item) => item.status === 'on_sale').length
    mock.stats.pendingGoods = mock.goods.filter((item) => item.status === 'pending').length
    mock.stats.refundingOrders = mock.orders.filter((item) => item.status === 'refunding').length
    mock.stats.todayAmount = mock.orders.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return ok(mock.stats)
  }
  if (url === '/api/admin/stats/export') {
    return ok({
      fileName: `campus_trade_stats_${Date.now()}.csv`,
      rows: [
        ['指标', '数值'],
        ['在售商品', mock.stats.goodsOnSale],
        ['待审商品', mock.stats.pendingGoods],
        ['售后订单', mock.stats.refundingOrders],
        ['交易金额', mock.stats.todayAmount]
      ]
    })
  }
  if (url === '/api/admin/ops/health') return ok(mock.opsHealth)
  if (url === '/api/admin/security/checks') return ok({ list: mock.securityChecks })
  if (url === '/api/admin/backup/latest') return ok(mock.opsHealth.latestBackup)
  if (url === '/api/admin/backup/run') {
    const timestamp = nowText()
    mock.opsHealth.latestBackup = {
      fileName: `campus_trade-full-${Date.now()}.sql`,
      sizeBytes: 89732 + mock.auditLogs.length,
      sha256: `SHA256-${Date.now()}`,
      time: timestamp
    }
    mock.opsHealth.checkedAt = timestamp
    mock.auditLogs.unshift({
      id: Date.now(),
      action: '生成数据库备份',
      target: mock.opsHealth.latestBackup.fileName,
      operator: '管理员',
      time: timestamp
    })
    return ok(mock.opsHealth.latestBackup)
  }
  if (url === '/api/admin/users') return ok({ list: mock.users })
  if (url === '/api/admin/user/status') {
    const item = mock.users.find((user) => user.id === Number(data.id))
    if (item) {
      item.status = data.status
      if (data.status === 'banned') item.creditScore = Math.min(item.creditScore, 59)
      mock.auditLogs.unshift({
        id: Date.now(),
        action: data.status === 'banned' ? '封禁用户' : '解封用户',
        target: item.nickname,
        operator: '管理员',
        time: nowText()
      })
    }
    return ok({ status: item ? item.status : 'missing' })
  }
  if (url === '/api/admin/ai/rules') return ok(mock.aiRules)
  if (url === '/api/admin/ai/rules/update') {
    mock.aiRules.textAudit = Boolean(data.textAudit)
    mock.aiRules.imageAudit = Boolean(data.imageAudit)
    mock.aiRules.manualRiskLevel = data.manualRiskLevel || 'manual'
    mock.aiRules.keywords = data.keywords || ''
    mock.aiRules.updatedAt = nowText()
    mock.auditLogs.unshift({
      id: Date.now(),
      action: '更新AI审核规则',
      target: mock.aiRules.keywords,
      operator: '管理员',
      time: nowText()
    })
    return ok(mock.aiRules)
  }
  if (url === '/api/admin/goods/pending') {
    return ok({ list: mock.goods.filter((item) => item.status === 'pending') })
  }
  if (url === '/api/admin/goods/audit') {
    const item = mock.goods.find((goods) => goods.id === Number(data.id))
    if (item) {
      item.status = data.result === 'reject' ? 'rejected' : 'on_sale'
      item.auditNote = data.result === 'reject' ? `人工驳回：${data.reason || '内容不合规'}` : '人工复核通过'
      mock.auditLogs.unshift({
        id: Date.now(),
        action: item.status === 'on_sale' ? '商品人工审核通过' : '商品人工驳回',
        target: item.title,
        operator: '管理员',
        time: nowText()
      })
    }
    return ok({ status: item ? item.status : 'missing' })
  }
  if (url === '/api/admin/orders/refunding') {
    return ok({ list: mock.orders.filter((item) => item.status === 'refunding') })
  }
  if (url === '/api/admin/order/arbitrate') {
    const order = findOrder(data.orderSn)
    if (order) {
      order.status = data.result === 'buyer' ? 'refunded' : 'completed'
      order.fundStatus = data.result === 'buyer' ? 'refunded' : 'settled'
      order.events.push(`管理员仲裁：${data.result === 'buyer' ? '买家胜诉退款' : '卖家胜诉结算'}`)
      mock.auditLogs.unshift({
        id: Date.now(),
        action: '订单仲裁',
        target: order.orderSn,
        operator: '管理员',
        time: nowText()
      })
    }
    return ok({ status: order ? order.status : 'missing' })
  }
  if (url === '/api/admin/withdraws') return ok({ list: mock.withdraws })
  if (url === '/api/admin/withdraw/audit') {
    const item = mock.withdraws.find((withdraw) => withdraw.id === Number(data.id))
    if (item) {
      item.status = data.result === 'reject' ? 'rejected' : 'approved'
      mock.auditLogs.unshift({
        id: Date.now(),
        action: item.status === 'approved' ? '提现审核通过' : '提现驳回',
        target: `提现 ${item.amount}`,
        operator: '管理员',
        time: nowText()
      })
    }
    return ok({ status: item ? item.status : 'missing' })
  }
  if (url === '/api/admin/audit/logs') return ok({ list: mock.auditLogs })

  return ok({})
}

module.exports = {
  api
}
