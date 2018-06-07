export function formatDate (date, text) {
  if (/^\d+$/.test(date)) {
    try {
      date = new Date(date)
    } catch (error) {
      return false
    }
  }
  var reg = /yyyy|yy|M+|d+|h+|m+|s+|q+|S|w/g
  text = text.replace(reg, function (pattern) {
    var result
    switch (pattern) {
      case 'yyyy':
        result = date.getFullYear()
        break
      case 'yy':
        result = date.getFullYear().toString().substring(2)
        break
      case 'M':
      case 'MM':
        result = date.getMonth() + 1
        break
      case 'dd':
      case 'd':
        result = date.getDate()
        break
      case 'hh':
      case 'h':
        result = date.getHours()
        break
      case 'mm':
      case 'm':
        result = date.getMinutes()
        break
      case 'ss':
      case 's':
        result = date.getSeconds()
        break
      case 'q':
        result = Math.floor((date.getMonth() + 3) / 3)
        break
      case 'S':
        result = date.getMilliseconds()
        break
      case 'w':
        result = '日一二三四五六'.charAt(date.getDay())
        break
      default:
        result = ''
        break
    }
    if (pattern.length === 2 && result.toString().length === 1) {
      result = '0' + result
    }
    return result
  })
  return text
}
