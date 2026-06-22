const { request: api } = require('../../utils/request')
const store = require('../../utils/store')
const { openChatRoom } = require('../../utils/chat-nav')

function buildOrderView(order) {
  const refund = order.refund || null
  const activeRefund = refund && refund.active
  const waitingErrandPeer = order.itemType === 'errand' && order.canChat === false
  const isBuyer = order.role === 'buyer'
  const isSeller = order.role === 'seller'
  const isPublisher = order.role === 'publisher'
  const isRider = order.role === 'rider'
  const canConfirm = isSeller && order.status === 'paid' && !waitingErrandPeer
  const canFulfill = order.itemType === 'errand'
    ? (isRider && order.status === 'confirmed' && !waitingErrandPeer)
    : (isSeller && order.status === 'confirmed' && !waitingErrandPeer)
  const canComplete = order.itemType === 'errand'
    ? (isPublisher && order.status === 'shipped')
    : ((isBuyer && order.status === 'shipped') || (isBuyer && order.status === 'paid' && !waitingErrandPeer))
  const canCancel = (isBuyer || (isPublisher && order.itemType === 'errand'))
    && (order.status === 'unpaid' || (order.status === 'paid' && (order.itemType === 'service' || order.itemType === 'errand')))
  const refundableStatus = ['paid', 'confirmed', 'shipped', 'completed'].indexOf(order.status) >= 0
  const complainableStatus = ['paid', 'confirmed', 'shipped', 'refunding', 'disputed'].indexOf(order.status) >= 0
  const canRefund = (isBuyer || isPublisher) && refundableStatus && !waitingErrandPeer && !activeRefund
  const canComplain = (isBuyer || isSeller || isPublisher || isRider) && complainableStatus && !waitingErrandPeer && !activeRefund
  const autoConfirm = order.autoConfirm || {}
  const actionHint = order.actionHint || (waitingErrandPeer
    ? '跑腿任务正在等待骑手接单，接单后可以继续聊天、投诉和查看进度。'
    : order.status === 'unpaid'
      ? '当前订单待支付，支付后资金会进入平台托管。'
      : order.status === 'confirmed'
        ? '骑手已接单，可开始配送并同步履约进度。'
        : order.status === 'paid'
          ? '当前资金已托管，可继续履约、申请售后或联系对方。'
          : order.status === 'shipped'
            ? '当前订单履约中，确认完成后会进行结算。'
            : order.status === 'completed'
              ? '订单已完成，现在可以补充评价。'
              : '可在此查看订单进度、售后状态和聊天证据。')

  const summaryCards = order.summaryCards || [
    { label: '订单类型', value: order.itemTypeText || '订单' },
    { label: '资金状态', value: order.fundText || '待确认' },
    { label: '最新进展', value: order.progressText || '已创建' }
  ]

  return Object.assign({}, order, {
    canPay: (isBuyer || (isPublisher && order.itemType === 'errand')) && order.status === 'unpaid',
    canConfirm,
    canShip: canFulfill,
    canReceive: canComplete,
    canCancel,
    canRefund,
    canComplain,
    canChat: order.canChat !== false && !waitingErrandPeer,
    canComment: order.canComment === true,
    autoConfirm,
    actionHint,
    summaryCards
  })
}

Page({
  data: {
    order: null,
    timeline: [],
    refund: null,
    refundProgress: [],
    hasRefund: false,
    commentScore: 5,
    commentContent: '',
    scrollIntoView: ''
  },

  onLoad(query) {
    this.orderSn = query.orderSn
    this.focusComment = query.comment === '1'
  },

  onReady() {
    this.loadDetail()
  },

  onShow() {
    const now = Date.now()
    if (this.loaded && (!this.lastLoadAt || now - this.lastLoadAt > 800)) this.loadDetail()
  },

  loadDetail() {
    if (this.loadingDetail) return
    this.loadingDetail = true
    this.lastLoadAt = Date.now()
    api({ url: `/api/orders/${this.orderSn}` }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      const order = buildOrderView(res.data || {})
      const refund = order.refund || null
      this.setData({
        order,
        timeline: order.timeline || [],
        refund,
        refundProgress: refund ? refund.progress || [] : [],
        hasRefund: Boolean(refund),
        scrollIntoView: this.focusComment && order.canComment ? 'comment-section' : ''
      })
      if (this.focusComment && order.canComment) this.focusComment = false
      this.loaded = true
    }).finally(() => {
      this.loadingDetail = false
    })
  },

  pay() {
    api({ url: `/api/orders/${this.orderSn}/pay`, method: 'POST' }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '支付成功' })
      this.loadDetail()
    })
  },

  cancelOrder() {
    wx.showModal({
      title: '取消订单',
      content: '未支付订单会直接取消；已托管但未履约的服务或跑腿订单会退回余额。',
      confirmText: '确认取消',
      success: (modal) => {
        if (!modal.confirm) return
        api({ url: `/api/orders/${this.orderSn}/cancel`, method: 'POST' }).then((res) => {
          if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
          wx.showToast({ title: '已取消' })
          this.loadDetail()
        })
      }
    })
  },

  ship() {
    api({ url: `/api/orders/${this.orderSn}/ship`, method: 'POST' }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '进度已更新' })
      this.loadDetail()
    })
  },

  confirmOrder() {
    api({ url: `/api/orders/${this.orderSn}/confirm`, method: 'POST' }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '已确认订单' })
      this.loadDetail()
    })
  },

  receive() {
    api({ url: `/api/orders/${this.orderSn}/receive`, method: 'POST' }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '已确认完成' })
      this.loadDetail()
    })
  },

  refund() {
    wx.showModal({
      title: '申请售后',
      editable: true,
      placeholderText: '填写问题、凭证或希望平台处理的事项',
      success: (res) => {
        if (!res.confirm) return
        const reason = String(res.content || '').trim()
        if (reason.length < 6) return wx.showToast({ title: '请至少填写 6 个字说明', icon: 'none' })
        api({ url: `/api/orders/${this.orderSn}/refunds`, method: 'POST', data: { reason } }).then((apiRes) => {
          if (apiRes.code !== 200) return wx.showToast({ title: apiRes.msg, icon: 'none' })
          wx.showToast({ title: '已提交售后' })
          this.loadDetail()
        })
      }
    })
  },

  complaint() {
    wx.showModal({
      title: '投诉举证',
      editable: true,
      placeholderText: '填写投诉说明，聊天证据链会自动关联',
      success: (res) => {
        if (!res.confirm) return
        const content = String(res.content || '').trim()
        if (content.length < 6) return wx.showToast({ title: '请至少填写 6 个字说明', icon: 'none' })
        api({ url: `/api/orders/${this.orderSn}/complaints`, method: 'POST', data: { content } }).then((apiRes) => {
          if (apiRes.code !== 200) return wx.showToast({ title: apiRes.msg, icon: 'none' })
          wx.showToast({ title: '投诉已提交' })
          this.loadDetail()
        })
      }
    })
  },

  openChatEvidence() {
    const order = this.data.order || {}
    openChatRoom({
      businessType: order.itemType,
      businessId: order.itemId,
      goodsId: order.itemType === 'goods' ? order.itemId : '',
      orderSn: order.orderSn,
      title: order.title,
      peerName: order.counterpartyName,
      peerUsername: order.counterpartyUsername,
      peerAvatar: order.counterpartyAvatar || ''
    })
  },

  onScoreInput(e) {
    this.setData({ commentScore: Number(e.detail.value) })
  },

  onCommentInput(e) {
    this.setData({ commentContent: e.detail.value })
  },

  submitComment() {
    if (!this.data.commentContent.trim()) {
      wx.showToast({ title: '请输入评价内容', icon: 'none' })
      return
    }
    api({
      url: '/api/comment',
      method: 'POST',
      data: {
        orderSn: this.orderSn,
        score: this.data.commentScore,
        content: this.data.commentContent
      }
    }).then((res) => {
      if (res.code !== 200) return wx.showToast({ title: res.msg, icon: 'none' })
      wx.showToast({ title: '评价成功' })
      this.setData({ commentContent: '', 'order.canComment': false, 'order.hasComment': true })
      this.loadDetail()
    })
  }
})
