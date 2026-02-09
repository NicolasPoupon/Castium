<script setup lang="ts">
import * as z from 'zod'
import { useI18n } from '#imports'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
    title: 'Login',
})

const toast = useToast()
const { t } = useI18n()
const router = useRouter()
const { signIn, signInWithGoogle, loading, isAuthenticated } = useAuth()

// Inline error message for failed login attempts
const errorMessage = ref('')

// Redirect if already authenticated
watch(isAuthenticated, (authenticated) => {
    if (authenticated) {
        router.push('/app/movies')
    }
})

const fields: AuthFormField[] = [
    {
        name: 'email',
        type: 'email',
        label: t('auth.login.fields.email.label'),
        placeholder: t('auth.login.fields.email.placeholder'),
        required: true,
    },
    {
        name: 'password',
        label: t('auth.login.fields.password.label'),
        type: 'password',
        placeholder: t('auth.login.fields.password.placeholder'),
        required: true,
    },
    {
        name: 'remember',
        label: t('auth.login.fields.remember.label'),
        type: 'checkbox',
    },
]

const providers = [
    {
        label: 'Google',
        icon: 'i-simple-icons-google',
        onClick: async () => {
            errorMessage.value = ''
            const { error } = await signInWithGoogle()
            if (error) {
                errorMessage.value = error.message || t('auth.login.errors.google')
            }
        },
    },
]

const schema = z.object({
    email: z.email(t('auth.login.fields.email.error.invalid')),
    password: z
        .string(t('auth.login.fields.password.error.required'))
        .min(8, t('auth.login.fields.password.error.min')),
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    errorMessage.value = ''
    const { error } = await signIn(payload.data.email, payload.data.password)

    if (error) {
        // Map Supabase error messages to user-friendly translated messages
        const msg = error.message || ''
        if (msg.toLowerCase().includes('email not confirmed')) {
            errorMessage.value = t('auth.login.errors.emailNotConfirmed')
        } else if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid email or password')) {
            errorMessage.value = t('auth.login.errors.invalid')
        } else {
            errorMessage.value = msg || t('auth.login.errors.invalid')
        }
    } else {
        toast.add({
            title: t('auth.login.success'),
            description: t('auth.login.successDescription'),
            color: 'success',
        })
        router.push('/app/movies')
    }
}
</script>

<template>
    <div class="flex flex-col items-center justify-center gap-4 p-4 bg-gray-900 min-h-screen">
        <Navbar mode="auth" />
        <UPageCard class="w-full max-w-md">
            <!-- Error bubble -->
            <Transition name="fade">
                <div
                    v-if="errorMessage"
                    class="mb-4 flex items-start gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500"
                >
                    <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{{ errorMessage }}</span>
                    <button
                        class="ml-auto shrink-0 hover:text-red-400 transition-colors"
                        @click="errorMessage = ''"
                    >
                        <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                    </button>
                </div>
            </Transition>

            <UAuthForm
                :schema="schema"
                :title="t('auth.login.title')"
                :description="t('auth.login.description')"
                icon="i-heroicons-user"
                :fields="fields"
                :providers="providers"
                :loading="loading"
                @submit="onSubmit"
            />
        </UPageCard>
        <div class="flex flex-col items-center gap-1">
            <UButton variant="link" color="neutral" to="/auth/forgot-password" class="text-sm">
                {{ t('auth.login.forgotPassword') }}
            </UButton>
            <UButton variant="link" color="neutral" to="/auth/signup" class="text-sm">
                {{ t('auth.login.noAccount') }}
            </UButton>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
