const password = process.argv[2]

module.exports = {
  hasPassword () {
    return password !== undefined
  },
  pass (req) {
    if (!this.hasPassword()) {
      return true
    }
    let userP = req.cookies && req.cookies.p
    return userP === password
  }
} 