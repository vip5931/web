<template>
  <a-layout class="admin-layout">
    <!-- 侧边栏 -->
    <a-layout-sider :trigger="null" :collapsible="false" class="sidebar" width="200">
      <div class="logo">
        <h2>管理系统</h2>
      </div>

      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        @click="handleMenuClick"
      >
        <template v-for="menu in userMenus" :key="menu.code">
          <!-- 有子菜单的情况 -->
          <a-sub-menu v-if="menu.children && menu.children.length > 0" :key="menu.code">
            <template #title>
              <component v-if="menu.icon" :is="getIconComponent(menu.icon)" />
              <span>{{ menu.name }}</span>
            </template>
            <a-menu-item v-for="child in menu.children" :key="child.path">
              {{ child.name }}
            </a-menu-item>
          </a-sub-menu>
          <!-- 没有子菜单的情况 -->
          <a-menu-item v-else :key="menu.path">
            <component v-if="menu.icon" :is="getIconComponent(menu.icon)" />
            <span>{{ menu.name }}</span>
          </a-menu-item>
        </template>
      </a-menu>
    </a-layout-sider>

    <!-- 主内容区 -->
    <a-layout>
      <!-- 顶部导航 -->
      <a-layout-header class="header">
        <div class="header-left">
          <!-- 可以在这里添加其他头部内容 -->
        </div>

        <div class="header-right">
          <a-dropdown>
            <a-button type="text" class="user-info">
              <a-avatar :size="32" :src="userStore.user?.avatar">
                {{ userStore.user?.username?.charAt(0).toUpperCase() }}
              </a-avatar>
              <span class="username">{{ userStore.user?.username }}</span>
              <DownOutlined />
            </a-button>

            <template #overlay>
              <a-menu>
                <a-menu-item key="profile">
                  <UserOutlined />
                  个人资料
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>

      <!-- 内容区 -->
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  TrophyOutlined,
  DownOutlined,
  LogoutOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const selectedKeys = ref<string[]>([])
const userMenus = ref<any[]>([])

// 创建 API 实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      userStore.logout()
    }
    return Promise.reject(error.response?.data || error)
  },
)

// 获取用户菜单
const fetchUserMenus = async () => {
  try {
    const userId = userStore.user?.id
    const response = await api.get(`/menus/user-menus?userId=${userId}`)
    if (response.success) {
      userMenus.value = response.data
    }
  } catch (error: any) {
    console.error('获取用户菜单失败:', error)
    // 默认至少显示仪表盘
    userMenus.value = [
      {
        id: 1,
        name: '仪表盘',
        code: 'dashboard',
        path: '/dashboard',
        icon: 'DashboardOutlined',
        children: [],
      },
    ]
  }
}

// 获取图标组件
const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    DashboardOutlined,
    UserOutlined,
    TeamOutlined,
    SafetyOutlined,
    TrophyOutlined,
    LogoutOutlined,
  }
  return icons[iconName] || null
}

// 监听路由变化，更新选中的菜单项
watch(
  () => route.path,
  (newPath) => {
    // 直接使用完整路径作为选中的key
    selectedKeys.value = [newPath]

    // 处理子路由，确保父菜单也被选中
    if (newPath.includes('/') && newPath !== '/') {
      const pathParts = newPath.split('/').filter(Boolean)
      if (pathParts.length > 1) {
        // 如果是子路由，也选中父路由
        const parentPath = `/${pathParts[0]}`
        if (!selectedKeys.value.includes(parentPath)) {
          selectedKeys.value.push(parentPath)
        }
      }
    }
  },
  { immediate: true },
)

const handleMenuClick = ({ key }: { key: string }) => {
  // key 现在直接是路径，直接跳转
  router.push(key)
}

const handleLogout = () => {
  userStore.logout()
  message.success('已退出登录')
  router.push('/login')
}

// 组件挂载时获取用户菜单
onMounted(() => {
  fetchUserMenus()
})
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

/* 全局过渡动画 */
.sidebar,
.header,
.content {
  transition: all 0.2s ease-in-out;
}

.sidebar {
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  overflow: auto;
  width: 200px !important;
  min-width: 200px !important;
  max-width: 200px !important;
}

.sidebar :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  margin: 16px 16px 0 16px;
  border-radius: 6px;
  flex-shrink: 0;
}

.logo h2 {
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

/* 菜单样式优化 */
.sidebar :deep(.ant-menu) {
  background: transparent;
  border: none;
  margin-top: 16px;
  flex: 1;
}

.sidebar :deep(.ant-menu-item) {
  margin: 4px 12px;
  border-radius: 6px;
  height: 40px;
  line-height: 40px;
  display: flex;
  align-items: center;
}

.sidebar :deep(.ant-menu-item-selected) {
  background: #1890ff !important;
}

.sidebar :deep(.ant-menu-item:hover) {
  background: rgba(255, 255, 255, 0.1);
}

.sidebar :deep(.ant-menu-item-selected:hover) {
  background: #1890ff !important;
}

.sidebar :deep(.ant-menu-item .anticon) {
  font-size: 16px;
  margin-right: 12px;
}

.sidebar :deep(.ant-menu-item span) {
  font-size: 14px;
}

.header {
  background: white;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  position: fixed;
  top: 0;
  right: 0;
  left: 200px;
  z-index: 99;
  height: 64px;
  transition: left 0.2s;
}

/* 移除了 trigger 相关样式 */

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 64px;
  padding: 0 12px;
}

.username {
  margin-left: 8px;
  font-weight: 500;
}

.content {
  margin-left: 200px;
  margin-top: 64px;
  padding: 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 64px);
  transition: margin-left 0.2s;
}

/* 移除了折叠相关样式 */

/* 响应式处理 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px !important;
    min-width: 200px !important;
    max-width: 200px !important;
  }

  .header {
    left: 200px;
  }

  .content {
    margin-left: 200px;
  }
}
</style>
