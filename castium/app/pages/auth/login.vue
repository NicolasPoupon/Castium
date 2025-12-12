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
            const { error } = await signInWithGoogle()
            if (error) {
                toast.add({
                    title: t('auth.login.errors.google'),
                    description: error.message,
                    color: 'error',
                })
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
    const { error } = await signIn(payload.data.email, payload.data.password)

    if (error) {
        toast.add({
            title: t('auth.login.errors.title'),
            description: error.message || t('auth.login.errors.invalid'),
            color: 'error',
        })
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
    <div
        class="flex flex-col items-center justify-center gap-4 p-4 bg-gradient-to-br from-[#45556C] to-[#00C16A] min-h-screen"
    >
        <Navbar mode="auth" />
        <UPageCard class="w-full max-w-md">
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
        <div class="mt-4 text-center">
            <UButton variant="link" color="neutral" to="/auth/signup" class="text-sm">
                {{ t('auth.login.noAccount') }}
            </UButton>
        </div>
    </div>
</template>
