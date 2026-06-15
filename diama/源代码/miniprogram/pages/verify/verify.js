const { api } = require('../../utils/api')
const store = require('../../utils/store')

Page({
  data: {
    isLogin: false,
    user: null,
    colleges: ['信息与电气工程学院', '理学院', '工学院', '经济管理学院', '食品科学与营养工程学院'],
    form: {
      studentId: '',
      realName: '',
      college: '信息与电气工程学院',
      email: '',
      emailCode: '',
      phone: ''
    },
    codeSent: false,
    codeTip: '',
    sendingCode: false,
    countdown: 0,
    backendStatusText: '正在检查认证服务...',
    backendReady: false
  },

  onShow() {
    this.syncUserState()
    this.checkBackendStatus()
  },

  onUnload() {
    this.clearCountdown()
  },

  syncUserState() {
    const state = store.getState()
    const user = state.user ? Object.assign({}, state.user, {
      verifyText: state.user.verified ? '已实名' : '待认证',
      verifyClass: state.user.verified ? 'ok' : 'warn',
      submitText: state.user.verified ? '更新实名资料' : '提交认证'
    }) : null
    this.setData({
      isLogin: state.isLogin,
      user,
      form: Object.assign({}, this.data.form, {
        studentId: state.user ? state.user.studentId || '' : '',
        realName: state.user ? state.user.realName || '' : '',
        college: state.user ? state.user.college || this.data.form.college : this.data.form.college,
        email: state.user ? state.user.schoolEmail || '' : '',
        emailCode: '',
        phone: state.user ? state.user.phone || '' : ''
      })
    })
  },

  checkBackendStatus() {
    api({ url: '/api/status' }).then((res) => {
      if (res.code !== 200) {
        this.setData({
          backendReady: false,
          backendStatusText: '认证服务未连通，请先启动 backend/server.js'
        })
        return
      }
      const mode = res.data && res.data.emailMode === 'mock' ? '当前为演示验证码模式' : '当前为真实邮箱发送模式'
      this.setData({
        backendReady: true,
        backendStatusText: `认证服务正常：${mode}`
      })
    }).catch(() => {
      this.setData({
        backendReady: false,
        backendStatusText: '认证服务未连通，请先启动 backend/server.js'
      })
    })
  },

  login() {
    api({ url: '/api/auth/login', method: 'POST' }).then(() => {
      wx.showToast({ title: '登录成功' })
      this.syncUserState()
    })
  },

  updateField(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  chooseCollege(e) {
    this.setData({ 'form.college': this.data.colleges[e.detail.value] })
  },

  startCountdown(seconds) {
    this.clearCountdown()
    this.setData({ countdown: seconds })
    this.countdownTimer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) {
        this.clearCountdown()
        this.setData({ countdown: 0 })
        return
      }
      this.setData({ countdown: next })
    }, 1000)
  },

  clearCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  },

  sendEmailCode() {
    if (!store.requireLogin()) return
    if (!this.data.backendReady) {
      wx.showToast({ title: '认证服务未就绪', icon: 'none' })
      return
    }
    if (this.data.countdown > 0) return
    const email = String(this.data.form.email || '').trim().toLowerCase()
    if (!/^[a-z0-9._%+-]+@cau\.edu\.cn$/.test(email)) {
      wx.showToast({ title: '请输入 @cau.edu.cn 邮箱', icon: 'none' })
      return
    }
    this.setData({ sendingCode: true })
    api({ url: '/api/user/email-code', method: 'POST', data: { email } }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        this.setData({ codeTip: res.msg })
        return
      }
      const demoCode = res.data && res.data.demoCode
      this.setData({
        codeSent: true,
        codeTip: demoCode ? `演示验证码：${demoCode}，5分钟内有效。` : '验证码已发送到学校邮箱，5分钟内有效。'
      })
      this.startCountdown(60)
      wx.showToast({ title: demoCode ? '已生成演示验证码' : '验证码已发送' })
    }).finally(() => {
      this.setData({ sendingCode: false })
    })
  },

  submit() {
    if (!store.requireLogin()) return
    if (!this.data.backendReady) {
      wx.showToast({ title: '认证服务未就绪', icon: 'none' })
      return
    }
    const form = this.data.form
    if (!form.studentId || !form.realName || !form.college || !form.email || !form.emailCode) {
      wx.showToast({ title: '请补全学号、姓名、学院、邮箱和验证码', icon: 'none' })
      return
    }
    if (!/^\d{8,12}$/.test(String(form.studentId).trim())) {
      wx.showToast({ title: '学号应为8-12位数字', icon: 'none' })
      return
    }
    if (!/^[\u4e00-\u9fa5A-Za-z·]{2,20}$/.test(String(form.realName).trim())) {
      wx.showToast({ title: '姓名格式不正确', icon: 'none' })
      return
    }
    if (!/^\d{6}$/.test(String(form.emailCode).trim())) {
      wx.showToast({ title: '验证码应为6位数字', icon: 'none' })
      return
    }
    if (!/^[a-z0-9._%+-]+@cau\.edu\.cn$/.test(String(form.email).trim().toLowerCase())) {
      wx.showToast({ title: '请使用学校邮箱', icon: 'none' })
      return
    }
    api({ url: '/api/user/verify', method: 'POST', data: form }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        this.setData({ codeTip: res.msg })
        return
      }
      this.clearCountdown()
      this.setData({ countdown: 0 })
      wx.showModal({
        title: '认证通过',
        content: '学校邮箱已验证，可继续发布、下单和聊天。',
        showCancel: false,
        success: () => wx.switchTab({ url: '/pages/profile/profile' })
      })
    })
  }
})
