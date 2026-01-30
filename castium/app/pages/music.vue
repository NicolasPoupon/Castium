<script setup lang="ts">
definePageMeta({
    title: 'Music',
})

type Playlist = {
    id: number
    name: string
    description: string
    tracks: number
}

const playlists = ref<Playlist[]>([
    { id: 1, name: 'Daily Mix', description: 'Un mélange personnalisé pour toi.', tracks: 42 },
    { id: 2, name: 'Focus & Code', description: 'Beats lo-fi pour rester concentré.', tracks: 27 },
    { id: 3, name: 'Night Drive', description: 'Ambiance nocturne et chill.', tracks: 35 },
])

const draggedId = ref<number | null>(null)
const currentPlaylistId = ref<number | null>(null)
const isPlaying = ref(false)

const currentPlaylist = computed(
    () => playlists.value.find((p) => p.id === currentPlaylistId.value) ?? null
)

function connectWithSpotify() {
    // TODO: Remplacer cette URL par l'endpoint OAuth réel (backend / callback Spotify)
    // Ex. redirection vers /api/auth/spotify ou directement vers accounts.spotify.com
    console.log('Connect with Spotify clicked')
}

function playPlaylist(playlist: Playlist) {
    if (currentPlaylistId.value === playlist.id && isPlaying.value) {
        isPlaying.value = false
        return
    }

    currentPlaylistId.value = playlist.id
    isPlaying.value = true
}

function onDragStart(id: number) {
    draggedId.value = id
}

function onDrop(targetId: number) {
    if (draggedId.value === null || draggedId.value === targetId) return

    const sourceIndex = playlists.value.findIndex((p) => p.id === draggedId.value)
    const targetIndex = playlists.value.findIndex((p) => p.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return

    const updated = [...playlists.value]
    const [moved] = updated.splice(sourceIndex, 1)
    updated.splice(targetIndex, 0, moved)

    playlists.value = updated
    draggedId.value = null
}
</script>

<template>
    <div class="min-h-screen bg-black text-white flex flex-col">
        <Navbar mode="music" />

        <main class="flex-1 pt-[--header-height]">
            <section
                class="mx-auto max-w-6xl px-4 md:px-8 py-8 flex flex-col gap-8 md:flex-row md:gap-10"
            >
                <!-- Colonne gauche : connexion + lecteur -->
                <aside class="w-full md:w-72 flex flex-col gap-6">
                    <div
                        class="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-400 p-5 shadow-lg"
                    >
                        <p class="text-sm uppercase tracking-[0.2em] text-black/70 mb-2">
                            Castium Music
                        </p>
                        <h1 class="text-2xl font-semibold text-black mb-4">
                            Connecte ton compte Spotify
                        </h1>
                        <p class="text-sm text-black/80 mb-4">
                            Synchronise tes playlists Spotify pour les organiser et les lire
                            directement depuis Castium.
                        </p>
                        <button
                            type="button"
                            class="inline-flex items-center gap-2 rounded-full bg-black text-emerald-400 px-4 py-2 text-sm font-medium hover:bg-black/90 transition-colors"
                            @click="connectWithSpotify"
                        >
                            <span class="i-simple-icons-spotify h-4 w-4" />
                            Continuer avec Spotify
                        </button>
                    </div>

                    <div class="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 space-y-3">
                        <p class="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Lecture en cours
                        </p>
                        <div v-if="currentPlaylist" class="space-y-1">
                            <p class="text-sm font-medium text-white">
                                {{ currentPlaylist.name }}
                            </p>
                            <p class="text-xs text-zinc-400">
                                {{ currentPlaylist.description }}
                            </p>
                        </div>
                        <p v-else class="text-xs text-zinc-500">
                            Aucune playlist en cours. Choisis-en une pour commencer.
                        </p>

                        <div
                            class="flex items-center justify-between pt-3 border-t border-zinc-800"
                        >
                            <button
                                type="button"
                                class="inline-flex items-center justify-center rounded-full bg-emerald-500 text-black h-10 w-10 hover:bg-emerald-400 transition-colors"
                                :disabled="!currentPlaylist"
                                @click="isPlaying = !isPlaying"
                            >
                                <span
                                    v-if="!isPlaying"
                                    class="i-heroicons-play-20-solid h-5 w-5 translate-x-[1px]"
                                />
                                <span v-else class="i-heroicons-pause-20-solid h-5 w-5" />
                            </button>
                            <p class="text-xs text-zinc-500">
                                {{ isPlaying && currentPlaylist ? 'Lecture' : 'En pause' }}
                            </p>
                        </div>
                    </div>
                </aside>

                <!-- Colonne droite : playlists drag & drop -->
                <section class="flex-1">
                    <header class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-semibold">Tes playlists</h2>
                            <p class="text-xs text-zinc-500">
                                Glisse-dépose pour réorganiser l’ordre d’écoute.
                            </p>
                        </div>
                    </header>

                    <div class="space-y-3">
                        <div
                            v-for="playlist in playlists"
                            :key="playlist.id"
                            draggable="true"
                            class="group flex items-center gap-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 px-4 py-3 cursor-pointer hover:border-emerald-500/70 hover:bg-zinc-900 transition-colors"
                            @dragstart="onDragStart(playlist.id)"
                            @dragover.prevent
                            @drop="onDrop(playlist.id)"
                        >
                            <!-- Handle drag -->
                            <div
                                class="flex flex-col items-center justify-center text-zinc-600 group-hover:text-zinc-400"
                            >
                                <span class="h-1 w-4 rounded-full bg-current mb-1" />
                                <span class="h-1 w-4 rounded-full bg-current" />
                            </div>

                            <!-- Infos playlist -->
                            <div class="flex-1">
                                <p class="text-sm font-medium text-white">
                                    {{ playlist.name }}
                                </p>
                                <p class="text-xs text-zinc-400">
                                    {{ playlist.description }}
                                </p>
                                <p class="text-[10px] text-zinc-500 mt-1">
                                    {{ playlist.tracks }} titres
                                </p>
                            </div>

                            <!-- Bouton play -->
                            <button
                                type="button"
                                class="inline-flex items-center justify-center rounded-full border border-emerald-500 text-emerald-400 h-9 w-9 hover:bg-emerald-500 hover:text-black transition-colors"
                                @click.stop="playPlaylist(playlist)"
                            >
                                <span
                                    v-if="currentPlaylistId === playlist.id && isPlaying"
                                    class="i-heroicons-pause-20-solid h-4 w-4"
                                />
                                <span
                                    v-else
                                    class="i-heroicons-play-20-solid h-4 w-4 translate-x-[1px]"
                                />
                            </button>
                        </div>
                    </div>
                </section>
            </section>
        </main>
    </div>
</template>
