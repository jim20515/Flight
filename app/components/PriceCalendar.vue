<template>
  <div>
    <!-- 價格統計 -->
    <div class="grid grid-cols-3 gap-2 mb-4">
      <div class="bg-green-50 rounded-xl p-2 text-center">
        <p class="text-xs text-gray-400 mb-0.5">最低價</p>
        <p class="text-sm font-bold text-green-600">NT$ {{ formatPrice(minPrice) }}</p>
      </div>
      <div class="bg-blue-50 rounded-xl p-2 text-center">
        <p class="text-xs text-gray-400 mb-0.5">平均價</p>
        <p class="text-sm font-bold text-blue-600">NT$ {{ formatPrice(avgPrice) }}</p>
      </div>
      <div class="bg-orange-50 rounded-xl p-2 text-center">
        <p class="text-xs text-gray-400 mb-0.5">最高價</p>
        <p class="text-sm font-bold text-orange-500">NT$ {{ formatPrice(maxPrice) }}</p>
      </div>
    </div>

    <!-- 日期列表 -->
    <div class="space-y-2">
      <button
        v-for="day in sortedDays"
        :key="day.date"
        class="w-full flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 active:bg-gray-50"
        @click="$emit('select', day)"
      >
        <div class="text-left">
          <p class="text-sm font-semibold text-gray-800">{{ formatDate(day.date) }}</p>
          <p class="text-xs text-gray-400">{{ day.airline }}</p>
        </div>
        <div class="text-right">
          <p
            :class="['text-base font-bold',
              day.price === minPrice ? 'text-green-600' : 'text-primary']"
          >NT$ {{ formatPrice(day.price) }}</p>
          <p v-if="day.price === minPrice" class="text-xs text-green-500">最便宜</p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  days: { type: Array, required: true },
})
defineEmits(['select'])

const sortedDays = computed(() => [...props.days].sort((a, b) => a.price - b.price))
const minPrice = computed(() => Math.min(...props.days.map(d => d.price)))
const maxPrice = computed(() => Math.max(...props.days.map(d => d.price)))
const avgPrice = computed(() => Math.round(props.days.reduce((s, d) => s + d.price, 0) / props.days.length))

function formatPrice(p) {
  return Math.round(p).toLocaleString('zh-TW')
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`
}
</script>
