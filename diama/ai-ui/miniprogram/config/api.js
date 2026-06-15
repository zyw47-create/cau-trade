module.exports = {
  auth: {
    login: "/auth/wx-login",
    profile: "/users/me",
    verify: "/users/verification"
  },
  goods: {
    list: "/goods/list",
    detail: "/goods/detail",
    publish: "/goods/publish",
    favorite: "/goods/favorite",
    uploadCredential: "/files/upload-credential"
  },
  trade: {
    createOrder: "/orders/create",
    list: "/orders/list",
    detail: "/orders/detail",
    cancel: "/orders/cancel",
    confirm: "/orders/confirm"
  },
  chat: {
    conversations: "/chat/conversations",
    messages: "/chat/messages",
    send: "/chat/send",
    unread: "/chat/unread-count"
  },
  wallet: {
    summary: "/wallet/summary",
    records: "/wallet/records"
  },
  service: {
    list: "/services/list",
    publish: "/services/publish",
    createOrder: "/services/orders/create"
  },
  errand: {
    list: "/errands/list",
    publish: "/errands/publish",
    accept: "/errands/accept",
    updateStatus: "/errands/status",
    riderApply: "/riders/apply"
  },
  ai: {
    audit: "/ai/audit",
    generate: "/ai/generate"
  }
}
