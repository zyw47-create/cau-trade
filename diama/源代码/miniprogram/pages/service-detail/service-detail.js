const { api } = require('../../utils/api')
const store = require('../../utils/store')

Page({
  data: {
    item: null,
    ownerReviews: [],
    noOwnerReviews: true,
    actionText: '当前不可操作',
    actionDisabled: true,
    actionLoading: false,
    actionClass: 'action-btn disabled',
    actionType: 'none',
    taking: false,
    ordering: false
  },

  onLoad(query) {
    this.itemId = query.id
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
    api({ url: '/api/service/detail', data: { id: this.itemId } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      const owner = res.data.owner || {}
      const item = Object.assign({}, res.data, {
        ownerInitial: (owner.nickname || '同').charAt(0),
        ownerLine: `${owner.nickname || '同校用户'} @${owner.username || 'user'}`,
        canTake: res.data.type === 'errand' && res.data.status === 'waiting_accept',
        canOrder: res.data.type !== 'errand' && res.data.status === 'on_sale'
      })
      const action = this.getActionState(item, this.data.ordering || this.data.taking)
      const ownerReviews = res.data.ownerReviews || []
      this.setData(Object.assign({
        item,
        ownerReviews,
        noOwnerReviews: ownerReviews.length === 0
      }, action))
      this.loaded = true
    }).finally(() => {
      this.loadingDetail = false
    })
  },

  syncActionState() {
    const item = this.data.item || {}
    const busy = this.data.ordering || this.data.taking
    this.setData(this.getActionState(item, busy))
  },

  getActionState(item, busy) {
    if (item.canOrder) {
      return {
        actionText: busy ? '提交中' : '预约服务',
        actionDisabled: busy,
        actionLoading: busy,
        actionClass: busy ? 'action-btn disabled' : 'action-btn buy',
        actionType: 'order'
      }
    }
    if (item.canTake) {
      return {
        actionText: busy ? '处理中' : '抢单',
        actionDisabled: busy,
        actionLoading: busy,
        actionClass: busy ? 'action-btn disabled' : 'action-btn buy',
        actionType: 'take'
      }
    }
    return {
      actionText: '当前不可操作',
      actionDisabled: true,
      actionLoading: false,
      actionClass: 'action-btn disabled',
      actionType: 'none'
    }
  },

  openOwner() {
    const owner = (this.data.item && this.data.item.owner) || {}
    store.setPendingUserPreview({
      id: owner.id,
      nickname: owner.nickname,
      username: owner.username,
      role: owner.role,
      verified: owner.verified,
      creditScore: owner.creditScore,
      reviewCount: owner.reviewCount,
      completedCount: owner.completedCount,
      goodRate: owner.goodRate,
      college: owner.college,
      campus: owner.campus,
      responseTime: owner.responseTime,
      bio: owner.bio
    })
    wx.navigateTo({ url: `/pages/user/user?id=${this.data.item.owner.id}` })
  },

  orderService() {
    if (!store.requireVerified() || this.data.ordering) return
    this.setData({ ordering: true })
    this.syncActionState()
    api({ url: '/api/service/order', method: 'POST', data: { id: this.data.item.id } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '预约已创建' })
      wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
    }).finally(() => {
      this.setData({ ordering: false })
      this.syncActionState()
    })
  },

  takeErrand() {
    if (!store.requireVerified() || this.data.taking) return
    this.setData({ taking: true })
    this.syncActionState()
    api({ url: '/api/rider/take', method: 'POST', data: { id: this.data.item.id } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        this.loadDetail()
        return
      }
      wx.showToast({ title: '接单成功' })
      this.loadDetail()
      if (res.data && res.data.orderSn) {
        wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
      } else {
        wx.switchTab({ url: '/pages/orders/orders' })
      }
    }).finally(() => {
      this.setData({ taking: false })
      this.syncActionState()
    })
  },

  handlePrimaryAction() {
    if (this.data.actionType === 'order') {
      this.orderService()
      return
    }
    if (this.data.actionType === 'take') this.takeErrand()
  },

  openChat() {
    if (!store.requireLogin()) return
    const item = this.data.item || {}
    const owner = item.owner || {}
    store.setPendingChat({
      businessType: item.type === 'errand' ? 'errand' : 'service',
      businessId: item.id,
      title: item.title,
      peerName: owner.nickname || item.provider,
      peerUsername: owner.username || item.username
    })
    wx.switchTab({ url: '/pages/chat/chat' })
  }
})
