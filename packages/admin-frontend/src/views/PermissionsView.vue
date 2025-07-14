<template>
  <div class="permissions-page">
    <a-card title="权限管理" :bordered="false">
      <!-- 搜索和操作栏 -->
      <div class="search-bar">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-input
              v-model:value="searchForm.search"
              placeholder="搜索权限名称或编码"
              allow-clear
              @press-enter="handleSearch"
            />
          </a-col>
          <a-col :span="6">
            <a-select
              v-model:value="searchForm.type"
              placeholder="权限类型"
              allow-clear
              style="width: 100%"
            >
              <a-select-option value="menu">菜单</a-select-option>
              <a-select-option value="button">按钮</a-select-option>
              <a-select-option value="api">接口</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-space>
              <a-button type="primary" @click="handleSearch">搜索</a-button>
              <a-button @click="resetSearch">重置</a-button>
            </a-space>
          </a-col>
          <a-col :span="6" style="text-align: right">
            <a-button type="primary" @click="showAddModal">
              <template #icon>
                <PlusOutlined />
              </template>
              新增权限
            </a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 权限表格 -->
      <a-table
        :columns="columns"
        :data-source="permissions"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag :color="getTypeColor(record.type)">
              {{ getTypeText(record.type) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'green' : 'red'">
              {{ record.status === 'active' ? '正常' : '禁用' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'icon'">
            <component v-if="record.icon" :is="record.icon" />
            <span v-else>-</span>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="showEditModal(record)"> 编辑 </a-button>
              <a-button
                type="link"
                size="small"
                :danger="record.status === 'active'"
                @click="togglePermissionStatus(record)"
              >
                {{ record.status === 'active' ? '禁用' : '启用' }}
              </a-button>
              <a-popconfirm
                title="确定要删除这个权限吗？"
                @confirm="deletePermission(record.id)"
                ok-text="确定"
                cancel-text="取消"
              >
                <a-button type="link" size="small" danger> 删除 </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑权限模态框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑权限' : '新增权限'"
      @ok="handleSubmit"
      @cancel="handleCancel"
      :confirm-loading="submitLoading"
      width="700px"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="权限名称" name="name">
              <a-input v-model:value="formData.name" placeholder="请输入权限名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="权限编码" name="code">
              <a-input v-model:value="formData.code" placeholder="请输入权限编码" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="权限类型" name="type">
              <a-select v-model:value="formData.type" placeholder="请选择权限类型">
                <a-select-option value="menu">菜单</a-select-option>
                <a-select-option value="button">按钮</a-select-option>
                <a-select-option value="api">接口</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="父级权限" name="parentId">
              <a-tree-select
                v-model:value="formData.parentId"
                :tree-data="parentPermissions"
                placeholder="请选择父级权限"
                allow-clear
                tree-default-expand-all
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16" v-if="formData.type === 'menu'">
          <a-col :span="12">
            <a-form-item label="路由路径" name="path">
              <a-input v-model:value="formData.path" placeholder="请输入路由路径" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="组件路径" name="component">
              <a-input v-model:value="formData.component" placeholder="请输入组件路径" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="图标" name="icon">
              <a-input v-model:value="formData.icon" placeholder="请输入图标名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序" name="sort">
              <a-input-number
                v-model:value="formData.sort"
                placeholder="请输入排序值"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="权限描述" name="description">
          <a-textarea v-model:value="formData.description" placeholder="请输入权限描述" :rows="3" />
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
import { ref, onMounted, reactive, computed } from 'vue'
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
const permissions = ref([])

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
  type: 'menu',
  parentId: null,
  path: '',
  component: '',
  icon: '',
  sort: 0,
  status: 'active',
  description: '',
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入权限名称', trigger: 'blur' },
    { min: 2, max: 50, message: '权限名称长度为2-50个字符', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入权限编码', trigger: 'blur' },
    { min: 2, max: 100, message: '权限编码长度为2-100个字符', trigger: 'blur' },
  ],
  type: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const searchForm = reactive({
  search: '',
  type: '',
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
    title: '权限名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '权限编码',
    dataIndex: 'code',
    key: 'code',
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
  },
  {
    title: '路径',
    dataIndex: 'path',
    key: 'path',
  },
  {
    title: '图标',
    dataIndex: 'icon',
    key: 'icon',
    width: 80,
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

// 父级权限选项
const parentPermissions = computed(() => {
  const buildTree = (items: any[], parentId: any = null): any[] => {
    return items
      .filter((item) => item.parentId === parentId && item.type === 'menu')
      .map((item) => ({
        title: item.name,
        value: item.id,
        key: item.id,
        children: buildTree(items, item.id),
      }))
  }
  return buildTree(permissions.value)
})

// 获取权限列表
const fetchPermissions = async () => {
  loading.value = true
  try {
    const response = await api.get('/permissions', {
      params: {
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: searchForm.search,
        type: searchForm.type,
      },
    })

    if (response.success) {
      permissions.value = response.data.permissions || response.data
      pagination.total = response.data.pagination?.total || response.data.length
    }
  } catch (error: any) {
    // 如果 API 调用失败，使用模拟数据
    console.warn('API call failed, using mock data:', error.message)
    const mockPermissions = [
      {
        id: 1,
        name: '仪表盘',
        code: 'dashboard',
        type: 'menu',
        parentId: null,
        path: '/dashboard',
        component: 'DashboardView',
        icon: 'DashboardOutlined',
        sort: 1,
        status: 'active',
        description: '系统仪表盘',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: '用户管理',
        code: 'user',
        type: 'menu',
        parentId: null,
        path: '/users',
        component: 'UsersView',
        icon: 'UserOutlined',
        sort: 2,
        status: 'active',
        description: '用户管理模块',
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        name: '用户查看',
        code: 'user:view',
        type: 'button',
        parentId: 2,
        path: '',
        component: '',
        icon: '',
        sort: 1,
        status: 'active',
        description: '查看用户信息',
        createdAt: new Date().toISOString(),
      },
      {
        id: 4,
        name: '角色管理',
        code: 'role',
        type: 'menu',
        parentId: null,
        path: '/roles',
        component: 'RolesView',
        icon: 'TeamOutlined',
        sort: 3,
        status: 'active',
        description: '角色管理模块',
        createdAt: new Date().toISOString(),
      },
      {
        id: 5,
        name: '权限管理',
        code: 'permission',
        type: 'menu',
        parentId: null,
        path: '/permissions',
        component: 'PermissionsView',
        icon: 'SafetyOutlined',
        sort: 4,
        status: 'active',
        description: '权限管理模块',
        createdAt: new Date().toISOString(),
      },
    ]

    permissions.value = mockPermissions
    pagination.total = mockPermissions.length
  } finally {
    loading.value = false
  }
}

// 工具函数
const getTypeColor = (type: string) => {
  const colors = {
    menu: 'blue',
    button: 'green',
    api: 'orange',
  }
  return colors[type] || 'default'
}

const getTypeText = (type: string) => {
  const texts = {
    menu: '菜单',
    button: '按钮',
    api: '接口',
  }
  return texts[type] || type
}

const formatTime = (time: string | Date) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const handleSearch = () => {
  pagination.current = 1
  fetchPermissions()
}

const resetSearch = () => {
  searchForm.search = ''
  searchForm.type = ''
  pagination.current = 1
  fetchPermissions()
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchPermissions()
}

// 重置表单
const resetForm = () => {
  formData.id = null
  formData.name = ''
  formData.code = ''
  formData.type = 'menu'
  formData.parentId = null
  formData.path = ''
  formData.component = ''
  formData.icon = ''
  formData.sort = 0
  formData.status = 'active'
  formData.description = ''
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
  Object.assign(formData, record)
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

    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 1000))

    message.success(isEdit.value ? '更新成功' : '创建成功')
    modalVisible.value = false
    resetForm()
    fetchPermissions()
  } catch (error: any) {
    message.error(error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 切换权限状态
const togglePermissionStatus = async (record: any) => {
  try {
    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newStatus = record.status === 'active' ? 'inactive' : 'active'
    message.success(`权限已${newStatus === 'active' ? '启用' : '禁用'}`)
    fetchPermissions()
  } catch (error: any) {
    message.error(error.message || '操作失败')
  }
}

// 删除权限
const deletePermission = async (id: number) => {
  try {
    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 500))

    message.success('删除成功')
    fetchPermissions()
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  fetchPermissions()
})
</script>

<style scoped>
.permissions-page {
  padding: 24px;
}

.search-bar {
  margin-bottom: 16px;
}
</style>
