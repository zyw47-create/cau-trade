const { api } = require('../../utils/api')
const store = require('../../utils/store')

Page({
  data: {
    orders: [],
    noOrders: true,
    loadingOrders: false
  },

  onShow() {
    if (!store.requireLogin()) return
    const now = Date.now()
    if (this.lastLoadAt && now - this.lastLoadAt < 500) return
    this.loadOrders()
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
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '已确认收货' })
      this.loadOrders()
    })
  },

  pay(e) {
    const orderSn = e.currentTarget.dataset.sn
    api({ url: '/api/order/pay', method: 'POST', data: { orderSn } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '支付成功' })
      this.loadOrders()
    })
  },

  cancelOrder(e) {
    const orderSn = e.currentTarget.dataset.sn
    wx.showModal({
      title: '取消订单',
      content: '未付款订单会直接取消；已托管但未履约的服务或跑腿会退回余额。',
      confirmText: '确认取消',
      success: (modal) => {
        if (!modal.confirm) return
        api({ url: '/api/order/cancel', method: 'POST', data: { orderSn } }).then((res) => {
          if (res.code !== 200) {
            wx.showToast({ title: res.msg, icon: 'none' })
            return
          }
          wx.showToast({ title: '已取消' })
          this.loadOrders()
        })
      }
    })
  },

  ship(e) {
    const orderSn = e.currentTarget.dataset.sn
    api({ url: '/api/order/ship', method: 'POST', data: { orderSn } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '已更新履约' })
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
        if (reason.length < 6) {
          wx.showToast({ title: '请至少填写6个字说明', icon: 'none' })
          return
        }
        api({
          url: '/api/order/refund',
          method: 'POST',
          data: { orderSn, reason }
        }).then((apiRes) => {
          if (apiRes.code !== 200) {
            wx.showToast({ title: apiRes.msg, icon: 'none' })
            return
          }
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
        if (content.length < 6) {
          wx.showToast({ title: '请至少填写6个字说明', icon: 'none' })
          return
        }
        api({
          url: '/api/order/complaint',
          method: 'POST',
          data: { orderSn, content }
        }).then((apiRes) => {
          if (apiRes.code !== 200) {
            wx.showToast({ title: apiRes.msg, icon: 'none' })
            return
          }
          wx.showToast({ title: '投诉已提交' })
          this.loadOrders()
        })
      }
    })
  },

  openChatEvidence(e) {
    const orderSn = e.currentTarget.dataset.sn
    const order = this.data.orders.find((item) => item.orderSn === orderSn)
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
      const orders = (res.data.list || []).map((item) => {
        const waitingErrandPeer = item.itemType === 'errand' && item.canChat === false
        return {
          orderSn: item.orderSn,
          itemId: item.itemId,
          itemType: item.itemType,
          itemTypeText: item.itemTypeText,
          title: item.title,
          amount: item.amount,
          status: item.status,
          statusLabel: item.statusLabel,
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
          canChat: item.canChat,
          canPay: item.status === 'unpaid',
          canShip: item.status === 'paid' && !waitingErrandPeer,
          canReceive: (item.status === 'paid' && !waitingErrandPeer) || item.status === 'shipped',
          canCancel: item.status === 'unpaid' || (item.status === 'paid' && (item.itemType === 'service' || item.itemType === 'errand')),
          canRefund: item.status === 'paid' && !waitingErrandPeer,
          canComplain: (item.status === 'paid' && !waitingErrandPeer) || item.status === 'shipped',
          canComment: item.status === 'completed'
        }
      })
      this.setData({
        orders,
        noOrders: orders.length === 0,
        loadingOrders: false
      })
    }).finally(() => {
      this.loadingOrders = false
      if (this.data.loadingOrders) this.setData({ loadingOrders: false })
    })
  }
})
