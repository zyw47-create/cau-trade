const { request: api } = require('../../utils/request')
const store = require('../../utils/store')

const ERRAND_STATUS_TEXT = {
  waiting_accept: '可抢单'
}

Page({
  data: {
    errands: [],
    loading: true,
    errorText: ''
  },

  onShow() {
    const now = Date.now()
    if (this.lastLoadAt && now - this.lastLoadAt < 600) return
    this.loadErrands()
  },

  goPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' })
  },

  openOrders() {
    wx.navigateTo({ url: '/pages/orders/orders?filter=rider' })
  },

  openErrandDetail(e) {
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${e.currentTarget.dataset.id}&type=errand` })
  },

  setItemTaking(id, taking) {
    this.setData({
      errands: this.data.errands.map((item) => Object.assign({}, item, {
        taking: item.id === id ? taking : item.taking
      }))
    })
  },

  takeErrand(e) {
    if (!store.requireVerified()) return
    const id = e.currentTarget.dataset.id
    const item = this.data.errands.find((errand) => errand.id === id)
    if (!item || item.taking) return
    if (store.getState().role !== 'rider') {
      api({ url: '/api/user/profile' }).then(() => {
        if (store.getState().role === 'rider') {
          this.takeErrand(e)
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
    this.setItemTaking(id, true)
    api({ url: `/api/errands/${id}/accept`, method: 'POST' }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        this.loadErrands()
        return
      }
      wx.showToast({ title: '接单成功' })
      this.loadErrands()
      if (res.data && res.data.orderSn) {
        wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
      } else {
        wx.navigateTo({ url: '/pages/orders/orders?filter=rider' })
      }
    }).finally(() => {
      this.setItemTaking(id, false)
    })
  },

  loadErrands() {
    this.lastLoadAt = Date.now()
    this.setData({ loading: true, errorText: '' })
    api({ url: '/api/errands' }).then((res) => {
      if (res.code !== 200) {
        this.setData({ errorText: res.msg || '跑腿任务加载失败' })
        return
      }
      const errands = (res.data.list || []).filter((item) => item.type === 'errand' && item.status === 'waiting_accept').map((item) => {
        const locationText = item.location || [item.pickupLocation, item.deliveryLocation].filter(Boolean).join(' -> ') || '校内指定地点'
        return Object.assign({}, item, {
          typeText: '跑腿任务',
          statusText: ERRAND_STATUS_TEXT[item.status] || item.status,
          providerLine: `发布者 ${item.publisherName || item.provider || '同校用户'} @${item.publisherUsername || item.username || 'user'}`,
          serviceTime: '发布者已托管费用',
          locationText,
          taking: Boolean(item.taking),
          actionText: item.taking ? '处理中...' : '抢单',
          actionDisabled: Boolean(item.taking),
          actionLoading: Boolean(item.taking)
        })
      })
      this.setData({ errands })
    }).catch(() => {
      this.setData({ errorText: '网络异常，跑腿任务加载失败' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  }
})
