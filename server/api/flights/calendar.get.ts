const RAPID_HOST = 'google-flights2.p.rapidapi.com'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event) as Record<string, string>
  const { destination, dates, adults = '1' } = query

  if (!destination || !dates) {
    throw createError({ statusCode: 400, message: '缺少參數' })
  }

  const apiKey = config.rapidApiKey as string

  // 解析目的地 ID
  async function resolveDestId(dest: string): Promise<string> {
    const isCode = /^[A-Z]{2,3}$/.test(dest.toUpperCase())
    if (isCode) return dest.toUpperCase()
    const data = await $fetch<any>(
      `https://${RAPID_HOST}/api/v1/searchAirport?query=${encodeURIComponent(dest)}&language_code=en-US`,
      { headers: { 'x-rapidapi-host': RAPID_HOST, 'x-rapidapi-key': apiKey } }
    )
    const first = data?.data?.[0]
    if (!first) throw createError({ statusCode: 400, message: `找不到目的地：${dest}` })
    return first.id || first.list?.[0]?.id
  }

  const destId = await resolveDestId(destination)
  const dateList = String(dates).split(',').slice(0, 15)
  const results: any[] = []

  // 每批 5 個日期平行查詢
  const batchSize = 5
  for (let i = 0; i < dateList.length; i += batchSize) {
    const batch = dateList.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map(async (date) => {
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

        const data = await $fetch<any>(
          `https://${RAPID_HOST}/api/v1/searchFlights?${params}`,
          { headers: { 'x-rapidapi-host': RAPID_HOST, 'x-rapidapi-key': apiKey } }
        )

        const its = data?.data?.itineraries || {}
        const all = [...(its.topFlights || []), ...(its.otherFlights || [])]
        const best = all.sort((a: any, b: any) => a.price - b.price)[0]
        if (!best) return null

        return {
          date,
          price: best.price || 0,
          airline: best.flights?.[0]?.airline || '',
          stops: best.stops || 0,
          destination: destUpper,
        }
      })
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value)
    }
  }

  return { days: results.sort((a, b) => a.price - b.price) }
})
