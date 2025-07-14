<template>
  <div class="menu-management-page">
    <a-card title="菜单管理" :bordered="false">
      <!-- 操作栏 -->
      <div class="action-bar">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-button type="primary" @click="showCreateModal">
              <PlusOutlined />
              新增菜单
            </a-button>
          </a-col>
          <a-col :span="12" style="text-align: right">
            <a-button @click="fetchMenus">
              <ReloadOutlined />
              刷新
            </a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 菜单树表格 -->
      <a-table
        :columns="columns"
        :data-source="menuTree"
        :loading="loading"
        row-key="id"
        :pagination="false"
        :default-expand-all-rows="true"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a-typography-text strong>{{ record.name }}</a-typography-text>
          </template>
          <template v-else-if="column.key === 'code'">
            <a-tag color="blue">{{ record.code }}</a-tag>
          </template>
          <template v-else-if="column.key === 'path'">
            <a-typography-text code>{{ record.path || '-' }}</a-typography-text>
          </template>
          <template v-else-if="column.key === 'icon'">
            <a-tag v-if="record.icon" color="green">{{ record.icon }}</a-tag>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'sort'">
            <a-tag color="orange">{{ record.sort }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="showEditModal(record)">编辑</a-button>
              <a-button type="link" size="small" @click="showCreateModal(record)">添加子菜单</a-button>
              <a-popconfirm
                title="确定要删除这个菜单吗？"
                @confirm="deleteMenu(record.id)"
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

    <!-- 新增/编辑菜单弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑菜单' : (parentMenu ? `为 ${parentMenu.name} 添加子菜单` : '新增菜单')"
      @ok="handleSubmit"
      @cancel="resetForm"
      :confirm-loading="submitLoading"
      width="600px"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="菜单名称" name="name">
              <a-input v-model:value="formData.name" placeholder="请输入菜单名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="菜单编码" name="code">
              <a-input v-model:value="formData.code" placeholder="请输入菜单编码" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="路由路径" name="path">
              <a-input v-model:value="formData.path" placeholder="如：/users" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="组件路径" name="component">
              <a-input v-model:value="formData.component" placeholder="如：UsersView" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="图标" name="icon">
              <a-input v-model:value="formData.icon" placeholder="如：UserOutlined" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序" name="sort">
              <a-input-number 
                v-model:value="formData.sort" 
                placeholder="排序号"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item v-if="!parentMenu" label="父级菜单" name="parent_id">
          <a-tree-select
            v-model:value="formData.parent_id"
            :tree-data="parentMenuOptions"
            placeholder="选择父级菜单（可选）"
            allow-clear
            :field-names="{ label: 'name', value: 'id', children: 'children' }"
          />
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
  { title: '菜单名称', dataIndex: 'name', key: 'name', width: 200 },
  { title: '菜单编码', dataIndex: 'code', key: 'code', width: 150 },
  { title: '路由路径', dataIndex: 'path', key: 'path', width: 150 },
  { title: '组件', dataIndex: 'component', key: 'component', width: 150 },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 120, align: 'center' },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80, align: 'center' },
  { title: '操作', key: 'action', width: 250, align: 'center', fixed: 'right' },
]

// 响应式数据
const loading = ref(false)
const menuTree = ref([])
const parentMenuOptions = ref([])
const modalVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const parentMenu = ref(null)

// 表单数据
const formData = reactive({
  id: null,
  name: '',
  code: '',
  path: '',
  component: '',
  icon: '',
  parent_id: null,
  sort: 0,
})

// 表单验证规则
const formRules = {
  name: [{ required: true, message: '请输入菜单名称' }],
  code: [{ required: true, message: '请输入菜单编码' }],
}

const formRef = ref()

// 获取菜单列表
const fetchMenus = async () => {
  loading.value = true
  try {
    const response = await api.get('/menus/all')
    if (response.success) {
      menuTree.value = response.data
      // 构建父级菜单选项（排除当前编辑的菜单）
      parentMenuOptions.value = buildParentOptions(response.data)
    }
  } catch (error: any) {
    message.error(error.message || '获取菜单列表失败')
  } finally {
    loading.value = false
  }
}

// 构建父级菜单选项
const buildParentOptions = (menus: any[], excludeId?: number): any[] => {
  return menus
    .filter(menu => menu.id !== excludeId)
    .map(menu => ({
      id: menu.id,
      name: menu.name,
      children: buildParentOptions(menu.children || [], excludeId)
    }))
}

// 显示新增弹窗
const showCreateModal = (parent?: any) => {
  isEdit.value = false
  parentMenu.value = parent || null
  modalVisible.value = true
  resetForm()
  if (parent) {
    formData.parent_id = parent.id
  }
}

// 显示编辑弹窗
const showEditModal = (record: any) => {
  isEdit.value = true
  parentMenu.value = null
  modalVisible.value = true
  Object.assign(formData, {
    id: record.id,
    name: record.name,
    code: record.code,
    path: record.path,
    component: record.component,
    icon: record.icon,
    parent_id: record.parent_id,
    sort: record.sort,
  })
  // 重新构建父级菜单选项，排除当前菜单
  parentMenuOptions.value = buildParentOptions(menuTree.value, record.id)
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    id: null,
    name: '',
    code: '',
    path: '',
    component: '',
    icon: '',
    parent_id: null,
    sort: 0,
  })
  formRef.value?.resetFields()
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitLoading.value = true

    const apiUrl = isEdit.value ? `/menus/${formData.id}` : '/menus'
    const method = isEdit.value ? 'put' : 'post'

    const response = await api[method](apiUrl, formData)

    if (response.success) {
      message.success(isEdit.value ? '更新成功' : '创建成功')
      modalVisible.value = false
      resetForm()
      fetchMenus()
    }
  } catch (error: any) {
    message.error(error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 删除菜单
const deleteMenu = async (id: number) => {
  try {
    const response = await api.delete(`/menus/${id}`)

    if (response.success) {
      message.success('删除成功')
      fetchMenus()
    }
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  fetchMenus()
})
</script>

<style scoped>
.menu-management-page {
  padding: 24px;
}

.action-bar {
  margin-bottom: 16px;
}
</style>
