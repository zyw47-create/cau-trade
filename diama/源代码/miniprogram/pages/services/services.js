const { api } = require('../../utils/api')
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
    publishForm: {
      type: 'service',
      title: '',
      price: '',
      desc: ''
    },
    publishTypeLabel: '校园服务',
    typeOptions: ['service', 'errand'],
    typeLabels: ['校园服务', '跑腿任务']
  },

  onShow() {
    const now = Date.now()
    if (this.lastLoadAt && now - this.lastLoadAt < 600) return
    this.loadServices()
  },

  handleAction(e) {
    if (!store.requireVerified()) return
    const item = this.data.services.find((svc) => svc.id === e.currentTarget.dataset.id)
    if (item.type === 'errand') {
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
          wx.switchTab({ url: '/pages/orders/orders' })
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

  updatePublishField(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`publishForm.${key}`]: e.detail.value })
  },

  chooseType(e) {
    const index = e.detail.value
    this.setData({
      'publishForm.type': this.data.typeOptions[index],
      publishTypeLabel: this.data.typeLabels[index]
    })
  },

  publishService() {
    if (!store.requireVerified()) return
    const form = this.data.publishForm
    if (!form.title || !form.price || !form.desc) {
      wx.showToast({ title: '请补全标题、价格和描述', icon: 'none' })
      return
    }
    api({ url: '/api/service/save', method: 'POST', data: form }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: form.type === 'errand' ? '跑腿待支付' : '服务已发布' })
      this.setData({
        publishForm: { type: 'service', title: '', price: '', desc: '' },
        publishTypeLabel: '校园服务'
      })
      if (form.type === 'errand' && res.data && res.data.orderSn) {
        wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
        return
      }
      this.loadServices()
    })
  },

  loadServices() {
    this.lastLoadAt = Date.now()
    api({ url: '/api/service/list' }).then((res) => {
      const services = res.data.list.filter((item) => {
        if (item.type !== 'errand') return item.status === 'on_sale'
        return item.status === 'waiting_accept' || item.status === 'accepted' || item.status === 'processing'
      }).map((item) => {
        const isErrand = item.type === 'errand'
        let providerLine = `${item.provider || '同校用户'} @${item.username || 'user'}`
        if (isErrand) {
          providerLine = item.status === 'waiting_accept'
            ? `发布者 @${item.username || 'user'}`
            : `骑手 ${item.provider || '同校用户'} @${item.riderUsername || item.username || 'user'}`
        }
        return Object.assign({}, item, {
          typeText: isErrand ? '跑腿任务' : '校园服务',
          statusText: SERVICE_STATUS_TEXT[item.status] || item.status,
          providerLine,
          disabled: isErrand && item.status !== 'waiting_accept',
          taking: Boolean(item.taking),
          actionText: item.taking ? '处理中' : (isErrand ? (item.status === 'waiting_accept' ? '抢单' : '已接单') : '预约'),
          actionDisabled: Boolean((isErrand && item.status !== 'waiting_accept') || item.taking),
          actionLoading: Boolean(item.taking),
          canProcess: isErrand && item.provider === '校园同学' && item.status === 'accepted',
          canComplete: isErrand && item.provider === '校园同学' && item.status === 'processing'
        })
      })
      this.setData({ services })
    })
  }
})
