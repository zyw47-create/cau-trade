const validators = require("../../utils/validators")
const api = require("../../config/api")
const request = require("../../utils/request")

Page({
  data: {
    name: "",
    studentNo: "",
    college: "",
    phone: "",
    agreement: false,
    submitting: false,
    successVisible: false
  },
  input: function (event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [field]: event.detail.value })
  },
  toggleAgreement: function () {
    this.setData({ agreement: !this.data.agreement })
  },
  submit: function () {
    if (!validators.required(this.data.name) || !validators.studentNo(this.data.studentNo)) {
      wx.showToast({ title: "请填写姓名和有效学号", icon: "none" })
      return
    }
    if (!validators.required(this.data.college) || !validators.phone(this.data.phone)) {
      wx.showToast({ title: "请填写学院和有效手机号", icon: "none" })
      return
    }
    if (!this.data.agreement) {
      wx.showToast({ title: "请先同意认证授权", icon: "none" })
      return
    }

    this.setData({ submitting: true })
    request.post(api.auth.verify, {
      name: this.data.name,
      studentNo: this.data.studentNo,
      college: this.data.college,
      phone: this.data.phone
    }).then(() => {
      const app = getApp()
      const userInfo = Object.assign({}, app.globalData.userInfo, {
        name: this.data.name,
        college: this.data.college,
        isVerified: true
      })
      app.globalData.userInfo = userInfo
      app.globalData.isVerified = true
      wx.setStorageSync("campus_userinfo", userInfo)
      this.setData({ successVisible: true })
    }).finally(() => {
      this.setData({ submitting: false })
    })
  },
  finish: function () {
    this.setData({ successVisible: false })
    wx.navigateBack()
  }
})
