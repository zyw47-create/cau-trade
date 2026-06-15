const BasePage = require("../../utils/base-page")
const { orderList } = require("../../utils/mock-data")
const request = require("../../utils/request")
const api = require("../../config/api")

function normalizeOrder(item) {
  const canCancel = ["pending", "待付款", "待接单"].includes(item.status) || item.statusLabel === "待付款"
  const canConfirm = ["shipped", "待收货"].includes(item.status) || item.statusLabel === "待收货"
  return {
    ...item,
    partyLabel: item.role === "buy" ? "卖家" : "买家",
    canCancel,
    canConfirm
  }
}

BasePage({
  data: {
    orderList: orderList.map(normalizeOrder)
  },
  onLoad() {
    request.get(api.trade.list).catch(() => null)
  },
  onOrderTap(event) {
    wx.navigateTo({ url: `/pages/goods-detail/index?id=${event.currentTarget.dataset.goodsId}` })
  },
  cancelOrder(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({
      title: "取消订单",
      content: "确定取消该订单吗？",
      success: (res) => {
        if (!res.confirm) return
        request.post(api.trade.cancel, { orderId: id }).then(() => {
          this.updateStatus(id, "已取消")
        })
      }
    })
  },
  confirmOrder(event) {
    const id = event.currentTarget.dataset.id
    request.post(api.trade.confirm, { orderId: id }).then(() => {
      this.updateStatus(id, "已完成")
    })
  },
  updateStatus(id, statusLabel) {
    this.setData({
      orderList: this.data.orderList.map((item) => {
        if (item.id !== id) return item
        return { ...item, statusLabel, canCancel: false, canConfirm: false }
      })
    })
    wx.showToast({ title: "操作成功", icon: "success" })
  }
}, {
  requireAuth: true
})
