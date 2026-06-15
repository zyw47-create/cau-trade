const { goodsList } = require("../../utils/mock-data")
const { ensureActionAccess } = require("../../utils/guards")
const request = require("../../utils/request")
const api = require("../../config/api")

Page({
  data: {
    goods: null,
    favorite: false,
    favoriteText: "收藏"
  },
  onLoad(options) {
    const goods = goodsList.find((item) => item.id === options.id) || goodsList[0] || null
    this.setData({ goods })
    if (goods) request.get(api.goods.detail, { id: goods.id }).catch(() => null)
  },
  toggleFavorite() {
    if (!ensureActionAccess({ requireAuth: true }) || !this.data.goods) return
    const favorite = !this.data.favorite
    this.setData({ favorite, favoriteText: favorite ? "已收藏" : "收藏" })
    request.post(api.goods.favorite, { goodsId: this.data.goods.id, favorite }).catch(() => null)
  },
  contactSeller() {
    if (!ensureActionAccess({ requireAuth: true }) || !this.data.goods) return
    wx.navigateTo({
      url: `/pages/chat/index?id=goods_${this.data.goods.id}&name=${encodeURIComponent(this.data.goods.sellerName)}&type=goods`
    })
  },
  placeOrder() {
    if (!ensureActionAccess({ requireAuth: true, requireVerified: true }) || !this.data.goods) return
    request.post(api.trade.createOrder, { goodsId: this.data.goods.id }).then(() => {
      wx.showToast({ title: "订单已创建", icon: "success" })
      setTimeout(() => wx.navigateTo({ url: "/pages/orders/index" }), 400)
    })
  }
})
