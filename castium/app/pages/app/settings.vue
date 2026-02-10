<script setup lang="ts">
import type { ThemeColor, CategoryColors } from '~/composables/useTheme'
import * as locales from '@nuxt/ui/locale'

definePageMeta({
    title: 'Settings',
})

const { t, locale, setLocale } = useI18n()

const selectedLocale = computed({
  get: () => locale.value as 'en' | 'fr' | 'pl',
  set: async (val) => {
    await setLocale(val)
  },
})

const {
    user,
    signOut,
    loading,
    resetPassword,
    updatePassword,
    verifyPassword,
    updateUserMetadata,
} = useAuth()
const toast = useToast()
const router = useRouter()
const {
    radioStreams,
    tvStreams,
    loadStreams,
    addStream,
    deleteStream,
    loading: streamsLoading,
} = useCustomStreams()
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

// Profile editing state
const isEditingUsername = ref(false)
const editUsername = ref('')
const savingUsername = ref(false)

// Password state
const showPasswordSection = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const verifyingPassword = ref(false)
const passwordVerified = ref(false)
const changingPassword = ref(false)
const sendingResetEmail = ref(false)

// Theme categories for color picker
const themeCategories = [
    {
        key: 'movies' as keyof CategoryColors,
        icon: 'i-heroicons-film',
        labelKey: 'settings.theme.movies',
    },
    {
        key: 'music' as keyof CategoryColors,
        icon: 'i-heroicons-musical-note',
        labelKey: 'settings.theme.music',
    },
    {
        key: 'podcasts' as keyof CategoryColors,
        icon: 'i-heroicons-microphone',
        labelKey: 'settings.theme.podcasts',
    },
    { key: 'tv' as keyof CategoryColors, icon: 'i-heroicons-tv', labelKey: 'settings.theme.tv' },
    {
        key: 'radio' as keyof CategoryColors,
        icon: 'i-heroicons-radio',
        labelKey: 'settings.theme.radio',
    },
    {
        key: 'lectures' as keyof CategoryColors,
        icon: 'i-heroicons-book-open',
        labelKey: 'settings.theme.lectures',
    },
]

const handleResetColors = () => {
    resetColors()
    toast.add({ title: t('settings.theme.resetSuccess'), color: 'success' })
}

const userName = computed(() => {
    if (!user.value) return ''
    const meta = user.value.user_metadata
    return meta?.full_name || meta?.name || meta?.username || ''
})

const userEmail = computed(() => {
    return user.value?.email || ''
})

const userAvatar = computed(() => {
    if (!user.value) return null
    const avatar = user.value.user_metadata?.avatar_url || user.value.user_metadata?.picture || null
    if (!avatar || avatar === 'null' || avatar === '') return null
    return avatar
})

const userCreatedAt = computed(() => {
    if (!user.value?.created_at) return ''
    return new Date(user.value.created_at).toLocaleDateString()
})

const userLastSignIn = computed(() => {
    if (!user.value?.last_sign_in_at) return ''
    return new Date(user.value.last_sign_in_at).toLocaleDateString()
})

// Profile editing handlers
const startEditingUsername = () => {
    editUsername.value = userName.value
    isEditingUsername.value = true
}

const cancelEditingUsername = () => {
    isEditingUsername.value = false
    editUsername.value = ''
}

const saveUsername = async () => {
    if (!editUsername.value.trim()) {
        toast.add({ title: t('settings.profile.usernameEmpty'), color: 'error' })
        return
    }

    savingUsername.value = true
    const { error } = await updateUserMetadata({
        full_name: editUsername.value.trim(),
        name: editUsername.value.trim(),
    })
    savingUsername.value = false

    if (error) {
        toast.add({ title: t('settings.profile.updateError'), color: 'error' })
    } else {
        toast.add({ title: t('settings.profile.updateSuccess'), color: 'success' })
        isEditingUsername.value = false
    }
}

// Password handlers
const handleVerifyPassword = async () => {
    if (!currentPassword.value) {
        toast.add({ title: t('settings.password.enterCurrent'), color: 'error' })
        return
    }

    verifyingPassword.value = true
    const { success, error } = await verifyPassword(currentPassword.value)
    verifyingPassword.value = false

    if (success) {
        passwordVerified.value = true
        toast.add({ title: t('settings.password.verified'), color: 'success' })
    } else {
        toast.add({ title: t('settings.password.wrongPassword'), color: 'error' })
    }
}

const handleChangePassword = async () => {
    if (!newPassword.value || !confirmPassword.value) {
        toast.add({ title: t('settings.password.fillAll'), color: 'error' })
        return
    }

    if (newPassword.value !== confirmPassword.value) {
        toast.add({ title: t('settings.password.noMatch'), color: 'error' })
        return
    }

    if (newPassword.value.length < 8) {
        toast.add({ title: t('settings.password.tooShort'), color: 'error' })
        return
    }

    changingPassword.value = true
    const { error } = await updatePassword(newPassword.value)
    changingPassword.value = false

    if (error) {
        toast.add({ title: t('settings.password.changeError'), color: 'error' })
    } else {
        toast.add({ title: t('settings.password.changeSuccess'), color: 'success' })
        // Reset form
        currentPassword.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
        passwordVerified.value = false
        showPasswordSection.value = false
    }
}

const handleForgotPassword = async () => {
    if (!userEmail.value) return

    sendingResetEmail.value = true
    const { error } = await resetPassword(userEmail.value)
    sendingResetEmail.value = false

    if (error) {
        toast.add({ title: t('settings.password.resetError'), color: 'error' })
    } else {
        toast.add({ title: t('settings.password.resetSent'), color: 'success' })
    }
}

const handleLogout = async () => {
    try {
        await signOut()
        toast.add({
            title: t('settings.logout.success'),
            color: 'success',
        })
    } catch (error: any) {
        toast.add({
            title: t('settings.logout.error'),
            description: error.message,
            color: 'error',
        })
    }
}

const handleAddRadio = async () => {
    if (!newRadioName.value.trim() || !newRadioUrl.value.trim()) {
        toast.add({ title: t('settings.streams.errorEmpty'), color: 'error' })
        return
    }
    addingRadio.value = true
    const success = await addStream('radio', newRadioName.value, newRadioUrl.value)
    addingRadio.value = false
    if (success) {
        newRadioName.value = ''
        newRadioUrl.value = ''
        toast.add({ title: t('settings.streams.addedRadio'), color: 'success' })
    } else {
        toast.add({ title: t('settings.streams.errorAdd'), color: 'error' })
    }
}

const handleAddTv = async () => {
    if (!newTvName.value.trim() || !newTvUrl.value.trim()) {
        toast.add({ title: t('settings.streams.errorEmpty'), color: 'error' })
        return
    }
    addingTv.value = true
    const success = await addStream('tv', newTvName.value, newTvUrl.value)
    addingTv.value = false
    if (success) {
        newTvName.value = ''
        newTvUrl.value = ''
        toast.add({ title: t('settings.streams.addedTv'), color: 'success' })
    } else {
        toast.add({ title: t('settings.streams.errorAdd'), color: 'error' })
    }
}

const handleDeleteRadio = async (id: string) => {
    const success = await deleteStream(id, 'radio')
    if (success) {
        toast.add({ title: t('settings.streams.deleted'), color: 'success' })
    }
}

const handleDeleteTv = async (id: string) => {
    const success = await deleteStream(id, 'tv')
    if (success) {
        toast.add({ title: t('settings.streams.deleted'), color: 'success' })
    }
}

// Delete category data handlers
const handleDeleteCategoryData = async (
    category: 'lectures' | 'music' | 'radio' | 'tv' | 'podcasts'
) => {
    deletingCategory.value = category
    const success = await deleteDataByCategory(category)
    deletingCategory.value = null

    if (success) {
        toast.add({
            title: t('settings.data.deletedCategory', {
                category: t(`settings.data.categories.${category}`),
            }),
            color: 'success',
        })
        // Reload streams if radio or tv was deleted
        if (category === 'radio' || category === 'tv') {
            await loadStreams()
        }
    } else {
        toast.add({ title: t('settings.data.deleteError'), color: 'error' })
    }
}

const handleDeleteAllData = async () => {
    deletingAllData.value = true
    const success = await deleteAllUserData()
    deletingAllData.value = false

    if (success) {
        toast.add({ title: t('settings.data.deletedAll'), color: 'success' })
        await loadStreams()
    } else {
        toast.add({ title: t('settings.data.deleteError'), color: 'error' })
    }
}

// Get the correct confirmation text based on locale
const confirmWord = computed(() => t('settings.data.deleteAccountPlaceholder'))

const handleDeleteAccount = async () => {
    if (deleteConfirmText.value !== confirmWord.value) {
        toast.add({ title: t('settings.data.confirmTextError'), color: 'error' })
        return
    }

    deletingAccount.value = true
    const success = await deleteAccount()
    deletingAccount.value = false
    showDeleteAccountModal.value = false

    if (success) {
        toast.add({ title: t('settings.data.accountDeleted'), color: 'success' })
        router.push('/')
    } else {
        toast.add({ title: t('settings.data.deleteError'), color: 'error' })
    }
}
</script>

<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <Navbar mode="app" />
        <div class="pt-20 px-4 md:px-8 lg:px-16 max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold text-white mb-8">
                {{ t('settings.title') }}
            </h1>

            <!-- Profile Section -->
            <UCard class="mb-6">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-user-circle" class="w-6 h-6 text-green-400" />
                        <h2 class="text-xl font-semibold text-white">
                            {{ t('settings.profile.title') }}
                        </h2>
                    </div>
                </template>
                <div class="flex flex-col md:flex-row md:items-start gap-6">
                    <UAvatar v-if="userAvatar" :src="userAvatar" :alt="userName" size="xl" />
                    <UAvatar
                        v-else
                        :text="userName.substring(0, 2).toUpperCase() || '?'"
                        size="xl"
                        class="bg-castium-green text-white text-2xl"
                    />
                    <div class="flex-1 space-y-4">
                        <!-- Username (editable) -->
                        <div>
                            <label class="text-sm text-gray-400 block mb-1">
                                {{ t('settings.profile.name') }}
                            </label>
                            <div v-if="!isEditingUsername" class="flex items-center gap-2">
                                <p class="text-lg text-white">{{ userName || '-' }}</p>
                                <UButton
                                    icon="i-heroicons-pencil"
                                    size="xs"
                                    color="neutral"
                                    variant="ghost"
                                    @click="startEditingUsername"
                                />
                            </div>
                            <div v-else class="flex items-center gap-2">
                                <UInput
                                    v-model="editUsername"
                                    :placeholder="t('settings.profile.namePlaceholder')"
                                    class="flex-1"
                                />
                                <UButton
                                    icon="i-heroicons-check"
                                    size="sm"
                                    color="primary"
                                    :loading="savingUsername"
                                    @click="saveUsername"
                                />
                                <UButton
                                    icon="i-heroicons-x-mark"
                                    size="sm"
                                    color="neutral"
                                    variant="ghost"
                                    @click="cancelEditingUsername"
                                />
                            </div>
                        </div>
                        <!-- Email (read-only) -->
                        <div>
                            <label class="text-sm text-gray-400 block mb-1">
                                {{ t('settings.profile.email') }}
                            </label>
                            <p class="text-lg text-white">{{ userEmail }}</p>
                        </div>
                        <!-- Account info -->
                        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700">
                            <div>
                                <label class="text-sm text-gray-400 block mb-1">
                                    {{ t('settings.profile.createdAt') }}
                                </label>
                                <p class="text-gray-300">{{ userCreatedAt || '-' }}</p>
                            </div>
                            <div>
                                <label class="text-sm text-gray-400 block mb-1">
                                    {{ t('settings.profile.lastSignIn') }}
                                </label>
                                <p class="text-gray-300">{{ userLastSignIn || '-' }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </UCard>

            <!-- Password Section -->
            <UCard class="mb-6">
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-key" class="w-6 h-6 text-amber-400" />
                        <h2 class="text-xl font-semibold text-white">
                            {{ t('settings.password.title') }}
                        </h2>
                    </div>
                </template>

                <div v-if="!showPasswordSection" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p class="text-gray-400">{{ t('settings.password.description') }}</p>
                    <UButton
                        icon="i-heroicons-pencil-square"
                        color="neutral"
                        variant="outline"
                        @click="showPasswordSection = true"
                    >
                        {{ t('settings.password.changeButton') }}
                    </UButton>
                </div>

                <div v-else class="space-y-4">
                    <!-- Step 1: Verify current password -->
                    <div v-if="!passwordVerified" class="space-y-4">
                        <p class="text-gray-400">{{ t('settings.password.verifyCurrent') }}</p>
                        <div class="flex items-center gap-2">
                            <UInput
                                v-model="currentPassword"
                                :type="showCurrentPassword ? 'text' : 'password'"
                                :placeholder="t('settings.password.currentPlaceholder')"
                                class="flex-1"
                                icon="i-heroicons-lock-closed"
                            />
                            <UButton
                                :icon="
                                    showCurrentPassword
                                        ? 'i-heroicons-eye-slash'
                                        : 'i-heroicons-eye'
                                "
                                color="neutral"
                                variant="ghost"
                                @click="showCurrentPassword = !showCurrentPassword"
                            />
                        </div>
                        <div class="flex items-center gap-3">
                            <UButton
                                color="primary"
                                :loading="verifyingPassword"
                                @click="handleVerifyPassword"
                            >
                                {{ t('settings.password.verify') }}
                            </UButton>
                            <UButton
                                color="neutral"
                                variant="ghost"
                                @click="showPasswordSection = false; currentPassword = ''"
                            >
                                {{ t('common.cancel') }}
                            </UButton>
                        </div>
                        <div class="pt-2 border-t border-gray-700">
                            <UButton
                                color="neutral"
                                variant="link"
                                icon="i-heroicons-envelope"
                                :loading="sendingResetEmail"
                                @click="handleForgotPassword"
                            >
                                {{ t('settings.password.forgot') }}
                            </UButton>
                        </div>
                    </div>

                    <!-- Step 2: Enter new password -->
                    <div v-else class="space-y-4">
                        <div class="flex items-center gap-2 text-green-400 mb-4">
                            <UIcon name="i-heroicons-check-circle" class="w-5 h-5" />
                            <span>{{ t('settings.password.verified') }}</span>
                        </div>

                        <div>
                            <label class="text-sm text-gray-400 block mb-2">
                                {{ t('settings.password.new') }}
                            </label>
                            <div class="flex items-center gap-2">
                                <UInput
                                    v-model="newPassword"
                                    :type="showNewPassword ? 'text' : 'password'"
                                    :placeholder="t('settings.password.newPlaceholder')"
                                    class="flex-1"
                                    icon="i-heroicons-lock-closed"
                                />
                                <UButton
                                    :icon="
                                        showNewPassword
                                            ? 'i-heroicons-eye-slash'
                                            : 'i-heroicons-eye'
                                    "
                                    color="neutral"
                                    variant="ghost"
                                    @click="showNewPassword = !showNewPassword"
                                />
                            </div>
                        </div>

                        <div>
                            <label class="text-sm text-gray-400 block mb-2">
                                {{ t('settings.password.confirm') }}
                            </label>
                            <div class="flex items-center gap-2">
                                <UInput
                                    v-model="confirmPassword"
                                    :type="showConfirmPassword ? 'text' : 'password'"
                                    :placeholder="t('settings.password.confirmPlaceholder')"
                                    class="flex-1"
                                    icon="i-heroicons-lock-closed"
                                />
                                <UButton
                                    :icon="
                                        showConfirmPassword
                                            ? 'i-heroicons-eye-slash'
                                            : 'i-heroicons-eye'
                                    "
                                    color="neutral"
                                    variant="ghost"
                                    @click="showConfirmPassword = !showConfirmPassword"
                                />
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <UButton
                                color="primary"
                                :loading="changingPassword"
                                @click="handleChangePassword"
                            >
                                {{ t('settings.password.save') }}
                            </UButton>
                            <UButton
                                color="neutral"
                                variant="ghost"
                                @click="showPasswordSection = false; passwordVerified = false; currentPassword = ''; newPassword = ''; confirmPassword = ''"
                            >
                                {{ t('common.cancel') }}
                            </UButton>
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
                            {{ t('settings.language.title') }}
                        </h2>
                    </div>
                </template>
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p class="text-gray-400">
                        {{ t('settings.language.description') }}
                    </p>
                    <ULocaleSelect
                      v-model="selectedLocale"
                      :locales="[locales.en, locales.fr, locales.pl]"
                      class="w-44"
                    />
                </div>
            </UCard>

            <!-- Logout Section -->
            <UCard class="mb-6">
                <template #header>
                    <h2 class="text-xl font-semibold text-white">
                        {{ t('settings.session.title') }}
                    </h2>
                </template>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p class="text-gray-400">
                        {{ t('settings.session.description') }}
                    </p>
                    <UButton
                        :loading="loading"
                        color="error"
                        variant="solid"
                        icon="i-heroicons-arrow-right-on-rectangle"
                        @click="handleLogout"
                    >
                        {{ t('settings.logout.button') }}
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
                                {{ t('settings.theme.title') }}
                            </h2>
                        </div>
                        <UButton
                            color="neutral"
                            variant="ghost"
                            size="sm"
                            icon="i-heroicons-arrow-path"
                            @click="handleResetColors"
                        >
                            {{ t('settings.theme.resetAll') }}
                        </UButton>
                    </div>
                </template>

                <p class="text-gray-400 mb-6">{{ t('settings.theme.description') }}</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div
                        v-for="category in themeCategories"
                        :key="category.key"
                        class="p-4 bg-gray-800/50 rounded-lg"
                    >
                        <div class="flex items-center gap-2 mb-3">
                            <UIcon
                                :name="category.icon"
                                :class="[
                                    'w-5 h-5',
                                    colorClasses[colors[category.key] as ThemeColor]?.text ||
                                        'text-gray-400',
                                ]"
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
                                        : 'border-transparent hover:scale-105',
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
                        <UIcon
                            name="i-heroicons-radio"
                            :class="[
                                'w-6 h-6',
                                colorClasses[colors.radio as ThemeColor]?.text || 'text-yellow-400',
                            ]"
                        />
                        <h2 class="text-xl font-semibold text-white">
                            {{ t('settings.streams.radioTitle') }}
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
                        {{ t('settings.streams.addButton') }}
                    </UButton>
                </div>

                <!-- List of radio streams -->
                <div v-if="streamsLoading" class="text-gray-400 text-center py-4">
                    {{ t('settings.streams.loading') }}
                </div>
                <div v-else-if="radioStreams.length === 0" class="text-gray-500 text-center py-4">
                    {{ t('settings.streams.emptyRadio') }}
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
                        <UIcon
                            name="i-heroicons-tv"
                            :class="[
                                'w-6 h-6',
                                colorClasses[colors.tv as ThemeColor]?.text || 'text-orange-400',
                            ]"
                        />
                        <h2 class="text-xl font-semibold text-white">
                            {{ t('settings.streams.tvTitle') }}
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
                        {{ t('settings.streams.addButton') }}
                    </UButton>
                </div>

                <!-- List of TV streams -->
                <div v-if="streamsLoading" class="text-gray-400 text-center py-4">
                    {{ t('settings.streams.loading') }}
                </div>
                <div v-else-if="tvStreams.length === 0" class="text-gray-500 text-center py-4">
                    {{ t('settings.streams.emptyTv') }}
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
                            {{ t('settings.data.title') }}
                        </h2>
                    </div>
                </template>

                <p class="text-gray-400 mb-6">{{ t('settings.data.description') }}</p>

                <!-- Delete by category -->
                <div class="space-y-3 mb-8">
                    <h3 class="text-lg font-medium text-white mb-4">
                        {{ t('settings.data.byCategory') }}
                    </h3>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <!-- Lectures (Videos) -->
                        <div
                            class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                        >
                            <div class="flex items-center gap-2">
                                <UIcon
                                    name="i-heroicons-play-circle"
                                    :class="[
                                        'w-5 h-5',
                                        colorClasses[colors.lectures as ThemeColor]?.text ||
                                            'text-purple-400',
                                    ]"
                                />
                                <span class="text-white">
                                    {{ t('settings.data.categories.lectures') }}
                                </span>
                            </div>
                            <UButton
                                :loading="deletingCategory === 'lectures'"
                                color="error"
                                variant="soft"
                                size="sm"
                                icon="i-heroicons-trash"
                                @click="handleDeleteCategoryData('lectures')"
                            />
                        </div>

                        <!-- Music -->
                        <div
                            class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                        >
                            <div class="flex items-center gap-2">
                                <UIcon
                                    name="i-heroicons-musical-note"
                                    :class="[
                                        'w-5 h-5',
                                        colorClasses[colors.music as ThemeColor]?.text ||
                                            'text-green-400',
                                    ]"
                                />
                                <span class="text-white">
                                    {{ t('settings.data.categories.music') }}
                                </span>
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
                        <div
                            class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                        >
                            <div class="flex items-center gap-2">
                                <UIcon
                                    name="i-heroicons-radio"
                                    :class="[
                                        'w-5 h-5',
                                        colorClasses[colors.radio as ThemeColor]?.text ||
                                            'text-yellow-400',
                                    ]"
                                />
                                <span class="text-white">
                                    {{ t('settings.data.categories.radio') }}
                                </span>
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
                        <div
                            class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                        >
                            <div class="flex items-center gap-2">
                                <UIcon
                                    name="i-heroicons-tv"
                                    :class="[
                                        'w-5 h-5',
                                        colorClasses[colors.tv as ThemeColor]?.text ||
                                            'text-orange-400',
                                    ]"
                                />
                                <span class="text-white">
                                    {{ t('settings.data.categories.tv') }}
                                </span>
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
                        <div
                            class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                        >
                            <div class="flex items-center gap-2">
                                <UIcon
                                    name="i-heroicons-microphone"
                                    :class="[
                                        'w-5 h-5',
                                        colorClasses[colors.podcasts as ThemeColor]?.text ||
                                            'text-pink-400',
                                    ]"
                                />
                                <span class="text-white">
                                    {{ t('settings.data.categories.podcasts') }}
                                </span>
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

                        <!-- Photos -->
                        <div
                            class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                        >
                            <div class="flex items-center gap-2">
                                <UIcon
                                    name="i-heroicons-photo"
                                    :class="[
                                        'w-5 h-5',
                                        colorClasses[colors.photos as ThemeColor]?.text ||
                                            'text-blue-400',
                                    ]"
                                />
                                <span class="text-white">
                                    {{ t('settings.data.categories.photos') }}
                                </span>
                            </div>
                            <UButton
                                :loading="deletingCategory === 'photos'"
                                color="error"
                                variant="soft"
                                size="sm"
                                icon="i-heroicons-trash"
                                @click="handleDeleteCategoryData('photos')"
                            />
                        </div>
                    </div>
                </div>

                <!-- Delete all data -->
                <div class="border-t border-gray-700 pt-6 mb-6">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 class="text-lg font-medium text-white">
                                {{ t('settings.data.deleteAllTitle') }}
                            </h3>
                            <p class="text-gray-400 text-sm">
                                {{ t('settings.data.deleteAllDescription') }}
                            </p>
                        </div>
                        <UButton
                            :loading="deletingAllData"
                            color="error"
                            variant="outline"
                            icon="i-heroicons-trash"
                            @click="handleDeleteAllData"
                        >
                            {{ t('settings.data.deleteAllButton') }}
                        </UButton>
                    </div>
                </div>

                <!-- Delete account -->
                <div class="border-t border-gray-700 pt-6">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 class="text-lg font-medium text-red-400">
                                {{ t('settings.data.deleteAccountTitle') }}
                            </h3>
                            <p class="text-gray-400 text-sm">
                                {{ t('settings.data.deleteAccountDescription') }}
                            </p>
                        </div>
                        <UButton
                            color="error"
                            variant="solid"
                            icon="i-heroicons-exclamation-triangle"
                            @click="showDeleteAccountModal = true"
                        >
                            {{ t('settings.data.deleteAccountButton') }}
                        </UButton>
                    </div>
                </div>
            </UCard>
        </div>

        <!-- Delete Account Confirmation Modal -->
        <UModal
            v-model:open="showDeleteAccountModal"
            :title="t('settings.data.deleteAccountTitle')"
            :description="t('settings.data.deleteAccountWarning')"
        >
            <template #content>
                <div class="p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div
                            class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"
                        >
                            <svg
                                class="w-6 h-6 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-xl font-semibold text-white">
                                {{ t('settings.data.deleteAccountTitle') }}
                            </h3>
                            <p class="text-gray-400">
                                {{ t('settings.data.deleteAccountWarning') }}
                            </p>
                        </div>
                    </div>

                    <p class="text-gray-300 mb-4">
                        {{ t('settings.data.deleteAccountConfirmText') }}
                    </p>

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
                            {{ t('common.cancel') }}
                        </UButton>
                        <UButton
                            :loading="deletingAccount"
                            :disabled="deleteConfirmText !== confirmWord"
                            color="error"
                            variant="solid"
                            @click="handleDeleteAccount"
                        >
                            {{ t('settings.data.deleteAccountButton') }}
                        </UButton>
                    </div>
                </div>
            </template>
        </UModal>
    </div>
</template>
