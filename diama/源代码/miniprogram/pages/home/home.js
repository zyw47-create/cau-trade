const { api } = require('../../utils/api')
const store = require('../../utils/store')

const HOME_TABS = [
  { key: 'goods', text: '二手闲置' },
  { key: 'service', text: '校园服务' },
  { key: 'errand', text: '跑腿任务' }
]

const SERVICE_STATUS_TEXT = {
  unpaid: '待支付',
  on_sale: '可预约',
  waiting_accept: '可抢单',
  accepted: '已接单',
  processing: '配送中',
  completed: '已完成',
  cancelled: '已取消'
}

Page({
  data: {
    keyword: '',
    activeTab: 'goods',
    feedTitle: '二手闲置',
    feedSubtitle: '按成色、地点和信用展示',
    showGoods: true,
    showService: false,
    showErrand: false,
    noVisibleGoods: true,
    noVisibleServices: true,
    noVisibleErrands: true,
    tabs: HOME_TABS.map((item) => Object.assign({}, item, { className: item.key === 'goods' ? 'tab active' : 'tab' })),
    activeCategory: '全部',
    categories: [],
    goods: [],
    visibleGoods: [],
    services: [],
    visibleServices: [],
    errands: [],
    visibleErrands: []
  },

  onLoad() {
    this.pendingInitialLoad = true
  },

  onReady() {
    if (this.pendingInitialLoad) {
      this.pendingInitialLoad = false
      this.loadHome()
    }
  },

  onShow() {
    if (this.pendingInitialLoad) return
    if (!this.loaded) this.loadHome()
  },

  loadHome() {
    if (this.loadingHome) return
    this.loadingHome = true
    Promise.all([
      api({ url: '/api/goods/list' }),
      api({ url: '/api/service/list' })
    ]).then(([goodsRes, serviceRes]) => {
      const serviceList = serviceRes.data.list || []
      const categories = ['全部'].concat(goodsRes.data.categories || []).map((name) => ({
        name,
        className: name === this.data.activeCategory ? 'category active' : 'category'
      }))
      const goods = goodsRes.data.list || []
      const services = serviceList.filter((item) => item.type !== 'errand')
      const errands = serviceList.filter((item) => item.type === 'errand')
      this.rawGoods = goods
      this.rawServices = services
      this.rawErrands = errands
      const baseData = Object.assign({}, this.data, { categories, goods, services, errands })
      this.setData(Object.assign({
        categories,
        goods,
        services: [],
        errands: []
      }, this.buildDisplayData(baseData)))
      this.loaded = true
    }).finally(() => {
      this.loadingHome = false
    })
  },

  onKeywordInput(e) {
    const keyword = e.detail.value
    this.setData({ keyword })
    clearTimeout(this.keywordTimer)
    this.keywordTimer = setTimeout(() => {
      const nextData = this.getSourceData({ keyword })
      this.setData(this.buildDisplayData(nextData))
    }, 180)
  },

  chooseCategory(e) {
    const activeCategory = e.currentTarget.dataset.name
    const nextData = this.getSourceData({ activeCategory })
    this.setData(Object.assign({ activeCategory }, this.buildDisplayData(nextData)))
  },

  chooseTab(e) {
    const activeTab = e.currentTarget.dataset.key
    const nextData = this.getSourceData({ activeTab })
    this.setData(Object.assign({ activeTab }, this.buildDisplayData(nextData)))
  },

  applyFilter() {
    this.setData(this.buildDisplayData(this.getSourceData()))
  },

  getSourceData(patch) {
    return Object.assign({}, this.data, {
      goods: this.rawGoods || this.data.goods || [],
      services: this.rawServices || this.data.services || [],
      errands: this.rawErrands || this.data.errands || []
    }, patch || {})
  },

  buildDisplayData(source) {
    const { goods, services, errands, keyword, activeCategory, activeTab } = source
    const text = keyword.trim()
    const hasText = Boolean(text)
    const visibleGoods = (goods || []).filter((item) => {
      const matchCategory = activeCategory === '全部' || item.category === activeCategory
      const matchText = !hasText || this.matchText(item, text)
      return item.status === 'on_sale' && matchCategory && matchText
    })
    const visibleServices = (services || []).filter((item) => {
      return item.status === 'on_sale' && (!hasText || this.matchText(item, text))
    })
    const visibleErrands = (errands || []).filter((item) => {
      const visibleStatus = item.status === 'waiting_accept' || item.status === 'accepted' || item.status === 'processing'
      return visibleStatus && (!hasText || this.matchText(item, text))
    })
    const feedCopy = this.getFeedCopy(activeTab)
    return {
      feedTitle: feedCopy.title,
      feedSubtitle: feedCopy.subtitle,
      showGoods: activeTab === 'goods',
      showService: activeTab === 'service',
      showErrand: activeTab === 'errand',
      noVisibleGoods: visibleGoods.length === 0,
      noVisibleServices: visibleServices.length === 0,
      noVisibleErrands: visibleErrands.length === 0,
      visibleGoods: activeTab === 'goods' ? visibleGoods.map((item) => Object.assign({}, item, {
        sellerInitial: (item.sellerName || item.username || '同').charAt(0),
        sellerLine: `${item.sellerName || '同校用户'} @${item.username || 'user'}`
      })) : [],
      visibleServices: activeTab === 'service' ? visibleServices.map((item) => this.decorateService(item)) : [],
      visibleErrands: activeTab === 'errand' ? visibleErrands.map((item) => this.decorateService(item)) : [],
      categories: (source.categories || []).map((item) => Object.assign({}, item, {
        className: item.name === activeCategory ? 'category active' : 'category'
      })),
      tabs: (source.tabs || []).map((item) => Object.assign({}, item, {
        className: item.key === activeTab ? 'tab active' : 'tab'
      }))
    }
  },

  getFeedCopy(tab) {
    if (tab === 'service') return { title: '校园服务', subtitle: '可直接预约服务' }
    if (tab === 'errand') return { title: '跑腿任务', subtitle: '待接单任务可抢单' }
    return { title: '二手闲置', subtitle: '按成色、地点和信用展示' }
  },

  matchText(item, text) {
    return [item.title, item.desc, item.sellerName, item.provider, item.username, item.location]
      .filter(Boolean)
      .some((value) => String(value).indexOf(text) >= 0)
  },

  decorateService(item) {
    const name = item.provider || '同校用户'
    const isErrand = item.type === 'errand'
    let providerLine = `${name} @${item.username || 'user'}`
    if (isErrand) {
      providerLine = item.status === 'waiting_accept'
        ? `发布者 @${item.username || 'user'}`
        : `骑手 ${name} @${item.riderUsername || item.username || 'user'}`
    }
    return Object.assign({}, item, {
      statusText: SERVICE_STATUS_TEXT[item.status] || item.status,
      providerInitial: name.charAt(0),
      providerLine,
      disabled: isErrand && item.status !== 'waiting_accept',
      taking: Boolean(item.taking),
      actionText: isErrand ? (item.status === 'waiting_accept' ? '抢单' : '已接单') : '预约',
      buttonText: item.taking ? '处理中' : (isErrand ? (item.status === 'waiting_accept' ? '抢单' : '已接单') : '预约'),
      actionDisabled: Boolean((isErrand && item.status !== 'waiting_accept') || item.taking),
      actionLoading: Boolean(item.taking)
    })
  },

  openDetail(e) {
    if (this.navigating) return
    this.navigating = true
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
    setTimeout(() => { this.navigating = false }, 500)
  },

  openGoodsChat(e) {
    if (!store.requireLogin()) return
    const id = Number(e.currentTarget.dataset.id)
    const item = this.data.goods.find((goods) => Number(goods.id) === id) || {}
    store.setPendingChat({
      businessType: 'goods',
      businessId: id,
      goodsId: id,
      title: item.title,
      peerName: item.sellerName,
      peerUsername: item.username
    })
    wx.switchTab({ url: '/pages/chat/chat' })
  },

  createGoodsOrder(e) {
    if (!store.requireVerified()) return
    const id = Number(e.currentTarget.dataset.id)
    api({ url: '/api/order/create', method: 'POST', data: { goodsId: id } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
    })
  },

  openServiceDetail(e) {
    if (this.navigating) return
    this.navigating = true
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${e.currentTarget.dataset.id}&type=${e.currentTarget.dataset.type}` })
    setTimeout(() => { this.navigating = false }, 500)
  },

  handleService(e) {
    if (!store.requireVerified()) return
    const id = Number(e.currentTarget.dataset.id)
    const type = e.currentTarget.dataset.type
    if (type === 'errand') {
      this.setTaking(id, true)
      api({ url: '/api/rider/take', method: 'POST', data: { id } }).then((res) => {
        if (res.code !== 200) {
          wx.showToast({ title: res.msg, icon: 'none' })
          this.loaded = false
          this.loadHome()
          return
        }
        wx.showToast({ title: '接单成功' })
        this.loaded = false
        this.loadHome()
        if (res.data && res.data.orderSn) {
          wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
        } else {
          wx.switchTab({ url: '/pages/orders/orders' })
        }
      }).finally(() => {
        this.setTaking(id, false)
      })
      return
    }
    api({ url: '/api/service/order', method: 'POST', data: { id } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: '预约已创建' })
      wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
    })
  },

  setTaking(id, taking) {
    const errands = this.data.errands.map((item) => Object.assign({}, item, {
        taking: item.id === id ? taking : item.taking
    }))
    const nextData = Object.assign({}, this.data, { errands })
    this.setData(Object.assign({ errands }, this.buildDisplayData(nextData)))
  }
})
