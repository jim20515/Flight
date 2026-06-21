const RAPID_HOST = 'google-flights2.p.rapidapi.com'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { q } = getQuery(event) as { q: string }

  if (!q || q.length < 2) return { results: [] }

  const data = await $fetch<any>(
    `https://${RAPID_HOST}/api/v1/searchAirport?query=${encodeURIComponent(q)}&language_code=zh-TW`,
    {
      headers: {
        'x-rapidapi-host': RAPID_HOST,
        'x-rapidapi-key': config.rapidApiKey as string,
      },
    }
  )

  const results = (data?.data || []).slice(0, 6).map((item: any) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    airports: item.list?.slice(0, 2).map((a: any) => a.id) || [],
  }))

  return { results }
})
