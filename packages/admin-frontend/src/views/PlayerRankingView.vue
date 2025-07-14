<template>
  <div class="player-ranking-page">
    <a-card title="玩家排行" :bordered="false">
      <!-- 搜索和筛选栏 -->
      <div class="search-bar">
        <a-row :gutter="16" align="middle">
          <a-col :span="5">
            <a-input
              v-model:value="searchForm.search"
              placeholder="搜索角色名"
              allow-clear
              @press-enter="handleSearch"
            />
          </a-col>
          <a-col :span="4">
            <a-select
              v-model:value="searchForm.server"
              placeholder="选择区服"
              allow-clear
              @change="handleSearch"
              style="width: 100%"
              :dropdown-style="{ minWidth: '120px' }"
            >
              <a-select-option
                v-for="server in serverList"
                :key="server.server_name"
                :value="server.server_name"
              >
                {{ server.server_name }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-space>
              <a-button type="primary" @click="handleSearch">搜索</a-button>
              <a-button @click="resetSearch">重置</a-button>
            </a-space>
          </a-col>
          <a-col :span="9" style="text-align: right">
            <a-button @click="fetchStats">
              <BarChartOutlined />
              查看统计
            </a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 排行榜表格 -->
      <a-table
        :columns="columns"
        :data-source="players"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
        :scroll="{ x: 800 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ranking'">
            <a-tag v-if="record.ranking <= 3" :color="getRankingColor(record.ranking)">
              {{ getRankingText(record.ranking) }}
            </a-tag>
            <span v-else>{{ record.ranking }}</span>
          </template>
          <template v-else-if="column.key === 'role_name'">
            <a-typography-text strong>{{ record.role_name }}</a-typography-text>
          </template>
          <template v-else-if="column.key === 'profession'">
            <a-tag color="blue">{{ record.profession }}</a-tag>
          </template>
          <template v-else-if="column.key === 'combat_power'">
            <a-typography-text type="warning" strong>
              {{ formatNumber(record.combat_power) }}
            </a-typography-text>
          </template>
          <template v-else-if="column.key === 'server_name'">
            <a-tag color="green">{{ record.server_name }}</a-tag>
          </template>
          <template v-else-if="column.key === 'create_time'">
            {{ formatTime(record.create_time) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="showEditModal(record)">编辑</a-button>
              <a-popconfirm
                title="确定要删除这个玩家数据吗？"
                @confirm="deletePlayer(record.id)"
                ok-text="确定"
                cancel-text="取消"
              >
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 编辑玩家弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      title="编辑玩家数据"
      @ok="handleSubmit"
      @cancel="resetForm"
      :confirm-loading="submitLoading"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item label="角色名" name="role_name">
          <a-input v-model:value="formData.role_name" placeholder="请输入角色名" />
        </a-form-item>
        <a-form-item label="职业" name="profession">
          <a-input v-model:value="formData.profession" placeholder="请输入职业" />
        </a-form-item>
        <a-form-item label="战力" name="combat_power">
          <a-input-number
            v-model:value="formData.combat_power"
            placeholder="请输入战力"
            :min="0"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="区服" name="server_name">
          <a-select
            v-model:value="formData.server_name"
            placeholder="请选择区服"
            style="width: 100%"
            :dropdown-style="{ minWidth: '120px' }"
          >
            <a-select-option
              v-for="server in serverList"
              :key="server.server_name"
              :value="server.server_name"
            >
              {{ server.server_name }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 统计信息弹窗 -->
    <a-modal v-model:open="statsVisible" title="玩家排行统计" :footer="null" width="800px">
      <div v-if="stats">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-statistic title="总玩家数" :value="stats.playerStats?.total_players || 0" />
          </a-col>
          <a-col :span="12">
            <a-statistic title="总区服数" :value="stats.playerStats?.total_servers || 0" />
          </a-col>
          <a-col :span="12">
            <a-statistic title="最高战力" :value="stats.playerStats?.max_power || 0" />
          </a-col>
          <a-col :span="12">
            <a-statistic title="平均战力" :value="Math.round(stats.playerStats?.avg_power || 0)" />
          </a-col>
        </a-row>

        <a-divider>各区服玩家分布</a-divider>
        <a-list :data-source="stats.serverPlayerCounts" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>{{ item.server_name }}</template>
                <template #description>{{ item.player_count }} 名玩家</template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { BarChartOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import axios from 'axios'

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

// 表格列定义
const columns = [
  { title: '排名', dataIndex: 'ranking', key: 'ranking', width: 80, align: 'center' },
  { title: '角色名', dataIndex: 'role_name', key: 'role_name', width: 120 },
  { title: '职业', dataIndex: 'profession', key: 'profession', width: 100, align: 'center' },
  {
    title: '战力',
    dataIndex: 'combat_power',
    key: 'combat_power',
    width: 120,
    align: 'right',
    sorter: true,
  },
  { title: '区服', dataIndex: 'server_name', key: 'server_name', width: 120, align: 'center' },
  { title: '创建时间', dataIndex: 'create_time', key: 'create_time', width: 160 },
  { title: '操作', key: 'action', width: 150, align: 'center', fixed: 'right' },
]

// 响应式数据
const loading = ref(false)
const players = ref([])
const serverList = ref([])
const modalVisible = ref(false)
const statsVisible = ref(false)
const submitLoading = ref(false)
const stats = ref(null)

// 搜索表单
const searchForm = reactive({
  search: '',
  server: '',
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

// 表单数据
const formData = reactive({
  id: null,
  role_name: '',
  profession: '',
  combat_power: 0,
  server_name: '',
})

// 表单验证规则
const formRules = {
  role_name: [{ required: true, message: '请输入角色名' }],
  profession: [{ required: true, message: '请输入职业' }],
  combat_power: [{ required: true, message: '请输入战力' }],
  server_name: [{ required: true, message: '请选择区服' }],
}

const formRef = ref()

// 获取排名颜色
const getRankingColor = (ranking: number) => {
  switch (ranking) {
    case 1:
      return 'gold'
    case 2:
      return 'silver'
    case 3:
      return 'orange'
    default:
      return 'default'
  }
}

// 获取排名文本
const getRankingText = (ranking: number) => {
  switch (ranking) {
    case 1:
      return '🥇'
    case 2:
      return '🥈'
    case 3:
      return '🥉'
    default:
      return ranking.toString()
  }
}

// 格式化数字
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

// 格式化时间
const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

// 获取玩家排行榜
const fetchPlayers = async () => {
  loading.value = true
  try {
    const response = await api.get('/ranking/players', {
      params: {
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: searchForm.search,
        server: searchForm.server,
      },
    })

    if (response.success) {
      players.value = response.data.players
      serverList.value = response.data.servers
      pagination.total = response.data.pagination.total
    }
  } catch (error: any) {
    message.error(error.message || '获取玩家排行失败')
  } finally {
    loading.value = false
  }
}

// 获取统计信息
const fetchStats = async () => {
  try {
    const response = await api.get('/ranking/stats')
    if (response.success) {
      stats.value = response.data
      statsVisible.value = true
    }
  } catch (error: any) {
    message.error(error.message || '获取统计信息失败')
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  fetchPlayers()
}

// 重置搜索
const resetSearch = () => {
  searchForm.search = ''
  searchForm.server = ''
  pagination.current = 1
  fetchPlayers()
}

// 表格变化处理
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchPlayers()
}

// 显示编辑弹窗
const showEditModal = (record: any) => {
  modalVisible.value = true
  Object.assign(formData, {
    id: record.id,
    role_name: record.role_name,
    profession: record.profession,
    combat_power: record.combat_power,
    server_name: record.server_name,
  })
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    id: null,
    role_name: '',
    profession: '',
    combat_power: 0,
    server_name: '',
  })
  formRef.value?.resetFields()
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitLoading.value = true

    const response = await api.put(`/ranking/players/${formData.id}`, formData)

    if (response.success) {
      message.success('更新成功')
      modalVisible.value = false
      resetForm()
      fetchPlayers()
    }
  } catch (error: any) {
    message.error(error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 删除玩家
const deletePlayer = async (id: number) => {
  try {
    const response = await api.delete(`/ranking/players/${id}`)

    if (response.success) {
      message.success('删除成功')
      fetchPlayers()
    }
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  fetchPlayers()
})
</script>

<style scoped>
.player-ranking-page {
  padding: 24px;
}

.search-bar {
  margin-bottom: 16px;
}
</style>
