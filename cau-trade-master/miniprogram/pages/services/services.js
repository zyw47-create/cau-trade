const { request: api } = require('../../utils/request')
const store = require('../../utils/store')

const SERVICE_STATUS_TEXT = {
  pending: '审核中',
  unpaid: '待支付',
  on_sale: '可预约',
  paused: '暂停',
  removed: '已下架',
  waiting_accept: '待接单',
  accepted: '已接单',
  processing: '配送中',
  completed: '已完成',
  confirmed: '已确认',
  cancelled: '已取消',
  disputed: '申诉中'
}

Page({
  data: {
    services: [],
    loading: true,
    errorText: ''
  },

  onShow() {
    const now = Date.now()
    if (this.lastLoadAt && now - this.lastLoadAt < 600) return
    this.loadServices()
  },

  goPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' })
  },

  handleAction(e) {
    if (!store.requireVerified()) return
    const item = this.data.services.find((svc) => svc.id === e.currentTarget.dataset.id)
    if (!item) return
    if (item.type === 'errand') {
      if (item.status === 'unpaid' && item.orderSn) {
        wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${item.orderSn}` })
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
      this.setItemTaking(item.id, true)
      api({ url: '/api/rider/take', method: 'POST', data: { id: item.id } }).then((res) => {
        if (res.code !== 200) {
          wx.showToast({ title: res.msg, icon: 'none' })
          this.loadServices()
          return
        }
        wx.showToast({ title: '接单成功' })
        this.loadServices()
        if (res.data && res.data.orderSn) {
          wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
        } else {
          wx.navigateTo({ url: '/pages/orders/orders' })
        }
      }).finally(() => {
        this.setItemTaking(item.id, false)
      })
      return
    }
    api({ url: '/api/service/order', method: 'POST', data: { id: item.id } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '预约已创建' })
      wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
    })
  },

  openServiceDetail(e) {
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${e.currentTarget.dataset.id}&type=${e.currentTarget.dataset.type}` })
  },

  setItemTaking(id, taking) {
    this.setData({
      services: this.data.services.map((item) => Object.assign({}, item, {
        taking: item.id === id ? taking : item.taking
      }))
    })
  },

  updateRiderStatus(e) {
    if (store.getState().role !== 'rider') {
      wx.showToast({ title: '请先切换到骑手身份', icon: 'none' })
      return
    }
    const id = e.currentTarget.dataset.id
    const status = e.currentTarget.dataset.status
    api({ url: '/api/rider/status', method: 'POST', data: { id, status } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: status === 'completed' ? '已送达' : '状态已更新' })
      this.loadServices()
    })
  },

  loadServices() {
    this.lastLoadAt = Date.now()
    const current = store.getState().user || {}
    this.setData({ loading: true, errorText: '' })
    api({ url: '/api/service/list' }).then((res) => {
      if (res.code !== 200) {
        this.setData({ errorText: res.msg || '服务加载失败' })
        return
      }
      const services = (res.data.list || []).filter((item) => {
        if (item.type !== 'errand') return item.status === 'on_sale'
        const isMineUnpaid = item.status === 'unpaid' && item.username === current.username
        return isMineUnpaid || item.status === 'waiting_accept' || item.status === 'accepted' || item.status === 'processing'
      }).map((item) => {
        const isErrand = item.type === 'errand'
        const isMineUnpaid = isErrand && item.status === 'unpaid' && item.username === current.username
        const serviceTime = item.serviceTime || (isErrand ? '发布后尽快处理' : '时间待沟通')
        const locationText = item.location || (isErrand
          ? [item.pickupLocation, item.deliveryLocation].filter(Boolean).join(' -> ') || '校内指定地点'
          : '地点待沟通')
        let providerLine = `${item.provider || '同校用户'} @${item.username || 'user'}`
        if (isErrand) {
          providerLine = isMineUnpaid
            ? `我发布的 @${item.username || 'user'}`
            : item.status === 'waiting_accept'
            ? `发布者 @${item.username || 'user'}`
            : `骑手 ${item.provider || '同校用户'} @${item.riderUsername || item.username || 'user'}`
        }
        return Object.assign({}, item, {
          typeText: isErrand ? '跑腿任务' : '校园服务',
          statusText: SERVICE_STATUS_TEXT[item.status] || item.status,
          providerLine,
          serviceTime,
          locationText,
          disabled: isErrand && item.status !== 'waiting_accept' && !isMineUnpaid,
          taking: Boolean(item.taking),
          actionText: item.taking ? '处理中...' : (isErrand ? (isMineUnpaid ? '去支付' : item.status === 'waiting_accept' ? '抢单' : '已接单') : '预约'),
          actionDisabled: Boolean((isErrand && item.status !== 'waiting_accept' && !isMineUnpaid) || item.taking),
          actionLoading: Boolean(item.taking),
          canProcess: isErrand && (item.riderUsername === current.username || item.provider === current.nickname) && item.status === 'accepted',
          canComplete: isErrand && (item.riderUsername === current.username || item.provider === current.nickname) && item.status === 'processing'
        })
      })
      this.setData({ services })
    }).catch(() => {
      this.setData({ errorText: '网络异常，服务加载失败' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  }
})
