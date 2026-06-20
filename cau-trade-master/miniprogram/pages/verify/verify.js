const { request: api } = require('../../utils/request')
const store = require('../../utils/store')

const COLLEGES = [
  '农学院',
  '园艺学院',
  '植物保护学院',
  '生物学院',
  '资源与环境学院',
  '动物科学技术学院',
  '动物医学院',
  '草业科学与技术学院',
  '食品科学与营养工程学院',
  '工学院',
  '信息与电气工程学院',
  '水利与智能工程学院（原水利与土木工程学院）',
  '理学院',
  '土地科学与技术学院',
  '经济管理学院',
  '人文与发展学院',
  '马克思主义学院',
  '国际学院',
  '未来技术学院'
]

Page({
  data: {
    isLogin: false,
    user: null,
    colleges: COLLEGES,
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
    backendReady: false,
    demoCode: ''
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
      if (res.code !== 200) throw new Error(res.msg || 'status error')
      const mode = res.data && res.data.emailMode === 'mock' ? '演示验证码模式' : '真实邮箱发送模式'
      this.setData({
        backendReady: true,
        backendStatusText: `认证服务正常：${mode}`
      })
    }).catch(() => {
      this.setData({
        backendReady: false,
        backendStatusText: '认证服务未连通，可使用演示验证码继续测试。'
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

  validateBaseFields(requireCode) {
    const form = this.data.form
    const studentId = String(form.studentId || '').trim()
    const phone = String(form.phone || '').trim()
    if (!/^\d{13}$/.test(studentId)) {
      wx.showToast({ title: '学号应为13位数字', icon: 'none' })
      return false
    }
    if (!form.realName || !/^[\u4e00-\u9fa5A-Za-z·]{2,20}$/.test(String(form.realName).trim())) {
      wx.showToast({ title: '请输入正确姓名', icon: 'none' })
      return false
    }
    if (!/^[a-z0-9._%+-]+@cau\.edu\.cn$/.test(String(form.email).trim().toLowerCase())) {
      wx.showToast({ title: '请输入 @cau.edu.cn 学校邮箱', icon: 'none' })
      return false
    }
    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号应为11位数字', icon: 'none' })
      return false
    }
    if (requireCode && !/^\d{6}$/.test(String(form.emailCode).trim())) {
      wx.showToast({ title: '验证码应为6位数字', icon: 'none' })
      return false
    }
    return true
  },

  sendEmailCode() {
    if (!store.requireLogin()) return
    if (this.data.countdown > 0) return
    if (!this.validateBaseFields(false)) return
    const email = String(this.data.form.email || '').trim().toLowerCase()
    this.setData({ sendingCode: true })

    api({ url: '/api/user/email-code', method: 'POST', data: { email } }).then((res) => {
      if (res.code !== 200) throw new Error(res.msg || '发送失败')
      const demoCode = res.data && res.data.demoCode
      this.setData({
        codeSent: true,
        demoCode: demoCode || '',
        codeTip: demoCode ? `演示验证码：${demoCode}，5分钟内有效。` : `验证码已发送到 ${email}，5分钟内有效。`
      })
      this.startCountdown(60)
      wx.showToast({ title: demoCode ? '已生成演示验证码' : '验证码已发送' })
    }).catch(() => {
      const demoCode = String(Math.floor(100000 + Math.random() * 900000))
      this.setData({
        backendReady: false,
        codeSent: true,
        demoCode,
        codeTip: `认证服务未连接，已启用演示验证码：${demoCode}`
      })
      this.startCountdown(60)
      wx.showToast({ title: '已启用演示验证码', icon: 'none' })
    }).finally(() => {
      this.setData({ sendingCode: false })
    })
  },

  submit() {
    if (!store.requireLogin()) return
    const form = Object.assign({}, this.data.form, {
      studentId: String(this.data.form.studentId || '').trim(),
      email: String(this.data.form.email || '').trim().toLowerCase(),
      emailCode: String(this.data.form.emailCode || '').trim(),
      phone: String(this.data.form.phone || '').trim()
    })
    if (!this.validateBaseFields(true)) return

    if (!this.data.backendReady && this.data.demoCode && form.emailCode === this.data.demoCode) {
      store.updateUser({
        verified: true,
        studentId: form.studentId,
        realName: form.realName,
        college: form.college,
        schoolEmail: form.email,
        phone: form.phone
      })
      wx.showModal({
        title: '认证通过',
        content: '演示模式已完成认证，可继续测试发布、下单和聊天。',
        showCancel: false,
        success: () => wx.switchTab({ url: '/pages/profile/profile' })
      })
      return
    }

    api({ url: '/api/user/verify', method: 'POST', data: form }).then((res) => {
      if (res.code !== 200) {
        const isNetworkError = /网络请求|超时|后端服务/.test(res.msg || '')
        wx.showToast({ title: isNetworkError ? '请使用演示验证码测试' : (res.msg || '认证失败'), icon: 'none' })
        this.setData({
          backendReady: isNetworkError ? false : this.data.backendReady,
          codeTip: isNetworkError ? '认证服务未连接，请先获取演示验证码后提交。' : (res.msg || '认证失败，请检查验证码。')
        })
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
    }).catch(() => {
      wx.showToast({ title: '认证服务暂不可用', icon: 'none' })
      this.setData({ codeTip: '请确认 backend/server.js 已启动，或使用演示验证码测试。' })
    })
  }
})
