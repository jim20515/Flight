const RAPID_HOST = 'google-flights2.p.rapidapi.com'

function getHeaders(apiKey: string) {
  return {
    'x-rapidapi-host': RAPID_HOST,
    'x-rapidapi-key': apiKey,
  }
}

// 若輸入是城市名稱（非 2-3 字母代碼），先查機場 ID
async function resolveDestId(dest: string, apiKey: string): Promise<string> {
  const isCode = /^[A-Z]{2,3}$/.test(dest.toUpperCase())
  if (isCode) return dest.toUpperCase()

  const data = await $fetch<any>(
    `https://${RAPID_HOST}/api/v1/searchAirport?query=${encodeURIComponent(dest)}&language_code=en-US`,
    { headers: getHeaders(apiKey) }
  )
  // 優先用 city-level id（如 /m/07dfk），若沒有就用第一個機場代碼
  const first = data?.data?.[0]
  if (!first) throw createError({ statusCode: 400, message: `找不到目的地：${dest}` })
  // 優先用城市層級 id（/m/xxxxx），搜尋範圍更廣
  return first.id || first.list?.[0]?.id
}

function parseItineraries(data: any) {
  const its = data?.data?.itineraries || {}
  return [...(its.topFlights || []), ...(its.otherFlights || [])]
}

function toFlight(item: any, isReturn = false) {
  const leg = item.flights?.[0]
  const lastLeg = item.flights?.[item.flights.length - 1]
  const price = item.price || 0

  let tag = ''
  if (price < 4000) tag = '💥 破盤價'
  else if (price < 7000) tag = '🔥 超值'

  const depCode = leg?.departure_airport?.airport_code || ''
  const arrCode = lastLeg?.arrival_airport?.airport_code || ''
  const depTime = leg?.departure_airport?.time?.slice(-5) || ''
  const arrTime = lastLeg?.arrival_airport?.time?.slice(-5) || ''

  return {
    origin: isReturn ? arrCode : depCode,
    destination: isReturn ? depCode : arrCode,
    departTime: depTime,
    arriveTime: arrTime,
    duration: item.duration?.raw || 0,
    stops: item.stops || 0,
    airline: item.flights?.map((f: any) => f.airline).filter(Boolean).join(' + ') || '',
    price,
    isSelfTransfer: item.self_transfer || false,
    tag,
    bookingUrl: `https://www.google.com/travel/flights/search?q=Flights+from+${depCode}+to+${arrCode}`,
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event) as Record<string, string>
  const { destination, date, returnDate, adults = '1' } = query

  if (!destination || (!date && !returnDate)) {
    throw createError({ statusCode: 400, message: '請填寫目的地和至少一個日期' })
  }

  const apiKey = config.rapidApiKey as string
  const { destinationId } = query
  const destId = destinationId ? String(destinationId) : await resolveDestId(destination, apiKey)
  const flights: any[] = []

  // 去程搜尋
  if (date) {
    const params = new URLSearchParams({
      departure_id: 'TPE',
      arrival_id: destId,
      travel_class: 'ECONOMY',
      adults,
      show_hidden: '1',
      currency: 'TWD',
      language_code: 'zh-TW',
      country_code: 'TW',
      search_type: 'best',
      outbound_date: date,
    })
    if (returnDate) params.set('return_date', returnDate)

    const data = await $fetch<any>(
      `https://${RAPID_HOST}/api/v1/searchFlights?${params}`,
      { headers: getHeaders(apiKey) }
    )
    parseItineraries(data).forEach(item => flights.push(toFlight(item)))
  }

  // 只填回程：搜尋從目的地回台灣
  if (!date && returnDate) {
    const params = new URLSearchParams({
      departure_id: destUpper,
      arrival_id: 'TPE',
      travel_class: 'ECONOMY',
      adults,
      show_hidden: '1',
      currency: 'TWD',
      language_code: 'zh-TW',
      country_code: 'TW',
      search_type: 'best',
      outbound_date: returnDate,
    })

    const data = await $fetch<any>(
      `https://${RAPID_HOST}/api/v1/searchFlights?${params}`,
      { headers: getHeaders(apiKey) }
    )
    parseItineraries(data).forEach(item => flights.push(toFlight(item, true)))
  }

  // 過濾掉飛行時間異常的航班（超過 24 小時視為資料錯誤）
  const filtered = flights.filter(f => f.duration <= 1440)
  filtered.sort((a, b) => a.price - b.price)
  return { flights: filtered.slice(0, 20) }
})
