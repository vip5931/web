<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>仪表盘</h1>
      <p>欢迎回来，{{ userStore.user?.username }}！</p>
    </div>
    
    <!-- 统计卡片 -->
    <a-row :gutter="[16, 16]" class="stats-row">
      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="stat-card">
          <a-statistic
            title="总用户数"
            :value="stats.totalUsers"
            :prefix="h(UserOutlined)"
            value-style="color: #3f8600"
          />
        </a-card>
      </a-col>
      
      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="stat-card">
          <a-statistic
            title="活跃用户"
            :value="stats.activeUsers"
            :prefix="h(TeamOutlined)"
            value-style="color: #1890ff"
          />
        </a-card>
      </a-col>
      
      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="stat-card">
          <a-statistic
            title="今日登录"
            :value="stats.todayLogins"
            :prefix="h(LoginOutlined)"
            value-style="color: #722ed1"
          />
        </a-card>
      </a-col>
      
      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="stat-card">
          <a-statistic
            title="系统运行天数"
            :value="stats.systemDays"
            :prefix="h(ClockCircleOutlined)"
            value-style="color: #fa8c16"
          />
        </a-card>
      </a-col>
    </a-row>
    
    <!-- 图表和表格 -->
    <a-row :gutter="[16, 16]" class="content-row">
      <a-col :xs="24" :lg="12">
        <a-card title="用户增长趋势" class="chart-card">
          <div class="chart-placeholder">
            <p>图表区域</p>
            <p>可以集成 ECharts 或其他图表库</p>
          </div>
        </a-card>
      </a-col>
      
      <a-col :xs="24" :lg="12">
        <a-card title="最近登录用户" class="table-card">
          <a-table
            :columns="columns"
            :data-source="recentUsers"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'avatar'">
                <a-avatar :size="32" :src="record.avatar">
                  {{ record.username.charAt(0).toUpperCase() }}
                </a-avatar>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.status === 'online' ? 'green' : 'default'">
                  {{ record.status === 'online' ? '在线' : '离线' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'lastLogin'">
                {{ formatTime(record.lastLogin) }}
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { 
  UserOutlined, 
  TeamOutlined, 
  LoginOutlined, 
  ClockCircleOutlined 
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'

const userStore = useUserStore()

const stats = ref({
  totalUsers: 1234,
  activeUsers: 856,
  todayLogins: 123,
  systemDays: 365
})

const columns = [
  {
    title: '头像',
    dataIndex: 'avatar',
    key: 'avatar',
    width: 60
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username'
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: '最后登录',
    dataIndex: 'lastLogin',
    key: 'lastLogin'
  }
]

const recentUsers = ref([
  {
    key: '1',
    username: 'admin',
    status: 'online',
    lastLogin: new Date(),
    avatar: ''
  },
  {
    key: '2',
    username: 'user1',
    status: 'offline',
    lastLogin: new Date(Date.now() - 1000 * 60 * 30),
    avatar: ''
  },
  {
    key: '3',
    username: 'user2',
    status: 'online',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60),
    avatar: ''
  }
])

const formatTime = (time: Date) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  // 这里可以调用 API 获取真实数据
  console.log('Dashboard mounted')
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}

.dashboard-header p {
  margin: 0;
  color: #8c8c8c;
  font-size: 14px;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.content-row {
  margin-bottom: 24px;
}

.chart-card,
.table-card {
  height: 400px;
}

.chart-placeholder {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  color: #8c8c8c;
}
</style>
