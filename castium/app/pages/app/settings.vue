<script setup lang="ts">
import type { ThemeColor, CategoryColors } from '~/composables/useTheme'
import * as locales from "@nuxt/ui/locale"

definePageMeta({
    title: "Settings",
})

const { t, locale, setLocale } = useI18n()

const onLocaleChange = async (value: "en" | "fr" | "pl") => {
    await setLocale(value as any)
    if (process.client) window.location.reload()
}
const { user, signOut, loading } = useAuth()
const toast = useToast()
const router = useRouter()
const { radioStreams, tvStreams, loadStreams, addStream, deleteStream, loading: streamsLoading } = useCustomStreams()
const { deleteDataByCategory, deleteAllUserData, deleteAccount } = useUserDataManagement()
const { colors, setColor, resetColors, availableColors, colorClasses, defaultColors } = useTheme()

// Load custom streams on mount
onMounted(async () => {
    await loadStreams()
})

// Form state for adding new streams
const newRadioName = ref('')
const newRadioUrl = ref('')
const newTvName = ref('')
const newTvUrl = ref('')
const addingRadio = ref(false)
const addingTv = ref(false)

// Delete state
const deletingCategory = ref<string | null>(null)
const deletingAllData = ref(false)
const deletingAccount = ref(false)
const showDeleteAccountModal = ref(false)
const deleteConfirmText = ref('')

// Theme categories for color picker
const themeCategories = [
    { key: 'movies' as keyof CategoryColors, icon: 'i-heroicons-film', labelKey: 'settings.theme.movies' },
    { key: 'music' as keyof CategoryColors, icon: 'i-heroicons-musical-note', labelKey: 'settings.theme.music' },
    { key: 'podcasts' as keyof CategoryColors, icon: 'i-heroicons-microphone', labelKey: 'settings.theme.podcasts' },
    { key: 'tv' as keyof CategoryColors, icon: 'i-heroicons-tv', labelKey: 'settings.theme.tv' },
    { key: 'radio' as keyof CategoryColors, icon: 'i-heroicons-radio', labelKey: 'settings.theme.radio' },
    { key: 'lectures' as keyof CategoryColors, icon: 'i-heroicons-book-open', labelKey: 'settings.theme.lectures' },
]

const handleResetColors = () => {
    resetColors()
    toast.add({ title: t("settings.theme.resetSuccess"), color: "success" })
}

const userName = computed(() => {
    if (!user.value) return ""
    const meta = user.value.user_metadata
    return meta?.full_name || meta?.name || ""
})

const userEmail = computed(() => {
    return user.value?.email || ""
})

const userAvatar = computed(() => {
    if (!user.value) return null
    const avatar = user.value.user_metadata?.avatar_url ||
        user.value.user_metadata?.picture ||
        null
    if (!avatar || avatar === 'null' || avatar === '') return null
    return avatar
})

const handleLogout = async () => {
    try {
        await signOut()
        toast.add({
            title: t("settings.logout.success"),
            color: "success",
        })
    } catch (error: any) {
        toast.add({
            title: t("settings.logout.error"),
            description: error.message,
            color: "error",
        })
    }
}

const handleAddRadio = async () => {
    if (!newRadioName.value.trim() || !newRadioUrl.value.trim()) {
        toast.add({ title: t("settings.streams.errorEmpty"), color: "error" })
        return
    }
    addingRadio.value = true
    const success = await addStream('radio', newRadioName.value, newRadioUrl.value)
    addingRadio.value = false
    if (success) {
        newRadioName.value = ''
        newRadioUrl.value = ''
        toast.add({ title: t("settings.streams.addedRadio"), color: "success" })
    } else {
        toast.add({ title: t("settings.streams.errorAdd"), color: "error" })
    }
}

const handleAddTv = async () => {
    if (!newTvName.value.trim() || !newTvUrl.value.trim()) {
        toast.add({ title: t("settings.streams.errorEmpty"), color: "error" })
        return
    }
    addingTv.value = true
    const success = await addStream('tv', newTvName.value, newTvUrl.value)
    addingTv.value = false
    if (success) {
        newTvName.value = ''
        newTvUrl.value = ''
        toast.add({ title: t("settings.streams.addedTv"), color: "success" })
    } else {
        toast.add({ title: t("settings.streams.errorAdd"), color: "error" })
    }
}

const handleDeleteRadio = async (id: string) => {
    const success = await deleteStream(id, 'radio')
    if (success) {
        toast.add({ title: t("settings.streams.deleted"), color: "success" })
    }
}

const handleDeleteTv = async (id: string) => {
    const success = await deleteStream(id, 'tv')
    if (success) {
        toast.add({ title: t("settings.streams.deleted"), color: "success" })
    }
}

// Delete category data handlers
const handleDeleteCategoryData = async (category: 'movies' | 'music' | 'radio' | 'tv' | 'podcasts') => {
    deletingCategory.value = category
    const success = await deleteDataByCategory(category)
    deletingCategory.value = null

    if (success) {
        toast.add({ title: t("settings.data.deletedCategory", { category: t(`settings.data.categories.${category}`) }), color: "success" })
        // Reload streams if radio or tv was deleted
        if (category === 'radio' || category === 'tv') {
            await loadStreams()
        }
    } else {
        toast.add({ title: t("settings.data.deleteError"), color: "error" })
    }
}

const handleDeleteAllData = async () => {
    deletingAllData.value = true
    const success = await deleteAllUserData()
    deletingAllData.value = false

    if (success) {
        toast.add({ title: t("settings.data.deletedAll"), color: "success" })
        await loadStreams()
    } else {
        toast.add({ title: t("settings.data.deleteError"), color: "error" })
    }
}

// Get the correct confirmation text based on locale
const confirmWord = computed(() => t("settings.data.deleteAccountPlaceholder"))

const handleDeleteAccount = async () => {
    if (deleteConfirmText.value !== confirmWord.value) {
        toast.add({ title: t("settings.data.confirmTextError"), color: "error" })
        return
    }

    deletingAccount.value = true
    const success = await deleteAccount()
    deletingAccount.value = false
    showDeleteAccountModal.value = false

    if (success) {
        toast.add({ title: t("settings.data.accountDeleted"), color: "success" })
        router.push('/')
    } else {
        toast.add({ title: t("settings.data.deleteError"), color: "error" })
    }
}
</script>

<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <Navbar mode="app" />
        <div class="pt-20 px-4 md:px-8 lg:px-16 max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold text-white mb-8">
                {{ t("settings.title") }}
            </h1>

            <!-- Profile Section -->
            <UCard class="mb-6">
                <template #header>
                    <h2 class="text-xl font-semibold text-white">
                        {{ t("settings.profile.title") }}
                    </h2>
                </template>
                <div class="flex items-center gap-6">
                    <UAvatar
                        v-if="userAvatar"
                        :src="userAvatar"
                        :alt="userName"
                        size="xl"
                    />
                    <UAvatar
                        v-else
                        :text="userName.substring(0, 2).toUpperCase()"
                        size="xl"
                        class="bg-castium-green text-white text-2xl"
                    />
                    <div class="flex-1">
                        <div class="mb-4">
                            <label class="text-sm text-gray-400">
                                {{ t("settings.profile.name") }}
                            </label>
                            <p class="text-lg text-white">
                                {{ userName || "-" }}
                            </p>
                        </div>
                        <div>
                            <label class="text-sm text-gray-400">
                                {{ t("settings.profile.email") }}
                            </label>
                            <p class="text-lg text-white">{{ userEmail }}</p>
                        </div>
                    </div>
                </div>
            </UCard>

            <!-- Language Section -->
            <UCard class="mb-6">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-language" class="w-6 h-6 text-blue-400" />
                        <h2 class="text-xl font-semibold text-white">
                            {{ t("settings.language.title") }}
                        </h2>
                    </div>
                </template>
                <div class="flex items-center justify-between">
                    <p class="text-gray-400">
                        {{ t("settings.language.description") }}
                    </p>
                    <ULocaleSelect
                        v-model="locale"
                        :locales="[locales.en, locales.fr, locales.pl]"
                        class="w-44"
                        @update:model-value="onLocaleChange"
                    />
                </div>
            </UCard>

            <!-- Logout Section -->
            <UCard class="mb-6">
                <template #header>
                    <h2 class="text-xl font-semibold text-white">
                        {{ t("settings.session.title") }}
                    </h2>
                </template>
                <div class="flex items-center justify-between">
                    <p class="text-gray-400">
                        {{ t("settings.session.description") }}
                    </p>
                    <UButton
                        :loading="loading"
                        color="error"
                        variant="solid"
                        icon="i-heroicons-arrow-right-on-rectangle"
                        @click="handleLogout"
                    >
                        {{ t("settings.logout.button") }}
                    </UButton>
                </div>
            </UCard>

            <!-- Theme Colors Section -->
            <UCard class="mb-6">
                <template #header>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <UIcon name="i-heroicons-paint-brush" class="w-6 h-6 text-purple-400" />
                            <h2 class="text-xl font-semibold text-white">
                                {{ t("settings.theme.title") }}
                            </h2>
                        </div>
                        <UButton
                            color="neutral"
                            variant="ghost"
                            size="sm"
                            icon="i-heroicons-arrow-path"
                            @click="handleResetColors"
                        >
                            {{ t("settings.theme.resetAll") }}
                        </UButton>
                    </div>
                </template>

                <p class="text-gray-400 mb-6">{{ t("settings.theme.description") }}</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div
                        v-for="category in themeCategories"
                        :key="category.key"
                        class="p-4 bg-gray-800/50 rounded-lg"
                    >
                        <div class="flex items-center gap-2 mb-3">
                            <UIcon
                                :name="category.icon"
                                :class="['w-5 h-5', colorClasses[colors[category.key] as ThemeColor]?.text || 'text-gray-400']"
                            />
                            <span class="text-white font-medium">{{ t(category.labelKey) }}</span>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button
                                v-for="color in availableColors"
                                :key="color"
                                :class="[
                                    'w-6 h-6 rounded-full transition-all border-2',
                                    colorClasses[color].bg,
                                    colors[category.key] === color
                                        ? 'border-white scale-110'
                                        : 'border-transparent hover:scale-105'
                                ]"
                                :title="color"
                                @click="setColor(category.key, color)"
                            />
                        </div>
                    </div>
                </div>
            </UCard>

            <!-- Custom Radio Streams Section -->
            <UCard class="mb-6">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-radio" :class="['w-6 h-6', colorClasses[colors.radio as ThemeColor]?.text || 'text-yellow-400']" />
                        <h2 class="text-xl font-semibold text-white">
                            {{ t("settings.streams.radioTitle") }}
                        </h2>
                    </div>
                </template>

                <!-- Add form -->
                <div class="mb-4 p-4 bg-gray-800/50 rounded-lg">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <UInput
                            v-model="newRadioName"
                            :placeholder="t('settings.streams.namePlaceholder')"
                            icon="i-heroicons-musical-note"
                        />
                        <UInput
                            v-model="newRadioUrl"
                            :placeholder="t('settings.streams.urlPlaceholder')"
                            icon="i-heroicons-link"
                        />
                    </div>
                    <UButton
                        :loading="addingRadio"
                        color="primary"
                        variant="solid"
                        icon="i-heroicons-plus"
                        @click="handleAddRadio"
                    >
                        {{ t("settings.streams.addButton") }}
                    </UButton>
                </div>

                <!-- List of radio streams -->
                <div v-if="streamsLoading" class="text-gray-400 text-center py-4">
                    {{ t("settings.streams.loading") }}
                </div>
                <div v-else-if="radioStreams.length === 0" class="text-gray-500 text-center py-4">
                    {{ t("settings.streams.emptyRadio") }}
                </div>
                <div v-else class="space-y-2">
                    <div
                        v-for="stream in radioStreams"
                        :key="stream.id"
                        class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                    >
                        <div class="flex-1 min-w-0">
                            <p class="text-white font-medium truncate">{{ stream.name }}</p>
                            <p class="text-gray-500 text-sm truncate">{{ stream.url }}</p>
                        </div>
                        <UButton
                            color="error"
                            variant="ghost"
                            icon="i-heroicons-trash"
                            size="sm"
                            @click="handleDeleteRadio(stream.id)"
                        />
                    </div>
                </div>
            </UCard>

            <!-- Custom TV Streams Section -->
            <UCard class="mb-6">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-tv" :class="['w-6 h-6', colorClasses[colors.tv as ThemeColor]?.text || 'text-orange-400']" />
                        <h2 class="text-xl font-semibold text-white">
                            {{ t("settings.streams.tvTitle") }}
                        </h2>
                    </div>
                </template>

                <!-- Add form -->
                <div class="mb-4 p-4 bg-gray-800/50 rounded-lg">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <UInput
                            v-model="newTvName"
                            :placeholder="t('settings.streams.namePlaceholder')"
                            icon="i-heroicons-tv"
                        />
                        <UInput
                            v-model="newTvUrl"
                            :placeholder="t('settings.streams.urlPlaceholder')"
                            icon="i-heroicons-link"
                        />
                    </div>
                    <UButton
                        :loading="addingTv"
                        color="primary"
                        variant="solid"
                        icon="i-heroicons-plus"
                        @click="handleAddTv"
                    >
                        {{ t("settings.streams.addButton") }}
                    </UButton>
                </div>

                <!-- List of TV streams -->
                <div v-if="streamsLoading" class="text-gray-400 text-center py-4">
                    {{ t("settings.streams.loading") }}
                </div>
                <div v-else-if="tvStreams.length === 0" class="text-gray-500 text-center py-4">
                    {{ t("settings.streams.emptyTv") }}
                </div>
                <div v-else class="space-y-2">
                    <div
                        v-for="stream in tvStreams"
                        :key="stream.id"
                        class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                    >
                        <div class="flex-1 min-w-0">
                            <p class="text-white font-medium truncate">{{ stream.name }}</p>
                            <p class="text-gray-500 text-sm truncate">{{ stream.url }}</p>
                        </div>
                        <UButton
                            color="error"
                            variant="ghost"
                            icon="i-heroicons-trash"
                            size="sm"
                            @click="handleDeleteTv(stream.id)"
                        />
                    </div>
                </div>
            </UCard>

            <!-- Data Management Section -->
            <UCard class="mb-6">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-400" />
                        <h2 class="text-xl font-semibold text-white">
                            {{ t("settings.data.title") }}
                        </h2>
                    </div>
                </template>

                <p class="text-gray-400 mb-6">{{ t("settings.data.description") }}</p>

                <!-- Delete by category -->
                <div class="space-y-3 mb-8">
                    <h3 class="text-lg font-medium text-white mb-4">{{ t("settings.data.byCategory") }}</h3>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <!-- Movies -->
                        <div class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-heroicons-film" :class="['w-5 h-5', colorClasses[colors.movies as ThemeColor]?.text || 'text-red-400']" />
                                <span class="text-white">{{ t("settings.data.categories.movies") }}</span>
                            </div>
                            <UButton
                                :loading="deletingCategory === 'movies'"
                                color="error"
                                variant="soft"
                                size="sm"
                                icon="i-heroicons-trash"
                                @click="handleDeleteCategoryData('movies')"
                            />
                        </div>

                        <!-- Music -->
                        <div class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-heroicons-musical-note" :class="['w-5 h-5', colorClasses[colors.music as ThemeColor]?.text || 'text-green-400']" />
                                <span class="text-white">{{ t("settings.data.categories.music") }}</span>
                            </div>
                            <UButton
                                :loading="deletingCategory === 'music'"
                                color="error"
                                variant="soft"
                                size="sm"
                                icon="i-heroicons-trash"
                                @click="handleDeleteCategoryData('music')"
                            />
                        </div>

                        <!-- Radio -->
                        <div class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-heroicons-radio" :class="['w-5 h-5', colorClasses[colors.radio as ThemeColor]?.text || 'text-yellow-400']" />
                                <span class="text-white">{{ t("settings.data.categories.radio") }}</span>
                            </div>
                            <UButton
                                :loading="deletingCategory === 'radio'"
                                color="error"
                                variant="soft"
                                size="sm"
                                icon="i-heroicons-trash"
                                @click="handleDeleteCategoryData('radio')"
                            />
                        </div>

                        <!-- TV -->
                        <div class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-heroicons-tv" :class="['w-5 h-5', colorClasses[colors.tv as ThemeColor]?.text || 'text-orange-400']" />
                                <span class="text-white">{{ t("settings.data.categories.tv") }}</span>
                            </div>
                            <UButton
                                :loading="deletingCategory === 'tv'"
                                color="error"
                                variant="soft"
                                size="sm"
                                icon="i-heroicons-trash"
                                @click="handleDeleteCategoryData('tv')"
                            />
                        </div>

                        <!-- Podcasts -->
                        <div class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-heroicons-microphone" :class="['w-5 h-5', colorClasses[colors.podcasts as ThemeColor]?.text || 'text-pink-400']" />
                                <span class="text-white">{{ t("settings.data.categories.podcasts") }}</span>
                            </div>
                            <UButton
                                :loading="deletingCategory === 'podcasts'"
                                color="error"
                                variant="soft"
                                size="sm"
                                icon="i-heroicons-trash"
                                @click="handleDeleteCategoryData('podcasts')"
                            />
                        </div>
                    </div>
                </div>

                <!-- Delete all data -->
                <div class="border-t border-gray-700 pt-6 mb-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-medium text-white">{{ t("settings.data.deleteAllTitle") }}</h3>
                            <p class="text-gray-400 text-sm">{{ t("settings.data.deleteAllDescription") }}</p>
                        </div>
                        <UButton
                            :loading="deletingAllData"
                            color="error"
                            variant="outline"
                            icon="i-heroicons-trash"
                            @click="handleDeleteAllData"
                        >
                            {{ t("settings.data.deleteAllButton") }}
                        </UButton>
                    </div>
                </div>

                <!-- Delete account -->
                <div class="border-t border-gray-700 pt-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-medium text-red-400">{{ t("settings.data.deleteAccountTitle") }}</h3>
                            <p class="text-gray-400 text-sm">{{ t("settings.data.deleteAccountDescription") }}</p>
                        </div>
                        <UButton
                            color="error"
                            variant="solid"
                            icon="i-heroicons-exclamation-triangle"
                            @click="showDeleteAccountModal = true"
                        >
                            {{ t("settings.data.deleteAccountButton") }}
                        </UButton>
                    </div>
                </div>
            </UCard>
        </div>

        <!-- Delete Account Confirmation Modal -->
        <UModal v-model:open="showDeleteAccountModal">
            <template #content>
                <div class="p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-xl font-semibold text-white">{{ t("settings.data.deleteAccountTitle") }}</h3>
                            <p class="text-gray-400">{{ t("settings.data.deleteAccountWarning") }}</p>
                        </div>
                    </div>

                    <p class="text-gray-300 mb-4">{{ t("settings.data.deleteAccountConfirmText") }}</p>

                    <UInput
                        v-model="deleteConfirmText"
                        :placeholder="t('settings.data.deleteAccountPlaceholder')"
                        class="mb-6"
                    />

                    <div class="flex gap-3 justify-end">
                        <UButton
                            color="neutral"
                            variant="ghost"
                            @click="showDeleteAccountModal = false; deleteConfirmText = ''"
                        >
                            {{ t("common.cancel") }}
                        </UButton>
                        <UButton
                            :loading="deletingAccount"
                            :disabled="deleteConfirmText !== confirmWord"
                            color="error"
                            variant="solid"
                            @click="handleDeleteAccount"
                        >
                            {{ t("settings.data.deleteAccountButton") }}
                        </UButton>
                    </div>
                </div>
            </template>
        </UModal>
    </div>
</template>
