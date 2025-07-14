import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          component: () => import('../views/DashboardView.vue'),
        },
      ],
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          component: () => import('../views/UsersViewNew.vue'),
        },
      ],
    },

    {
      path: '/game-permissions',
      name: 'game-permissions',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          component: () => import('../views/GamePermissionsView.vue'),
        },
      ],
    },
    {
      path: '/menu-management',
      name: 'menu-management',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          component: () => import('../views/MenuManagementView.vue'),
        },
      ],
    },
    {
      path: '/server-management',
      name: 'server-management',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          component: () => import('../views/ServerManagementView.vue'),
        },
      ],
    },
    {
      path: '/ranking',
      name: 'ranking',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'player',
          component: () => import('../views/PlayerRankingView.vue'),
        },
        {
          path: 'school',
          component: () => import('../views/SchoolRankingView.vue'),
        },
      ],
    },
  ],
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 初始化用户信息
  if (!userStore.user && userStore.token) {
    userStore.initUser()
  }

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.requiresGuest && userStore.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
