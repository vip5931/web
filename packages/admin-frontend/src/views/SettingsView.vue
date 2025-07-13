<template>
  <div class="settings-page">
    <div class="page-header">
      <h1>系统设置</h1>
    </div>
    
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="12">
        <a-card title="基本设置">
          <a-form
            :model="basicSettings"
            layout="vertical"
            @finish="saveBasicSettings"
          >
            <a-form-item label="系统名称">
              <a-input v-model:value="basicSettings.systemName" />
            </a-form-item>
            
            <a-form-item label="系统描述">
              <a-textarea 
                v-model:value="basicSettings.systemDescription"
                :rows="3"
              />
            </a-form-item>
            
            <a-form-item label="系统版本">
              <a-input v-model:value="basicSettings.systemVersion" />
            </a-form-item>
            
            <a-form-item>
              <a-button type="primary" html-type="submit">
                保存设置
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>
      
      <a-col :xs="24" :lg="12">
        <a-card title="安全设置">
          <a-form
            :model="securitySettings"
            layout="vertical"
            @finish="saveSecuritySettings"
          >
            <a-form-item label="密码最小长度">
              <a-input-number 
                v-model:value="securitySettings.minPasswordLength"
                :min="6"
                :max="20"
                style="width: 100%"
              />
            </a-form-item>
            
            <a-form-item label="登录失败锁定次数">
              <a-input-number 
                v-model:value="securitySettings.maxLoginAttempts"
                :min="3"
                :max="10"
                style="width: 100%"
              />
            </a-form-item>
            
            <a-form-item label="会话超时时间（小时）">
              <a-input-number 
                v-model:value="securitySettings.sessionTimeout"
                :min="1"
                :max="24"
                style="width: 100%"
              />
            </a-form-item>
            
            <a-form-item>
              <a-button type="primary" html-type="submit">
                保存设置
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>
    </a-row>
    
    <a-row :gutter="[16, 16]" style="margin-top: 16px">
      <a-col :span="24">
        <a-card title="系统信息">
          <a-descriptions :column="2" bordered>
            <a-descriptions-item label="系统版本">
              v1.0.0
            </a-descriptions-item>
            <a-descriptions-item label="Node.js 版本">
              {{ systemInfo.nodeVersion }}
            </a-descriptions-item>
            <a-descriptions-item label="数据库版本">
              MySQL 8.0
            </a-descriptions-item>
            <a-descriptions-item label="运行时间">
              {{ systemInfo.uptime }}
            </a-descriptions-item>
            <a-descriptions-item label="内存使用">
              {{ systemInfo.memoryUsage }}
            </a-descriptions-item>
            <a-descriptions-item label="CPU 使用率">
              {{ systemInfo.cpuUsage }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'

const basicSettings = reactive({
  systemName: '后台管理系统',
  systemDescription: '基于 Vue3 + Koa2 + MySQL 的现代化后台管理系统',
  systemVersion: 'v1.0.0'
})

const securitySettings = reactive({
  minPasswordLength: 6,
  maxLoginAttempts: 5,
  sessionTimeout: 24
})

const systemInfo = reactive({
  nodeVersion: 'v18.17.1',
  uptime: '7天 12小时 30分钟',
  memoryUsage: '256MB / 1GB',
  cpuUsage: '15%'
})

const saveBasicSettings = () => {
  message.success('基本设置保存成功')
}

const saveSecuritySettings = () => {
  message.success('安全设置保存成功')
}

onMounted(() => {
  // 这里可以调用 API 获取真实的系统信息
  console.log('Settings page mounted')
})
</script>

<style scoped>
.settings-page {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}
</style>
