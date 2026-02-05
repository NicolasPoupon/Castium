<script setup lang="ts">
import { useI18n } from '#imports'
import type { ThemeColor } from '~/composables/useTheme'
import type { PhotoFile } from '~/composables/useLocalPhotos'
import type { CloudPhoto, CloudPhotoFolder } from '~/composables/useCloudPhotos'

const { t } = useI18n()
const { colors, colorClasses } = useTheme()
const themeColor = computed(() => colors.value.photos as ThemeColor)
const theme = computed(() => colorClasses[themeColor.value] || colorClasses.blue)

definePageMeta({
    title: 'Photos',
    ssr: false,
})

// Local Photos
const {
    photos: localPhotos,
    loading: localLoading,
    hasPermission,
    albums,
    likedPhotos: localLikedPhotos,
    selectFolder,
    restoreFolderAccess,
    reauthorizeAccess,
    getPhotoUrl,
    toggleLike: toggleLocalLike,
    isLiked: isLocalLiked,
    loadLikedPhotos,
    getPhotosByFolder,
    formatSize,
    formatDate,
    getPhotoColor,
    needsReauthorization,
    savedFolderName,
    clearLocalState,
} = useLocalPhotos()

// Cloud Photos
const {
    photos: cloudPhotos,
    folders: cloudFolders,
    likedPhotos: cloudLikedPhotos,
    loading: cloudLoading,
    uploading,
    uploadProgress,
    sortedPhotos,
    rootFolders,
    fetchPhotos,
    fetchFolders,
    fetchLikedPhotos,
    uploadPhotos,
    createFolder,
    deleteFolder,
    renameFolder,
    addPhotoToFolder,
    removePhotoFromFolder,
    toggleLike: toggleCloudLike,
    isLiked: isCloudLiked,
    deletePhoto: deleteCloudPhoto,
    updatePhoto,
    downloadPhoto,
    formatFileSize,
    formatDate: formatCloudDate,
    getPhotoColor: getCloudPhotoColor,
    getPhotosInFolder,
    clearState: clearCloudState,
} = useCloudPhotos()

// Active tab
const activeTab = ref<'local' | 'cloud'>('local')

// View mode
const viewMode = ref<'all' | 'albums' | 'liked'>('all')

// Selected album/folder
const selectedAlbum = ref<string | null>(null)
const selectedFolder = ref<CloudPhotoFolder | null>(null)

// Photo viewer state
const showViewer = ref(false)
const viewerPhoto = ref<PhotoFile | CloudPhoto | null>(null)
const viewerPhotoUrl = ref<string | null>(null)
const viewerIndex = ref(0)
const viewerPhotos = ref<(PhotoFile | CloudPhoto)[]>([])

// Photo info modal
const showPhotoInfo = ref(false)
const selectedPhotoInfo = ref<PhotoFile | CloudPhoto | null>(null)

// Delete confirmation
const showDeleteConfirm = ref(false)
const photoToDelete = ref<CloudPhoto | null>(null)

// Create folder modal
const showCreateFolder = ref(false)
const newFolderName = ref('')

// Add to folder modal
const showAddToFolder = ref(false)
const photoToAdd = ref<CloudPhoto | null>(null)

// Search
const searchQuery = ref('')

// File input ref
const fileInputRef = ref<HTMLInputElement | null>(null)

// Computed
const loading = computed(() => activeTab.value === 'local' ? localLoading.value : cloudLoading.value)

const filteredLocalPhotos = computed(() => {
    let list: PhotoFile[] = []

    if (viewMode.value === 'liked') {
        list = localLikedPhotos.value
    } else if (viewMode.value === 'albums' && selectedAlbum.value) {
        list = getPhotosByFolder(selectedAlbum.value)
    } else {
        list = localPhotos.value
    }

    if (!searchQuery.value) return list
    const query = searchQuery.value.toLowerCase()
    return list.filter(p => p.name.toLowerCase().includes(query))
})

const filteredCloudPhotos = computed(() => {
    let list: CloudPhoto[] = []

    if (viewMode.value === 'liked') {
        list = cloudLikedPhotos.value
    } else {
        list = cloudPhotos.value
    }

    if (!searchQuery.value) return list
    const query = searchQuery.value.toLowerCase()
    return list.filter(p =>
        p.fileName.toLowerCase().includes(query) ||
        p.title?.toLowerCase().includes(query)
    )
})

// Handlers
const handleSelectFolder = async () => {
    await selectFolder()
}

const handleReauthorize = async () => {
    await reauthorizeAccess()
}

const handleFileSelect = () => {
    fileInputRef.value?.click()
}

const handleFilesSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return
    await uploadPhotos(input.files)
    input.value = ''
}

// Open photo viewer
const openViewer = async (photo: PhotoFile | CloudPhoto, photos: (PhotoFile | CloudPhoto)[]) => {
    viewerPhoto.value = photo
    viewerPhotos.value = photos
    viewerIndex.value = photos.findIndex(p => {
        if ('filePath' in p && 'filePath' in photo) return p.filePath === photo.filePath
        if ('path' in p && 'path' in photo) return p.path === photo.path
        return false
    })

    // Get URL
    if ('handle' in photo || 'file' in photo) {
        viewerPhotoUrl.value = await getPhotoUrl(photo as PhotoFile)
    } else {
        viewerPhotoUrl.value = (photo as CloudPhoto).publicUrl || null
    }

    showViewer.value = true
}

const closeViewer = () => {
    showViewer.value = false
    viewerPhoto.value = null
    viewerPhotoUrl.value = null
}

const navigateViewer = async (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next'
        ? (viewerIndex.value + 1) % viewerPhotos.value.length
        : (viewerIndex.value - 1 + viewerPhotos.value.length) % viewerPhotos.value.length

    viewerIndex.value = newIndex
    const photo = viewerPhotos.value[newIndex]
    viewerPhoto.value = photo

    if ('handle' in photo || 'file' in photo) {
        viewerPhotoUrl.value = await getPhotoUrl(photo as PhotoFile)
    } else {
        viewerPhotoUrl.value = (photo as CloudPhoto).publicUrl || null
    }
}

// Photo info
const openPhotoInfo = (photo: PhotoFile | CloudPhoto) => {
    selectedPhotoInfo.value = photo
    showPhotoInfo.value = true
}

const closePhotoInfo = () => {
    showPhotoInfo.value = false
    selectedPhotoInfo.value = null
}

// Toggle like
const handleToggleLike = async (photo: PhotoFile | CloudPhoto) => {
    if ('id' in photo) {
        await toggleCloudLike(photo.id)
    } else {
        await toggleLocalLike(photo as PhotoFile)
    }
}

// Check if liked
const checkIsLiked = (photo: PhotoFile | CloudPhoto): boolean => {
    if ('id' in photo) {
        return isCloudLiked(photo.id)
    } else {
        return isLocalLiked((photo as PhotoFile).path)
    }
}

// Delete photo
const confirmDeletePhoto = (photo: CloudPhoto) => {
    photoToDelete.value = photo
    showDeleteConfirm.value = true
}

const handleDeletePhoto = async () => {
    if (photoToDelete.value) {
        await deleteCloudPhoto(photoToDelete.value.id)
        showDeleteConfirm.value = false
        photoToDelete.value = null
    }
}

// Folder management
const handleCreateFolder = async () => {
    if (newFolderName.value.trim()) {
        await createFolder(newFolderName.value.trim())
        newFolderName.value = ''
        showCreateFolder.value = false
    }
}

const openAddToFolder = (photo: CloudPhoto) => {
    photoToAdd.value = photo
    showAddToFolder.value = true
}

const handleAddToFolder = async (folderId: string) => {
    if (photoToAdd.value) {
        await addPhotoToFolder(folderId, photoToAdd.value.id)
        showAddToFolder.value = false
        photoToAdd.value = null
    }
}

// Keyboard navigation
const handleKeydown = (e: KeyboardEvent) => {
    if (!showViewer.value) return

    if (e.key === 'ArrowLeft') navigateViewer('prev')
    else if (e.key === 'ArrowRight') navigateViewer('next')
    else if (e.key === 'Escape') closeViewer()
}

// Lifecycle
onMounted(async () => {
    await restoreFolderAccess()
    await loadLikedPhotos()

    window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
})

// Watch for tab changes
watch(activeTab, async (tab) => {
    if (tab === 'cloud' && cloudPhotos.value.length === 0) {
        await fetchPhotos()
        await fetchFolders()
        await fetchLikedPhotos()
    }
    viewMode.value = 'all'
    selectedAlbum.value = null
    selectedFolder.value = null
})

// Data refresh subscription
const { onRefresh } = useDataRefresh()
onMounted(() => {
    const unsubscribe = onRefresh('photos', async () => {
        clearLocalState()
        clearCloudState()
        await restoreFolderAccess()
        await loadLikedPhotos()
        if (activeTab.value === 'cloud') {
            await fetchPhotos()
            await fetchFolders()
            await fetchLikedPhotos()
        }
    })
    onUnmounted(() => unsubscribe())
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex flex-col theme-transition">
        <Navbar mode="app" />

        <div class="pt-24 pb-12">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <!-- Tab Navigation -->
                <div class="flex items-center gap-4 mb-8">
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 btn-press',
                            activeTab === 'local'
                                ? `${theme.bg} text-white shadow-lg shadow-${themeColor}-500/25`
                                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white',
                        ]"
                        @click="activeTab = 'local'"
                    >
                        <UIcon name="i-heroicons-folder" class="w-5 h-5" />
                        {{ t('photos.tabs.local') }}
                    </button>
                    <button
                        :class="[
                            'px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 btn-press',
                            activeTab === 'cloud'
                                ? `${theme.bg} text-white shadow-lg shadow-${themeColor}-500/25`
                                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white',
                        ]"
                        @click="activeTab = 'cloud'"
                    >
                        <UIcon name="i-heroicons-cloud" class="w-5 h-5" />
                        {{ t('photos.tabs.cloud') }}
                    </button>
                </div>

                <!-- LOCAL PHOTOS TAB -->
                <div v-if="activeTab === 'local'">
                    <!-- No folder selected -->
                    <div v-if="!hasPermission" class="flex flex-col items-center justify-center min-h-[60vh]">
                        <div class="text-center max-w-2xl">
                            <div class="mb-8">
                                <div :class="['w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6', `bg-${themeColor}-500/20`]">
                                    <UIcon name="i-heroicons-photo" :class="['w-12 h-12', theme.textLight]" />
                                </div>
                                <h1 class="text-4xl font-bold text-white mb-4">{{ t('photos.hero.title') }}</h1>
                                <p class="text-gray-400 text-lg mb-8">{{ t('photos.hero.description') }}</p>
                            </div>

                            <div v-if="needsReauthorization && savedFolderName" class="mb-6">
                                <p class="text-gray-300 mb-4">
                                    {{ t('photos.hero.previousFolder') }}:
                                    <span :class="[theme.textLight, 'font-medium']">{{ savedFolderName }}</span>
                                </p>
                                <UButton
                                    icon="i-heroicons-arrow-path"
                                    size="xl"
                                    :label="t('photos.hero.reauthorize')"
                                    :loading="loading"
                                    :class="[theme.bg, 'text-white font-semibold btn-press']"
                                    @click="handleReauthorize"
                                />
                            </div>

                            <UButton
                                icon="i-heroicons-folder-plus"
                                size="xl"
                                :label="t('photos.hero.selectFolder')"
                                :loading="loading"
                                :variant="needsReauthorization ? 'outline' : 'solid'"
                                :class="needsReauthorization
                                    ? `border-${themeColor}-600 ${theme.textLight}`
                                    : `${theme.bg} text-white font-semibold btn-press`"
                                @click="handleSelectFolder"
                            />
                        </div>
                    </div>

                    <!-- Photos library -->
                    <div v-else>
                        <!-- Toolbar -->
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-2">
                                <button
                                    v-for="mode in ['all', 'albums', 'liked']"
                                    :key="mode"
                                    :class="[
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                        viewMode === mode
                                            ? `${theme.bg} text-white`
                                            : 'bg-gray-800 text-gray-400 hover:text-white'
                                    ]"
                                    @click="viewMode = mode as any; selectedAlbum = null"
                                >
                                    {{ t(`photos.view.${mode}`) }}
                                </button>
                            </div>

                            <div class="flex items-center gap-4">
                                <UInput
                                    v-model="searchQuery"
                                    :placeholder="t('photos.search')"
                                    icon="i-heroicons-magnifying-glass"
                                    class="w-64"
                                />
                                <UButton
                                    icon="i-heroicons-arrow-path"
                                    variant="ghost"
                                    color="neutral"
                                    @click="handleSelectFolder"
                                />
                            </div>
                        </div>

                        <!-- Albums view -->
                        <div v-if="viewMode === 'albums' && !selectedAlbum">
                            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                <button
                                    v-for="album in albums"
                                    :key="album.folderPath"
                                    class="group relative aspect-square bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                                    @click="selectedAlbum = album.folderPath"
                                >
                                    <img
                                        v-if="album.thumbnail"
                                        :src="album.thumbnail"
                                        :alt="album.name"
                                        class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div v-else class="w-full h-full flex items-center justify-center">
                                        <UIcon name="i-heroicons-folder" class="w-16 h-16 text-gray-600" />
                                    </div>
                                    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                        <p class="text-white font-medium truncate">{{ album.name }}</p>
                                        <p class="text-gray-400 text-sm">{{ album.photoCount }} {{ t('photos.items') }}</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <!-- Photos grid -->
                        <div v-else>
                            <div v-if="selectedAlbum" class="flex items-center gap-2 mb-4">
                                <button
                                    class="text-gray-400 hover:text-white"
                                    @click="selectedAlbum = null"
                                >
                                    <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
                                </button>
                                <h2 class="text-xl font-semibold text-white">{{ selectedAlbum }}</h2>
                            </div>

                            <!-- Loading indicator -->
                            <div v-if="localLoading" class="flex flex-col items-center justify-center py-16">
                                <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-blue-400 animate-spin mb-4" />
                                <p class="text-gray-400">{{ t('photos.loading') || 'Chargement des photos...' }}</p>
                            </div>

                            <div v-else-if="filteredLocalPhotos.length === 0" class="text-center py-16">
                                <UIcon name="i-heroicons-photo" class="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p class="text-gray-400">{{ t('photos.noPhotos') }}</p>
                            </div>

                            <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                                <button
                                    v-for="photo in filteredLocalPhotos"
                                    :key="photo.path"
                                    class="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                                    @click="openViewer(photo, filteredLocalPhotos)"
                                >
                                    <img
                                        v-if="photo.thumbnail"
                                        :src="photo.thumbnail"
                                        :alt="photo.name"
                                        class="w-full h-full object-cover"
                                    />
                                    <div
                                        v-else
                                        class="w-full h-full flex items-center justify-center"
                                        :style="{ backgroundColor: getPhotoColor(photo) }"
                                    >
                                        <UIcon name="i-heroicons-photo" class="w-8 h-8 text-white/50" />
                                    </div>

                                    <!-- Overlay -->
                                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                                        <button
                                            class="p-1.5 rounded-full bg-black/50 hover:bg-black/70"
                                            @click.stop="handleToggleLike(photo)"
                                        >
                                            <UIcon
                                                :name="checkIsLiked(photo) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                                                :class="checkIsLiked(photo) ? 'w-4 h-4 text-red-500' : 'w-4 h-4 text-white'"
                                            />
                                        </button>
                                        <button
                                            class="p-1.5 rounded-full bg-black/50 hover:bg-black/70"
                                            @click.stop="openPhotoInfo(photo)"
                                        >
                                            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-white" />
                                        </button>
                                    </div>

                                    <!-- Like indicator -->
                                    <div v-if="checkIsLiked(photo)" class="absolute top-2 right-2">
                                        <UIcon name="i-heroicons-heart-solid" class="w-4 h-4 text-red-500" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CLOUD PHOTOS TAB -->
                <div v-if="activeTab === 'cloud'">
                    <!-- Toolbar -->
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-2">
                            <button
                                v-for="mode in ['all', 'liked']"
                                :key="mode"
                                :class="[
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                    viewMode === mode
                                        ? `${theme.bg} text-white`
                                        : 'bg-gray-800 text-gray-400 hover:text-white'
                                ]"
                                @click="viewMode = mode as any"
                            >
                                {{ t(`photos.view.${mode}`) }}
                            </button>
                        </div>

                        <div class="flex items-center gap-4">
                            <UInput
                                v-model="searchQuery"
                                :placeholder="t('photos.search')"
                                icon="i-heroicons-magnifying-glass"
                                class="w-64"
                            />
                            <UButton
                                icon="i-heroicons-folder-plus"
                                variant="ghost"
                                color="neutral"
                                @click="showCreateFolder = true"
                            />
                            <UButton
                                icon="i-heroicons-arrow-up-tray"
                                :loading="uploading"
                                :class="[theme.bg, 'text-white']"
                                @click="handleFileSelect"
                            >
                                {{ t('photos.upload') }}
                            </UButton>
                            <input
                                ref="fileInputRef"
                                type="file"
                                accept="image/*"
                                multiple
                                class="hidden"
                                @change="handleFilesSelected"
                            />
                        </div>
                    </div>

                    <!-- Upload Progress -->
                    <div v-if="uploading && uploadProgress.length > 0" class="mb-6">
                        <div class="bg-gray-800 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-white text-sm">{{ t('photos.uploading') }}</span>
                                <span class="text-gray-400 text-sm">
                                    {{ uploadProgress.filter(p => p.status === 'complete').length }}/{{ uploadProgress.length }}
                                </span>
                            </div>
                            <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    class="h-full bg-blue-500 transition-all"
                                    :style="{ width: `${(uploadProgress.filter(p => p.status === 'complete').length / uploadProgress.length) * 100}%` }"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Folders -->
                    <div v-if="rootFolders.length > 0 && viewMode === 'all'" class="mb-8">
                        <h3 class="text-lg font-semibold text-white mb-4">{{ t('photos.folders') }}</h3>
                        <div class="flex flex-wrap gap-3">
                            <button
                                v-for="folder in rootFolders"
                                :key="folder.id"
                                class="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                                @click="selectedFolder = folder"
                            >
                                <div
                                    class="w-8 h-8 rounded flex items-center justify-center"
                                    :style="{ backgroundColor: folder.coverColor || '#3b82f6' }"
                                >
                                    <UIcon name="i-heroicons-folder" class="w-4 h-4 text-white" />
                                </div>
                                <span class="text-white">{{ folder.name }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Cloud Photos Grid -->
                    <div v-if="filteredCloudPhotos.length === 0 && !cloudLoading" class="text-center py-16">
                        <UIcon name="i-heroicons-cloud-arrow-up" class="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p class="text-gray-400 mb-4">{{ t('photos.noCloudPhotos') }}</p>
                        <UButton
                            icon="i-heroicons-arrow-up-tray"
                            :class="[theme.bg, 'text-white']"
                            @click="handleFileSelect"
                        >
                            {{ t('photos.uploadFirst') }}
                        </UButton>
                    </div>

                    <div v-else-if="cloudLoading" class="flex justify-center py-16">
                        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-400 animate-spin" />
                    </div>

                    <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                        <button
                            v-for="photo in filteredCloudPhotos"
                            :key="photo.id"
                            class="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                            @click="openViewer(photo, filteredCloudPhotos)"
                        >
                            <img
                                v-if="photo.thumbnailUrl || photo.publicUrl"
                                :src="photo.thumbnailUrl || photo.publicUrl"
                                :alt="photo.fileName"
                                class="w-full h-full object-cover"
                            />
                            <div
                                v-else
                                class="w-full h-full flex items-center justify-center"
                                :style="{ backgroundColor: getCloudPhotoColor(photo) }"
                            >
                                <UIcon name="i-heroicons-photo" class="w-8 h-8 text-white/50" />
                            </div>

                            <!-- Overlay -->
                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                                <div class="flex gap-1">
                                    <button
                                        class="p-1.5 rounded-full bg-black/50 hover:bg-black/70"
                                        @click.stop="handleToggleLike(photo)"
                                    >
                                        <UIcon
                                            :name="photo.isLiked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                                            :class="photo.isLiked ? 'w-4 h-4 text-red-500' : 'w-4 h-4 text-white'"
                                        />
                                    </button>
                                    <button
                                        class="p-1.5 rounded-full bg-black/50 hover:bg-black/70"
                                        @click.stop="openAddToFolder(photo)"
                                    >
                                        <UIcon name="i-heroicons-folder-plus" class="w-4 h-4 text-white" />
                                    </button>
                                </div>
                                <div class="flex gap-1">
                                    <button
                                        class="p-1.5 rounded-full bg-black/50 hover:bg-black/70"
                                        @click.stop="downloadPhoto(photo)"
                                    >
                                        <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 text-white" />
                                    </button>
                                    <button
                                        class="p-1.5 rounded-full bg-black/50 hover:bg-black/70"
                                        @click.stop="openPhotoInfo(photo)"
                                    >
                                        <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-white" />
                                    </button>
                                    <button
                                        class="p-1.5 rounded-full bg-black/50 hover:bg-red-600"
                                        @click.stop="confirmDeletePhoto(photo)"
                                    >
                                        <UIcon name="i-heroicons-trash" class="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>

                            <!-- Like indicator -->
                            <div v-if="photo.isLiked" class="absolute top-2 right-2">
                                <UIcon name="i-heroicons-heart-solid" class="w-4 h-4 text-red-500" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Photo Viewer Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showViewer && viewerPhoto"
                    class="fixed inset-0 z-[100] bg-black flex items-center justify-center"
                    @click="closeViewer"
                >
                    <!-- Close button -->
                    <button
                        class="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 z-10"
                        @click="closeViewer"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-white" />
                    </button>

                    <!-- Navigation -->
                    <button
                        v-if="viewerPhotos.length > 1"
                        class="absolute left-4 p-3 rounded-full bg-black/50 hover:bg-black/70 z-10"
                        @click.stop="navigateViewer('prev')"
                    >
                        <UIcon name="i-heroicons-chevron-left" class="w-8 h-8 text-white" />
                    </button>
                    <button
                        v-if="viewerPhotos.length > 1"
                        class="absolute right-4 p-3 rounded-full bg-black/50 hover:bg-black/70 z-10"
                        @click.stop="navigateViewer('next')"
                    >
                        <UIcon name="i-heroicons-chevron-right" class="w-8 h-8 text-white" />
                    </button>

                    <!-- Image -->
                    <img
                        v-if="viewerPhotoUrl"
                        :src="viewerPhotoUrl"
                        :alt="'name' in viewerPhoto ? viewerPhoto.name : viewerPhoto.fileName"
                        class="max-h-[90vh] max-w-[90vw] object-contain"
                        @click.stop
                    />

                    <!-- Bottom bar -->
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                        <div class="flex items-center justify-between max-w-4xl mx-auto">
                            <div>
                                <p class="text-white font-medium">
                                    {{ 'name' in viewerPhoto ? viewerPhoto.name : viewerPhoto.fileName }}
                                </p>
                                <p class="text-gray-400 text-sm">
                                    {{ viewerIndex + 1 }} / {{ viewerPhotos.length }}
                                </p>
                            </div>
                            <div class="flex gap-2">
                                <button
                                    class="p-2 rounded-full bg-white/10 hover:bg-white/20"
                                    @click.stop="handleToggleLike(viewerPhoto)"
                                >
                                    <UIcon
                                        :name="checkIsLiked(viewerPhoto) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                                        :class="checkIsLiked(viewerPhoto) ? 'w-5 h-5 text-red-500' : 'w-5 h-5 text-white'"
                                    />
                                </button>
                                <button
                                    class="p-2 rounded-full bg-white/10 hover:bg-white/20"
                                    @click.stop="openPhotoInfo(viewerPhoto)"
                                >
                                    <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Photo Info Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showPhotoInfo && selectedPhotoInfo"
                    class="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
                    @click.self="closePhotoInfo"
                >
                    <div class="bg-gray-900 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-6">
                                <h2 class="text-xl font-bold text-white">{{ t('photos.info.title') }}</h2>
                                <button
                                    class="p-1 rounded-full hover:bg-gray-800"
                                    @click="closePhotoInfo"
                                >
                                    <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <div class="space-y-4">
                                <div class="flex justify-between py-2 border-b border-gray-800">
                                    <span class="text-gray-400">{{ t('photos.info.name') }}</span>
                                    <span class="text-white">{{ 'name' in selectedPhotoInfo ? selectedPhotoInfo.name : selectedPhotoInfo.fileName }}</span>
                                </div>
                                <div v-if="selectedPhotoInfo.width && selectedPhotoInfo.height" class="flex justify-between py-2 border-b border-gray-800">
                                    <span class="text-gray-400">{{ t('photos.info.dimensions') }}</span>
                                    <span class="text-white">{{ selectedPhotoInfo.width }} × {{ selectedPhotoInfo.height }}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b border-gray-800">
                                    <span class="text-gray-400">{{ t('photos.info.size') }}</span>
                                    <span class="text-white">{{ 'fileSize' in selectedPhotoInfo ? formatFileSize(selectedPhotoInfo.fileSize) : formatSize(selectedPhotoInfo.size) }}</span>
                                </div>
                                <div v-if="'takenAt' in selectedPhotoInfo && selectedPhotoInfo.takenAt" class="flex justify-between py-2 border-b border-gray-800">
                                    <span class="text-gray-400">{{ t('photos.info.takenAt') }}</span>
                                    <span class="text-white">{{ formatCloudDate(selectedPhotoInfo.takenAt) }}</span>
                                </div>
                                <div v-if="'cameraMake' in selectedPhotoInfo && selectedPhotoInfo.cameraMake" class="flex justify-between py-2 border-b border-gray-800">
                                    <span class="text-gray-400">{{ t('photos.info.camera') }}</span>
                                    <span class="text-white">{{ selectedPhotoInfo.cameraMake }} {{ selectedPhotoInfo.cameraModel }}</span>
                                </div>
                                <div v-if="'iso' in selectedPhotoInfo && selectedPhotoInfo.iso" class="flex justify-between py-2 border-b border-gray-800">
                                    <span class="text-gray-400">ISO</span>
                                    <span class="text-white">{{ selectedPhotoInfo.iso }}</span>
                                </div>
                                <div v-if="'aperture' in selectedPhotoInfo && selectedPhotoInfo.aperture" class="flex justify-between py-2 border-b border-gray-800">
                                    <span class="text-gray-400">{{ t('photos.info.aperture') }}</span>
                                    <span class="text-white">{{ selectedPhotoInfo.aperture }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Delete Confirmation Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showDeleteConfirm"
                    class="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
                    @click.self="showDeleteConfirm = false"
                >
                    <div class="bg-gray-900 rounded-xl max-w-md w-full p-6">
                        <h2 class="text-xl font-bold text-white mb-4">{{ t('photos.deleteConfirm.title') }}</h2>
                        <p class="text-gray-400 mb-6">{{ t('photos.deleteConfirm.message') }}</p>
                        <div class="flex justify-end gap-3">
                            <UButton variant="ghost" color="neutral" @click="showDeleteConfirm = false">
                                {{ t('common.cancel') }}
                            </UButton>
                            <UButton color="error" @click="handleDeletePhoto">
                                {{ t('common.delete') }}
                            </UButton>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Create Folder Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showCreateFolder"
                    class="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
                    @click.self="showCreateFolder = false"
                >
                    <div class="bg-gray-900 rounded-xl max-w-md w-full p-6">
                        <h2 class="text-xl font-bold text-white mb-4">{{ t('photos.createFolder.title') }}</h2>
                        <UInput
                            v-model="newFolderName"
                            :placeholder="t('photos.createFolder.placeholder')"
                            class="mb-6"
                        />
                        <div class="flex justify-end gap-3">
                            <UButton variant="ghost" color="neutral" @click="showCreateFolder = false">
                                {{ t('common.cancel') }}
                            </UButton>
                            <UButton :class="[theme.bg, 'text-white']" @click="handleCreateFolder">
                                {{ t('common.create') }}
                            </UButton>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Add to Folder Modal -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showAddToFolder && photoToAdd"
                    class="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4"
                    @click.self="showAddToFolder = false"
                >
                    <div class="bg-gray-900 rounded-xl max-w-md w-full p-6">
                        <h2 class="text-xl font-bold text-white mb-4">{{ t('photos.addToFolder.title') }}</h2>

                        <div v-if="cloudFolders.length === 0" class="text-center py-8">
                            <UIcon name="i-heroicons-folder" class="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p class="text-gray-400 mb-4">{{ t('photos.addToFolder.noFolders') }}</p>
                            <UButton :class="[theme.bg, 'text-white']" @click="showCreateFolder = true; showAddToFolder = false">
                                {{ t('photos.createFolder.title') }}
                            </UButton>
                        </div>

                        <div v-else class="space-y-2 max-h-64 overflow-y-auto">
                            <button
                                v-for="folder in cloudFolders"
                                :key="folder.id"
                                class="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-gray-800 transition-colors"
                                @click="handleAddToFolder(folder.id)"
                            >
                                <div
                                    class="w-10 h-10 rounded flex items-center justify-center"
                                    :style="{ backgroundColor: folder.coverColor || '#3b82f6' }"
                                >
                                    <UIcon name="i-heroicons-folder" class="w-5 h-5 text-white" />
                                </div>
                                <span class="text-white">{{ folder.name }}</span>
                            </button>
                        </div>

                        <div class="flex justify-end mt-6">
                            <UButton variant="ghost" color="neutral" @click="showAddToFolder = false">
                                {{ t('common.cancel') }}
                            </UButton>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
