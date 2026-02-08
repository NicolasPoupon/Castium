<script setup lang="ts">
const props = defineProps<{
    isLoading: boolean
    searchResults?: {
        tracks?: {
            items: Array<{
                id: string
                name: string
                uri: string
                duration_ms: number
                album: {
                    name: string
                    images: Array<{ url: string }>
                }
                artists: Array<{ name: string }>
            }>
        }
        artists?: {
            items: Array<{
                id: string
                name: string
                uri: string
                images: Array<{ url: string }>
            }>
        }
        albums?: {
            items: Array<{
                id: string
                name: string
                uri: string
                images: Array<{ url: string }>
                artists: Array<{ name: string }>
            }>
        }
        playlists?: {
            items: Array<{
                id: string
                name: string
                uri: string
                description?: string
                images: Array<{ url: string }>
            }>
        }
    }
}>()

const emit = defineEmits<{
    playTrack: [uri: string]
    playPlaylist: [uri: string]
}>()

const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>

<template>
    <div v-if="isLoading" class="flex items-center justify-center py-20">
        <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-green-600 animate-spin" />
    </div>

    <div v-else-if="searchResults" class="space-y-12">
        <section v-if="searchResults.tracks?.items?.length">
            <h2 class="text-2xl font-bold text-white mb-6">Titres</h2>
            <div class="space-y-2">
                <div
                    v-for="track in searchResults.tracks.items"
                    :key="track.id"
                    class="group flex items-center gap-4 p-3 bg-gray-800/30 hover:bg-gray-800/60 rounded-lg transition-colors cursor-pointer"
                    @click="emit('playTrack', track.uri)"
                >
                    <div
                        v-if="track.album.images[2]"
                        class="flex-shrink-0 w-12 h-12 rounded overflow-hidden"
                    >
                        <img
                            :src="track.album.images[2].url"
                            :alt="track.name"
                            class="w-full h-full object-cover"
                        />
                    </div>

                    <div class="flex-1 min-w-0">
                        <p class="text-white font-medium truncate">{{ track.name }}</p>
                        <p class="text-gray-400 text-sm truncate">
                            {{ track.artists.map((a) => a.name).join(', ') }}
                        </p>
                    </div>

                    <div class="flex items-center gap-4">
                        <span class="text-gray-400 text-sm flex-shrink-0">
                            {{ formatDuration(track.duration_ms) }}
                        </span>
                        <UIcon
                            name="i-heroicons-play-solid"
                            class="w-5 h-5 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        />
                    </div>
                </div>
            </div>
        </section>

        <section v-if="searchResults.artists?.items?.length">
            <h2 class="text-2xl font-bold text-white mb-6">Artistes</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div
                    v-for="artist in searchResults.artists.items"
                    :key="artist.id"
                    class="group bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer p-4 text-center"
                >
                    <div v-if="artist.images[0]" class="mb-4 overflow-hidden rounded-lg">
                        <img
                            :src="artist.images[0].url"
                            :alt="artist.name"
                            class="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                        />
                    </div>
                    <p class="text-white font-medium truncate">{{ artist.name }}</p>
                </div>
            </div>
        </section>

        <section v-if="searchResults.albums?.items?.length">
            <h2 class="text-2xl font-bold text-white mb-6">Albums</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div
                    v-for="album in searchResults.albums.items"
                    :key="album.id"
                    class="group bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer"
                    @click="emit('playPlaylist', album.uri)"
                >
                    <div v-if="album.images[0]" class="overflow-hidden">
                        <img
                            :src="album.images[0].url"
                            :alt="album.name"
                            class="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                        />
                    </div>
                    <div class="p-3">
                        <p class="text-white font-medium text-sm truncate">{{ album.name }}</p>
                        <p class="text-gray-400 text-xs truncate">
                            {{ album.artists.map((a) => a.name).join(', ') }}
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section v-if="searchResults.playlists?.items?.length">
            <h2 class="text-2xl font-bold text-white mb-6">Playlists</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div
                    v-for="playlist in searchResults.playlists.items"
                    :key="playlist.id"
                    class="group bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer"
                    @click="emit('playPlaylist', playlist.uri)"
                >
                    <div v-if="playlist.images[0]" class="overflow-hidden">
                        <img
                            :src="playlist.images[0].url"
                            :alt="playlist.name"
                            class="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                        />
                    </div>
                    <div class="p-3">
                        <p class="text-white font-medium text-sm truncate">{{ playlist.name }}</p>
                        <p class="text-gray-400 text-xs line-clamp-2">{{ playlist.description }}</p>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <div v-else class="text-center py-20">
        <p class="text-gray-400">Aucun résultat trouvé</p>
    </div>
</template>
