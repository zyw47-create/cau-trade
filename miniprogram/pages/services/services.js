const { request: api } = require('../../utils/request')
const store = require('../../utils/store')

const SERVICE_STATUS_TEXT = {
  pending: '审核中',
  on_sale: '可预约',
  paused: '暂停',
  removed: '已下架'
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
    api({ url: `/api/services/${item.id}/orders`, method: 'POST' }).then((res) => {
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

  loadServices() {
    this.lastLoadAt = Date.now()
    this.setData({ loading: true, errorText: '' })
    api({ url: '/api/services' }).then((res) => {
      if (res.code !== 200) {
        this.setData({ errorText: res.msg || '服务加载失败' })
        return
      }
      const services = (res.data.list || []).filter((item) => item.type === 'service' && item.status === 'on_sale').map((item) => {
        const serviceTime = item.serviceTime || '时间待沟通'
        const locationText = item.location || '地点待沟通'
        const providerLine = `${item.provider || '同校用户'} @${item.username || 'user'}`
        return Object.assign({}, item, {
          typeText: '校园服务',
          statusText: SERVICE_STATUS_TEXT[item.status] || item.status,
          providerLine,
          serviceTime,
          locationText,
          actionText: '预约',
          actionDisabled: false,
          actionLoading: false
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
