export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.rapidApiKey as string

  // 用最輕量的 endpoint 查額度（checkServer）
  const response = await fetch(
    'https://google-flights2.p.rapidapi.com/api/v1/checkServer',
    {
      headers: {
        'x-rapidapi-host': 'google-flights2.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    }
  )

  const limit = response.headers.get('x-ratelimit-requests-limit')
  const remaining = response.headers.get('x-ratelimit-requests-remaining')
  const reset = response.headers.get('x-ratelimit-requests-reset')

  return {
    limit: limit ? parseInt(limit) : null,
    remaining: remaining ? parseInt(remaining) : null,
    reset: reset ? parseInt(reset) : null,
  }
})
