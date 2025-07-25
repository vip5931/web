<template>
  <div class="users-page">
    <div class="page-header">
      <h1>用户管理</h1>
      <a-button type="primary" @click="showAddModal">
        <PlusOutlined />
        添加用户
      </a-button>
    </div>

    <!-- 搜索和筛选 -->
    <a-card class="search-card">
      <a-form layout="inline" :model="searchForm" @finish="handleSearch">
        <a-form-item label="搜索">
          <a-input
            v-model:value="searchForm.search"
            placeholder="用户名或邮箱"
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">搜索</a-button>
          <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 用户表格 -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="users"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'avatar'">
            <a-avatar :size="40" :src="record.avatar">
              {{ record.username.charAt(0).toUpperCase() }}
            </a-avatar>
          </template>
          <template v-else-if="column.key === 'role'">
            <a-tag :color="record.role === 'admin' ? 'red' : 'blue'">
              {{ record.role === 'admin' ? '管理员' : '普通用户' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'green' : 'default'">
              {{ record.status === 'active' ? '正常' : '禁用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'lastLoginAt'">
            {{ record.lastLoginAt ? formatTime(record.lastLoginAt) : '从未登录' }}
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="showEditModal(record)"> 编辑 </a-button>
              <a-button
                v-if="record.username !== 'admin'"
                type="link"
                size="small"
                :danger="record.status === 'active'"
                @click="toggleUserStatus(record)"
              >
                {{ record.status === 'active' ? '禁用' : '启用' }}
              </a-button>
              <a-popconfirm
                v-if="record.username !== 'admin'"
                title="确定要删除这个用户吗？"
                @confirm="deleteUser(record.id)"
                ok-text="确定"
                cancel-text="取消"
              >
                <a-button type="link" size="small" danger> 删除 </a-button>
              </a-popconfirm>
              <a-tag v-if="record.username === 'admin'" color="gold"> 系统管理员 </a-tag>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑用户模态框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      @ok="handleSubmit"
      @cancel="handleCancel"
      :confirm-loading="submitLoading"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item label="用户名" name="username">
          <a-input
            v-model:value="formData.username"
            placeholder="请输入用户名"
            :disabled="isEdit && formData.username === 'admin'"
          />
          <div
            v-if="isEdit && formData.username === 'admin'"
            style="color: #999; font-size: 12px; margin-top: 4px"
          >
            管理员用户名不可修改
          </div>
        </a-form-item>

        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="formData.email" placeholder="请输入邮箱" />
        </a-form-item>

        <a-form-item v-if="!isEdit" label="密码" name="password">
          <a-input-password v-model:value="formData.password" placeholder="请输入密码" />
        </a-form-item>

        <a-form-item label="角色" name="roleIds">
          <a-select
            v-model:value="formData.roleIds"
            mode="multiple"
            placeholder="请选择角色"
            :disabled="isEdit && formData.username === 'admin'"
            :options="roleOptions"
          />
          <div
            v-if="isEdit && formData.username === 'admin'"
            style="color: #999; font-size: 12px; margin-top: 4px"
          >
            管理员角色不可修改
          </div>
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
const users = ref([])

// 模态框相关
const modalVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref()

// 表单数据
const formData = reactive({
  id: null,
  username: '',
  email: '',
  password: '',
  status: 'active',
  roleIds: [],
})

// 角色选项
const roleOptions = ref([])

// 表单验证规则
const formRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6个字符', trigger: 'blur' },
  ],

  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const searchForm = reactive({
  search: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
})

const columns = [
  {
    title: '头像',
    dataIndex: 'avatar',
    key: 'avatar',
    width: 80,
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
  },
  {
    title: '最后登录',
    dataIndex: 'lastLoginAt',
    key: 'lastLoginAt',
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
  },
]

// 获取角色列表
const fetchRoles = async () => {
  try {
    const response = await api.get('/roles')
    if (response.success) {
      roleOptions.value =
        response.data.roles?.map((role: any) => ({
          label: role.name,
          value: role.id,
        })) || []
    }
  } catch (error) {
    // 使用模拟数据
    roleOptions.value = [
      { label: '超级管理员', value: 1 },
      { label: '普通用户', value: 2 },
    ]
  }
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await api.get('/users', {
      params: {
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: searchForm.search,
      },
    })

    if (response.success) {
      users.value = response.data.users || response.data
      pagination.total = response.data.pagination?.total || response.data.length
    }
  } catch (error: any) {
    message.error(error.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchUsers()
}

const resetSearch = () => {
  searchForm.search = ''
  pagination.current = 1
  fetchUsers()
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchUsers()
}

// 格式化时间
const formatTime = (time: string | Date) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 重置表单
const resetForm = () => {
  formData.id = null
  formData.username = ''
  formData.email = ''
  formData.password = ''
  formData.status = 'active'
  formData.roleIds = []
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
  formData.username = record.username
  formData.email = record.email
  formData.status = record.status
  formData.roleIds = record.roles?.map((role: any) => role.id) || []
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

    const apiUrl = isEdit.value ? `/users/${formData.id}` : '/users'
    const method = isEdit.value ? 'put' : 'post'

    const response = await api[method](apiUrl, formData)

    if (response.success) {
      message.success(isEdit.value ? '更新成功' : '创建成功')
      modalVisible.value = false
      resetForm()
      fetchUsers()
    }
  } catch (error: any) {
    message.error(error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 切换用户状态
const toggleUserStatus = async (record: any) => {
  try {
    // 保护管理员账户
    if (record.username === 'admin') {
      message.warning('不能修改管理员账户状态')
      return
    }

    const newStatus = record.status === 'active' ? 'inactive' : 'active'

    const response = await api.put(`/users/${record.id}`, {
      ...record,
      status: newStatus,
    })

    if (response.success) {
      message.success(`用户已${newStatus === 'active' ? '启用' : '禁用'}`)
      fetchUsers()
    }
  } catch (error: any) {
    message.error(error.message || '操作失败')
  }
}

// 删除用户
const deleteUser = async (id: number) => {
  try {
    const response = await api.delete(`/users/${id}`)

    if (response.success) {
      message.success('删除成功')
      fetchUsers()
    }
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  fetchUsers()
  fetchRoles()
})
</script>

<style scoped>
.users-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}

.search-card {
  margin-bottom: 16px;
}
</style>
