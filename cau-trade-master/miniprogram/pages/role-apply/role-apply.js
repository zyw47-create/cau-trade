const { request: api } = require('../../utils/request')
const store = require('../../utils/store')
const { BasePage } = require('../../utils/base-page')

const ROLE_CONFIG = {
  rider: {
    title: '骑手认证',
    subtitle: '用于跑腿抢单、配送状态更新和收益提现。',
    submitText: '提交骑手认证',
    successText: '骑手认证已通过',
    roleText: '骑手',
    checklist: ['已完成校园实名认证', '熟悉校内主要路线', '同意接单后及时更新配送状态'],
    showRider: true,
    showProvider: false
  },
  provider: {
    title: '服务者认证',
    subtitle: '用于发布可预约服务、承接校园服务订单和收益提现。',
    submitText: '提交服务者认证',
    successText: '服务者认证已通过',
    roleText: '服务者',
    checklist: ['已完成校园实名认证', '服务内容真实可履约', '同意服务完成后接受评价'],
    showRider: false,
    showProvider: true
  }
}

BasePage({
  requireAuth: true,
  requireVerified: true,
  data: {
    role: 'rider',
    config: ROLE_CONFIG.rider,
    isLogin: false,
    isVerified: false,
    user: null,
    alreadyCertified: false,
    canActivateRole: false,
    certification: null,
    form: {
      campusArea: '',
      availableTime: '',
      emergencyContact: '',
      serviceCategory: '',
      experience: '',
      agreement: false
    }
  },

  onLoad(query) {
    const role = ROLE_CONFIG[query.role] ? query.role : 'rider'
    this.setData({ role, config: ROLE_CONFIG[role] })
  },

  onShow() {
    const now = Date.now()
    if (store.getState().isLogin && (!this.lastProfileSyncAt || now - this.lastProfileSyncAt > 2000)) {
      this.lastProfileSyncAt = now
      this.refreshingProfile = true
      api({ url: '/api/user/profile' }).finally(() => {
        this.refreshingProfile = false
        this.renderLocalState()
      })
      return
    }
    this.renderLocalState()
  },

  renderLocalState() {
    const state = store.getState()
    const certifications = (state.user && state.user.roleCertifications) || {}
    const certification = certifications[this.data.role] || null
    this.setData({
      isLogin: state.isLogin,
      isVerified: state.isVerified,
      user: state.user,
      certification,
      alreadyCertified: Boolean(certification && certification.status === 'approved'),
      canActivateRole: Boolean(certification && certification.status === 'approved' && state.role !== this.data.role)
    })
  },

  login() {
    api({ url: '/api/auth/login', method: 'POST' }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg || '登录失败', icon: 'none' })
        return
      }
      wx.showToast({ title: '登录成功' })
      this.onShow()
    })
  },

  goVerify() {
    wx.navigateTo({ url: '/pages/verify/verify' })
  },

  updateField(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  toggleAgreement() {
    this.setData({ 'form.agreement': !this.data.form.agreement })
  },

  validateForm() {
    const form = this.data.form
    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return false
    }
    if (!this.data.isVerified) {
      wx.showToast({ title: '请先完成实名认证', icon: 'none' })
      return false
    }
    if (this.data.role === 'rider' && (!form.campusArea || !form.availableTime || !form.emergencyContact)) {
      wx.showToast({ title: '请补全骑手接单资料', icon: 'none' })
      return false
    }
    if (this.data.role === 'provider' && (!form.serviceCategory || !form.experience)) {
      wx.showToast({ title: '请补全服务者资料', icon: 'none' })
      return false
    }
    if (!form.agreement) {
      wx.showToast({ title: '请先勾选认证承诺', icon: 'none' })
      return false
    }
    return true
  },

  submit() {
    if (!this.validateForm()) return
    api({
      url: '/api/user/role',
      method: 'POST',
      data: Object.assign({}, this.data.form, { role: this.data.role })
    }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      this.onShow()
      wx.showModal({
        title: this.data.config.successText,
        content: `${this.data.config.roleText}权限已开通，可在对应业务中使用。`,
        showCancel: false,
        success: () => wx.switchTab({ url: '/pages/profile/profile' })
      })
    })
  },

  activateRole() {
    const payload = Object.assign({}, this.data.certification || {}, {
      role: this.data.role,
      agreement: true
    })
    api({ url: '/api/user/role', method: 'POST', data: payload }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      wx.showToast({ title: `已切换为${this.data.config.roleText}` })
      this.onShow()
    })
  }
})
