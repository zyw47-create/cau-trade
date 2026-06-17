const { api } = require('../../utils/api')
const store = require('../../utils/store')

Page({
  data: {
    keyword: '',
    favorites: [],
    visibleFavorites: [],
    noFavorites: true,
    loading: true,
    errorText: ''
  },

  onShow() {
    this.loadFavorites()
  },

  loadFavorites() {
    if (!store.requireLogin()) return
    this.setData({ loading: true, errorText: '' })
    api({ url: '/api/goods/favorites' }).then((res) => {
      if (res.code !== 200) {
        this.setData({ errorText: res.msg || '收藏加载失败' })
        return
      }
      const favorites = (res.data.list || []).map((item) => Object.assign({}, item, {
        sellerInitial: (item.sellerName || '同').charAt(0)
      }))
      this.rawFavorites = favorites
      this.setData({ favorites })
      this.applyDisplay()
    }).catch(() => {
      this.setData({ errorText: '网络异常，收藏加载失败' })
    }).finally(() => {
      this.setData({ loading: false })
    })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
    this.applyDisplay({ keyword: e.detail.value })
  },

  applyDisplay(patch) {
    const source = Object.assign({}, this.data, patch || {})
    const keyword = String(source.keyword || '').trim()
    const visibleFavorites = (this.rawFavorites || source.favorites || []).filter((item) => {
      return !keyword || [item.title, item.desc, item.category, item.location]
        .filter(Boolean)
        .some((value) => String(value).indexOf(keyword) >= 0)
    })
    this.setData({
      visibleFavorites,
      noFavorites: visibleFavorites.length === 0
    })
  },

  openDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  cancelFavorite(e) {
    const id = Number(e.currentTarget.dataset.id)
    api({ url: '/api/goods/favorite', method: 'POST', data: { id } }).then(() => {
      wx.showToast({ title: '已取消收藏' })
      this.loadFavorites()
    })
  },

  goCategory() {
    wx.switchTab({ url: '/pages/category/category' })
  }
})
