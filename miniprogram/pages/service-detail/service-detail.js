const { request: api } = require('../../utils/request')
const store = require('../../utils/store')
const { openChatRoom } = require('../../utils/chat-nav')

function buildDetailView(data) {
  const owner = data.owner || {}
  const isErrand = data.type === 'errand'
  const serviceTime = data.serviceTime || (isErrand ? '发布后尽快处理' : '支持课后或晚间预约')
  const locationText = data.location || [data.pickupLocation, data.deliveryLocation].filter(Boolean).join(' -> ') || (isErrand ? '校内指定地点' : '校内线下或线上沟通')
  return Object.assign({}, data, {
    ownerAvatar: owner.avatar || data.ownerAvatar || '',
    ownerInitial: (owner.nickname || '同').charAt(0),
    ownerLine: `${owner.nickname || '同校用户'} @${owner.username || 'user'}`,
    canTake: data.type === 'errand' && data.status === 'waiting_accept',
    canOrder: data.type !== 'errand' && data.status === 'on_sale',
    typeText: isErrand ? '校园跑腿' : '校园服务',
    statusText: data.statusText || (data.status === 'on_sale' ? '可预约' : data.status === 'waiting_accept' ? '待接单' : data.status),
    serviceTime,
    locationText,
    appointmentText: isErrand ? '发布后由骑手接单，接单后可在聊天和订单页同步进度。' : '建议先聊天确认服务时间、地点和交付方式，再提交预约。',
    settlementText: isErrand ? '任务完成并确认后，跑腿费再结算给骑手。' : '服务费支付后进入平台托管，确认完成后再结算给服务者。',
    trustTags: isErrand ? ['接单校验', '配送留痕', '完成后结算'] : ['预约确认', '担保支付', '完成后评价'],
    detailItems: isErrand
      ? [
        `取件地点：${data.pickupLocation || '待沟通'}`,
        `送达地点：${data.deliveryLocation || '待沟通'}`,
        '发布者完成支付后，任务才会进入接单大厅。',
        '骑手接单后任务会锁定，避免重复抢单。'
      ]
      : [
        `服务时段：${serviceTime}`,
        `服务地点：${locationText}`,
        '预约后会生成待支付订单，支付后资金进入平台托管。',
        '服务完成后可评价服务者，评价会展示在主页。'
      ]
  })
}

Page({
  data: {
    item: null,
    ownerReviews: [],
    noOwnerReviews: true,
    trustTags: [],
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
    this.itemType = query.type || 'service'
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
    const detailUrl = this.itemType === 'errand'
      ? `/api/errands/${this.itemId}`
      : `/api/services/${this.itemId}`
    api({ url: detailUrl }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      const item = buildDetailView(res.data || {})
      store.addBrowseHistory({
        id: item.id,
        type: item.type || this.itemType,
        title: item.title,
        price: item.price,
        category: item.typeText,
        location: item.locationText
      })
      const action = this.getActionState(item, this.data.ordering || this.data.taking)
      const ownerReviews = res.data.ownerReviews || []
      this.setData(Object.assign({
        item,
        trustTags: item.trustTags || [],
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
        actionText: busy ? '提交中...' : '预约服务',
        actionDisabled: busy,
        actionLoading: busy,
        actionClass: busy ? 'action-btn disabled' : 'action-btn buy',
        actionType: 'order'
      }
    }
    if (item.canTake) {
      return {
        actionText: busy ? '处理中...' : '抢单',
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
      avatar: owner.avatar || '',
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
    api({ url: `/api/services/${this.data.item.id}/orders`, method: 'POST' }).then((res) => {
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
    if (store.getState().role !== 'rider') {
      api({ url: '/api/user/profile' }).then(() => {
        if (store.getState().role === 'rider') {
          this.takeErrand()
          return
        }
        wx.showToast({ title: '\u8bf7\u5148\u5b8c\u6210\u9a91\u624b\u8ba4\u8bc1', icon: 'none' })
        wx.navigateTo({ url: '/pages/role-apply/role-apply?role=rider' })
      })
      return
    }
    if (store.getState().role !== 'rider') {
      wx.showModal({
        title: '需要骑手认证',
        content: '抢跑腿单需要先完成实名认证，并提交骑手接单资料。',
        confirmText: '去认证',
        success: (modal) => {
          if (modal.confirm) wx.navigateTo({ url: '/pages/role-apply/role-apply?role=rider' })
        }
      })
      return
    }
    this.setData({ taking: true })
    this.syncActionState()
    api({ url: `/api/errands/${this.data.item.id}/accept`, method: 'POST' }).then((res) => {
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
        wx.navigateTo({ url: '/pages/orders/orders' })
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
    openChatRoom({
      businessType: item.type === 'errand' ? 'errand' : 'service',
      businessId: item.id,
      title: item.title,
      peerName: owner.nickname || item.provider,
      peerUsername: owner.username || item.username,
      peerAvatar: owner.avatar || item.ownerAvatar || ''
    })
  }
})
