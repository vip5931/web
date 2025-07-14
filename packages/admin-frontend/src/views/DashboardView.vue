<template>
  <div class="dashboard">
    <!-- 内容区域 -->
    <div class="dashboard-content">
      <a-empty description="仪表盘内容开发中..." />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
</script>

<style scoped>
.dashboard {
  padding: 0;
  background: transparent;
}

.dashboard-header {
  margin-bottom: 24px;
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.03),
    0 1px 6px -1px rgba(0, 0, 0, 0.02),
    0 2px 4px 0 rgba(0, 0, 0, 0.02);
}

.dashboard-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}

.dashboard-header p {
  margin: 0;
  color: #8c8c8c;
  font-size: 14px;
}

.dashboard-content {
  padding: 60px 0;
  text-align: center;
}
</style>
