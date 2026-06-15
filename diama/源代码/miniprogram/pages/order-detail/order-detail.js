const { api } = require('../../utils/api')
const store = require('../../utils/store')

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
    api({ url: '/api/order/detail', data: { orderSn: this.orderSn } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      const order = res.data || {}
      const waitingErrandPeer = order.itemType === 'errand' && order.canChat === false
      const viewOrder = Object.assign({}, order, {
        canPay: order.status === 'unpaid',
        canShip: order.status === 'paid' && !waitingErrandPeer,
        canReceive: (order.status === 'paid' && !waitingErrandPeer) || order.status === 'shipped',
        canCancel: order.status === 'unpaid' || (order.status === 'paid' && (order.itemType === 'service' || order.itemType === 'errand')),
        canRefund: order.status === 'paid' && !waitingErrandPeer,
        canComplain: (order.status === 'paid' && !waitingErrandPeer) || order.status === 'shipped' || order.status === 'refunding',
        canComment: order.status === 'completed'
      })
      const refund = order.refund || null
      this.setData({
        order: viewOrder,
        timeline: viewOrder.timeline || [],
        refund,
        refundProgress: refund ? refund.progress || [] : [],
        hasRefund: Boolean(refund),
        scrollIntoView: this.focusComment && viewOrder.canComment ? 'comment-section' : ''
      })
      if (this.focusComment && viewOrder.canComment) {
        this.focusComment = false
      }
      this.loaded = true
    }).finally(() => {
      this.loadingDetail = false
    })
  },

  pay() {
    api({ url: '/api/order/pay', method: 'POST', data: { orderSn: this.orderSn } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '支付成功' })
      this.loadDetail()
    })
  },

  cancelOrder() {
    wx.showModal({
      title: '取消订单',
      content: '未付款订单会直接取消；已托管但未履约的服务或跑腿会退回余额。',
      confirmText: '确认取消',
      success: (modal) => {
        if (!modal.confirm) return
        api({ url: '/api/order/cancel', method: 'POST', data: { orderSn: this.orderSn } }).then((res) => {
          if (res.code !== 200) {
            wx.showToast({ title: res.msg, icon: 'none' })
            return
          }
          wx.showToast({ title: '已取消' })
          this.loadDetail()
        })
      }
    })
  },

  ship() {
    api({ url: '/api/order/ship', method: 'POST', data: { orderSn: this.orderSn } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '进度已更新' })
      this.loadDetail()
    })
  },

  receive() {
    api({ url: '/api/order/receive', method: 'POST', data: { orderSn: this.orderSn } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
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
        if (reason.length < 6) {
          wx.showToast({ title: '请至少填写6个字说明', icon: 'none' })
          return
        }
        api({
          url: '/api/order/refund',
          method: 'POST',
          data: { orderSn: this.orderSn, reason }
        }).then((apiRes) => {
          if (apiRes.code !== 200) {
            wx.showToast({ title: apiRes.msg, icon: 'none' })
            return
          }
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
        if (content.length < 6) {
          wx.showToast({ title: '请至少填写6个字说明', icon: 'none' })
          return
        }
        api({
          url: '/api/order/complaint',
          method: 'POST',
          data: { orderSn: this.orderSn, content }
        }).then((apiRes) => {
          if (apiRes.code !== 200) {
            wx.showToast({ title: apiRes.msg, icon: 'none' })
            return
          }
          wx.showToast({ title: '投诉已提交' })
          this.loadDetail()
        })
      }
    })
  },

  openChatEvidence() {
    const order = this.data.order || {}
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
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '评价成功' })
      this.setData({ commentContent: '' })
      this.loadDetail()
    })
  }
})
