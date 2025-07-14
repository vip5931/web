<template>
  <div class="server-management-page">
    <a-card title="区服管理" :bordered="false">
      <!-- 操作栏 -->
      <div class="action-bar">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-button type="primary" @click="showCreateModal">
              <PlusOutlined />
              新增区服
            </a-button>
          </a-col>
          <a-col :span="12" style="text-align: right">
            <a-space>
              <a-button @click="fetchServers">
                <ReloadOutlined />
                刷新
              </a-button>
            </a-space>
          </a-col>
        </a-row>
      </div>

      <!-- 区服表格 -->
      <a-table
        :columns="columns"
        :data-source="servers"
        :loading="loading"
        row-key="id"
        :pagination="pagination"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a-typography-text strong>{{ record.name }}</a-typography-text>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="showEditModal(record)">编辑</a-button>
              <a-popconfirm
                title="确定要删除这个区服吗？"
                @confirm="deleteServer(record.id)"
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

    <!-- 新增/编辑区服弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑区服' : '新增区服'"
      @ok="handleSubmit"
      @cancel="resetForm"
      :confirm-loading="submitLoading"
      width="400px"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item label="区服名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入区服名称" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
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
  { title: '区服名称', dataIndex: 'name', key: 'name' },
  { title: '操作', key: 'action', width: 150, align: 'center' },
]

// 响应式数据
const loading = ref(false)
const servers = ref([])
const modalVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)

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
})

// 表单验证规则
const formRules = {
  name: [{ required: true, message: '请输入区服名称' }],
}

const formRef = ref()

// 获取区服列表
const fetchServers = async () => {
  loading.value = true
  try {
    const response = await api.get('/servers/all')
    if (response.success) {
      servers.value = response.data
      pagination.total = response.data.length
    }
  } catch (error: any) {
    message.error(error.message || '获取区服列表失败')
  } finally {
    loading.value = false
  }
}

// 显示新增弹窗
const showCreateModal = () => {
  isEdit.value = false
  modalVisible.value = true
  resetForm()
}

// 显示编辑弹窗
const showEditModal = (record: any) => {
  isEdit.value = true
  modalVisible.value = true
  Object.assign(formData, {
    id: record.id,
    name: record.name,
  })
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    id: null,
    name: '',
  })
  formRef.value?.resetFields()
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitLoading.value = true

    const apiUrl = isEdit.value ? `/servers/${formData.id}` : '/servers'
    const method = isEdit.value ? 'put' : 'post'

    const response = await api[method](apiUrl, formData)

    if (response.success) {
      message.success(isEdit.value ? '更新成功' : '创建成功')
      modalVisible.value = false
      resetForm()
      fetchServers()
    }
  } catch (error: any) {
    message.error(error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 删除区服
const deleteServer = async (id: number) => {
  try {
    const response = await api.delete(`/servers/${id}`)

    if (response.success) {
      message.success('删除成功')
      fetchServers()
    }
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  fetchServers()
})
</script>

<style scoped>
.server-management-page {
  padding: 24px;
}

.action-bar {
  margin-bottom: 16px;
}
</style>
