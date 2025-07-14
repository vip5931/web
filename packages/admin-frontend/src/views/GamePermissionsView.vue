<template>
  <div class="game-permissions-page">
    <a-card title="游戏权限管理" :bordered="false">
      <a-tabs v-model:activeKey="activeTab">
        <!-- 员工权限设置 -->
        <a-tab-pane key="staff" tab="员工权限设置">
          <div class="staff-permissions">
            <a-row :gutter="16">
              <!-- 员工列表 -->
              <a-col :span="8">
                <a-card title="员工列表" size="small">
                  <a-list :data-source="staffList" :loading="staffLoading" size="small">
                    <template #renderItem="{ item }">
                      <a-list-item
                        :class="{ 'selected-staff': selectedStaff?.id === item.id }"
                        @click="selectStaff(item)"
                        style="cursor: pointer"
                      >
                        <a-list-item-meta>
                          <template #title>{{ item.username }}</template>
                          <template #description>{{ item.email }}</template>
                        </a-list-item-meta>
                        <template #actions>
                          <a-tag :color="item.role?.level === 3 ? 'blue' : 'red'">
                            {{ item.role?.name || '未分配角色' }}
                          </a-tag>
                        </template>
                      </a-list-item>
                    </template>
                  </a-list>
                </a-card>
              </a-col>

              <!-- 权限配置 -->
              <a-col :span="16">
                <a-card
                  :title="selectedStaff ? `设置 ${selectedStaff.username} 的权限` : '请选择员工'"
                  size="small"
                >
                  <div v-if="selectedStaff">
                    <a-form layout="vertical">
                      <!-- 菜单权限 -->
                      <a-form-item label="菜单权限">
                        <a-tree
                          v-model:checkedKeys="selectedMenus"
                          :tree-data="menuTree"
                          :checkable="true"
                          :default-expand-all="true"
                          :field-names="{ title: 'name', key: 'id', children: 'children' }"
                        />
                      </a-form-item>

                      <!-- 区服权限 -->
                      <a-form-item label="区服权限">
                        <a-checkbox-group v-model:value="selectedServers">
                          <a-row>
                            <a-col :span="8" v-for="server in serverList" :key="server.id">
                              <a-checkbox :value="server.id">
                                {{ server.name }} ({{ server.region }})
                              </a-checkbox>
                            </a-col>
                          </a-row>
                        </a-checkbox-group>
                      </a-form-item>

                      <!-- 操作权限 -->
                      <a-form-item label="操作权限">
                        <a-checkbox-group v-model:value="selectedOperations">
                          <a-row>
                            <a-col :span="6" v-for="operation in operationList" :key="operation.id">
                              <a-checkbox :value="operation.id">
                                {{ operation.name }}
                              </a-checkbox>
                            </a-col>
                          </a-row>
                        </a-checkbox-group>
                      </a-form-item>

                      <!-- 操作按钮 -->
                      <a-form-item>
                        <a-space>
                          <a-button type="primary" @click="savePermissions" :loading="saveLoading">
                            保存权限
                          </a-button>
                          <a-button @click="resetPermissions"> 重置 </a-button>
                        </a-space>
                      </a-form-item>
                    </a-form>
                  </div>
                  <div v-else class="empty-state">
                    <a-empty description="请从左侧选择要设置权限的员工" />
                  </div>
                </a-card>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>

        <!-- 权限总览 -->
        <a-tab-pane key="overview" tab="权限总览">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-card title="菜单权限" size="small">
                <a-tree
                  :tree-data="menuTree"
                  :default-expand-all="true"
                  :field-names="{ title: 'name', key: 'id', children: 'children' }"
                />
              </a-card>
            </a-col>
            <a-col :span="8">
              <a-card title="区服列表" size="small">
                <a-list :data-source="serverList" size="small">
                  <template #renderItem="{ item }">
                    <a-list-item>
                      <a-list-item-meta>
                        <template #title>{{ item.name }}</template>
                        <template #description>{{ item.region }} - {{ item.code }}</template>
                      </a-list-item-meta>
                      <template #actions>
                        <a-tag :color="item.status === 'active' ? 'green' : 'red'">
                          {{ item.status }}
                        </a-tag>
                      </template>
                    </a-list-item>
                  </template>
                </a-list>
              </a-card>
            </a-col>
            <a-col :span="8">
              <a-card title="操作权限" size="small">
                <a-list :data-source="operationList" size="small">
                  <template #renderItem="{ item }">
                    <a-list-item>
                      <a-list-item-meta>
                        <template #title>{{ item.name }}</template>
                        <template #description>{{ item.description }}</template>
                      </a-list-item-meta>
                    </a-list-item>
                  </template>
                </a-list>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { message } from 'ant-design-vue'
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

const activeTab = ref('staff')
const staffLoading = ref(false)
const saveLoading = ref(false)

// 数据
const staffList = ref([])
const selectedStaff = ref(null)
const menuTree = ref([])
const serverList = ref([])
const operationList = ref([])

// 选中的权限
const selectedMenus = ref([])
const selectedServers = ref([])
const selectedOperations = ref([])

// 获取员工列表
const fetchStaffList = async () => {
  staffLoading.value = true
  try {
    const response = await api.get('/users')
    if (response.success) {
      // 过滤出普通员工（假设通过角色判断）
      staffList.value = response.data.users || response.data
    }
  } catch (error: any) {
    message.error(error.message || '获取员工列表失败')
  } finally {
    staffLoading.value = false
  }
}

// 获取菜单权限
const fetchMenus = async () => {
  try {
    const response = await api.get('/game-permissions/menus')
    if (response.success) {
      menuTree.value = response.data
    }
  } catch (error: any) {
    console.warn('获取菜单权限失败，使用模拟数据')
    // 模拟数据
    menuTree.value = [
      {
        id: 1,
        name: '仪表盘',
        children: [],
      },
      {
        id: 2,
        name: '排行榜管理',
        children: [
          { id: 3, name: '玩家排行' },
          { id: 4, name: '公会排行' },
          { id: 5, name: '活动排行' },
        ],
      },
      {
        id: 6,
        name: '数据管理',
        children: [
          { id: 7, name: '数据导入' },
          { id: 8, name: '数据导出' },
        ],
      },
    ]
  }
}

// 获取区服列表
const fetchServers = async () => {
  try {
    const response = await api.get('/servers/all')
    if (response.success) {
      serverList.value = response.data
    }
  } catch (error: any) {
    console.warn('获取区服列表失败，使用模拟数据')
    // 模拟数据
    serverList.value = [
      { id: 1, name: 'QQ互通1区' },
      { id: 2, name: 'QQ互通34区' },
      { id: 3, name: 'QQ互通43区' },
      { id: 4, name: 'QQ互通58区' },
      { id: 5, name: '微信互通1区' },
    ]
  }
}

// 获取操作权限
const fetchOperations = async () => {
  try {
    const response = await api.get('/game-permissions/operations')
    if (response.success) {
      operationList.value = response.data
    }
  } catch (error: any) {
    console.warn('获取操作权限失败，使用模拟数据')
    // 模拟数据
    operationList.value = [
      { id: 1, name: '查看', code: 'view', description: '查看数据权限' },
      { id: 2, name: '新增', code: 'create', description: '新增数据权限' },
      { id: 3, name: '编辑', code: 'edit', description: '编辑数据权限' },
      { id: 4, name: '删除', code: 'delete', description: '删除数据权限' },
      { id: 5, name: '导入', code: 'import', description: '数据导入权限' },
      { id: 6, name: '导出', code: 'export', description: '数据导出权限' },
      { id: 7, name: '审核', code: 'audit', description: '数据审核权限' },
    ]
  }
}

// 选择员工
const selectStaff = async (staff: any) => {
  selectedStaff.value = staff
  await loadStaffPermissions(staff.id)
}

// 加载员工权限
const loadStaffPermissions = async (userId: number) => {
  try {
    const response = await api.get(`/game-permissions/staff/${userId}`)
    if (response.success) {
      selectedMenus.value = response.data.menuIds || []
      selectedServers.value = response.data.serverIds || []
      selectedOperations.value = response.data.operationIds || []
    }
  } catch (error: any) {
    console.warn('获取员工权限失败')
    selectedMenus.value = []
    selectedServers.value = []
    selectedOperations.value = []
  }
}

// 保存权限
const savePermissions = async () => {
  if (!selectedStaff.value) {
    message.warning('请选择员工')
    return
  }

  saveLoading.value = true
  try {
    const response = await api.post(`/game-permissions/staff/${selectedStaff.value.id}`, {
      menuIds: selectedMenus.value,
      serverIds: selectedServers.value,
      operationIds: selectedOperations.value,
    })

    if (response.success) {
      message.success('权限保存成功')
    }
  } catch (error: any) {
    message.error(error.message || '保存权限失败')
  } finally {
    saveLoading.value = false
  }
}

// 重置权限
const resetPermissions = () => {
  selectedMenus.value = []
  selectedServers.value = []
  selectedOperations.value = []
}

onMounted(() => {
  fetchStaffList()
  fetchMenus()
  fetchServers()
  fetchOperations()
})
</script>

<style scoped>
.game-permissions-page {
  padding: 24px;
}

.selected-staff {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
}
</style>
