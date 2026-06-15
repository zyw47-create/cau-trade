Component({
  properties: {
    userInfo: {
      type: Object,
      value: {}
    },
    stats: {
      type: Array,
      value: []
    },
    roleOptions: {
      type: Array,
      value: []
    },
    currentRoleIndex: {
      type: Number,
      value: 0
    }
  },
  data: {
    viewUserInfo: {
      avatarText: "张",
      verifiedText: "未实名",
      roleText: "普通用户",
      nameText: "张三",
      descText: "校园用户",
      creditText: "信用 0"
    }
  },
  observers: {
    userInfo(userInfo) {
      const next = userInfo || {}
      const name = next.name || "张三"
      const roleMap = {
        user: "普通用户",
        service: "服务者",
        rider: "校园骑手",
        admin: "管理员"
      }
      const college = next.college || "校园"
      const grade = next.grade || "在读"
      const creditScore = next.creditScore || 0
      this.setData({
        viewUserInfo: {
          avatarText: name.slice(0, 1),
          verifiedText: next.isVerified ? "实名认证" : "未实名",
          roleText: roleMap[next.role] || "普通用户",
          nameText: name,
          descText: `${college} · ${grade}`,
          creditText: `信用 ${creditScore}`
        }
      })
    }
  },
  methods: {
    handlePublish() {
      this.triggerEvent("publish")
    },
    handleRoleChange(event) {
      this.triggerEvent("rolechange", event.detail)
    }
  }
})
