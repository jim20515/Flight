<template>
  <div>
    <!-- 省錢提示 -->
    <div v-if="saving > 0" class="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4 flex items-center gap-3">
      <span class="text-2xl">💰</span>
      <div>
        <p class="text-sm font-bold text-green-700">換個地區買，最多省 NT$ {{ formatPrice(saving) }}</p>
        <p class="text-xs text-green-500">用 {{ cheapestRegion?.flag }} {{ cheapestRegion?.label }} 購買最便宜</p>
      </div>
    </div>

    <!-- 地區比價列表 -->
    <div class="space-y-2">
      <div
        v-for="(region, i) in regions"
        :key="region.code"
        :class="['bg-white rounded-2xl border overflow-hidden transition-all',
          region.code === cheapest ? 'border-green-300 shadow-md' : 'border-gray-100 shadow-sm']"
      >
        <!-- 最便宜標籤 -->
        <div v-if="region.code === cheapest" class="bg-green-500 text-white text-xs font-semibold px-3 py-1">
          🏆 最便宜
        </div>
        <!-- 台灣基準標籤 -->
        <div v-else-if="region.code === 'TW'" class="bg-gray-100 text-gray-500 text-xs px-3 py-1">
          台灣基準價
        </div>

        <div class="flex items-center justify-between px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="text-xl">{{ region.flag }}</span>
            <div>
              <p class="text-sm font-semibold text-gray-800">{{ region.label }}</p>
              <p class="text-xs text-gray-400">{{ region.airline }} · {{ region.duration }}</p>
            </div>
          </div>
          <div class="text-right">
            <p :class="['text-base font-bold', region.code === cheapest ? 'text-green-600' : 'text-gray-800']">
              NT$ {{ formatPrice(region.twdPrice) }}
            </p>
            <p class="text-xs text-gray-400">{{ region.localPrice.toLocaleString() }} {{ region.currency }}</p>
            <!-- 省了多少 -->
            <p v-if="baseline && region.twdPrice < baseline.twdPrice" class="text-xs text-green-500 font-semibold">
              省 NT$ {{ formatPrice(baseline.twdPrice - region.twdPrice) }}
            </p>
            <p v-else-if="baseline && region.twdPrice > baseline.twdPrice" class="text-xs text-red-400">
              貴 NT$ {{ formatPrice(region.twdPrice - baseline.twdPrice) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <p class="text-xs text-gray-400 text-center mt-3">匯率為近似值，實際以購票當下為準</p>
  </div>
</template>

<script setup>
const props = defineProps({
  regions: { type: Array, required: true },
  cheapest: { type: String, default: '' },
  saving: { type: Number, default: 0 },
})

const baseline = computed(() => props.regions.find(r => r.code === 'TW'))
const cheapestRegion = computed(() => props.regions.find(r => r.code === props.cheapest))

function formatPrice(p) {
  return Math.round(p).toLocaleString('zh-TW')
}
</script>
