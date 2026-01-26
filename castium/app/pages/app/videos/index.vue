<script setup lang="ts">
import { useI18n } from '#imports'
const { t } = useI18n()
const supabase = useSupabase()
const { user, profile } = useAuth()

const videoFolderPath = ref('')
const videoFiles = ref<File[]>([])
const videoFileNames = ref<string[]>([])
const selectedVideo = ref<File | null>(null)
const showVideoPlayer = ref(false)

// Charger le dossier vidéo depuis le profil
const loadVideoFolder = async () => {
  if (!profile.value) return
  videoFolderPath.value = profile.value.video_folder_path || ''
  videoFileNames.value = profile.value.video_files || []
}

// Sauvegarder le dossier vidéo et les fichiers
const saveVideoFolder = async () => {
  if (!profile.value) return
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        video_folder_path: videoFolderPath.value,
        video_files: videoFileNames.value
      })
      .eq('id', profile.value.id)
    if (error) throw error
    profile.value.video_folder_path = videoFolderPath.value
    profile.value.video_files = videoFileNames.value
  } catch (error) {
    console.error('Error saving video folder:', error)
  }
}

// Sélectionner un dossier et scanner les MP4
const selectFolder = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.webkitdirectory = true
  input.multiple = true
  input.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files && files.length > 0) {
      // Filtrer seulement les fichiers MP4
      const mp4Files = Array.from(files).filter(file =>
        file.name.toLowerCase().endsWith('.mp4') ||
        file.name.toLowerCase().endsWith('.avi') ||
        file.name.toLowerCase().endsWith('.mkv') ||
        file.name.toLowerCase().endsWith('.mov')
      )

      videoFiles.value = mp4Files
      videoFileNames.value = mp4Files.map(file => file.name)

      // Prendre le path du premier fichier comme base du dossier
      const path = files[0].webkitRelativePath.split('/')[0]
      videoFolderPath.value = path

      // Sauvegarder automatiquement
      saveVideoFolder()
    }
  }
  input.click()
}

// Jouer une vidéo
const playVideo = (file: File) => {
  selectedVideo.value = file
  showVideoPlayer.value = true
}

// Fermer le player
const closePlayer = () => {
  showVideoPlayer.value = false
  selectedVideo.value = null
}

// Obtenir l'URL blob pour la lecture
const getVideoUrl = (file: File) => {
  return URL.createObjectURL(file)
}

// Nettoyer les URLs blob quand le composant se démonte
onUnmounted(() => {
  videoFiles.value.forEach(file => {
    URL.revokeObjectURL(getVideoUrl(file))
  })
})

onMounted(async () => {
  await loadVideoFolder()
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col">
        <Navbar mode="app" />

        <!-- Player vidéo modal -->
        <UModal v-model="showVideoPlayer" :ui="{ width: 'w-full max-w-6xl' }">
            <div class="bg-gray-900 rounded-lg p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-white">
                        {{ selectedVideo?.name }}
                    </h2>
                    <UButton
                        color="gray"
                        variant="ghost"
                        size="sm"
                        @click="closePlayer"
                    >
                        <UIcon name="i-heroicons-x-mark" />
                    </UButton>
                </div>
                <div class="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                        v-if="selectedVideo"
                        :src="getVideoUrl(selectedVideo)"
                        controls
                        autoplay
                        class="w-full h-full"
                        preload="metadata"
                    >
                        Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                </div>
            </div>
        </UModal>

        <div class="pt-24 pb-12">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Si aucun dossier sélectionné -->
                <div v-if="!videoFolderPath" class="flex flex-col items-center justify-center min-h-[60vh]">
                    <div class="text-center max-w-2xl">
                        <UIcon
                            name="i-heroicons-video-camera"
                            class="w-24 h-24 text-purple-400 mx-auto mb-6"
                        />
                        <h1 class="text-4xl font-bold text-white mb-4">
                            {{ t('videos.hero.title') }}
                        </h1>
                        <p class="text-gray-400 text-lg mb-8">
                            {{ t('videos.hero.description') }}
                        </p>

                        <UButton
                            color="purple"
                            variant="solid"
                            size="lg"
                            @click="selectFolder"
                        >
                            <UIcon name="i-heroicons-folder" class="mr-2" />
                            {{ t('videos.hero.selectFolder') }}
                        </UButton>
                    </div>
                </div>

                <!-- Si dossier sélectionné, afficher les vidéos -->
                <div v-else>
                    <!-- Header avec bouton changer dossier -->
                    <div class="flex justify-between items-center mb-8">
                        <div>
                            <h1 class="text-3xl font-bold text-white mb-2">
                                {{ t('videos.library.title') }}
                            </h1>
                            <p class="text-gray-400">
                                {{ videoFileNames.length }} {{ t('videos.library.videosFound') }}
                            </p>
                        </div>
                        <UButton
                            color="gray"
                            variant="outline"
                            @click="selectFolder"
                        >
                            <UIcon name="i-heroicons-folder" class="mr-2" />
                            {{ t('videos.hero.changeFolder') }}
                        </UButton>
                    </div>

                    <!-- Grille des vidéos -->
                    <div v-if="videoFiles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        <div
                            v-for="(file, index) in videoFiles"
                            :key="index"
                            class="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer group"
                            @click="playVideo(file)"
                        >
                            <!-- Thumbnail placeholder -->
                            <div class="aspect-video bg-gray-700 flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                                <UIcon
                                    name="i-heroicons-video-camera"
                                    class="w-12 h-12 text-gray-400 group-hover:text-white transition-colors"
                                />
                            </div>

                            <!-- Info vidéo -->
                            <div class="p-4">
                                <h3 class="text-white font-medium text-sm mb-1 truncate" :title="file.name">
                                    {{ file.name.replace(/\.(mp4|avi|mkv|mov)$/i, '') }}
                                </h3>
                                <p class="text-gray-400 text-xs">
                                    {{ (file.size / (1024 * 1024)).toFixed(1) }} MB
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Message si pas de vidéos MP4 -->
                    <div v-else class="flex flex-col items-center justify-center min-h-[40vh]">
                        <UIcon
                            name="i-heroicons-exclamation-triangle"
                            class="w-16 h-16 text-yellow-400 mx-auto mb-4"
                        />
                        <h2 class="text-xl font-bold text-white mb-2">
                            {{ t('videos.library.noVideos') }}
                        </h2>
                        <p class="text-gray-400 text-center mb-6">
                            {{ t('videos.library.noVideosDesc') }}
                        </p>
                        <UButton
                            color="purple"
                            variant="solid"
                            @click="selectFolder"
                        >
                            <UIcon name="i-heroicons-folder" class="mr-2" />
                            {{ t('videos.hero.changeFolder') }}
                        </UButton>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
