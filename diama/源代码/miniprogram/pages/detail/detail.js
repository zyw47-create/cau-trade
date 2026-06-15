const { api } = require('../../utils/api')
const store = require('../../utils/store')

Page({
  data: {
    item: null
  },

  onLoad(query) {
    this.goodsId = query.id
  },

  onReady() {
    this.loadDetail()
  },

  onShow() {
    const now = Date.now()
    if (this.goodsId && this.loaded && (!this.lastLoadAt || now - this.lastLoadAt > 5000)) this.loadDetail()
  },

  loadDetail() {
    if (this.loadingDetail) return
    this.loadingDetail = true
    this.lastLoadAt = Date.now()
    api({ url: '/api/goods/detail', data: { id: this.goodsId } }).then((res) => {
      this.setData({ item: this.decorateItem(res.data) })
      this.loaded = true
    }).finally(() => {
      this.loadingDetail = false
    })
  },

  decorateItem(item) {
    return Object.assign({}, item, {
      favoriteText: item.favorite ? '取消收藏' : '收藏',
      sellerInitial: (item.sellerName || '同').charAt(0),
      sellerLine: `${item.sellerName || '同校用户'} @${item.username || 'user'}`
    })
  },

  openSeller() {
    if (this.navigating) return
    const item = this.data.item || {}
    this.navigating = true
    store.setPendingUserPreview({
      id: item.sellerId,
      nickname: item.sellerName,
      username: item.username,
      creditScore: item.sellerCreditScore || item.creditScore || 100,
      role: 'user',
      verified: true
    })
    wx.navigateTo({ url: `/pages/user/user?id=${this.data.item.sellerId}` })
    setTimeout(() => { this.navigating = false }, 500)
  },

  createOrder() {
    if (!store.requireVerified()) return
    api({ url: '/api/order/create', method: 'POST', data: { goodsId: this.data.item.id } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showModal({
        title: '订单已创建',
        content: '请在订单详情中确认金额与交易对象，付款后资金进入平台托管。',
        confirmText: '查看订单',
        success: (modal) => {
          if (modal.confirm) {
            wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
          }
        }
      })
    })
  },

  pay(orderSn) {
    api({ url: '/api/order/pay', method: 'POST', data: { orderSn } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '支付成功' })
      wx.switchTab({ url: '/pages/orders/orders' })
    })
  },

  toggleFavorite() {
    if (!store.requireLogin()) return
    api({ url: '/api/goods/favorite', method: 'POST', data: { id: this.data.item.id } }).then((res) => {
      this.setData({
        'item.favorite': res.data.favorite,
        'item.favoriteCount': res.data.favoriteCount,
        'item.favoriteText': res.data.favorite ? '取消收藏' : '收藏'
      })
      wx.showToast({ title: res.data.favorite ? '已收藏' : '已取消' })
    })
  },

  openChat() {
    if (!store.requireLogin()) return
    const item = this.data.item || {}
    store.setPendingChat({
      businessType: 'goods',
      businessId: item.id,
      goodsId: item.id,
      title: item.title,
      peerName: item.sellerName,
      peerUsername: item.username
    })
    wx.switchTab({ url: '/pages/chat/chat' })
  },

  noop() {}
})
