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
const activeTab = ref('library')

// États de suivi des vidéos
const watchingVideos = ref<any[]>([])
const watchedVideos = ref<any[]>([])
const favoriteVideos = ref<any[]>([])

const showReloadBanner = ref(false)

// Variable pour stocker le handle du dossier
let folderHandle: FileSystemDirectoryHandle | null = null

// Vérifier si la File System Access API est supportée
const isFileSystemAccessSupported = () => {
  if (typeof window === 'undefined') {
    console.log('isFileSystemAccessSupported: window is undefined (SSR)')
    return false
  }

  const hasAPI = typeof (window as any).showDirectoryPicker === 'function'
  console.log('isFileSystemAccessSupported:', hasAPI, '- showDirectoryPicker type:', typeof (window as any).showDirectoryPicker)
  return hasAPI
}

// Types
type FolderInfo = { folderName: string, fileNames: string[] } | null

// Ouvrir IndexedDB avec garantie de création des object stores
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VideoAppDB', 2)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      console.log('Upgrade event - creating object stores if needed')

      // Créer tous les object stores nécessaires
      if (!db.objectStoreNames.contains('folderHandle')) {
        db.createObjectStore('folderHandle')
        console.log('Object store folderHandle créé')
      }
      if (!db.objectStoreNames.contains('folderInfo')) {
        db.createObjectStore('folderInfo')
        console.log('Object store folderInfo créé')
      }
    }

    request.onsuccess = () => {
      const db = request.result
      console.log('IndexedDB ouvert avec succès. Objet stores:', Array.from(db.objectStoreNames))
      resolve(db)
    }

    request.onerror = () => {
      console.error("Erreur lors de l'ouverture de IndexedDB:", request.error)
      reject(request.error)
    }
  })
}

// Sauvegarder le handle du dossier en IndexedDB
const saveFolderHandle = async (handle: FileSystemDirectoryHandle) => {
  let db: IDBDatabase | null = null
  try {
    console.log('Sauvegarde du handle du dossier...')
    db = await openDB()
    console.log('DB ouverte, object stores:', Array.from(db.objectStoreNames))

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db!.transaction('folderHandle', 'readwrite')
        const store = tx.objectStore('folderHandle')
        const request = store.put(handle, 'currentFolder')

        request.onsuccess = () => {
          console.log('Handle du dossier sauvegardé en IndexedDB')
          resolve()
        }

        request.onerror = () => {
          console.error('Erreur lors de la sauvegarde du handle:', request.error)
          reject(request.error)
        }

        tx.onerror = () => {
          console.error('Erreur dans la transaction:', tx.error)
          reject(tx.error)
        }

        // Fermer la DB après la transaction complète
        tx.oncomplete = () => {
          console.log('Transaction sauvegarde complète, fermeture DB')
          db?.close()
        }
      } catch (error) {
        console.error('Erreur lors de la création de la transaction:', error)
        reject(error)
      }
    })
  } catch (error) {
    console.error('Erreur lors du stockage du handle:', error)
    db?.close()
    throw error
  }
}

// Charger le handle du dossier depuis IndexedDB
const loadFolderHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  let db: IDBDatabase | null = null
  try {
    console.log('Chargement du handle du dossier...')
    db = await openDB()
    console.log('DB ouverte, object stores:', Array.from(db.objectStoreNames))

    return new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      try {
        const tx = db!.transaction('folderHandle', 'readonly')
        const store = tx.objectStore('folderHandle')
        const request = store.get('currentFolder')

        request.onsuccess = () => {
          const handle = request.result
          if (handle) {
            console.log('Handle du dossier chargé depuis IndexedDB')
            resolve(handle)
          } else {
            console.log('Aucun handle trouvé en IndexedDB')
            resolve(null)
          }
        }

        request.onerror = () => {
          console.error('Erreur lors de la lecture du handle:', request.error)
          reject(request.error)
        }

        tx.onerror = () => {
          console.error('Erreur dans la transaction de lecture:', tx.error)
          reject(tx.error)
        }

        // Fermer la DB après la transaction complète
        tx.oncomplete = () => {
          console.log('Transaction lecture complète, fermeture DB')
          db?.close()
        }
      } catch (error) {
        console.error('Erreur lors de la création de la transaction:', error)
        reject(error)
      }
    })
  } catch (error) {
    console.error('Erreur lors du chargement du handle:', error)
    db?.close()
    return null
  }
}

// Supprimer le handle du dossier depuis IndexedDB
const removeFolderHandle = async () => {
  let db: IDBDatabase | null = null
  try {
    console.log('Suppression du handle du dossier...')
    db = await openDB()

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db!.transaction('folderHandle', 'readwrite')
        const store = tx.objectStore('folderHandle')
        const request = store.delete('currentFolder')

        request.onsuccess = () => {
          console.log('Handle du dossier supprimé')
          resolve()
        }

        request.onerror = () => {
          console.error('Erreur lors de la suppression du handle:', request.error)
          reject(request.error)
        }

        tx.onerror = () => {
          console.error('Erreur dans la transaction de suppression:', tx.error)
          reject(tx.error)
        }

        // Fermer la DB après la transaction complète
        tx.oncomplete = () => {
          console.log('Transaction suppression complète, fermeture DB')
          db?.close()
        }
      } catch (error) {
        console.error('Erreur lors de la création de la transaction:', error)
        reject(error)
      }
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du handle:', error)
    db?.close()
  }
}

// Récupérer les informations du dossier depuis IndexedDB
const getStoredFolderInfo = async (): Promise<FolderInfo> => {
  let db: IDBDatabase | null = null
  try {
    console.log('Récupération des infos du dossier depuis IndexedDB...')
    db = await openDB()

    const info = await new Promise<any>((resolve, reject) => {
      try {
        const tx = db!.transaction('folderInfo', 'readonly')
        const store = tx.objectStore('folderInfo')
        const request = store.get('videoFolder')

        request.onsuccess = () => {
          console.log('Infos du dossier récupérées:', request.result)
          resolve(request.result)
        }

        request.onerror = () => {
          console.error('Erreur lors de la lecture des infos:', request.error)
          reject(request.error)
        }

        tx.onerror = () => {
          console.error('Erreur dans la transaction:', tx.error)
          reject(tx.error)
        }

        tx.oncomplete = () => {
          console.log('Fermeture DB après lecture des infos')
          db?.close()
        }
      } catch (error) {
        console.error('Erreur lors de la création de la transaction:', error)
        reject(error)
      }
    })
    return info ?? null
  } catch (error) {
    console.error('Erreur lors de la récupération des infos du dossier:', error)
    db?.close()
    return null
  }
}

// Demander la permission persistante pour un dossier
const requestPersistentFolderAccess = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    if (!isFileSystemAccessSupported()) return null

    // Demander la permission avec accès persistant
    const handle = await (window as any).showDirectoryPicker({
      mode: 'read',
      startIn: 'documents'
    })

    // Essayer de rendre la permission persistante
    if ('requestPermission' in handle) {
      await handle.requestPermission({ mode: 'read' })
    }

    return handle
  } catch (error) {
    if ((error as any).name !== 'AbortError') {
      console.error('Erreur lors de la demande de permission:', error)
    }
    return null
  }
}

// Convertir un handle de dossier en liste de fichiers
const getFilesFromHandle = async (handle: FileSystemDirectoryHandle): Promise<File[]> => {
  const files: File[] = []

  try {
    // Utiliser directement le symbole iterator de FileSystemDirectoryHandle
    for await (const entry of (handle as any)) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle
        const file = await fileHandle.getFile()

        // Filtrer seulement les vidéos
        if (file.name.toLowerCase().match(/\.(mp4|avi|mkv|mov)$/)) {
          files.push(file)
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la lecture des fichiers:', error)
    throw error
  }

  return files
}

// Charger le dossier vidéo depuis le profil
const loadVideoFolder = async () => {
  if (!profile.value) return
  videoFolderPath.value = profile.value.video_folder_path || ''
  videoFileNames.value = profile.value.video_files || []
  watchingVideos.value = profile.value.video_watching || []
  watchedVideos.value = profile.value.video_watched || []
  favoriteVideos.value = profile.value.video_favorites || []

  console.log('loadVideoFolder: chemin du profil =', videoFolderPath.value)

  // Si un dossier est sauvegardé, essayer de le recharger automatiquement
  if (videoFolderPath.value && videoFileNames.value.length > 0) {
    await tryReloadFolder()
  }
}

// Tenter de recharger automatiquement le dossier sauvegardé
const tryReloadFolder = async () => {
  try {
    console.log('tryReloadFolder: Début')
    // Vérifier si un dossier a été sauvegardé dans le profil
    if (videoFolderPath.value && videoFileNames.value.length > 0) {
      console.log('tryReloadFolder: Dossier sauvegardé trouvé:', videoFolderPath.value)

      // Essayer d'abord de charger le handle depuis IndexedDB
      if (!folderHandle) {
        console.log('tryReloadFolder: Chargement du handle depuis IndexedDB...')
        folderHandle = await loadFolderHandle()
      }

      // Si on a un handle, l'utiliser directement
      if (folderHandle) {
        console.log('tryReloadFolder: Handle chargé, utilisation pour charger les fichiers')
        try {
          const files = await getFilesFromHandle(folderHandle)
          videoFiles.value = files
          console.log('tryReloadFolder: Fichiers chargés depuis le handle:', files.length)
          showReloadBanner.value = false
          return
        } catch (error) {
          console.log('tryReloadFolder: Le handle sauvegardé n\'est plus valide:', error)
          // Le handle n'est plus valide, supprimer et redemander
          await removeFolderHandle()
          folderHandle = null
        }
      }

      // Si on a les infos mais pas les fichiers, essayer de reconnecter automatiquement
      if (videoFiles.value.length === 0) {
        console.log('Tentative de reconnexion automatique...')
        try {
          await reconnectFolder()
          // Si la reconnexion réussit, on n'affiche pas la bannière
          if (videoFiles.value.length > 0) {
            console.log('Reconnexion automatique réussie')
            return
          }
        } catch (error) {
          console.log('Reconnexion automatique échouée:', error)
        }

        // Si la reconnexion automatique échoue, afficher la bannière
        showReloadBanner.value = true
      }
    }

  } catch (error) {
    console.log('Erreur lors du rechargement automatique:', error)
    showReloadBanner.value = true
  }
}

// Sauvegarder le dossier vidéo et les fichiers
const saveVideoFolder = async () => {
  if (!profile.value) {
    console.warn('Profile not available, cannot save video folder')
    return
  }
  try {
    console.log('Saving video folder:', { videoFolderPath: videoFolderPath.value })
    const { error } = await supabase
      .from('profiles')
      .update({
        video_folder_path: videoFolderPath.value,
        video_files: videoFileNames.value,
        video_watching: watchingVideos.value,
        video_watched: watchedVideos.value,
        video_favorites: favoriteVideos.value
      })
      .eq('id', profile.value.id)
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    console.log('Video folder saved successfully')
    // Mettre à jour le profil local
    profile.value.video_folder_path = videoFolderPath.value
    profile.value.video_files = videoFileNames.value
    profile.value.video_watching = watchingVideos.value
    profile.value.video_watched = watchedVideos.value
    profile.value.video_favorites = favoriteVideos.value
  } catch (error) {
    console.error('Error saving video folder:', error)
  }
}

// Sélectionner un dossier et scanner les MP4
const selectFolder = async () => {
  try {
    console.log('selectFolder: Début de la sélection du dossier')
    if (isFileSystemAccessSupported()) {
      console.log('selectFolder: File System Access API est supportée')
      // Utiliser la File System Access API moderne
      const handle = await (window as any).showDirectoryPicker({
        mode: 'read',
        startIn: 'documents'
      })
      console.log('selectFolder: Dossier sélectionné:', handle.name)

      // Sauvegarder le handle pour l'utiliser sans redemander la permission
      folderHandle = handle
      console.log('selectFolder: Sauvegarde du handle...')
      await saveFolderHandle(handle)
      console.log('selectFolder: Handle sauvegardé avec succès')

      // Récupérer les fichiers
      console.log('selectFolder: Chargement des fichiers du dossier...')
      const files = await getFilesFromHandle(handle)
      console.log(`selectFolder: ${files.length} vidéos trouvées`)

      videoFiles.value = files
      videoFileNames.value = files.map(file => file.name)
      videoFolderPath.value = handle.name

      // Sauvegarder automatiquement dans Supabase
      console.log('selectFolder: Sauvegarde dans Supabase...')
      await saveVideoFolder()
      console.log('selectFolder: Données sauvegardées dans Supabase')
      showReloadBanner.value = false

      console.log(`selectFolder: ${files.length} vidéos chargées depuis ${handle.name}`)

    } else {
      console.log('selectFolder: File System Access API non supportée, utilisation du fallback')
      // Fallback vers l'ancienne méthode
      const input = document.createElement('input')
      input.type = 'file'
      input.webkitdirectory = true
      input.multiple = true
      console.log('selectFolder: Ouverture du sélecteur de dossier fallback')
      input.onchange = async (e) => {
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
          await saveVideoFolder()
          showReloadBanner.value = false
        }
      }
      input.click()
    }
  } catch (error) {
    if ((error as any).name !== 'AbortError') {
      console.error('Erreur lors de la sélection du dossier:', error)
      alert('Erreur lors de la sélection du dossier. Veuillez réessayer.')
    }
  }
}

// Reconnecter le dossier sauvegardé (appelée depuis la bannière)
const reconnectFolder = async () => {
  try {
    // D'abord, essayer d'utiliser le handle sauvegardé
    if (!folderHandle) {
      folderHandle = await loadFolderHandle()
    }

    let handle: FileSystemDirectoryHandle | null = folderHandle

    // Si on n'a pas de handle valide, demander à l'utilisateur
    if (!handle && isFileSystemAccessSupported()) {
      console.log('Pas de handle sauvegardé, demander à l\'utilisateur de sélectionner le dossier')
      handle = await (window as any).showDirectoryPicker({
        mode: 'read',
        startIn: 'documents'
      })

      if (handle) {
        folderHandle = handle
        await saveFolderHandle(handle)
      }
    }

    if (handle) {
      try {
        // Vérifier que c'est le bon dossier en comparant le nom
        if (handle.name === videoFolderPath.value) {
          const files = await getFilesFromHandle(handle)

          videoFiles.value = files
          videoFileNames.value = files.map(file => file.name)
          videoFolderPath.value = handle.name

          await saveVideoFolder()
          showReloadBanner.value = false

          console.log(`${files.length} vidéos reconnectées depuis ${handle.name}`)
          return
        }
      } catch (error) {
        console.log('Le handle sauvegardé n\'est plus valide:', error)
        // Le handle n'est plus valide, le supprimer
        await removeFolderHandle()
        folderHandle = null
      }
    }

    // Si la reconnexion automatique échoue, faire une sélection normale
    await selectFolder()

  } catch (error) {
    if ((error as any).name !== 'AbortError') {
      console.error('Erreur lors de la reconnexion:', error)
      // En cas d'erreur, faire une sélection normale
      await selectFolder()
    }
  }
}

// Extraire les métadonnées d'un nom de fichier
const extractMetadata = (fileName: string) => {
  const name = fileName.replace(/\.(mp4|avi|mkv|mov)$/i, '')

  // Patterns courants pour extraire des infos
  const yearMatch = name.match(/\((\d{4})\)/) || name.match(/(\d{4})/)
  const seasonEpisodeMatch = name.match(/[sS](\d+)[eE](\d+)/)
  const qualityMatch = name.match(/(1080p|720p|480p|4K|HD|SD)/i)

  return {
    title: name.replace(/\([^(]*\d{4}[^)]*\)/g, '').replace(/[sS]\d+[eE]\d+/g, '').trim(),
    year: yearMatch ? parseInt(yearMatch[1]) : null,
    season: seasonEpisodeMatch ? parseInt(seasonEpisodeMatch[1]) : null,
    episode: seasonEpisodeMatch ? parseInt(seasonEpisodeMatch[2]) : null,
    quality: qualityMatch ? qualityMatch[1] : null,
    isSeries: !!seasonEpisodeMatch
  }
}

// Jouer une vidéo
const playVideo = async (fileOrName: File | string) => {
  let file: File | undefined
  let fileName: string

  if (fileOrName instanceof File) {
    // Cas où on passe directement un objet File (depuis la bibliothèque)
    file = fileOrName
    fileName = file.name
  } else {
    // Cas où on passe un nom de fichier (depuis les autres onglets)
    fileName = fileOrName
    file = videoFiles.value.find(f => f.name === fileName)
  }

  if (file) {
    // Fichier disponible, on peut le lire
    selectedVideo.value = file
    showVideoPlayer.value = true

    // Marquer comme en cours de visionnage
    const metadata = extractMetadata(file.name)
    const videoData = {
      name: file.name,
      metadata,
      lastWatched: new Date().toISOString(),
      progress: 0
    }

    // Retirer des regardés si présent
    watchedVideos.value = watchedVideos.value.filter(v => v.name !== file.name)

    // Ajouter aux vidéos en cours (ou mettre à jour)
    const existingIndex = watchingVideos.value.findIndex(v => v.name === file.name)
    if (existingIndex >= 0) {
      watchingVideos.value[existingIndex] = videoData
    } else {
      watchingVideos.value.unshift(videoData)
    }

    saveVideoFolder()
  } else {
    // Fichier non disponible - essayer de reconnecter ou sélectionner
    console.log(`Fichier "${fileName}" non disponible, tentative de reconnexion...`)

    // Essayer de reconnecter le dossier d'abord
    if (videoFileNames.value.includes(fileName)) {
      // On a des infos sauvegardées, essayer de reconnecter
      await reconnectFolder()
      // Après reconnexion, réessayer de jouer la vidéo
      const reconnectedFile = videoFiles.value.find(f => f.name === fileName)
      if (reconnectedFile) {
        selectedVideo.value = reconnectedFile
        showVideoPlayer.value = true
        return
      }
    }

    // Si la reconnexion échoue, demander une nouvelle sélection
    alert(`Le fichier "${fileName}" n'est plus accessible. Veuillez re-sélectionner votre dossier vidéo.`)
    selectFolder()
  }
}
// Marquer une vidéo comme regardée
const markAsWatched = (fileName: string) => {
  const metadata = extractMetadata(fileName)
  const videoData = {
    name: fileName,
    metadata,
    watchedAt: new Date().toISOString()
  }

  // Retirer des vidéos en cours
  watchingVideos.value = watchingVideos.value.filter(v => v.name !== fileName)

  // Ajouter aux vidéos regardées
  const existingIndex = watchedVideos.value.findIndex(v => v.name === fileName)
  if (existingIndex >= 0) {
    watchedVideos.value[existingIndex] = videoData
  } else {
    watchedVideos.value.unshift(videoData)
  }

  saveVideoFolder()
}

// Basculer favori
const toggleFavorite = (fileName: string) => {
  const metadata = extractMetadata(fileName)
  const videoData = {
    name: fileName,
    metadata,
    addedAt: new Date().toISOString()
  }

  const existingIndex = favoriteVideos.value.findIndex(v => v.name === fileName)
  if (existingIndex >= 0) {
    favoriteVideos.value.splice(existingIndex, 1)
  } else {
    favoriteVideos.value.unshift(videoData)
  }

  saveVideoFolder()
}

// Vérifier si une vidéo est favorite
const isFavorite = (fileName: string) => {
  return favoriteVideos.value.some(v => v.name === fileName)
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

// Watcher pour charger les données quand le profil devient disponible
watch(profile, async (newProfile) => {
  if (newProfile) {
    console.log('Profile loaded, calling loadVideoFolder')
    await loadVideoFolder()
  }
}, { immediate: false })

onMounted(async () => {
  console.log('Video page mounted')

  // Essayer de charger le handle au démarrage
  if (!folderHandle) {
    folderHandle = await loadFolderHandle()
  }

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
                    <div class="flex-1">
                        <h2 class="text-xl font-bold text-white mb-1">
                            {{ selectedVideo ? extractMetadata(selectedVideo.name).title : '' }}
                        </h2>
                        <div class="flex items-center gap-4 text-sm text-gray-400">
                            <span v-if="selectedVideo && extractMetadata(selectedVideo.name).year">
                                {{ extractMetadata(selectedVideo.name).year }}
                            </span>
                            <span v-if="selectedVideo && extractMetadata(selectedVideo.name).quality">
                                {{ extractMetadata(selectedVideo.name).quality }}
                            </span>
                            <span v-if="selectedVideo && extractMetadata(selectedVideo.name).isSeries">
                                S{{ extractMetadata(selectedVideo.name).season }}E{{ extractMetadata(selectedVideo.name).episode }}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <UButton
                            v-if="selectedVideo && isFavorite(selectedVideo.name)"
                            color="red"
                            variant="ghost"
                            size="sm"
                            @click="toggleFavorite(selectedVideo.name)"
                        >
                            <UIcon name="i-heroicons-heart-solid" class="text-red-500" />
                        </UButton>
                        <UButton
                            v-else-if="selectedVideo"
                            color="gray"
                            variant="ghost"
                            size="sm"
                            @click="toggleFavorite(selectedVideo.name)"
                        >
                            <UIcon name="i-heroicons-heart" />
                        </UButton>
                        <UButton
                            color="gray"
                            variant="ghost"
                            size="sm"
                            @click="closePlayer"
                        >
                            <UIcon name="i-heroicons-x-mark" />
                        </UButton>
                    </div>
                </div>
                <div class="aspect-video bg-black rounded-lg overflow-hidden" @click.stop>
                    <video
                        v-if="selectedVideo"
                        :src="getVideoUrl(selectedVideo)"
                        controls
                        autoplay
                        class="w-full h-full"
                        preload="metadata"
                        @ended="selectedVideo && markAsWatched(selectedVideo.name)"
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

                <!-- Si dossier sélectionné, afficher les onglets -->
                <div v-else>
                    <!-- Message si dossier sauvegardé mais fichiers non disponibles -->
                    <div v-if="videoFolderPath && videoFileNames.length > 0 && videoFiles.length === 0" class="mb-8 p-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                        <div class="flex items-center gap-4">
                            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-yellow-400" />
                            <div class="flex-1">
                                <h3 class="text-yellow-400 font-medium mb-1">Dossier détecté</h3>
                                <p class="text-gray-300 text-sm">
                                    Votre dossier "{{ videoFolderPath }}" contient {{ videoFileNames.length }} vidéos, mais elles ne sont plus accessibles.
                                    Re-sélectionnez votre dossier pour continuer à regarder vos vidéos.
                                </p>
                            </div>
                            <UButton
                                color="yellow"
                                variant="solid"
                                size="sm"
                                @click="selectFolder"
                            >
                                Re-sélectionner
                            </UButton>
                        </div>
                    </div>

                    <!-- Bannière de notification pour recharger le dossier -->
                    <div v-if="showReloadBanner" class="mb-8 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <UIcon name="i-heroicons-information-circle" class="w-6 h-6 text-blue-400" />
                                <div>
                                    <p class="text-blue-400 font-medium">Dossier sauvegardé détecté</p>
                                    <p class="text-gray-300 text-sm">
                                        Votre dossier "{{ videoFolderPath }}" a été sauvegardé. Re-sélectionnez-le pour accéder à vos {{ videoFileNames.length }} vidéos.
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <UButton
                                    color="blue"
                                    variant="solid"
                                    size="sm"
                                    @click="reconnectFolder"
                                >
                                    Recharger
                                </UButton>
                                <UButton
                                    color="gray"
                                    variant="ghost"
                                    size="sm"
                                    @click="showReloadBanner = false"
                                >
                                    <UIcon name="i-heroicons-x-mark" />
                                </UButton>
                            </div>
                        </div>
                    </div>

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

                    <!-- Onglets -->
                    <div class="mb-8">
                        <nav class="flex space-x-8">
                            <button
                                @click="activeTab = 'library'"
                                :class="[
                                    'text-lg font-medium pb-2 border-b-2 transition-colors',
                                    activeTab === 'library'
                                        ? 'text-white border-purple-500'
                                        : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                                ]"
                            >
                                {{ t('videos.tabs.library') }}
                            </button>
                            <button
                                @click="activeTab = 'watching'"
                                :class="[
                                    'text-lg font-medium pb-2 border-b-2 transition-colors',
                                    activeTab === 'watching'
                                        ? 'text-white border-purple-500'
                                        : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                                ]"
                            >
                                {{ t('videos.tabs.watching') }}
                                <span v-if="watchingVideos.length > 0" class="ml-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                                    {{ watchingVideos.length }}
                                </span>
                            </button>
                            <button
                                @click="activeTab = 'watched'"
                                :class="[
                                    'text-lg font-medium pb-2 border-b-2 transition-colors',
                                    activeTab === 'watched'
                                        ? 'text-white border-purple-500'
                                        : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                                ]"
                            >
                                {{ t('videos.tabs.watched') }}
                                <span v-if="watchedVideos.length > 0" class="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                    {{ watchedVideos.length }}
                                </span>
                            </button>
                            <button
                                @click="activeTab = 'favorites'"
                                :class="[
                                    'text-lg font-medium pb-2 border-b-2 transition-colors',
                                    activeTab === 'favorites'
                                        ? 'text-white border-purple-500'
                                        : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                                ]"
                            >
                                {{ t('videos.tabs.favorites') }}
                                <span v-if="favoriteVideos.length > 0" class="ml-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                                    {{ favoriteVideos.length }}
                                </span>
                            </button>
                        </nav>
                    </div>

                    <!-- Bibliothèque principale -->
                    <div v-if="activeTab === 'library'">
                        <div v-if="videoFiles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            <div
                                v-for="(file, index) in videoFiles"
                                :key="index"
                                class="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer group relative"
                                @click="playVideo(file)"
                            >
                                <!-- Bouton favori -->
                                <button
                                    @click.stop="toggleFavorite(file.name)"
                                    class="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <UIcon
                                        :name="isFavorite(file.name) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                                        :class="isFavorite(file.name) ? 'text-red-500' : 'text-white'"
                                    />
                                </button>

                                <!-- Thumbnail placeholder -->
                                <div class="aspect-video bg-gray-700 flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                                    <UIcon
                                        name="i-heroicons-video-camera"
                                        class="w-12 h-12 text-gray-400 group-hover:text-white transition-colors"
                                    />
                                </div>

                                <!-- Info vidéo -->
                                <div class="p-4">
                                    <h3 class="text-white font-medium text-sm mb-1 truncate" :title="extractMetadata(file.name).title">
                                        {{ extractMetadata(file.name).title }}
                                    </h3>
                                    <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                        <span v-if="extractMetadata(file.name).year">{{ extractMetadata(file.name).year }}</span>
                                        <span v-if="extractMetadata(file.name).quality">{{ extractMetadata(file.name).quality }}</span>
                                        <span v-if="extractMetadata(file.name).isSeries">
                                            S{{ extractMetadata(file.name).season }}E{{ extractMetadata(file.name).episode }}
                                        </span>
                                    </div>
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

                    <!-- Vidéos en cours -->
                    <div v-else-if="activeTab === 'watching'">
                        <div v-if="watchingVideos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            <div
                                v-for="video in watchingVideos"
                                :key="video.name"
                                class="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer group relative"
                                @click="playVideo(video.name)"
                            >
                                <!-- Indicateur "En cours" -->
                                <div class="absolute top-2 left-2 z-10 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                                    En cours
                                </div>

                                <!-- Bouton favori -->
                                <button
                                    @click.stop="toggleFavorite(video.name)"
                                    class="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <UIcon
                                        :name="isFavorite(video.name) ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                                        :class="isFavorite(video.name) ? 'text-red-500' : 'text-white'"
                                    />
                                </button>

                                <div class="aspect-video bg-gray-700 flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                                    <UIcon name="i-heroicons-play" class="w-12 h-12 text-purple-400" />
                                </div>

                                <div class="p-4">
                                    <h3 class="text-white font-medium text-sm mb-1 truncate" :title="video.metadata.title">
                                        {{ video.metadata.title }}
                                    </h3>
                                    <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                        <span v-if="video.metadata.year">{{ video.metadata.year }}</span>
                                        <span v-if="video.metadata.quality">{{ video.metadata.quality }}</span>
                                        <span v-if="video.metadata.isSeries">
                                            S{{ video.metadata.season }}E{{ video.metadata.episode }}
                                        </span>
                                    </div>
                                    <p class="text-gray-400 text-xs">
                                        Vu le {{ new Date(video.lastWatched).toLocaleDateString('fr-FR') }}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div v-else class="flex flex-col items-center justify-center min-h-[40vh]">
                            <UIcon name="i-heroicons-play-circle" class="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h2 class="text-xl font-bold text-white mb-2">Aucune vidéo en cours</h2>
                            <p class="text-gray-400 text-center">Commencez à regarder une vidéo pour la voir apparaître ici.</p>
                        </div>
                    </div>

                    <!-- Vidéos regardées -->
                    <div v-else-if="activeTab === 'watched'">
                        <div v-if="watchedVideos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            <div
                                v-for="video in watchedVideos"
                                :key="video.name"
                                class="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer group relative"
                                @click="playVideo(video.name)"
                            >
                                <!-- Indicateur "Vu" -->
                                <div class="absolute top-2 left-2 z-10 bg-green-600 text-white text-xs px-2 py-1 rounded">
                                    <UIcon name="i-heroicons-check" class="w-3 h-3" />
                                </div>

                                <!-- Bouton favori -->
                                <button
                                    @click.stop="toggleFavorite(video.name)"
                                    class="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <UIcon name="i-heroicons-heart-solid" class="text-red-500" />
                                </button>

                                <div class="aspect-video bg-gray-700 flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                                    <UIcon name="i-heroicons-play" class="w-12 h-12 text-green-400" />
                                </div>

                                <div class="p-4">
                                    <h3 class="text-white font-medium text-sm mb-1 truncate" :title="video.metadata.title">
                                        {{ video.metadata.title }}
                                    </h3>
                                    <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                        <span v-if="video.metadata.year">{{ video.metadata.year }}</span>
                                        <span v-if="video.metadata.quality">{{ video.metadata.quality }}</span>
                                        <span v-if="video.metadata.isSeries">
                                            S{{ video.metadata.season }}E{{ video.metadata.episode }}
                                        </span>
                                    </div>
                                    <p class="text-gray-400 text-xs">
                                        Vu le {{ new Date(video.watchedAt).toLocaleDateString('fr-FR') }}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div v-else class="flex flex-col items-center justify-center min-h-[40vh]">
                            <UIcon name="i-heroicons-eye" class="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h2 class="text-xl font-bold text-white mb-2">Aucune vidéo regardée</h2>
                            <p class="text-gray-400 text-center">Les vidéos terminées apparaîtront ici.</p>
                        </div>
                    </div>

                    <!-- Vidéos favorites -->
                    <div v-else-if="activeTab === 'favorites'">
                        <div v-if="favoriteVideos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            <div
                                v-for="video in favoriteVideos"
                                :key="video.name"
                                class="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer group relative"
                                @click="playVideo(video.name)"
                            >
                                <!-- Indicateur favori -->
                                <div class="absolute top-2 left-2 z-10 bg-red-600 text-white text-xs px-2 py-1 rounded">
                                    <UIcon name="i-heroicons-heart" class="w-3 h-3" />
                                </div>

                                <!-- Bouton retirer favori -->
                                <button
                                    @click.stop="toggleFavorite(video.name)"
                                    class="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full opacity-100 transition-opacity"
                                >
                                    <UIcon name="i-heroicons-heart-solid" class="text-red-500" />
                                </button>

                                <div class="aspect-video bg-gray-700 flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                                    <UIcon name="i-heroicons-play" class="w-12 h-12 text-red-400" />
                                </div>

                                <div class="p-4">
                                    <h3 class="text-white font-medium text-sm mb-1 truncate" :title="video.metadata.title">
                                        {{ video.metadata.title }}
                                    </h3>
                                    <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                        <span v-if="video.metadata.year">{{ video.metadata.year }}</span>
                                        <span v-if="video.metadata.quality">{{ video.metadata.quality }}</span>
                                        <span v-if="video.metadata.isSeries">
                                            S{{ video.metadata.season }}E{{ video.metadata.episode }}
                                        </span>
                                    </div>
                                    <p class="text-gray-400 text-xs">
                                        Ajouté le {{ new Date(video.addedAt).toLocaleDateString('fr-FR') }}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div v-else class="flex flex-col items-center justify-center min-h-[40vh]">
                            <UIcon name="i-heroicons-heart" class="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h2 class="text-xl font-bold text-white mb-2">Aucune vidéo favorite</h2>
                            <p class="text-gray-400 text-center">Ajoutez des vidéos à vos favoris en cliquant sur le cœur.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
