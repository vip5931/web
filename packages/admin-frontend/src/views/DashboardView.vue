<template>
  <div class="dashboard-page">
    <!-- 欢迎信息 -->
    <a-card class="welcome-card" :bordered="false">
      <div class="welcome-content">
        <div class="welcome-text">
          <h3>欢迎回来，{{ userStore.user?.username }}！</h3>
          <p class="welcome-date">{{ currentDate }} · 祝您工作愉快！</p>
        </div>
        <div class="welcome-actions">
          <a-space size="small">
            <a-button size="small" type="primary" @click="refreshData">
              <ReloadOutlined />
              刷新
            </a-button>
            <a-button size="small" @click="goToRanking">
              <TrophyOutlined />
              排行
            </a-button>
          </a-space>
        </div>
      </div>
    </a-card>

    <!-- 统计卡片 -->
    <a-row :gutter="12" class="stats-row">
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #1890ff, #40a9ff)">
              <GlobalOutlined />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ dashboardStats.totalServers }}</div>
              <div class="stat-label">可访问区服</div>
            </div>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #52c41a, #73d13d)">
              <UserOutlined />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatNumber(dashboardStats.totalPlayers) }}</div>
              <div class="stat-label">总玩家数</div>
            </div>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #722ed1, #9254de)">
              <TeamOutlined />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatNumber(dashboardStats.totalSchools) }}</div>
              <div class="stat-label">总门派数</div>
            </div>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #fa8c16, #ffa940)">
              <FireOutlined />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatNumber(dashboardStats.maxPower) }}</div>
              <div class="stat-label">最高战力</div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 图表区域 -->
    <a-row :gutter="12" class="charts-row">
      <!-- 区服玩家战力折线图 -->
      <a-col :span="12">
        <a-card :bordered="false" class="chart-card">
          <template #title>
            <div class="chart-title">
              <FireOutlined />
              <span>区服玩家战力趋势</span>
            </div>
          </template>
          <div class="chart-container">
            <div v-if="serverPlayerData.length > 0" class="line-chart">
              <svg class="chart-svg" viewBox="0 0 400 200">
                <!-- 网格线 -->
                <defs>
                  <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                <!-- Y轴标签 -->
                <g class="y-axis">
                  <text x="10" y="20" class="axis-label">
                    {{ formatShortNumber(maxPlayerPower) }}
                  </text>
                  <text x="10" y="110" class="axis-label">
                    {{ formatShortNumber(maxPlayerPower / 2) }}
                  </text>
                  <text x="10" y="190" class="axis-label">0</text>
                </g>

                <!-- 折线 -->
                <polyline
                  :points="getPlayerPowerLinePoints()"
                  fill="none"
                  stroke="url(#playerGradient)"
                  stroke-width="3"
                  stroke-linecap="round"
                />

                <!-- 数据点 -->
                <circle
                  v-for="(point, index) in getPlayerPowerPoints()"
                  :key="index"
                  :cx="point.x"
                  :cy="point.y"
                  r="4"
                  fill="#1890ff"
                  stroke="#fff"
                  stroke-width="2"
                />

                <!-- 渐变定义 -->
                <defs>
                  <linearGradient id="playerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #1890ff; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #40a9ff; stop-opacity: 1" />
                  </linearGradient>
                </defs>
              </svg>

              <!-- X轴标签 -->
              <div class="x-axis-labels">
                <span
                  v-for="(item, index) in serverPlayerData.slice(0, 6)"
                  :key="item.name"
                  class="x-label"
                >
                  {{ item.name.length > 4 ? item.name.substring(0, 4) + '...' : item.name }}
                </span>
              </div>
            </div>
            <a-empty v-else description="暂无数据" size="small" />
          </div>
        </a-card>
      </a-col>

      <!-- 区服门派战力折线图 -->
      <a-col :span="12">
        <a-card :bordered="false" class="chart-card">
          <template #title>
            <div class="chart-title">
              <TeamOutlined />
              <span>区服门派战力趋势</span>
            </div>
          </template>
          <div class="chart-container">
            <div v-if="serverSchoolData.length > 0" class="line-chart">
              <svg class="chart-svg" viewBox="0 0 400 200">
                <!-- 网格线 -->
                <rect width="100%" height="100%" fill="url(#grid)" />

                <!-- Y轴标签 -->
                <g class="y-axis">
                  <text x="10" y="20" class="axis-label">
                    {{ formatShortNumber(maxSchoolPower) }}
                  </text>
                  <text x="10" y="110" class="axis-label">
                    {{ formatShortNumber(maxSchoolPower / 2) }}
                  </text>
                  <text x="10" y="190" class="axis-label">0</text>
                </g>

                <!-- 折线 -->
                <polyline
                  :points="getSchoolPowerLinePoints()"
                  fill="none"
                  stroke="url(#schoolGradient)"
                  stroke-width="3"
                  stroke-linecap="round"
                />

                <!-- 数据点 -->
                <circle
                  v-for="(point, index) in getSchoolPowerPoints()"
                  :key="index"
                  :cx="point.x"
                  :cy="point.y"
                  r="4"
                  fill="#722ed1"
                  stroke="#fff"
                  stroke-width="2"
                />

                <!-- 渐变定义 -->
                <defs>
                  <linearGradient id="schoolGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #722ed1; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #9254de; stop-opacity: 1" />
                  </linearGradient>
                </defs>
              </svg>

              <!-- X轴标签 -->
              <div class="x-axis-labels">
                <span
                  v-for="(item, index) in serverSchoolData.slice(0, 6)"
                  :key="item.name"
                  class="x-label"
                >
                  {{ item.name.length > 4 ? item.name.substring(0, 4) + '...' : item.name }}
                </span>
              </div>
            </div>
            <a-empty v-else description="暂无数据" size="small" />
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  TrophyOutlined,
  GlobalOutlined,
  UserOutlined,
  TeamOutlined,
  FireOutlined,
  SafetyOutlined,
  MenuOutlined,
} from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import axios from 'axios'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

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

// 响应式数据
const dashboardStats = ref({
  totalServers: 0,
  totalPlayers: 0,
  totalSchools: 0,
  maxPower: 0,
})

const serverPlayerData = ref([])
const serverSchoolData = ref([])

// 计算最大战力值
const maxPlayerPower = computed(() => {
  return Math.max(...serverPlayerData.value.map((s: any) => s.max_power || 0))
})

const maxSchoolPower = computed(() => {
  return Math.max(...serverSchoolData.value.map((s: any) => s.max_school_power || 0))
})

// 计算属性
const currentDate = computed(() => {
  return dayjs().format('YYYY年MM月DD日')
})

// 格式化数字
const formatNumber = (num: number) => {
  return num?.toLocaleString() || '0'
}

// 格式化短数字（用于Y轴标签）
const formatShortNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 获取玩家战力折线图点位
const getPlayerPowerPoints = () => {
  const data = serverPlayerData.value.slice(0, 6)
  const maxPower = maxPlayerPower.value
  const points = []

  for (let i = 0; i < data.length; i++) {
    const x = 50 + (i * 300) / Math.max(data.length - 1, 1)
    const y = 180 - ((data[i].max_power || 0) / maxPower) * 160
    points.push({ x, y })
  }

  return points
}

// 获取玩家战力折线图路径
const getPlayerPowerLinePoints = () => {
  return getPlayerPowerPoints()
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
}

// 获取门派战力折线图点位
const getSchoolPowerPoints = () => {
  const data = serverSchoolData.value.slice(0, 6)
  const maxPower = maxSchoolPower.value
  const points = []

  for (let i = 0; i < data.length; i++) {
    const x = 50 + (i * 300) / Math.max(data.length - 1, 1)
    const y = 180 - ((data[i].max_school_power || 0) / maxPower) * 160
    points.push({ x, y })
  }

  return points
}

// 获取门派战力折线图路径
const getSchoolPowerLinePoints = () => {
  return getSchoolPowerPoints()
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
}

// 获取仪表盘数据
const fetchDashboardData = async () => {
  try {
    const userId = userStore.user?.id || 5
    const response = await api.get(`/servers/stats?userId=${userId}`)

    if (response.success) {
      const data = response.data

      // 计算统计数据
      const totalPlayers = data.serverStats.reduce(
        (sum: number, server: any) => sum + (server.player_count || 0),
        0,
      )
      const totalSchools = data.schoolStats.reduce(
        (sum: number, server: any) => sum + (server.school_count || 0),
        0,
      )
      const maxPower = Math.max(...data.serverStats.map((s: any) => s.max_power || 0))

      dashboardStats.value = {
        totalServers: data.totalServers,
        totalPlayers,
        totalSchools,
        maxPower,
      }

      // 设置区服数据
      serverPlayerData.value = data.serverStats.sort(
        (a: any, b: any) => (b.player_count || 0) - (a.player_count || 0),
      )
      serverSchoolData.value = data.schoolStats.sort(
        (a: any, b: any) => (b.school_count || 0) - (a.school_count || 0),
      )
    }
  } catch (error: any) {
    console.error('获取仪表盘数据失败:', error)
  }
}

// 刷新数据
const refreshData = () => {
  fetchDashboardData()
  message.success('数据已刷新')
}

// 导航函数
const goToRanking = () => {
  router.push('/ranking/player')
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.dashboard-page {
  padding: 16px;
  font-size: 13px;
}

.welcome-card {
  margin-bottom: 16px;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text h3 {
  margin: 0 0 4px 0;
  color: #1890ff;
  font-size: 18px;
  font-weight: 500;
}

.welcome-date {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.charts-row {
  margin-bottom: 16px;
}

.chart-card {
  height: 320px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.chart-container {
  height: 260px;
  padding: 8px 0;
}

.line-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.chart-svg {
  width: 100%;
  height: 200px;
  margin-bottom: 8px;
}

.axis-label {
  font-size: 10px;
  fill: #8c8c8c;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.x-axis-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 50px 0 50px;
  height: 20px;
}

.x-label {
  font-size: 10px;
  color: #8c8c8c;
  text-align: center;
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-page {
    padding: 12px;
  }

  .chart-card {
    height: 280px;
  }

  .chart-container {
    height: 220px;
  }

  .stat-value {
    font-size: 18px;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
}
</style>
