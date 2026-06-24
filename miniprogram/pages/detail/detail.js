const { request: api } = require('../../utils/request')
const store = require('../../utils/store')
const { openChatRoom } = require('../../utils/chat-nav')

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
    api({ url: `/api/goods/${this.goodsId}` }).then((res) => {
      const item = this.decorateItem(res.data)
      store.addBrowseHistory(item)
      this.setData({ item })
      this.loaded = true
    }).finally(() => {
      this.loadingDetail = false
    })
  },

  decorateItem(item) {
    return Object.assign({}, item, {
      favoriteText: item.favorite ? '取消收藏' : '收藏',
      sellerAvatar: item.sellerAvatar || '',
      sellerInitial: item.sellerInitial || (item.sellerName || '同').charAt(0),
      sellerLine: `${item.sellerName || '同校用户'} @${item.username || 'user'}`,
      commentCount: (item.comments || []).length,
      commentPreview: (item.comments || []).slice(0, 2),
      auditTag: item.auditNote || '待审核说明',
      safeTags: ['资金托管', '聊天留痕', '售后仲裁']
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
      avatar: item.sellerAvatar || '',
      creditScore: item.sellerCreditScore || item.creditScore || 100,
      role: 'user',
      verified: true
    })
    wx.navigateTo({ url: `/pages/user/user?id=${this.data.item.sellerId}` })
    setTimeout(() => { this.navigating = false }, 500)
  },

  createOrder() {
    if (!store.requireVerified()) return
    api({ url: '/api/orders', method: 'POST', data: { goodsId: this.data.item.id } }).then((res) => {
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
    api({ url: `/api/orders/${orderSn}/pay`, method: 'POST' }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '支付成功' })
      wx.navigateTo({ url: '/pages/orders/orders' })
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
    const user = store.getState().user || {}
    if (String(item.sellerId || '') === String(user.id || '')) {
      wx.showToast({ title: '???????', icon: 'none' })
      return
    }
    openChatRoom({
      businessType: 'goods',
      businessId: item.id,
      goodsId: item.id,
      title: item.title,
      peerName: item.sellerName,
      peerUsername: item.username,
      peerAvatar: item.sellerAvatar || ''
    })
  },

  noop() {}
})
