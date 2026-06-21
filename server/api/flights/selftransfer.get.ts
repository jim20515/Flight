const RAPID_HOST = 'google-flights2.p.rapidapi.com'

// 熱門中轉城市（從台灣出發最常用的）
const HUB_AIRPORTS = [
  { code: 'HKG', name: '香港', flag: '🇭🇰' },
  { code: 'SIN', name: '新加坡', flag: '🇸🇬' },
  { code: 'BKK', name: '曼谷', flag: '🇹🇭' },
  { code: 'ICN', name: '首爾', flag: '🇰🇷' },
  { code: 'NRT', name: '東京', flag: '🇯🇵' },
  { code: 'KUL', name: '吉隆坡', flag: '🇲🇾' },
  { code: 'MNL', name: '馬尼拉', flag: '🇵🇭' },
]

async function searchFlight(
  from: string,
  to: string,
  date: string,
  adults: string,
  apiKey: string
): Promise<{ price: number; airline: string; duration: number; departTime: string; arriveTime: string } | null> {
  try {
    const params = new URLSearchParams({
      departure_id: from,
      arrival_id: to,
      travel_class: 'ECONOMY',
      adults,
      show_hidden: '1',
      currency: 'TWD',
      language_code: 'zh-TW',
      country_code: 'TW',
      search_type: 'best',
      outbound_date: date,
    })

    const data = await $fetch<any>(
      `https://${RAPID_HOST}/api/v1/searchFlights?${params}`,
      { headers: { 'x-rapidapi-host': RAPID_HOST, 'x-rapidapi-key': apiKey } }
    )

    const its = data?.data?.itineraries || {}
    const all = [...(its.topFlights || []), ...(its.otherFlights || [])]
      .filter((f: any) => (f.duration?.raw || 0) <= 600) // 單程不超過 10 小時
      .sort((a: any, b: any) => a.price - b.price)

    const best = all[0]
    if (!best) return null

    const leg = best.flights?.[0]
    return {
      price: best.price || 0,
      airline: best.flights?.map((f: any) => f.airline).filter(Boolean)[0] || '',
      duration: best.duration?.raw || 0,
      departTime: leg?.departure_airport?.time?.slice(-5) || '',
      arriveTime: best.flights?.slice(-1)[0]?.arrival_airport?.time?.slice(-5) || '',
    }
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event) as Record<string, string>
  const { destinationId, date, adults = '1', directPrice = '0' } = query

  if (!destinationId || !date) {
    throw createError({ statusCode: 400, message: '缺少參數' })
  }

  const apiKey = config.rapidApiKey as string
  const destination = String(destinationId).toUpperCase()

  // 過濾掉目的地本身作為中轉
  const hubs = HUB_AIRPORTS.filter(h => h.code !== destination)

  // 並行查詢所有中轉組合
  const results = await Promise.allSettled(
    hubs.map(async (hub) => {
      // 同時查 TPE→Hub 和 Hub→目的地
      const [leg1, leg2] = await Promise.all([
        searchFlight('TPE', hub.code, date, adults, apiKey),
        searchFlight(hub.code, destination, date, adults, apiKey),
      ])

      if (!leg1 || !leg2) return null

      const totalPrice = leg1.price + leg2.price
      const totalDuration = leg1.duration + leg2.duration
      const directPriceNum = parseInt(directPrice) || 0
      const saving = directPriceNum > 0 ? directPriceNum - totalPrice : 0

      return {
        hub: hub.code,
        hubName: hub.name,
        hubFlag: hub.flag,
        leg1: { from: 'TPE', to: hub.code, ...leg1 },
        leg2: { from: hub.code, to: destination, ...leg2 },
        totalPrice,
        totalDuration,
        saving,
        cheaper: saving > 0,
      }
    })
  )

  const combinations = results
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean)
    .sort((a: any, b: any) => a.totalPrice - b.totalPrice)

  return { combinations }
})
