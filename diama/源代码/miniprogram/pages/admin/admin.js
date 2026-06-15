const { api } = require('../../utils/api')
const store = require('../../utils/store')

const ROLE_TEXT = {
  user: '普通用户',
  provider: '服务者',
  rider: '骑手',
  admin: '管理员'
}

const USER_STATUS_TEXT = {
  active: '正常',
  pending_verify: '待实名',
  banned: '已限制',
  removed: '已注销'
}

const WITHDRAW_STATUS_TEXT = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消'
}

const OPS_STATUS_TEXT = {
  healthy: '正常',
  warning: '需关注',
  failed: '异常',
  DISABLED: '未启用',
  ENABLED: '已启用',
  SLAVESIDE_DISABLED: '从库停用'
}

Page({
  data: {
    isAdmin: false,
    noPendingGoods: false,
    noRefundingOrders: false,
    noWithdraws: false,
    stats: {},
    pendingGoods: [],
    refundingOrders: [],
    withdraws: [],
    auditLogs: [],
    users: [],
    aiRules: {},
    opsHealth: {},
    securityChecks: [],
    opsEvents: [],
    latestBackup: null,
    backupRunning: false,
    exportInfo: null
  },

  onShow() {
    const state = store.getState()
    this.setData({ isAdmin: state.role === 'admin' })
    if (!state.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      wx.switchTab({ url: '/pages/profile/profile' })
      return
    }
    if (state.role !== 'admin') return
    this.loadAll()
  },

  loadAll() {
    api({ url: '/api/admin/stats' }).then((res) => this.setData({ stats: res.data }))
    api({ url: '/api/admin/goods/pending' }).then((res) => {
      this.setData({ pendingGoods: res.data.list, noPendingGoods: res.data.list.length === 0 })
    })
    api({ url: '/api/admin/orders/refunding' }).then((res) => {
      this.setData({ refundingOrders: res.data.list, noRefundingOrders: res.data.list.length === 0 })
    })
    api({ url: '/api/admin/withdraws' }).then((res) => {
      this.setData({
        withdraws: res.data.list.map((item) => Object.assign({}, item, {
          canAudit: item.status === 'pending',
          roleText: ROLE_TEXT[item.role] || item.role,
          statusText: WITHDRAW_STATUS_TEXT[item.status] || item.status
        })),
        noWithdraws: res.data.list.length === 0
      })
    })
    api({ url: '/api/admin/audit/logs' }).then((res) => this.setData({ auditLogs: res.data.list }))
    api({ url: '/api/admin/ops/health' }).then((res) => {
      const health = Object.assign({}, res.data, {
        statusText: OPS_STATUS_TEXT[res.data.status] || res.data.status
      })
      this.setData({
        opsHealth: health,
        opsEvents: (res.data.events || []).map((item) => Object.assign({}, item, {
          statusText: OPS_STATUS_TEXT[item.status] || item.status
        })),
        latestBackup: res.data.latestBackup || null
      })
    })
    api({ url: '/api/admin/security/checks' }).then((res) => this.setData({ securityChecks: res.data.list }))
    api({ url: '/api/admin/users' }).then((res) => {
      this.setData({
        users: res.data.list.map((item) => Object.assign({}, item, {
          canBan: item.status !== 'banned',
          roleText: ROLE_TEXT[item.role] || item.role,
          statusText: USER_STATUS_TEXT[item.status] || item.status,
          nextStatus: item.status === 'banned' ? 'active' : 'banned',
          statusAction: item.status === 'banned' ? '解封' : '封禁'
        }))
      })
    })
    api({ url: '/api/admin/ai/rules' }).then((res) => this.setData({ aiRules: res.data }))
  },

  auditGoods(e) {
    const id = e.currentTarget.dataset.id
    const result = e.currentTarget.dataset.result
    api({
      url: '/api/admin/goods/audit',
      method: 'POST',
      data: { id, result, reason: result === 'reject' ? '内容不合规' : '' }
    }).then(() => {
      wx.showToast({ title: result === 'reject' ? '已驳回' : '已通过' })
      this.loadAll()
    })
  },

  arbitrate(e) {
    const orderSn = e.currentTarget.dataset.sn
    const result = e.currentTarget.dataset.result
    api({
      url: '/api/admin/order/arbitrate',
      method: 'POST',
      data: { orderSn, result }
    }).then(() => {
      wx.showToast({ title: '仲裁完成' })
      this.loadAll()
    })
  },

  auditWithdraw(e) {
    const id = e.currentTarget.dataset.id
    const result = e.currentTarget.dataset.result
    api({
      url: '/api/admin/withdraw/audit',
      method: 'POST',
      data: { id, result }
    }).then(() => {
      wx.showToast({ title: result === 'reject' ? '已驳回' : '已通过' })
      this.loadAll()
    })
  },

  changeUserStatus(e) {
    const id = e.currentTarget.dataset.id
    const status = e.currentTarget.dataset.status
    api({
      url: '/api/admin/user/status',
      method: 'POST',
      data: { id, status }
    }).then(() => {
      wx.showToast({ title: status === 'banned' ? '已封禁' : '已解封' })
      this.loadAll()
    })
  },

  onRuleInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`aiRules.${key}`]: e.detail.value })
  },

  toggleRule(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`aiRules.${key}`]: !this.data.aiRules[key] })
  },

  saveRules() {
    api({ url: '/api/admin/ai/rules/update', method: 'POST', data: this.data.aiRules }).then((res) => {
      wx.showToast({ title: '规则已保存' })
      this.setData({ aiRules: res.data })
      this.loadAll()
    })
  },

  exportStats() {
    api({ url: '/api/admin/stats/export' }).then((res) => {
      this.setData({ exportInfo: res.data })
      wx.showToast({ title: '已生成报表' })
    })
  },

  runBackup() {
    if (this.data.backupRunning) return
    this.setData({ backupRunning: true })
    api({ url: '/api/admin/backup/run', method: 'POST' }).then((res) => {
      this.setData({ latestBackup: res.data })
      wx.showToast({ title: '备份已生成' })
      this.loadAll()
    }).finally(() => {
      this.setData({ backupRunning: false })
    })
  }
})
