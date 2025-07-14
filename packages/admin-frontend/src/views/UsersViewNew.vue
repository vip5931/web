<template>
  <div class="users-page">
    <a-card title="用户管理" :bordered="false">
      <!-- 搜索和操作栏 -->
      <div class="search-bar">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-input
              v-model:value="searchForm.search"
              placeholder="搜索用户名或邮箱"
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
            <a-button type="primary" @click="showCreateModal">
              <PlusOutlined />
              新增用户
            </a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 用户表格 -->
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
            <a-tag v-if="record.role" :color="getRoleColor(record.role.level)">
              {{ record.role.name }}
            </a-tag>
            <a-tag v-else color="default">未分配角色</a-tag>
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
              <a-button type="link" size="small" @click="showEditModal(record)">编辑</a-button>
              <a-button type="link" size="small" @click="showRoleModal(record)">分配角色</a-button>
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
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
              <a-tag v-if="record.username === 'admin'" color="gold">系统管理员</a-tag>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑用户弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      @ok="handleSubmit"
      @cancel="resetForm"
      :confirm-loading="submitLoading"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="formData.username" placeholder="请输入用户名" />
        </a-form-item>
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="formData.email" placeholder="请输入邮箱" />
        </a-form-item>
        <a-form-item v-if="!isEdit" label="密码" name="password">
          <a-input-password v-model:value="formData.password" placeholder="请输入密码" />
        </a-form-item>
        <a-form-item label="角色" name="roleId">
          <a-select v-model:value="formData.roleId" placeholder="请选择角色" allow-clear>
            <a-select-option v-for="role in roleList" :key="role.id" :value="role.id">
              {{ role.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-select v-model:value="formData.status" placeholder="请选择状态">
            <a-select-option value="active">正常</a-select-option>
            <a-select-option value="inactive">禁用</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 角色分配弹窗 -->
    <a-modal
      v-model:open="roleModalVisible"
      title="分配角色"
      @ok="handleRoleSubmit"
      @cancel="resetRoleForm"
      :confirm-loading="roleSubmitLoading"
    >
      <a-form layout="vertical">
        <a-form-item label="用户">
          <a-input :value="selectedUser?.username" disabled />
        </a-form-item>
        <a-form-item label="当前角色">
          <a-tag v-if="selectedUser?.role" :color="getRoleColor(selectedUser.role.level)">
            {{ selectedUser.role.name }}
          </a-tag>
          <a-tag v-else color="default">未分配角色</a-tag>
        </a-form-item>
        <a-form-item label="新角色">
          <a-select v-model:value="selectedRoleId" placeholder="请选择角色" allow-clear>
            <a-select-option v-for="role in roleList" :key="role.id" :value="role.id">
              {{ role.name }}
            </a-select-option>
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
  { title: '头像', dataIndex: 'avatar', key: 'avatar', width: 80 },
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '角色', dataIndex: 'role', key: 'role' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '最后登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'action', width: 300 },
]

// 响应式数据
const loading = ref(false)
const users = ref([])
const roleList = ref([])
const modalVisible = ref(false)
const roleModalVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const roleSubmitLoading = ref(false)
const selectedUser = ref(null)
const selectedRoleId = ref(null)

// 搜索表单
const searchForm = reactive({
  search: '',
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
  username: '',
  email: '',
  password: '',
  roleId: null,
  status: 'active',
})

// 表单验证规则
const formRules = {
  username: [{ required: true, message: '请输入用户名' }],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入正确的邮箱格式' },
  ],
  password: [{ required: true, message: '请输入密码' }],
}

const formRef = ref()

// 获取角色颜色
const getRoleColor = (level: number) => {
  switch (level) {
    case 1: return 'red'    // 超级管理员
    case 2: return 'orange' // 管理员
    case 3: return 'blue'   // 普通员工
    default: return 'default'
  }
}

// 格式化时间
const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

// 获取用户列表
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
      users.value = response.data.users
      pagination.total = response.data.pagination.total
    }
  } catch (error: any) {
    message.error(error.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 获取角色列表
const fetchRoles = async () => {
  try {
    const response = await api.get('/user-roles/roles')
    if (response.success) {
      roleList.value = response.data
    }
  } catch (error: any) {
    console.warn('获取角色列表失败')
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  fetchUsers()
}

// 重置搜索
const resetSearch = () => {
  searchForm.search = ''
  pagination.current = 1
  fetchUsers()
}

// 表格变化处理
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchUsers()
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
    username: record.username,
    email: record.email,
    roleId: record.role?.id,
    status: record.status,
  })
}

// 显示角色分配弹窗
const showRoleModal = (record: any) => {
  selectedUser.value = record
  selectedRoleId.value = record.role?.id
  roleModalVisible.value = true
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    id: null,
    username: '',
    email: '',
    password: '',
    roleId: null,
    status: 'active',
  })
  formRef.value?.resetFields()
}

// 重置角色表单
const resetRoleForm = () => {
  selectedUser.value = null
  selectedRoleId.value = null
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

// 提交角色分配
const handleRoleSubmit = async () => {
  if (!selectedUser.value) return

  roleSubmitLoading.value = true
  try {
    const response = await api.post('/user-roles/assign', {
      userId: selectedUser.value.id,
      roleId: selectedRoleId.value,
    })

    if (response.success) {
      message.success('角色分配成功')
      roleModalVisible.value = false
      resetRoleForm()
      fetchUsers()
    }
  } catch (error: any) {
    message.error(error.message || '角色分配失败')
  } finally {
    roleSubmitLoading.value = false
  }
}

// 切换用户状态
const toggleUserStatus = async (record: any) => {
  try {
    const newStatus = record.status === 'active' ? 'inactive' : 'active'
    
    const response = await api.patch(`/users/${record.id}/status`, {
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
  padding: 24px;
}

.search-bar {
  margin-bottom: 16px;
}
</style>
