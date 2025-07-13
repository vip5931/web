import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  avatar?: string
}

interface LoginForm {
  username: string
  password: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // 配置 axios 默认设置
  const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    timeout: 10000
  })

  // 请求拦截器
  api.interceptors.request.use(
    (config) => {
      if (token.value) {
        config.headers.Authorization = `Bearer ${token.value}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  api.interceptors.response.use(
    (response) => {
      return response.data
    },
    (error) => {
      if (error.response?.status === 401) {
        logout()
      }
      return Promise.reject(error.response?.data || error)
    }
  )

  const login = async (loginForm: LoginForm) => {
    try {
      const response = await api.post('/auth/login', loginForm)
      
      if (response.success) {
        token.value = response.data.token
        user.value = response.data.user
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      } else {
        throw new Error(response.message)
      }
    } catch (error: any) {
      throw new Error(error.message || '登录失败')
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const initUser = () => {
    const savedUser = localStorage.getItem('user')
    if (savedUser && token.value) {
      try {
        user.value = JSON.parse(savedUser)
      } catch (error) {
        console.error('Failed to parse saved user:', error)
        logout()
      }
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    api,
    login,
    logout,
    initUser
  }
})
