<template>
  <div>
    <div class="bg-primary text-white px-4 pt-12 pb-8">
      <h1 class="text-2xl font-bold mb-1">机票比价</h1>
      <p class="text-blue-100 text-sm">台湾出发，找最便宜的机票</p>
    </div>

    <div class="bg-white mx-4 -mt-4 rounded-2xl shadow-lg p-4 mb-4">
      <SearchForm @search="handleSearch" />
    </div>

    <div class="px-4 pb-8">
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p class="text-gray-500 text-sm">{{ loadingText }}</p>
      </div>

      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-500">{{ error }}</p>
      </div>

      <div v-else-if="calendarDays.length > 0">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-semibold text-gray-700">{{ calendarTitle }}</p>
          <p class="text-xs text-gray-400">点日期搜寻航班</p>
        </div>
        <PriceCalendar :days="calendarDays" @select="handleCalendarSelect" />
      </div>

      <div v-else-if="hasResults">
        <div class="flex gap-1 mb-4">
          <button
            data-tab="flights"
            :class="['flex-1 py-2 rounded-xl text-xs font-semibold transition-colors', activeTab === 'flights' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500']"
            @click="activeTab = 'flights'"
          >航班列表</button>
          <button
            data-tab="regions"
            :class="['flex-1 py-2 rounded-xl text-xs font-semibold transition-colors', activeTab === 'regions' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500']"
            @click="switchToRegions"
          >换地区比价</button>
          <button
            data-tab="selftransfer"
            :class="['flex-1 py-2 rounded-xl text-xs font-semibold transition-colors', activeTab === 'selftransfer' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500']"
            @click="switchToSelfTransfer"
          >自拼票</button>
        </div>

        <div v-if="activeTab === 'flights'">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-gray-500">找到 {{ results.length }} 笔结果</p>
            <select v-model="sortBy" class="text-sm border rounded-lg px-2 py-1">
              <option value="price">价格最低</option>
              <option value="duration">飞行最短</option>
            </select>
          </div>
          <FlightCard v-for="(flight, i) in sortedResults" :key="i" :flight="flight" class="mb-3" />
        </div>

        <div v-else-if="activeTab === 'regions'">
          <div v-if="regionLoading" class="text-center py-8">
            <div class="inline-block w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
            <p class="text-gray-400 text-sm">扫描 7 个地区价格中...</p>
          </div>
          <RegionCompare
            v-else-if="regionData.regions && regionData.regions.length"
            :regions="regionData.regions"
            :cheapest="regionData.cheapest"
            :saving="regionData.saving"
          />
        </div>

        <div v-else-if="activeTab === 'selftransfer'">
          <div v-if="stLoading" class="text-center py-8">
            <div class="inline-block w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
            <p class="text-gray-400 text-sm">搜寻中转组合中...</p>
          </div>
          <SelfTransfer v-else :combinations="stCombinations" />
        </div>
      </div>

      <div v-else-if="searched" class="text-center py-12">
        <p class="text-gray-400">没有找到符合的航班，请尝试调整日期</p>
      </div>

      <div v-else>
        <h2 class="text-base font-semibold text-gray-700 mb-3">热门路线</h2>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="route in popularRoutes"
            :key="route.code"
            class="bg-white rounded-xl p-3 shadow-sm text-left border border-gray-100 active:bg-gray-50"
            @click="quickSearch(route)"
          >
            <p class="text-2xl mb-1">{{ route.flag }}</p>
            <p class="font-semibold text-gray-800 text-sm">{{ route.name }}</p>
            <p class="text-xs text-gray-400">{{ route.enName }}</p>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const loading = ref(false)
const loadingText = ref('搜寻中，请稍候...')
const error = ref('')
const results = ref([])
const calendarDays = ref([])
const calendarTitle = ref('')
const searched = ref(false)
const sortBy = ref('price')
const activeTab = ref('flights')
const regionLoading = ref(false)
const regionData = ref({ regions: [], cheapest: '', saving: 0 })
const stLoading = ref(false)
const stCombinations = ref([])
const lastQuery = ref(null)

const hasResults = computed(() => results.value.length > 0 || (regionData.value.regions && regionData.value.regions.length > 0))

const popularRoutes = [
  { name: '東京', enName: 'Tokyo', code: 'TYO', flag: '🇯🇵' },
  { name: '大阪', enName: 'Osaka', code: 'OSA', flag: '🇯🇵' },
  { name: '首爾', enName: 'Seoul', code: 'SEL', flag: '🇰🇷' },
  { name: '曼谷', enName: 'Bangkok', code: 'BKK', flag: '🇹🇭' },
  { name: '新加坡', enName: 'Singapore', code: 'SIN', flag: '🇸🇬' },
  { name: '香港', enName: 'Hong Kong', code: 'HKG', flag: '🇭🇰' },
]

const sortedResults = computed(() => {
  return [...results.value].sort((a, b) => {
    if (sortBy.value === 'price') return a.price - b.price
    return a.duration - b.duration
  })
})

async function handleSearch(query) {
  activeTab.value = 'flights'
  regionData.value = { regions: [], cheapest: '', saving: 0 }
  stCombinations.value = []
  lastQuery.value = query
  if (query.flexMode) {
    await doFlexSearch(query)
  } else {
    await doSearch(query)
  }
}

async function quickSearch(route) {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  const dateStr = d.toISOString().split('T')[0]
  await handleSearch({ destination: route.enName, destinationId: '', date: dateStr, adults: 1 })
}

async function doSearch(query) {
  loading.value = true
  loadingText.value = '搜寻中，请稍候...'
  error.value = ''
  results.value = []
  calendarDays.value = []
  searched.value = true

  try {
    const data = await $fetch('/api/flights', { params: query })
    results.value = data.flights || []
  } catch (e) {
    error.value = '搜寻失败，请稍后再试'
  } finally {
    loading.value = false
  }
}

async function switchToRegions() {
  activeTab.value = 'regions'
  if ((regionData.value.regions && regionData.value.regions.length) || !lastQuery.value) return
  await doRegionSearch(lastQuery.value)
}

async function doRegionSearch(query) {
  if (!query.destinationId && !query.destination) return
  regionLoading.value = true
  try {
    const data = await $fetch('/api/flights/regions', {
      params: {
        destinationId: query.destinationId || query.destination,
        date: query.date,
        returnDate: query.returnDate,
        adults: query.adults || 1,
      },
    })
    regionData.value = data
  } catch (e) {
    // silent fail
  } finally {
    regionLoading.value = false
  }
}

async function switchToSelfTransfer() {
  activeTab.value = 'selftransfer'
  if (stCombinations.value.length || !lastQuery.value) return
  await doSelfTransferSearch(lastQuery.value)
}

async function doSelfTransferSearch(query) {
  if (!query.destinationId && !query.destination) return
  stLoading.value = true
  try {
    const directPrice = results.value.length > 0
      ? Math.min(...results.value.map((f) => f.price))
      : 0
    const data = await $fetch('/api/flights/selftransfer', {
      params: {
        destinationId: query.destinationId || query.destination,
        date: query.date,
        adults: query.adults || 1,
        directPrice,
      },
    })
    stCombinations.value = data.combinations || []
  } catch {
    stCombinations.value = []
  } finally {
    stLoading.value = false
  }
}

async function doFlexSearch(query) {
  loading.value = true
  loadingText.value = '正在扫描最便宜日期...'
  error.value = ''
  results.value = []
  calendarDays.value = []
  searched.value = true

  try {
    const dates = getDateRange(query.flexRange)
    calendarTitle.value = query.destination + ' 价格日历（' + dates.length + ' 天）'
    const data = await $fetch('/api/flights/calendar', {
      params: { destination: query.destination, dates: dates.join(','), adults: query.adults },
    })
    calendarDays.value = data.days || []
  } catch (e) {
    error.value = '搜寻失败，请稍后再试'
  } finally {
    loading.value = false
  }
}

function getDateRange(range) {
  const dates = []
  const start = new Date()
  start.setDate(start.getDate() + 1)
  const days = range === 'this_month'
    ? Math.ceil((new Date(start.getFullYear(), start.getMonth() + 1, 0) - start) / 86400000)
    : range === '3_months' ? 90 : 30
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

async function handleCalendarSelect(day) {
  await doSearch({ destination: day.destination, date: day.date, adults: 1 })
}
</script>
