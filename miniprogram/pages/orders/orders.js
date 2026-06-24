const { request: api } = require('../../utils/request')
const store = require('../../utils/store')
const { BasePage } = require('../../utils/base-page')
const { openChatRoom } = require('../../utils/chat-nav')

const FILTERS = [
  { key: 'all', text: '全部' },
  { key: 'toPay', text: '待付款' },
  { key: 'toConfirm', text: '待确认' },
  { key: 'toAccept', text: '待接单' },
  { key: 'toShip', text: '待发货' },
  { key: 'toReceive', text: '待收货' },
  { key: 'toComment', text: '待评价' },
  { key: 'afterSale', text: '售后中' },
  { key: 'done', text: '已完成' },
  { key: 'closed', text: '已关闭' },
  { key: 'buyer', text: '我买到的' },
  { key: 'seller', text: '我卖出的' },
  { key: 'publisher', text: '我发布的' },
  { key: 'rider', text: '我接单的' }
]

function buildFilters(activeKey) {
  return FILTERS.map((item) => Object.assign({}, item, {
    className: item.key === activeKey ? 'order-filter active' : 'order-filter'
  }))
}

function normalizeKeyword(value) {
  return String(value || '').trim().toLowerCase()
}

function orderMatchesKeyword(item, keyword) {
  if (!keyword) return true
  const tokens = keyword.split(/\s+/).filter(Boolean)
  const text = [
    item.orderSn,
    item.displaySn,
    item.snLabel,
    item.itemTypeText,
    item.title,
    item.amount,
    item.status,
    item.statusLabel,
    item.roleText,
    item.counterpartyName,
    item.counterpartyUsername,
    item.counterpartyLine,
    item.fundText,
    item.progressText,
    item.latestTime,
    item.refundTitle,
    item.refundStatusText,
    item.refundReason,
    item.actionHint,
    (item.summaryEvents || []).join(' ')
  ].filter(Boolean).join(' ').toLowerCase()
  return tokens.every((token) => text.indexOf(token) >= 0)
}

function filterText(key) {
  const item = FILTERS.find((filter) => filter.key === key)
  return item ? item.text : '当前分类'
}

function orderMatchesFilter(item, activeFilter) {
  if (activeFilter === 'all') return true
  if (['buyer', 'seller', 'publisher', 'rider'].indexOf(activeFilter) >= 0) {
    return item.role === activeFilter
  }
  if (activeFilter === 'toPay') return item.status === 'unpaid'
  if (activeFilter === 'toConfirm') return item.status === 'paid' && item.itemType !== 'errand'
  if (activeFilter === 'toAccept') return item.status === 'paid' && item.itemType === 'errand'
  if (activeFilter === 'toShip') return item.status === 'confirmed'
  if (activeFilter === 'toReceive') return item.status === 'shipped'
  if (activeFilter === 'toComment') return item.canComment === true
  if (activeFilter === 'afterSale') return ['refunding', 'disputed'].indexOf(item.status) >= 0 || (item.refund && item.refund.active)
  if (activeFilter === 'done') return item.status === 'completed'
  if (activeFilter === 'closed') return ['cancelled', 'refunded'].indexOf(item.status) >= 0
  return true
}

function decorateOrder(item) {
  const refund = item.refund || null
  const activeRefund = refund && refund.active
  const waitingErrandPeer = item.itemType === 'errand' && item.canChat === false
  const isBuyer = item.role === 'buyer'
  const isSeller = item.role === 'seller'
  const isPublisher = item.role === 'publisher'
  const isRider = item.role === 'rider'
  const canConfirm = isSeller && item.status === 'paid' && !waitingErrandPeer
  const canFulfill = item.itemType === 'errand'
    ? (isRider && item.status === 'confirmed' && !waitingErrandPeer)
    : (isSeller && item.status === 'confirmed' && !waitingErrandPeer)
  const canComplete = item.itemType === 'errand'
    ? (isPublisher && item.status === 'shipped')
    : ((isBuyer && item.status === 'shipped') || (isBuyer && item.status === 'paid' && !waitingErrandPeer))
  const canCancel = (isBuyer || (isPublisher && item.itemType === 'errand'))
    && (item.status === 'unpaid' || (item.status === 'paid' && (item.itemType === 'service' || item.itemType === 'errand')))
  const refundableStatus = ['paid', 'confirmed', 'shipped', 'completed'].indexOf(item.status) >= 0
  const complainableStatus = ['paid', 'confirmed', 'shipped', 'refunding', 'disputed'].indexOf(item.status) >= 0
  const canRefund = (isBuyer || isPublisher) && refundableStatus && !waitingErrandPeer && !activeRefund
  const canComplain = (isBuyer || isSeller || isPublisher || isRider) && complainableStatus && !waitingErrandPeer && !activeRefund
  const canPay = (isBuyer || (isPublisher && item.itemType === 'errand')) && item.status === 'unpaid'
  const autoConfirm = item.autoConfirm || {}
  return {
    orderSn: item.orderSn,
    displaySn: item.isPublication ? (item.publicationId || item.orderSn) : item.orderSn,
    snLabel: item.isPublication ? '发布编号' : '订单号',
    itemId: item.itemId,
    itemType: item.itemType,
    itemTypeText: item.itemTypeText,
    title: item.title,
    amount: item.amount,
    status: item.status,
    statusLabel: item.statusLabel,
    role: item.role || 'buyer',
    roleText: item.role === 'seller'
      ? '我卖出的'
      : item.role === 'publisher'
        ? '我发布的'
        : item.role === 'rider'
          ? '我接单的'
          : '我买到的',
    counterpartyName: item.counterpartyName,
    counterpartyUsername: item.counterpartyUsername,
    counterpartyLine: item.counterpartyLine,
    counterpartyId: item.counterpartyId || (item.counterparty && item.counterparty.id) || '',
    counterpartyAvatar: item.counterpartyAvatar || (item.counterparty && item.counterparty.avatar) || '',
    counterparty: item.counterparty || null,
    participants: item.participants || null,
    fundText: item.fundText,
    progressText: item.progressText,
    latestTime: item.latestTime,
    hasRefund: Boolean(refund) || item.hasRefund,
    isPublication: Boolean(item.isPublication),
    detailText: item.isPublication ? '查看' : '详情',
    refundTitle: refund ? (refund.title || '售后进度') : (item.refundTitle || '售后进度'),
    refundStatusText: refund ? (refund.statusText || item.refundStatusText) : item.refundStatusText,
    refundReason: refund ? (refund.summary || refund.reason || refund.resultText || '') : (item.refundReason || ''),
    summaryEvents: item.summaryEvents || [],
    autoConfirm,
    canChat: item.canChat !== false && !waitingErrandPeer,
    canPay,
    canConfirm,
    canShip: canFulfill,
    canReceive: canComplete,
    canCancel,
    canRefund,
    canComplain,
    canComment: item.canComment === true,
    actionHint: item.actionHint || (waitingErrandPeer
      ? '等待骑手接单中'
      : item.status === 'unpaid'
        ? '待支付'
        : item.status === 'confirmed'
          ? '已接单'
          : item.status === 'paid'
            ? '待履约'
            : item.status === 'shipped'
              ? '履约中'
              : item.status === 'completed'
                ? '可评价'
                : item.statusLabel)
  }
}

BasePage({
  requireAuth: true,
  data: {
    orders: [],
    visibleOrders: [],
    noOrders: true,
    loadingOrders: false,
    activeFilter: 'all',
    filters: buildFilters('all'),
    searchKeyword: '',
    searchResultText: '',
    emptyText: '当前分类下还没有订单，可以切换分类看看。'
  },

  onLoad(query) {
    const activeFilter = query && query.filter ? query.filter : 'all'
    if (!FILTERS.some((item) => item.key === activeFilter)) return
    this.setData({
      activeFilter,
      filters: buildFilters(activeFilter)
    })
  },

  onShow() {
    if (!store.requireLogin()) return
    const now = Date.now()
    if (this.lastLoadAt && now - this.lastLoadAt < 500) return
    this.loadOrders()
  },

  changeFilter(e) {
    const activeFilter = e.currentTarget.dataset.key
    if (activeFilter === this.data.activeFilter) return
    this.setData({
      activeFilter,
      filters: buildFilters(activeFilter)
    })
    this.applyFilter()
  },

  applyFilter() {
    const activeFilter = this.data.activeFilter
    const keyword = normalizeKeyword(this.data.searchKeyword)
    const visibleOrders = this.data.orders.filter((item) => {
      return orderMatchesFilter(item, activeFilter) && orderMatchesKeyword(item, keyword)
    })
    const plainEmptyText = activeFilter === 'all'
      ? '当前还没有订单，可以先去逛逛商品、服务或跑腿任务。'
      : `暂无${filterText(activeFilter)}订单，可以切换分类看看。`
    this.setData({
      visibleOrders,
      noOrders: visibleOrders.length === 0,
      searchResultText: keyword ? `找到 ${visibleOrders.length} 条相关订单` : '',
      emptyText: keyword ? '没有找到匹配的订单，换个关键词试试。' : plainEmptyText
    })
  },

  onSearchInput(e) {
    const searchKeyword = (e.detail && e.detail.value) || ''
    this.setData({ searchKeyword })
    this.applyFilter()
  },

  onSearchConfirm(e) {
    const searchKeyword = (e.detail && e.detail.value) || this.data.searchKeyword || ''
    this.setData({ searchKeyword })
    this.applyFilter()
  },

  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.applyFilter()
  },

  openDetail(e) {
    if (this.navigating) return
    const orderSn = e.currentTarget.dataset.sn
    const order = this.data.visibleOrders.find((item) => item.orderSn === orderSn) || this.data.orders.find((item) => item.orderSn === orderSn)
    this.navigating = true
    if (order && order.isPublication) {
      const url = order.itemType === 'goods'
        ? `/pages/detail/detail?id=${order.itemId}`
        : `/pages/service-detail/service-detail?id=${order.itemId}&type=${order.itemType}`
      wx.navigateTo({ url })
    } else {
      wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${orderSn}` })
    }
    setTimeout(() => { this.navigating = false }, 600)
  },

  confirmReceive(e) {
    const orderSn = e.currentTarget.dataset.sn
    api({ url: `/api/orders/${orderSn}/receive`, method: 'POST' }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '已确认收货' })
      this.loadOrders()
    })
  },

  pay(e) {
    const orderSn = e.currentTarget.dataset.sn
    api({ url: `/api/orders/${orderSn}/pay`, method: 'POST' }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '支付成功' })
      this.loadOrders()
    })
  },

  cancelOrder(e) {
    const orderSn = e.currentTarget.dataset.sn
    wx.showModal({
      title: '取消订单',
      content: '未支付订单会直接取消；已托管但未履约的服务或跑腿订单会退回余额。',
      confirmText: '确认取消',
      success: (modal) => {
        if (!modal.confirm) return
        api({ url: `/api/orders/${orderSn}/cancel`, method: 'POST' }).then((res) => {
          if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
          wx.showToast({ title: '已取消' })
          this.loadOrders()
        })
      }
    })
  },

  ship(e) {
    const orderSn = e.currentTarget.dataset.sn
    api({ url: `/api/orders/${orderSn}/ship`, method: 'POST' }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '已更新履约进度' })
      this.loadOrders()
    })
  },

  confirmOrder(e) {
    const orderSn = e.currentTarget.dataset.sn
    api({ url: `/api/orders/${orderSn}/confirm`, method: 'POST' }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '已确认订单' })
      this.loadOrders()
    })
  },

  refund(e) {
    const orderSn = e.currentTarget.dataset.sn
    wx.showModal({
      title: '申请售后',
      editable: true,
      placeholderText: '填写退款原因或凭证说明',
      success: (res) => {
        if (!res.confirm) return
        const reason = String(res.content || '').trim()
        if (reason.length < 6) return wx.showToast({ title: '请至少填写 6 个字说明', icon: 'none' })
        api({ url: `/api/orders/${orderSn}/refunds`, method: 'POST', data: { reason } }).then((apiRes) => {
          if (apiRes.code !== 200) return wx.showToast({ title: apiRes.msg, icon: 'none' })
          wx.showToast({ title: '已提交售后' })
          this.loadOrders()
        })
      }
    })
  },

  complaint(e) {
    const orderSn = e.currentTarget.dataset.sn
    wx.showModal({
      title: '投诉举证',
      editable: true,
      placeholderText: '填写投诉说明，聊天记录将作为证据链',
      success: (res) => {
        if (!res.confirm) return
        const content = String(res.content || '').trim()
        if (content.length < 6) return wx.showToast({ title: '请至少填写 6 个字说明', icon: 'none' })
        api({ url: `/api/orders/${orderSn}/complaints`, method: 'POST', data: { content } }).then((apiRes) => {
          if (apiRes.code !== 200) return wx.showToast({ title: apiRes.msg, icon: 'none' })
          wx.showToast({ title: '投诉已提交' })
          this.loadOrders()
        })
      }
    })
  },

  openChatEvidence(e) {
    const orderSn = e.currentTarget.dataset.sn
    const order = this.data.visibleOrders.find((item) => item.orderSn === orderSn) || this.data.orders.find((item) => item.orderSn === orderSn)
    if (!order) return
    openChatRoom({
      businessType: order.itemType,
      businessId: order.itemId,
      goodsId: order.itemType === 'goods' ? order.itemId : '',
      orderSn: order.orderSn,
      peerId: order.counterpartyId || '',
      title: order.title,
      peerName: order.counterpartyName,
      peerUsername: order.counterpartyUsername,
      peerAvatar: order.counterpartyAvatar || ''
    })
  },

  openCounterparty(e) {
    const userId = e.currentTarget.dataset.userId
    if (!userId) return
    const orderSn = e.currentTarget.dataset.sn
    const order = this.data.visibleOrders.find((item) => item.orderSn === orderSn) || this.data.orders.find((item) => item.orderSn === orderSn) || {}
    const user = order.counterparty || {}
    store.setPendingUserPreview({
      id: userId,
      nickname: user.nickname || order.counterpartyName,
      username: user.username || order.counterpartyUsername,
      avatar: user.avatar || order.counterpartyAvatar || '',
      role: user.role,
      verified: user.verified,
      creditScore: user.creditScore,
      college: user.college
    })
    wx.navigateTo({ url: `/pages/user/user?id=${userId}` })
  },

  openComment(e) {
    if (this.navigating) return
    this.navigating = true
    wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${e.currentTarget.dataset.sn}&comment=1` })
    setTimeout(() => { this.navigating = false }, 600)
  },

  loadOrders() {
    if (this.loadingOrders) return
    this.loadingOrders = true
    this.lastLoadAt = Date.now()
    this.setData({ loadingOrders: true })
    api({ url: '/api/orders' }).then((res) => {
      const orders = (res.data.list || []).map(decorateOrder)
      this.setData({
        orders,
        loadingOrders: false
      })
      this.applyFilter()
    }).finally(() => {
      this.loadingOrders = false
      if (this.data.loadingOrders) this.setData({ loadingOrders: false })
    })
  }
})
