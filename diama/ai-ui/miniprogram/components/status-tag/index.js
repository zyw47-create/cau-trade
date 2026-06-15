const statusMap = {
  on_sale: { text: "在售", tone: "green" },
  off_shelf: { text: "已下架", tone: "gray" },
  pending_audit: { text: "审核中", tone: "amber" },
  waiting_pay: { text: "待付款", tone: "amber" },
  waiting_ship: { text: "待发货", tone: "blue" },
  waiting_receive: { text: "待收货", tone: "purple" },
  completed: { text: "已完成", tone: "green" },
  cancelled: { text: "已取消", tone: "gray" },
  waiting_accept: { text: "待接单", tone: "pink" },
  accepted: { text: "已接单", tone: "blue" },
  delivering: { text: "配送中", tone: "purple" },
  disputed: { text: "处理中", tone: "red" }
}

Component({
  properties: {
    status: {
      type: String,
      value: ""
    },
    text: {
      type: String,
      value: ""
    }
  },
  data: {
    viewText: "",
    tone: "gray"
  },
  observers: {
    "status,text": function (status, text) {
      const config = statusMap[status] || { text: status || "未知", tone: "gray" }
      this.setData({
        viewText: text || config.text,
        tone: config.tone
      })
    }
  }
})
