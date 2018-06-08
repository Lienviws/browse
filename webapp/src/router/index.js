import Vue from 'vue'
import Router from 'vue-router'
import MainView from '@/components/mainView'
import Login from '@/components/login'
import Preview from '@/components/preview'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'index',
      component: Login
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/browse',
      name: 'browse',
      component: MainView
    },
    {
      path: '/preview',
      name: 'preview',
      component: Preview
    }
  ]
})
