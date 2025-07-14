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
        <a-menu-item key="dashboard">
          <DashboardOutlined />
          <span>仪表盘</span>
        </a-menu-item>

        <a-menu-item key="users">
          <UserOutlined />
          <span>用户管理</span>
        </a-menu-item>
        <a-menu-item key="roles">
          <TeamOutlined />
          <span>角色管理</span>
        </a-menu-item>
        <a-menu-item key="permissions">
          <SafetyOutlined />
          <span>权限管理</span>
        </a-menu-item>
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
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  DownOutlined,
  LogoutOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const selectedKeys = ref<string[]>([])

// 监听路由变化，更新选中的菜单项
watch(
  () => route.path,
  (newPath) => {
    if (newPath.includes('dashboard')) {
      selectedKeys.value = ['dashboard']
    } else if (newPath.includes('users')) {
      selectedKeys.value = ['users']
    }
  },
  { immediate: true },
)

const handleMenuClick = ({ key }: { key: string }) => {
  router.push(`/${key}`)
}

const handleLogout = () => {
  userStore.logout()
  message.success('已退出登录')
  router.push('/login')
}
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
