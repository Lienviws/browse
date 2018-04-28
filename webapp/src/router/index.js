import Vue from 'vue'
import Router from 'vue-router'
import MainView from '@/components/mainView'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'mainView',
      component: MainView
    }
  ]
})
