<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const supabase = useSupabase()
const toast = useToast()
const { t } = useI18n()

onMounted(async () => {
    try {
        const { data, error } = await supabase.auth.getSession()

        if (error) throw error

        if (data.session) {
            toast.add({
                title: t('auth.callback.success'),
                color: 'success',
            })
            await router.push('/app/movies')
        } else {
            // Session is missing, likely due to clock skew or invalid token
            console.warn('No session found in callback. Possible clock skew.')
            toast.add({
                title: t('auth.callback.error'),
                description:
                    "Impossible de valider la session. Vérifiez que votre horloge système est à l'heure.",
                color: 'error',
                timeout: 0, // Keep it visible
            })
            // Delay redirect to let user read the message
            setTimeout(() => {
                router.push('/auth/login')
            }, 5000)
        }
    } catch (error: any) {
        console.error('Auth callback error:', error)
        toast.add({
            title: t('auth.callback.error'),
            description: error.message,
            color: 'error',
            timeout: 0,
        })
        // Delay redirect to let user read the message
        setTimeout(() => {
            router.push('/auth/login')
        }, 5000)
    }
})
</script>

<template>
    <div
        class="flex flex-col items-center justify-center gap-4 p-4 bg-gradient-to-br from-[#45556C] to-[#00C16A] min-h-screen"
    >
        <Navbar mode="login" />
        <div class="text-center">
            <UIcon
                name="i-heroicons-arrow-path"
                class="w-12 h-12 text-castium-green animate-spin"
            />
            <p class="mt-4 text-white">{{ t('auth.callback.loading') }}</p>
        </div>
    </div>
</template>
