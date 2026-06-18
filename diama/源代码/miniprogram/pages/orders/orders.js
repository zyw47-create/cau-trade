const { api } = require('../../utils/api')
const store = require('../../utils/store')

const FILTERS = [
  { key: 'all', text: '全部' },
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

function decorateOrder(item) {
  const waitingErrandPeer = item.itemType === 'errand' && item.canChat === false
  const isBuyer = item.role === 'buyer'
  const isSeller = item.role === 'seller'
  const isPublisher = item.role === 'publisher'
  const isRider = item.role === 'rider'
  const canFulfill = item.itemType === 'errand'
    ? (isRider && item.status === 'paid' && !waitingErrandPeer)
    : (isSeller && item.status === 'paid' && !waitingErrandPeer)
  const canComplete = item.itemType === 'errand'
    ? ((isPublisher && item.status === 'shipped') || (isPublisher && item.status === 'paid' && !waitingErrandPeer))
    : ((isBuyer && item.status === 'shipped') || (isBuyer && item.status === 'paid' && !waitingErrandPeer))
  const canCancel = isBuyer && (item.status === 'unpaid' || (item.status === 'paid' && (item.itemType === 'service' || item.itemType === 'errand')))
  const canRefund = isBuyer && item.status === 'paid' && !waitingErrandPeer
  const canComplain = (isBuyer || isPublisher) && ((item.status === 'paid' && !waitingErrandPeer) || item.status === 'shipped')
  const canPay = isBuyer && item.status === 'unpaid'
  const autoConfirm = item.autoConfirm || {}
  return {
    orderSn: item.orderSn,
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
    fundText: item.fundText,
    progressText: item.progressText,
    latestTime: item.latestTime,
    hasRefund: item.hasRefund,
    refundStatusText: item.refundStatusText,
    refundReason: item.refund ? item.refund.reason : '',
    summaryEvents: item.summaryEvents || [],
    autoConfirm,
    canChat: item.canChat,
    canPay,
    canShip: canFulfill,
    canReceive: canComplete,
    canCancel,
    canRefund,
    canComplain,
    canComment: item.status === 'completed',
    actionHint: waitingErrandPeer
      ? '等待骑手接单中'
      : item.status === 'unpaid'
        ? '待支付'
        : item.status === 'paid'
          ? '待履约'
          : item.status === 'shipped'
            ? '履约中'
            : item.status === 'completed'
              ? '可评价'
              : item.statusLabel
  }
}

Page({
  data: {
    orders: [],
    visibleOrders: [],
    noOrders: true,
    loadingOrders: false,
    activeFilter: 'all',
    filters: buildFilters('all')
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
    const visibleOrders = this.data.orders.filter((item) => {
      if (activeFilter === 'all') return true
      return item.role === activeFilter
    })
    this.setData({
      visibleOrders,
      noOrders: visibleOrders.length === 0
    })
  },

  openDetail(e) {
    if (this.navigating) return
    this.navigating = true
    wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${e.currentTarget.dataset.sn}` })
    setTimeout(() => { this.navigating = false }, 600)
  },

  confirmReceive(e) {
    const orderSn = e.currentTarget.dataset.sn
    api({ url: '/api/order/receive', method: 'POST', data: { orderSn } }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '已确认收货' })
      this.loadOrders()
    })
  },

  pay(e) {
    const orderSn = e.currentTarget.dataset.sn
    api({ url: '/api/order/pay', method: 'POST', data: { orderSn } }).then((res) => {
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
        api({ url: '/api/order/cancel', method: 'POST', data: { orderSn } }).then((res) => {
          if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
          wx.showToast({ title: '已取消' })
          this.loadOrders()
        })
      }
    })
  },

  ship(e) {
    const orderSn = e.currentTarget.dataset.sn
    api({ url: '/api/order/ship', method: 'POST', data: { orderSn } }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '已更新履约进度' })
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
        api({ url: '/api/order/refund', method: 'POST', data: { orderSn, reason } }).then((apiRes) => {
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
        api({ url: '/api/order/complaint', method: 'POST', data: { orderSn, content } }).then((apiRes) => {
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
    store.setPendingChat({
      businessType: order.itemType,
      businessId: order.itemId,
      goodsId: order.itemType === 'goods' ? order.itemId : '',
      orderSn: order.orderSn,
      title: order.title,
      peerName: order.counterpartyName,
      peerUsername: order.counterpartyUsername
    })
    wx.switchTab({ url: '/pages/chat/chat' })
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
    api({ url: '/api/order/list' }).then((res) => {
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
