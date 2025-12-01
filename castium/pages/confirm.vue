<script setup>
const route = useRoute()
const { $supabase } = useNuxtApp()

onMounted(async () => {
  await $supabase.auth.exchangeCodeForSession(route.query.code)
})
</script>

<template>
  <div>Ton email est confirmé ! Tu peux maintenant te connecter.</div>
</template>
