<template>
  <div>
    <!-- 省錢提示 -->
    <div v-if="cheaperCount > 0" class="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-4 flex items-center gap-3">
      <span class="text-2xl">✂️</span>
      <div>
        <p class="text-sm font-bold text-orange-700">找到 {{ cheaperCount }} 個比直飛更便宜的自拼方案</p>
        <p class="text-xs text-orange-500">自行轉機，行李需重新託運，請預留 3 小時以上轉機時間</p>
      </div>
    </div>

    <div v-if="combinations.length === 0" class="text-center py-8 text-gray-400 text-sm">
      沒有找到更便宜的自拼方案
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="combo in combinations"
        :key="combo.hub"
        :class="['bg-white rounded-2xl border overflow-hidden',
          combo.cheaper ? 'border-orange-200 shadow-md' : 'border-gray-100 shadow-sm']"
      >
        <!-- 省錢標籤 -->
        <div v-if="combo.cheaper" class="bg-orange-500 text-white text-xs font-semibold px-3 py-1 flex items-center justify-between">
          <span>✂️ 比直飛省 NT$ {{ formatPrice(combo.saving) }}</span>
          <span>自拼票</span>
        </div>
        <div v-else class="bg-gray-50 text-gray-400 text-xs px-3 py-1">
          自拼票
        </div>

        <div class="p-4">
          <!-- 總覽 -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ combo.hubFlag }}</span>
              <div>
                <p class="text-sm font-semibold text-gray-800">經由 {{ combo.hubName }} 中轉</p>
                <p class="text-xs text-gray-400">{{ formatDuration(combo.totalDuration) }} 總飛行時間</p>
              </div>
            </div>
            <div class="text-right">
              <p :class="['text-xl font-bold', combo.cheaper ? 'text-orange-500' : 'text-gray-800']">
                NT$ {{ formatPrice(combo.totalPrice) }}
              </p>
              <p class="text-xs text-gray-400">兩張票合計</p>
            </div>
          </div>

          <!-- 第一段 -->
          <div class="bg-gray-50 rounded-xl p-3 mb-2">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-semibold text-gray-500">第 1 段</span>
              <span class="text-xs text-gray-400">{{ combo.leg1.airline }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold">{{ combo.leg1.from }}</span>
              <span class="text-gray-300">→</span>
              <span class="text-sm font-bold">{{ combo.leg1.to }}</span>
              <span class="text-xs text-gray-400 ml-auto">{{ formatDuration(combo.leg1.duration) }}</span>
            </div>
            <p class="text-xs text-primary font-semibold mt-1">NT$ {{ formatPrice(combo.leg1.price) }}</p>
          </div>

          <!-- 第二段 -->
          <div class="bg-gray-50 rounded-xl p-3 mb-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-semibold text-gray-500">第 2 段</span>
              <span class="text-xs text-gray-400">{{ combo.leg2.airline }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold">{{ combo.leg2.from }}</span>
              <span class="text-gray-300">→</span>
              <span class="text-sm font-bold">{{ combo.leg2.to }}</span>
              <span class="text-xs text-gray-400 ml-auto">{{ formatDuration(combo.leg2.duration) }}</span>
            </div>
            <p class="text-xs text-primary font-semibold mt-1">NT$ {{ formatPrice(combo.leg2.price) }}</p>
          </div>

          <!-- 注意事項 -->
          <div class="text-xs text-gray-400 bg-yellow-50 rounded-lg px-3 py-2">
            ⚠️ 兩張獨立機票，若第一段誤點導致錯過第二段，航空公司不負責
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  combinations: { type: Array, required: true },
})

const cheaperCount = computed(() => props.combinations.filter(c => c.cheaper).length)

function formatPrice(p) {
  return Math.round(p).toLocaleString('zh-TW')
}

function formatDuration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
</script>
