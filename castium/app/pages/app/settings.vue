<script setup lang="ts">
definePageMeta({
    title: "Settings",
})

const { t } = useI18n()
const { user, signOut, loading } = useAuth()
const toast = useToast()

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
    return (
        user.value.user_metadata?.avatar_url ||
        user.value.user_metadata?.picture ||
        null
    )
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

            <!-- Logout Section -->
            <UCard>
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
        </div>
    </div>
</template>
