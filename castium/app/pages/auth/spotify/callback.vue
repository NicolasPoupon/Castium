<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { exchangeCodeForToken } = useSpotify()

onMounted(async () => {
    const code = route.query.code as string
    if (code) {
        try {
            await exchangeCodeForToken(code)
            await router.push('/app/music')
        } catch (error) {
            console.error('Error during Spotify authentication:', error)
            await router.push('/app/music?error=auth_failed')
        }
    }
})
</script>

<template>
    <div class="flex items-center justify-center min-h-screen bg-gray-900">
        <div class="text-center">
            <UIcon
                name="i-heroicons-arrow-path"
                class="w-12 h-12 text-castium-green animate-spin"
            />
            <p class="mt-4 text-white">Connexion à Spotify...</p>
        </div>
    </div>
</template>
