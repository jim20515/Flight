const RAPID_HOST = 'google-flights2.p.rapidapi.com'

// 各地區設定與匯率（對 TWD）
const REGIONS = [
  { code: 'TW', label: '台灣', currency: 'TWD', rate: 1,     flag: '🇹🇼' },
  { code: 'TH', label: '泰國', currency: 'THB', rate: 0.90,  flag: '🇹🇭' },
  { code: 'JP', label: '日本', currency: 'JPY', rate: 0.215, flag: '🇯🇵' },
  { code: 'HK', label: '香港', currency: 'HKD', rate: 4.10,  flag: '🇭🇰' },
  { code: 'US', label: '美國', currency: 'USD', rate: 32.0,  flag: '🇺🇸' },
  { code: 'KR', label: '韓國', currency: 'KRW', rate: 0.023, flag: '🇰🇷' },
  { code: 'SG', label: '新加坡', currency: 'SGD', rate: 24.0, flag: '🇸🇬' },
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event) as Record<string, string>
  const { destinationId, date, returnDate, adults = '1' } = query

  if (!destinationId || !date) {
    throw createError({ statusCode: 400, message: '缺少參數' })
  }

  const apiKey = config.rapidApiKey as string

  const results = await Promise.allSettled(
    REGIONS.map(async (region) => {
      const params = new URLSearchParams({
        departure_id: 'TPE',
        arrival_id: destinationId,
        travel_class: 'ECONOMY',
        adults,
        show_hidden: '1',
        currency: region.currency,
        language_code: 'en-US',
        country_code: region.code,
        search_type: 'best',
        outbound_date: date,
      })
      if (returnDate) params.set('return_date', returnDate)

      const data = await $fetch<any>(
        `https://${RAPID_HOST}/api/v1/searchFlights?${params}`,
        { headers: { 'x-rapidapi-host': RAPID_HOST, 'x-rapidapi-key': apiKey } }
      )

      const its = data?.data?.itineraries || {}
      const all = [...(its.topFlights || []), ...(its.otherFlights || [])]
        .filter((f: any) => (f.duration?.raw || 0) <= 1440)
        .sort((a: any, b: any) => a.price - b.price)

      const best = all[0]
      if (!best) return null

      const localPrice = best.price
      const twdPrice = Math.round(localPrice * region.rate)

      return {
        ...region,
        localPrice,
        twdPrice,
        airline: best.flights?.[0]?.airline || '',
        stops: best.stops || 0,
        duration: best.duration?.text || '',
      }
    })
  )

  const regions = results
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean)
    .sort((a: any, b: any) => a.twdPrice - b.twdPrice)

  const cheapest = regions[0] as any
  const baseline = regions.find((r: any) => r?.code === 'TW') as any

  return {
    regions,
    cheapest: cheapest?.code,
    saving: baseline && cheapest ? baseline.twdPrice - cheapest.twdPrice : 0,
  }
})
