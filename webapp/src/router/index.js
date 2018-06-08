import Vue from 'vue'
import Router from 'vue-router'
import MainView from '@/components/mainView'
import Login from '@/components/login'

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
    }
  ]
})
