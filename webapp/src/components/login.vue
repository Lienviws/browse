<template>
  <div v-show="visible">
    <p>press password</p>
    <div>
      <input v-model="inputValue" style="width:200px" />
    </div>
    <div style="margin-top:10px">
      <input type="button" @click="confirm" value="confirm">
    </div>
  </div>
</template>

<script>
import Cookies from 'js-cookie'

export default {
  data () {
    return {
      visible: false,
      inputValue: ''
    }
  },
  methods: {
    hasPassword () {
      fetch('/hasPassword', {
        method: 'get',
        credentials: 'include'
      }).then(res => res.json())
        .then(data => {
          if (data.code === 's_ok') {
            if (data.res) {
              this.visible = true
            } else {
              this.gotoMainPage()
            }
          } else {
            alert('server err')
          }
        })
    },
    login () {
      Cookies.set('p', this.inputValue)
      fetch('/login', {
        method: 'post',
        credentials: 'include'
      }).then(res => res.json())
        .then(data => {
          if (data.code === 's_ok') {
            if (data.res) {
              this.gotoMainPage()
            } else {
              alert('password wrong')
            }
          } else {
            alert('server err')
          }
        })
    },
    gotoMainPage () {
      this.$router.push({
        path: 'browse'
      })
    },
    confirm () {
      this.login()
    }
  },
  mounted () {
    this.hasPassword()
  }
}
</script>

<style>

</style>
