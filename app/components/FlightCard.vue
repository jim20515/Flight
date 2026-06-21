<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <!-- 標籤 -->
    <div v-if="flight.tag" class="bg-accent text-white text-xs font-semibold px-3 py-1">
      {{ flight.tag }}
    </div>

    <div class="p-4">
      <!-- 航班資訊 -->
      <div class="flex items-center justify-between mb-3">
        <div class="text-center">
          <p class="text-xl font-bold text-gray-800">{{ flight.origin }}</p>
          <p class="text-xs text-gray-400">{{ flight.departTime }}</p>
        </div>

        <div class="flex-1 mx-3 text-center">
          <p class="text-xs text-gray-400 mb-1">{{ formatDuration(flight.duration) }}</p>
          <div class="flex items-center gap-1">
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="text-gray-400 text-xs">✈</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>
          <p class="text-xs text-gray-400 mt-1">
            {{ flight.stops === 0 ? '直飛' : `${flight.stops} 次轉機` }}
          </p>
        </div>

        <div class="text-center">
          <p class="text-xl font-bold text-gray-800">{{ flight.destination }}</p>
          <p class="text-xs text-gray-400">{{ flight.arriveTime }}</p>
        </div>
      </div>

      <!-- 航空公司 -->
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xs text-gray-400">{{ flight.airlines?.join(' + ') || flight.airline }}</span>
        <span v-if="flight.isSelfTransfer" class="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">自拼票</span>
      </div>

      <!-- 價格與購買 -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400">每人</p>
          <p class="text-2xl font-bold text-primary">
            NT$ {{ formatPrice(flight.price) }}
          </p>
        </div>
        <a
          :href="flight.bookingUrl"
          target="_blank"
          rel="noopener"
          class="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:opacity-80"
        >
          搶購
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  flight: { type: Object, required: true },
})

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

function formatPrice(price) {
  return Math.round(price).toLocaleString('zh-TW')
}
</script>
