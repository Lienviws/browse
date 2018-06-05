<template>
  <div>
    <div v-if="dialogVisible" class="model" :style="{'height': height===null ? '200px':`${height}px`}">
      <slot></slot>
      <div class="foot">
        <wired-button @click="dialogVisible=false">ok</wired-button>
      </div>
    </div>
    <div v-if="dialogVisible" class="mask"></div>
  </div>
</template>

<script>
export default {
  name: 'Confirm',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    height: {
      default: null
    }
  },
  data () {
    return {
      dialogVisible: this.visible
    }
  },
  watch: {
    visible (val) {
      this.dialogVisible = val
    },
    dialogVisible (val) {
      if (val !== this.visible) {
        this.$emit('update:visible', val) // 更新带.sync的visible。语法结构：this.$emit('update:xxxxxx', val)
      }
    }
  }
}
</script>

<style>

</style>
