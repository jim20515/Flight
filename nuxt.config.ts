export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@vueuse/nuxt'],
  runtimeConfig: {
    rapidApiKey: process.env.RAPIDAPI_KEY,
  },
  app: {
    head: {
      title: '機票比價 — 台灣出發最便宜機票',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '幫你找到台灣出發最便宜的機票，包含自拼票組合' },
      ],
    },
  },
})
