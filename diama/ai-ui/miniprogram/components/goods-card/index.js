function buildViewGoods(goods, imageError) {
  const source = goods || {}
  const images = source.images || []
  const hasImage = !!(images.length && !imageError)
  return Object.assign({}, source, {
    coverImage: images[0] || "",
    hasImage,
    favText: source.isFav ? "已收藏" : "收藏",
    aiBadgeVisible: !!source.isAiAudit,
    priceText: `￥${source.price || 0}`,
    originPriceText: `￥${source.originalPrice || 0}`,
    viewsText: `浏览 ${source.views || 0}`,
    likesText: `点赞 ${source.likes || 0}`,
    commentsText: `评论 ${source.comments || 0}`,
    sellerText: `${source.sellerName || "匿名用户"} · ${source.creditScore || 0} 分`
  })
}

Component({
  properties: {
    goods: {
      type: Object,
      value: {}
    },
    showAiBadge: {
      type: Boolean,
      value: true
    }
  },
  data: {
    imageError: false,
    viewGoods: {}
  },
  observers: {
    goods(goods) {
      this.setData({
        imageError: false,
        viewGoods: buildViewGoods(goods, false)
      })
    },
    showAiBadge() {
      this.setData({
        viewGoods: buildViewGoods(this.properties.goods, this.data.imageError)
      })
    }
  },
  methods: {
    onTap() {
      this.triggerEvent("tap", { id: this.properties.goods.id })
    },
    onFavTap() {
      this.triggerEvent("fav", {
        id: this.properties.goods.id,
        isFav: !this.properties.goods.isFav
      })
    },
    onImageError() {
      this.setData({
        imageError: true,
        viewGoods: buildViewGoods(this.properties.goods, true)
      })
    }
  }
})
