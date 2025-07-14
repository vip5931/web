<template>
  <div class="school-ranking-page">
    <a-card title="门派排行" :bordered="false">
      <!-- 搜索和筛选栏 -->
      <div class="search-bar">
        <a-row :gutter="16" align="middle">
          <a-col :span="5">
            <a-input
              v-model:value="searchForm.search"
              placeholder="搜索门派名"
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
                :key="server.server"
                :value="server.server"
              >
                {{ server.server }}
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
        :data-source="schools"
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
          <template v-else-if="column.key === 'name'">
            <a-typography-text strong>{{ record.name }}</a-typography-text>
          </template>
          <template v-else-if="column.key === 'power'">
            <a-typography-text type="warning" strong>
              {{ formatNumber(record.power) }}
            </a-typography-text>
          </template>
          <template v-else-if="column.key === 'server'">
            <a-tag color="green">{{ record.server }}</a-tag>
          </template>
          <template v-else-if="column.key === 'master_name'">
            <a-tag color="purple">{{ record.master_name }}</a-tag>
          </template>
          <template v-else-if="column.key === 'create_time'">
            {{ formatTime(record.create_time) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="showEditModal(record)">编辑</a-button>
              <a-popconfirm
                title="确定要删除这个门派数据吗？"
                @confirm="deleteSchool(record.id)"
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

    <!-- 编辑门派弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      title="编辑门派数据"
      @ok="handleSubmit"
      @cancel="resetForm"
      :confirm-loading="submitLoading"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item label="门派名" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入门派名" />
        </a-form-item>
        <a-form-item label="门主" name="master_name">
          <a-input v-model:value="formData.master_name" placeholder="请输入门主名称" />
        </a-form-item>
        <a-form-item label="战力" name="power">
          <a-input-number
            v-model:value="formData.power"
            placeholder="请输入门派战力"
            :min="0"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="区服" name="server">
          <a-select
            v-model:value="formData.server"
            placeholder="请选择区服"
            style="width: 100%"
            :dropdown-style="{ minWidth: '120px' }"
          >
            <a-select-option
              v-for="server in serverList"
              :key="server.server"
              :value="server.server"
            >
              {{ server.server }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 统计信息弹窗 -->
    <a-modal v-model:open="statsVisible" title="门派排行统计" :footer="null" width="800px">
      <div v-if="stats">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-statistic title="总门派数" :value="stats.schoolStats?.total_schools || 0" />
          </a-col>
          <a-col :span="12">
            <a-statistic title="总区服数" :value="stats.schoolStats?.school_servers || 0" />
          </a-col>
          <a-col :span="12">
            <a-statistic title="最高门派战力" :value="stats.schoolStats?.max_school_power || 0" />
          </a-col>
          <a-col :span="12">
            <a-statistic
              title="平均门派战力"
              :value="Math.round(stats.schoolStats?.avg_school_power || 0)"
            />
          </a-col>
        </a-row>

        <a-divider>各区服门派分布</a-divider>
        <a-list :data-source="stats.serverSchoolCounts" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>{{ item.server }}</template>
                <template #description>{{ item.school_count }} 个门派</template>
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
  { title: '门派名', dataIndex: 'name', key: 'name', width: 120 },
  { title: '门主', dataIndex: 'master_name', key: 'master_name', width: 100, align: 'center' },
  { title: '战力', dataIndex: 'power', key: 'power', width: 120, align: 'right', sorter: true },
  { title: '区服', dataIndex: 'server', key: 'server', width: 120, align: 'center' },
  { title: '创建时间', dataIndex: 'create_time', key: 'create_time', width: 160 },
  { title: '操作', key: 'action', width: 150, align: 'center', fixed: 'right' },
]

// 响应式数据
const loading = ref(false)
const schools = ref([])
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
  name: '',
  master_name: '',
  power: 0,
  server: '',
})

// 表单验证规则
const formRules = {
  name: [{ required: true, message: '请输入门派名' }],
  master_name: [{ required: true, message: '请输入门主名称' }],
  power: [{ required: true, message: '请输入门派战力' }],
  server: [{ required: true, message: '请选择区服' }],
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

// 获取门派排行榜
const fetchSchools = async () => {
  loading.value = true
  try {
    const userId = userStore.user?.id || 5
    const response = await api.get('/ranking/schools', {
      params: {
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: searchForm.search,
        server: searchForm.server,
        userId: userId,
      },
    })

    if (response.success) {
      schools.value = response.data.schools
      // 不再从这里获取区服列表，使用fetchUserServers获取的列表
      pagination.total = response.data.pagination.total
    }
  } catch (error: any) {
    message.error(error.message || '获取门派排行失败')
  } finally {
    loading.value = false
  }
}

// 获取用户可访问的区服列表
const fetchUserServers = async () => {
  try {
    const userId = userStore.user?.id || 5
    const response = await api.get(`/servers/user-servers?userId=${userId}`)
    if (response.success) {
      // 转换数据格式以匹配下拉框需要的格式
      serverList.value = response.data.map((server: any) => ({
        server: server.name || server.server_name,
        name: server.name || server.server_name,
      }))
    }
  } catch (error: any) {
    console.error('获取用户区服失败:', error)
    // 如果获取失败，设置空数组
    serverList.value = []
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
  fetchSchools()
}

// 重置搜索
const resetSearch = () => {
  searchForm.search = ''
  searchForm.server = ''
  pagination.current = 1
  fetchSchools()
}

// 表格变化处理
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchSchools()
}

// 显示编辑弹窗
const showEditModal = (record: any) => {
  modalVisible.value = true
  Object.assign(formData, {
    id: record.id,
    name: record.name,
    master_name: record.master_name,
    power: record.power,
    server: record.server,
  })
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    id: null,
    name: '',
    master_name: '',
    power: 0,
    server: '',
  })
  formRef.value?.resetFields()
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitLoading.value = true

    const response = await api.put(`/ranking/schools/${formData.id}`, formData)

    if (response.success) {
      message.success('更新成功')
      modalVisible.value = false
      resetForm()
      fetchSchools()
    }
  } catch (error: any) {
    message.error(error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 删除门派
const deleteSchool = async (id: number) => {
  try {
    const response = await api.delete(`/ranking/schools/${id}`)

    if (response.success) {
      message.success('删除成功')
      fetchSchools()
    }
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  fetchUserServers()
  fetchSchools()
})
</script>

<style scoped>
.school-ranking-page {
  padding: 24px;
}

.search-bar {
  margin-bottom: 16px;
}
</style>
