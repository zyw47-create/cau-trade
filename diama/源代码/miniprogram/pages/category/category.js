const { api } = require('../../utils/api')
const store = require('../../utils/store')

const SORT_OPTIONS = [
  { key: 'default', text: '综合' },
  { key: 'priceAsc', text: '价格低到高' },
  { key: 'priceDesc', text: '价格高到低' },
  { key: 'favorite', text: '收藏最多' }
]

Page({
  data: {
    keyword: '',
    activeCategory: '全部',
    activeSort: 'default',
    filters: {
      minPrice: '',
      maxPrice: '',
      condition: '',
      location: '',
      onlyVerified: false
    },
    filterDrawerVisible: false,
    filterSummary: '高级筛选',
    filterConditions: [],
    filterLocations: [],
    pendingOrderGoods: null,
    orderModalVisible: false,
    categories: [],
    sortOptions: SORT_OPTIONS,
    searchHistory: [],
    hasSearchHistory: false,
    goods: [],
    visibleGoods: [],
    noVisibleGoods: true,
    loading: true,
    errorText: ''
  },

  onLoad(query) {
    this.queryCategory = query.category || '全部'
    this.queryKeyword = query.keyword || ''
    const searchHistory = store.getSearchHistory()
    this.setData({
      searchHistory,
      hasSearchHistory: searchHistory.length > 0
    })
  },

  onReady() {
    this.loadGoods()
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar && tabBar.syncSelected) tabBar.syncSelected()
    const pending = store.takePendingCategory()
    if (pending && (pending.keyword || pending.category)) {
      this.queryKeyword = pending.keyword || ''
      this.queryCategory = pending.category || '全部'
      this.setData({
        keyword: this.queryKeyword,
        activeCategory: this.queryCategory || '全部'
      })
    }
    if (this.loaded) this.loadGoods()
  },

  loadGoods() {
    if (this.loading) return
    this.loading = true
    this.setData({ loading: true, errorText: '' })
    api({ url: '/api/goods/list' }).then((res) => {
      if (res.code !== 200) {
        this.setData({ errorText: res.msg || '商品加载失败' })
        return
      }
      const goods = res.data.list || []
      const categoryNames = ['全部'].concat(res.data.categories || [])
      const activeCategory = this.data.activeCategory === '全部' ? this.queryCategory : this.data.activeCategory
      const keyword = this.data.keyword || this.queryKeyword || ''
      this.rawGoods = goods
      this.setData({
        goods,
        keyword,
        activeCategory,
        categories: this.decorateCategories(categoryNames, activeCategory),
        filterConditions: this.uniqueValues(goods, 'condition'),
        filterLocations: this.uniqueValues(goods, 'location')
      })
      if (keyword) {
        const searchHistory = store.addSearchHistory(keyword)
        this.setData({
          searchHistory,
          hasSearchHistory: searchHistory.length > 0
        })
      }
      this.applyDisplay({ goods, keyword, activeCategory })
      this.loaded = true
      this.queryCategory = ''
      this.queryKeyword = ''
    }).catch(() => {
      this.setData({ errorText: '网络异常，商品加载失败' })
    }).finally(() => {
      this.loading = false
      this.setData({ loading: false })
    })
  },

  onKeywordInput(e) {
    const keyword = e.detail.value || ''
    this.setData({ keyword })
    clearTimeout(this.keywordTimer)
    this.keywordTimer = setTimeout(() => {
      this.applyDisplay({ keyword })
    }, 180)
  },

  onSearchConfirm(e) {
    const keyword = e && e.detail ? (e.detail.value || this.data.keyword) : this.data.keyword
    const searchHistory = store.addSearchHistory(keyword)
    this.setData({
      keyword,
      searchHistory,
      hasSearchHistory: searchHistory.length > 0
    })
    this.applyDisplay({ keyword })
  },

  chooseHistory(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword })
    store.addSearchHistory(keyword)
    this.applyDisplay({ keyword })
  },

  clearHistory() {
    store.clearSearchHistory()
    this.setData({
      searchHistory: [],
      hasSearchHistory: false
    })
  },

  chooseCategory(e) {
    const activeCategory = (e.detail && e.detail.name) || e.currentTarget.dataset.name
    this.setData({
      activeCategory,
      categories: this.decorateCategories(this.data.categories.map((item) => item.name), activeCategory)
    })
    this.applyDisplay({ activeCategory })
  },

  chooseSort(e) {
    const activeSort = (e.detail && e.detail.key) || e.currentTarget.dataset.key
    this.setData({ activeSort })
    this.applyDisplay({ activeSort })
  },

  openFilterDrawer() {
    this.setData({ filterDrawerVisible: true })
  },

  closeFilterDrawer() {
    this.setData({ filterDrawerVisible: false })
  },

  confirmFilters(e) {
    const filters = e.detail || {}
    this.setData({
      filters,
      filterDrawerVisible: false,
      filterSummary: this.buildFilterSummary(filters)
    })
    this.applyDisplay({ filters })
  },

  applyDisplay(patch) {
    const source = Object.assign({}, this.data, {
      goods: this.rawGoods || this.data.goods || []
    }, patch || {})
    const keyword = String(source.keyword || '').trim()
    const visibleGoods = (source.goods || [])
      .filter((item) => {
        const matchStatus = item.status === 'on_sale'
        const matchCategory = source.activeCategory === '全部' || item.category === source.activeCategory
        const matchKeyword = !keyword || [item.title, item.desc, item.category, item.location, item.sellerName, item.username]
          .filter(Boolean)
          .some((value) => String(value).indexOf(keyword) >= 0)
        const filters = source.filters || {}
        const price = Number(item.price || 0)
        const minPrice = filters.minPrice === '' ? null : Number(filters.minPrice)
        const maxPrice = filters.maxPrice === '' ? null : Number(filters.maxPrice)
        const matchPrice = (minPrice === null || price >= minPrice) && (maxPrice === null || price <= maxPrice)
        const matchCondition = !filters.condition || item.condition === filters.condition
        const matchLocation = !filters.location || item.location === filters.location
        const matchVerified = !filters.onlyVerified || item.verified !== false
        return matchStatus && matchCategory && matchKeyword && matchPrice && matchCondition && matchLocation && matchVerified
      })
      .sort((a, b) => this.sortGoods(a, b, source.activeSort))
      .map((item) => Object.assign({}, item, {
        sellerInitial: (item.sellerName || '同').charAt(0),
        favoriteText: item.favorite ? '已收藏' : '收藏'
      }))
    this.setData({
      visibleGoods,
      noVisibleGoods: visibleGoods.length === 0
    })
  },

  sortGoods(a, b, sortKey) {
    if (sortKey === 'priceAsc') return Number(a.price || 0) - Number(b.price || 0)
    if (sortKey === 'priceDesc') return Number(b.price || 0) - Number(a.price || 0)
    if (sortKey === 'favorite') return Number(b.favoriteCount || 0) - Number(a.favoriteCount || 0)
    return Number(b.id || 0) - Number(a.id || 0)
  },

  decorateCategories(names, activeCategory) {
    const goods = this.rawGoods || this.data.goods || []
    return (names || []).map((name) => ({
      name,
      count: name === '全部'
        ? goods.filter((item) => item.status === 'on_sale').length
        : goods.filter((item) => item.status === 'on_sale' && item.category === name).length,
      className: name === activeCategory ? 'category active' : 'category'
    }))
  },

  uniqueValues(list, key) {
    const values = (list || []).map((item) => item[key]).filter(Boolean)
    return Array.from(new Set(values)).slice(0, 12)
  },

  buildFilterSummary(filters) {
    const parts = []
    if (filters.minPrice || filters.maxPrice) parts.push(`${filters.minPrice || 0}-${filters.maxPrice || '不限'}元`)
    if (filters.condition) parts.push(filters.condition)
    if (filters.location) parts.push(filters.location)
    if (filters.onlyVerified) parts.push('可信卖家')
    return parts.length ? parts.join(' · ') : '高级筛选'
  },

  openDetail(e) {
    const id = (e.detail && e.detail.id) || e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  toggleFavorite(e) {
    if (!store.requireLogin()) return
    const id = Number((e.detail && e.detail.id) || e.currentTarget.dataset.id)
    api({ url: '/api/goods/favorite', method: 'POST', data: { id } }).then((res) => {
      const goods = (this.rawGoods || this.data.goods).map((item) => {
        if (Number(item.id) !== id) return item
        return Object.assign({}, item, {
          favorite: res.data.favorite,
          favoriteCount: res.data.favoriteCount
        })
      })
      this.rawGoods = goods
      this.setData({ goods })
      this.applyDisplay()
      wx.showToast({ title: res.data.favorite ? '已收藏' : '已取消' })
    })
  },

  createOrder(e) {
    if (!store.requireVerified()) return
    const id = Number((e.detail && e.detail.id) || e.currentTarget.dataset.id)
    const pendingOrderGoods = this.data.visibleGoods.find((item) => Number(item.id) === id) || null
    this.setData({
      pendingOrderGoods,
      orderModalVisible: true
    })
  },

  cancelOrderModal() {
    this.setData({
      pendingOrderGoods: null,
      orderModalVisible: false
    })
  },

  confirmCreateOrder() {
    const goods = this.data.pendingOrderGoods
    if (!goods) return this.cancelOrderModal()
    this.setData({ orderModalVisible: false })
    api({ url: '/api/order/create', method: 'POST', data: { goodsId: Number(goods.id) } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      this.setData({ pendingOrderGoods: null })
      wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${res.data.orderSn}` })
    })
  }
})
