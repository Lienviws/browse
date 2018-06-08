<template>
  <iframe ref="iframe"></iframe>
</template>

<script>
export default {
  mounted () {
    this.loadHtml(this.$route.query.filename)
  },
  methods: {
    loadHtml (fileName) {
      this.$refs.iframe.src = fileName
      // fetch(fileName, {
      //   method: 'GET',
      //   credentials: 'include'
      // }).then(res => {
      //   return res.text()
      // }).then(data => {
      //   this.$refs.iframe.contentWindow.document.write(data)
      // }).catch(e => {
      //   alert('please rechoose file')
      // })
    }
  }
}
</script>

<style>

</style>
