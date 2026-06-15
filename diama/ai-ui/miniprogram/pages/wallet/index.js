const BasePage = require("../../utils/base-page")
const { walletRecords } = require("../../utils/mock-data")
const request = require("../../utils/request")
const api = require("../../config/api")

BasePage({
  data: {
    walletRecords: walletRecords.map((item) => ({
      ...item,
      amountClass: item.amount >= 0 ? "income" : "expense",
      amountText: `${item.amount >= 0 ? "+" : "-"}¥${Math.abs(item.amount).toFixed(2)}`
    }))
  },
  onLoad() {
    request.get(api.wallet.summary).catch(() => null)
    request.get(api.wallet.records).catch(() => null)
  }
}, {
  requireAuth: true
})
