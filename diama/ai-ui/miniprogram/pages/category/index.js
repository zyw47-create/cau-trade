const { categories } = require("../../utils/mock-data")
const { saveSearchHistory } = require("../../utils/store")
const request = require("../../utils/request")

const PAGE_SIZE = 4

Page({
  data: {
    keyword: "",
    categories,
    activeCategory: "all",
    goodsList: [],
    pageNo: 1,
    pageSize: PAGE_SIZE,
    hasMore: true,
    loading: false,
    sortType: "latest",
    filterVisible: false,
    filterCondition: "",
    aiOnly: false,
    conditionOptions: ["全新", "几乎全新", "正常使用", "轻微使用"],
    sortOptions: [
      { id: "latest", name: "最新" },
      { id: "popular", name: "最热" },
      { id: "price_asc", name: "价格低到高" },
      { id: "price_desc", name: "价格高到低" }
    ],
    requestSeq: 0,
    headline: "全部商品",
    filterText: "筛选"
  },
  onLoad(options) {
    this.applyPendingState(options)
  },
  onShow() {
    this.applyPendingState({})
  },
  applyPendingState(options) {
    const app = getApp()
    const globalData = app.globalData || {}
    const nextCategory = options.category || globalData.categoryId || this.data.activeCategory
    const nextKeyword = options.keyword || globalData.categoryKeyword || this.data.keyword
    globalData.categoryId = ""
    globalData.categoryKeyword = ""
    app.globalData = globalData
    this.setData({
      activeCategory: nextCategory,
      keyword: nextKeyword,
      pageNo: 1,
      hasMore: true,
      headline: nextCategory === "all" ? "全部商品" : "分类商品"
    })
    if (nextKeyword) {
      saveSearchHistory(nextKeyword, "goods")
    }
    this.fetchGoods(true)
  },
  onSearchInput(event) {
    this.setData({ keyword: event.detail.value })
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.setData({ pageNo: 1, hasMore: true })
      this.fetchGoods(true)
    }, 300)
  },
  onSearch(event) {
    this.setData({
      keyword: event.detail.value.trim(),
      pageNo: 1,
      hasMore: true
    })
    this.fetchGoods(true)
  },
  onSearchCancel() {
    this.setData({ keyword: "", pageNo: 1, hasMore: true })
    this.fetchGoods(true)
  },
  selectCategory(event) {
    const activeCategory = event.detail.id || event.currentTarget.dataset.id
    this.setData({
      activeCategory,
      pageNo: 1,
      hasMore: true,
      headline: activeCategory === "all" ? "全部商品" : "分类商品"
    })
    this.fetchGoods(true)
  },
  changeSort(event) {
    this.setData({
      sortType: event.detail.value || event.currentTarget.dataset.id,
      pageNo: 1,
      hasMore: true
    })
    this.fetchGoods(true)
  },
  openFilter() {
    this.setData({
      filterVisible: true
    })
  },
  closeFilter() {
    this.setData({
      filterVisible: false
    })
  },
  resetFilter() {
    this.setData({
      filterCondition: "",
      aiOnly: false,
      filterVisible: false,
      pageNo: 1,
      hasMore: true,
      filterText: "筛选"
    })
    this.fetchGoods(true)
  },
  applyFilter(event) {
    this.setData({
      filterCondition: event.detail.condition,
      aiOnly: !!event.detail.aiOnly,
      filterVisible: false,
      pageNo: 1,
      hasMore: true,
      filterText: event.detail.condition || event.detail.aiOnly ? "筛选 已启用" : "筛选"
    })
    this.fetchGoods(true)
  },
  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) {
      return
    }
    this.setData({
      pageNo: this.data.pageNo + 1
    })
    this.fetchGoods(false)
  },
  fetchGoods(reset) {
    const seq = this.data.requestSeq + 1
    this.setData({
      loading: true,
      requestSeq: seq
    })

    request.get("/goods/list", {
      keyword: this.data.keyword.trim(),
      categoryId: this.data.activeCategory,
      sortType: this.data.sortType,
      condition: this.data.filterCondition,
      aiOnly: this.data.aiOnly,
      pageNo: this.data.pageNo,
      pageSize: this.data.pageSize
    }).then((res) => {
      if (seq !== this.data.requestSeq) {
        return
      }
      this.setData({
        goodsList: reset ? res.data.list : this.data.goodsList.concat(res.data.list),
        hasMore: !!res.data.hasMore,
        loading: false
      })
    }).catch(() => {
      if (seq !== this.data.requestSeq) {
        return
      }
      this.setData({ loading: false })
    })
  },
  onGoodsTap(event) {
    wx.navigateTo({
      url: `/pages/goods-detail/index?id=${event.detail.id}`
    })
  },
  onFavTap(event) {
    const next = this.data.goodsList.map((item) => {
      if (item.id === event.detail.id) {
        return Object.assign({}, item, { isFav: event.detail.isFav })
      }
      return item
    })
    this.setData({ goodsList: next })
  }
})
