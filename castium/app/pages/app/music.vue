<script setup lang="ts">
const { getAuthUrl, isAuthenticated, getUserPlaylists, getFeaturedPlaylists, play } = useSpotify()

const userPlaylists = ref<any[]>([])
const featuredPlaylists = ref<any[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

const loadPlaylists = async () => {
    if (!isAuthenticated.value) return

    isLoading.value = true
    try {
        const [user, featured] = await Promise.all([getUserPlaylists(20), getFeaturedPlaylists()])

        userPlaylists.value = user.items || []
        featuredPlaylists.value = featured.playlists?.items || []
    } catch (error) {
        console.error('Error loading playlists:', error)
    } finally {
        isLoading.value = false
    }
}

const handlePlayPlaylist = async (playlistId: string) => {
    try {
        await play(`spotify:playlist:${playlistId}`)
    } catch (error) {
        console.error('Error playing playlist:', error)
    }
}

const connectSpotify = () => {
    window.location.href = getAuthUrl()
}

onMounted(() => {
    if (isAuthenticated.value) {
        loadPlaylists()
    }
})

watch(isAuthenticated, (newValue) => {
    if (newValue) {
        loadPlaylists()
    }
})
</script>

<template>
    <div class="min-h-screen bg-gray-900">
        <Navbar mode="app" />
        <AppNav />

        <div class="pt-24 pb-12">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <div
                    v-if="!isAuthenticated"
                    class="flex flex-col items-center justify-center min-h-[60vh]"
                >
                    <div class="text-center max-w-2xl">
                        <div class="mb-8">
                            <UIcon
                                name="i-heroicons-musical-note"
                                class="w-24 h-24 text-castium-green mx-auto mb-6"
                            />
                            <h1 class="text-4xl font-bold text-white mb-4">
                                Connectez votre compte Spotify
                            </h1>
                            <p class="text-gray-400 text-lg mb-8">
                                Accédez à vos playlists, albums et artistes préférés. Écoutez votre
                                musique directement depuis Castium.
                            </p>
                        </div>

                        <UButton
                            icon="i-simple-icons-spotify"
                            size="xl"
                            label="Connecter Spotify"
                            class="bg-castium-green hover:bg-green-600 text-white font-semibold"
                            @click="connectSpotify"
                        />

                        <p class="text-gray-500 text-sm mt-6">
                            Vous serez redirigé vers Spotify pour autoriser l'accès
                        </p>
                    </div>
                </div>

                <div v-else>
                    <div class="mb-8">
                        <h1 class="text-4xl font-bold text-white mb-6">Votre musique</h1>
                        <UInput
                            v-model="searchQuery"
                            icon="i-heroicons-magnifying-glass"
                            size="lg"
                            placeholder="Rechercher un titre, un artiste ou un album..."
                            class="max-w-2xl"
                        />
                    </div>

                    <div v-if="isLoading" class="flex items-center justify-center py-20">
                        <UIcon
                            name="i-heroicons-arrow-path"
                            class="w-12 h-12 text-castium-green animate-spin"
                        />
                    </div>

                    <div v-else class="space-y-12">
                        <section v-if="userPlaylists.length > 0">
                            <h2 class="text-2xl font-bold text-white mb-6">Vos playlists</h2>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                <MusicPlaylistCard
                                    v-for="playlist in userPlaylists"
                                    :key="playlist.id"
                                    :playlist="playlist"
                                    @play="handlePlayPlaylist"
                                />
                            </div>
                        </section>

                        <section v-if="featuredPlaylists.length > 0">
                            <h2 class="text-2xl font-bold text-white mb-6">
                                Playlists recommandées
                            </h2>
                            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                <MusicPlaylistCard
                                    v-for="playlist in featuredPlaylists"
                                    :key="playlist.id"
                                    :playlist="playlist"
                                    @play="handlePlayPlaylist"
                                />
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>

        <Footer mode="app" />
    </div>
</template>
