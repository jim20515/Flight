<template>
  <form @submit.prevent="submit">
    <!-- 目的地（有自動完成） -->
    <div class="mb-3 relative">
      <label class="text-xs text-gray-500 mb-1 block">目的地</label>
      <input
        v-model="form.destination"
        type="text"
        placeholder="城市名稱（如 Tokyo、Bangkok）"
        autocomplete="off"
        class="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        required
        @input="onInput"
        @blur="hideDropdown"
        @focus="onFocus"
      />
      <!-- 搜尋中 spinner -->
      <div v-if="searching" class="absolute right-3 top-9">
        <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      <!-- 下拉建議 -->
      <div
        v-if="showDrop && suggestions.length"
        class="absolute z-50 w-full bg-white border border-gray-100 rounded-xl shadow-lg mt-1 overflow-hidden"
      >
        <button
          v-for="s in suggestions"
          :key="s.id"
          type="button"
          class="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
          @mousedown.prevent="selectSuggestion(s)"
        >
          <p class="text-sm font-semibold text-gray-800">{{ s.title }}</p>
          <p class="text-xs text-gray-400">{{ s.subtitle }} · {{ s.airports.join(' / ') }}</p>
        </button>
      </div>
    </div>

    <!-- 指定 / 彈性 切換 -->
    <div class="flex gap-2 mb-3">
      <button
        type="button"
        :class="['flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
          !flexMode ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500']"
        @click="flexMode = false"
      >指定日期</button>
      <button
        type="button"
        :class="['flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
          flexMode ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500']"
        @click="flexMode = true"
      >彈性日期</button>
    </div>

    <!-- 指定日期 -->
    <div v-if="!flexMode" class="grid grid-cols-2 gap-2 mb-3">
      <div>
        <label class="text-xs text-gray-500 mb-1 block">去程日期 <span class="text-gray-300">（選填）</span></label>
        <input
          v-model="form.date"
          type="date"
          :min="today"
          class="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1 block">回程日期 <span class="text-gray-300">（選填）</span></label>
        <input
          v-model="form.returnDate"
          type="date"
          :min="form.date || today"
          class="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <p v-if="dateError" class="col-span-2 text-xs text-red-400">{{ dateError }}</p>
    </div>

    <!-- 彈性日期 -->
    <div v-else class="mb-3">
      <label class="text-xs text-gray-500 mb-1 block">搜尋範圍</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="opt in flexOptions"
          :key="opt.value"
          type="button"
          :class="['py-2 rounded-xl text-xs font-semibold border transition-colors',
            form.flexRange === opt.value
              ? 'bg-primary text-white border-primary'
              : 'bg-gray-50 text-gray-600 border-gray-100']"
          @click="form.flexRange = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <!-- 乘客 -->
    <div class="mb-4">
      <label class="text-xs text-gray-500 mb-1 block">乘客人數</label>
      <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
        <button type="button" class="w-8 h-8 rounded-full bg-white shadow text-lg font-bold" @click="form.adults = Math.max(1, form.adults - 1)">−</button>
        <span class="flex-1 text-center text-sm font-semibold">{{ form.adults }} 位成人</span>
        <button type="button" class="w-8 h-8 rounded-full bg-white shadow text-lg font-bold" @click="form.adults = Math.min(9, form.adults + 1)">+</button>
      </div>
    </div>

    <button
      type="submit"
      class="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm active:opacity-80"
    >
      {{ flexMode ? '搜尋最便宜日期' : '搜尋機票' }}
    </button>

    <!-- API 額度顯示 -->
    <div v-if="quota.remaining !== null" class="mt-3 flex items-center justify-between px-1">
      <div class="flex items-center gap-2">
        <div class="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="quotaColor"
            :style="{ width: quotaPct + '%' }"
          ></div>
        </div>
        <span class="text-xs text-gray-400">剩餘額度 {{ quota.remaining }} / {{ quota.limit }}</span>
      </div>
      <span class="text-xs text-gray-300">{{ resetLabel }}</span>
    </div>
  </form>
</template>

<script setup>
const emit = defineEmits(['search'])

const today = new Date().toISOString().split('T')[0]
const flexMode = ref(false)
const dateError = ref('')
const suggestions = ref([])
const showDrop = ref(false)
const searching = ref(false)
const selectedId = ref('')
let debounceTimer = null

const flexOptions = [
  { label: '本月', value: 'this_month' },
  { label: '下個月', value: 'next_month' },
  { label: '未來 3 個月', value: '3_months' },
]

const form = reactive({
  destination: '',
  destinationId: '',
  date: '',
  returnDate: '',
  adults: 1,
  flexRange: 'next_month',
})

function onInput() {
  selectedId.value = ''
  form.destinationId = ''
  showDrop.value = false
  clearTimeout(debounceTimer)
  if (form.destination.length < 2) {
    suggestions.value = []
    return
  }
  debounceTimer = setTimeout(fetchSuggestions, 350)
}

async function fetchSuggestions() {
  searching.value = true
  try {
    const data = await $fetch('/api/airports', { params: { q: form.destination } })
    suggestions.value = data.results || []
    showDrop.value = suggestions.value.length > 0
  } finally {
    searching.value = false
  }
}

function selectSuggestion(s) {
  form.destination = s.title
  form.destinationId = s.id
  suggestions.value = []
  showDrop.value = false
}

function onFocus() {
  if (suggestions.value.length) showDrop.value = true
}

function hideDropdown() {
  setTimeout(() => { showDrop.value = false }, 150)
}

// 額度
const quota = ref({ limit: null, remaining: null, reset: null })

const quotaPct = computed(() => {
  if (!quota.value.limit) return 0
  return Math.round((quota.value.remaining / quota.value.limit) * 100)
})

const quotaColor = computed(() => {
  if (quotaPct.value > 50) return 'bg-green-400'
  if (quotaPct.value > 20) return 'bg-yellow-400'
  return 'bg-red-400'
})

const resetLabel = computed(() => {
  if (!quota.value.reset) return ''
  const days = Math.ceil(quota.value.reset / 86400)
  return `${days} 天後重置`
})

onMounted(async () => {
  try {
    quota.value = await $fetch('/api/quota')
  } catch {}
})

function submit() {
  dateError.value = ''
  if (!flexMode.value && !form.date && !form.returnDate) {
    dateError.value = '請至少填寫去程或回程日期'
    return
  }
  emit('search', { ...form, flexMode: flexMode.value })
}
</script>
