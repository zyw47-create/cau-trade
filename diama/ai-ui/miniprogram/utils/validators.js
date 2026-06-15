function required(value) {
  return value !== undefined && value !== null && String(value).trim() !== ""
}

function price(value) {
  const text = String(value || "").trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return false
  }
  const number = Number(text)
  return number > 0 && number <= 999999.99
}

function phone(value) {
  return /^1[3-9]\d{9}$/.test(String(value || "").trim())
}

function studentNo(value) {
  return /^[A-Za-z0-9_-]{6,24}$/.test(String(value || "").trim())
}

function maxLength(value, length) {
  return String(value || "").length <= length
}

module.exports = {
  required,
  price,
  phone,
  studentNo,
  maxLength
}
