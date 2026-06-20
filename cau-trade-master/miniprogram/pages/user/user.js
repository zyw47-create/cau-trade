const { request: api } = require('../../utils/request')
const store = require('../../utils/store')

Page({
  data: {
    user: null,
    reviews: [],
    goods: [],
    services: [],
    loadingPublic: false,
    noReviews: true,
    noGoods: true,
    noServices: true,
    userTags: []
  },

  onLoad(query) {
    this.userId = query.id
    this.preview = store.takePendingUserPreview()
    if (this.preview && String(this.preview.id) === String(this.userId)) {
      wx.nextTick(() => {
        this.applyUserData({
          user: this.preview,
          reviews: [],
          goods: [],
          services: [],
          previewOnly: true
        })
      })
    }
  },

  onReady() {
    this.loadUser()
  },

  onShow() {
    const now = Date.now()
    if (this.loaded && (!this.lastLoadAt || now - this.lastLoadAt > 5000)) this.loadUser()
  },

  loadUser() {
    if (this.loadingUser) return
    this.loadingUser = true
    this.lastLoadAt = Date.now()
    api({ url: '/api/user/public', data: { id: this.userId } }).then((res) => {
      this.applyUserData(res.data || {})
      this.loaded = true
    }).finally(() => {
      this.loadingUser = false
    })
  },

  applyUserData(data) {
    const reviews = data.reviews || []
    const goods = data.goods || []
    const services = data.services || []
    const user = data.user || {}
    const previewOnly = Boolean(data.previewOnly)
    this.setData({
      user: Object.assign({}, user, {
        initial: (user.nickname || '同').charAt(0),
        roleText: user.role === 'provider' ? '服务者' : user.role === 'rider' ? '骑手' : '普通用户',
        verifyText: user.verified ? '已实名' : '未实名',
        usernameText: `@${user.username || 'user'}`,
        campusLine: [user.college, user.major, user.grade].filter(Boolean).join(' · ') || '校内用户',
        activityLine: [user.campus, user.responseTime, user.lastActive].filter(Boolean).join(' · ') || '近期活跃',
        bio: user.bio || '该用户暂未填写个人简介。',
        activeGoodsCount: user.activeGoodsCount || goods.length,
        activeServiceCount: user.activeServiceCount || services.length
      }),
      reviews,
      goods,
      services,
      userTags: user.tradeTags || [],
      loadingPublic: false,
      noReviews: !previewOnly && reviews.length === 0,
      noGoods: !previewOnly && goods.length === 0,
      noServices: !previewOnly && services.length === 0
    })
  },

  openGoods(e) {
    if (this.navigating) return
    this.navigating = true
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
    setTimeout(() => { this.navigating = false }, 500)
  },

  openService(e) {
    if (this.navigating) return
    this.navigating = true
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${e.currentTarget.dataset.id}&type=${e.currentTarget.dataset.type}` })
    setTimeout(() => { this.navigating = false }, 500)
  }
})
