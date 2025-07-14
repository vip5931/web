<template>
  <div class="roles-page">
    <a-card title="角色管理" :bordered="false">
      <!-- 搜索和操作栏 -->
      <div class="search-bar">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-input
              v-model:value="searchForm.search"
              placeholder="搜索角色名称或编码"
              allow-clear
              @press-enter="handleSearch"
            />
          </a-col>
          <a-col :span="8">
            <a-space>
              <a-button type="primary" @click="handleSearch">搜索</a-button>
              <a-button @click="resetSearch">重置</a-button>
            </a-space>
          </a-col>
          <a-col :span="8" style="text-align: right">
            <a-button type="primary" @click="showAddModal">
              <template #icon>
                <PlusOutlined />
              </template>
              新增角色
            </a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 角色表格 -->
      <a-table
        :columns="columns"
        :data-source="roles"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'green' : 'red'">
              {{ record.status === 'active' ? '正常' : '禁用' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="showEditModal(record)"> 编辑 </a-button>
              <a-button
                v-if="record.code !== 'admin'"
                type="link"
                size="small"
                :danger="record.status === 'active'"
                @click="toggleRoleStatus(record)"
              >
                {{ record.status === 'active' ? '禁用' : '启用' }}
              </a-button>
              <a-popconfirm
                v-if="record.code !== 'admin'"
                title="确定要删除这个角色吗？"
                @confirm="deleteRole(record.id)"
                ok-text="确定"
                cancel-text="取消"
              >
                <a-button type="link" size="small" danger> 删除 </a-button>
              </a-popconfirm>
              <a-tag v-if="record.code === 'admin'" color="gold"> 系统角色 </a-tag>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑角色模态框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑角色' : '新增角色'"
      @ok="handleSubmit"
      @cancel="handleCancel"
      :confirm-loading="submitLoading"
      width="600px"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item label="角色名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入角色名称" />
        </a-form-item>

        <a-form-item label="角色编码" name="code">
          <a-input
            v-model:value="formData.code"
            placeholder="请输入角色编码"
            :disabled="isEdit && formData.code === 'admin'"
          />
          <div
            v-if="isEdit && formData.code === 'admin'"
            style="color: #999; font-size: 12px; margin-top: 4px"
          >
            系统角色编码不可修改
          </div>
        </a-form-item>

        <a-form-item label="角色描述" name="description">
          <a-textarea v-model:value="formData.description" placeholder="请输入角色描述" :rows="3" />
        </a-form-item>

        <a-form-item label="排序" name="sort">
          <a-input-number
            v-model:value="formData.sort"
            placeholder="请输入排序值"
            :min="0"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="状态" name="status">
          <a-select v-model:value="formData.status" placeholder="请选择状态">
            <a-select-option value="active">正常</a-select-option>
            <a-select-option value="inactive">禁用</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import axios from 'axios'
import dayjs from 'dayjs'

const userStore = useUserStore()

// 创建 API 实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
})

// 请求拦截器 - 添加认证头
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

// 响应拦截器 - 处理响应
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

const loading = ref(false)
const roles = ref([])

// 模态框相关
const modalVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref()

// 表单数据
const formData = reactive({
  id: null,
  name: '',
  code: '',
  description: '',
  sort: 0,
  status: 'active',
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 50, message: '角色名称长度为2-50个字符', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { min: 2, max: 50, message: '角色编码长度为2-50个字符', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '角色编码只能包含字母、数字和下划线，且以字母开头',
      trigger: 'blur',
    },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const searchForm = reactive({
  search: '',
})

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

// 表格列配置
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '角色名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '角色编码',
    dataIndex: 'code',
    key: 'code',
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: '排序',
    dataIndex: 'sort',
    key: 'sort',
    width: 80,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
  },
]

// 获取角色列表
const fetchRoles = async () => {
  loading.value = true
  try {
    const response = await api.get('/roles', {
      params: {
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: searchForm.search,
      },
    })

    if (response.success) {
      roles.value = response.data.roles || response.data
      pagination.total = response.data.pagination?.total || response.data.length
    }
  } catch (error: any) {
    // 如果 API 调用失败，使用模拟数据
    console.warn('API call failed, using mock data:', error.message)
    const mockRoles = [
      {
        id: 1,
        name: '超级管理员',
        code: 'admin',
        description: '系统超级管理员，拥有所有权限',
        sort: 1,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: '普通用户',
        code: 'user',
        description: '普通用户角色',
        sort: 2,
        status: 'active',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
    ]

    roles.value = mockRoles
    pagination.total = mockRoles.length
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchRoles()
}

const resetSearch = () => {
  searchForm.search = ''
  pagination.current = 1
  fetchRoles()
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchRoles()
}

// 格式化时间
const formatTime = (time: string | Date) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 重置表单
const resetForm = () => {
  formData.id = null
  formData.name = ''
  formData.code = ''
  formData.description = ''
  formData.sort = 0
  formData.status = 'active'
}

// 显示新增模态框
const showAddModal = () => {
  isEdit.value = false
  resetForm()
  modalVisible.value = true
}

// 显示编辑模态框
const showEditModal = (record: any) => {
  isEdit.value = true
  formData.id = record.id
  formData.name = record.name
  formData.code = record.code
  formData.description = record.description
  formData.sort = record.sort
  formData.status = record.status
  modalVisible.value = true
}

// 取消模态框
const handleCancel = () => {
  modalVisible.value = false
  resetForm()
  formRef.value?.resetFields()
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitLoading.value = true

    const apiUrl = isEdit.value ? `/roles/${formData.id}` : '/roles'
    const method = isEdit.value ? 'put' : 'post'

    const response = await api[method](apiUrl, formData)

    if (response.success) {
      message.success(isEdit.value ? '更新成功' : '创建成功')
      modalVisible.value = false
      resetForm()
      fetchRoles()
    }
  } catch (error: any) {
    message.error(error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 切换角色状态
const toggleRoleStatus = async (record: any) => {
  try {
    // 保护系统角色
    if (record.code === 'admin') {
      message.warning('不能修改系统角色状态')
      return
    }

    const newStatus = record.status === 'active' ? 'inactive' : 'active'

    const response = await api.put(`/roles/${record.id}`, {
      ...record,
      status: newStatus,
    })

    if (response.success) {
      message.success(`角色已${newStatus === 'active' ? '启用' : '禁用'}`)
      fetchRoles()
    }
  } catch (error: any) {
    message.error(error.message || '操作失败')
  }
}

// 删除角色
const deleteRole = async (id: number) => {
  try {
    const response = await api.delete(`/roles/${id}`)

    if (response.success) {
      message.success('删除成功')
      fetchRoles()
    }
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  fetchRoles()
})
</script>

<style scoped>
.roles-page {
  padding: 24px;
}

.search-bar {
  margin-bottom: 16px;
}
</style>
