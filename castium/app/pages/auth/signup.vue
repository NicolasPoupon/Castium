<script setup lang="ts">
import * as z from 'zod'
import { useI18n } from '#imports'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
    title: 'Signup',
})

const toast = useToast()
const { t } = useI18n()
const router = useRouter()
const { signUp, signInWithGoogle, loading, isAuthenticated } = useAuth()

// Redirect if already authenticated
watch(isAuthenticated, (authenticated) => {
    if (authenticated) {
        router.push('/app/movies')
    }
})

const fields: AuthFormField[] = [
    {
        name: 'username',
        type: 'text',
        label: t('auth.signup.fields.username.label'),
        placeholder: t('auth.signup.fields.username.placeholder'),
        required: true,
    },
    {
        name: 'email',
        type: 'email',
        label: t('auth.signup.fields.email.label'),
        placeholder: t('auth.signup.fields.email.placeholder'),
        required: true,
    },
    {
        name: 'password',
        label: t('auth.signup.fields.password.label'),
        type: 'password',
        placeholder: t('auth.signup.fields.password.placeholder'),
        required: true,
    },
    {
        name: 'confirmPassword',
        label: t('auth.signup.fields.confirmPassword.label'),
        type: 'password',
        placeholder: t('auth.signup.fields.confirmPassword.placeholder'),
        required: true,
    },
]

const providers = [
    {
        label: t('auth.signup.providers.google'),
        icon: 'i-simple-icons-google',
        onClick: async () => {
            const { error } = await signInWithGoogle()
            if (error) {
                toast.add({
                    title: t('auth.signup.errors.google'),
                    description: error.message,
                    color: 'error',
                })
            }
        },
    },
]

const schema = z
    .object({
        username: z.string().min(1, t('auth.signup.fields.username.error.required')),
        email: z.string().email(t('auth.signup.fields.email.error.invalid')),
        password: z
            .string()
            .min(1, t('auth.signup.fields.password.error.required'))
            .min(8, t('auth.signup.fields.password.error.min')),
        confirmPassword: z
            .string()
            .min(1, t('auth.signup.fields.confirmPassword.error.required')),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: t('auth.signup.fields.confirmPassword.error.match'),
        path: ['confirmPassword'],
    })

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    const { error } = await signUp(payload.data.email, payload.data.password, {
        username: payload.data.username,
    })

    if (error) {
        toast.add({
            title: t('auth.signup.errors.title'),
            description: error.message || t('auth.signup.errors.invalid'),
            color: 'error',
        })
    } else {
        toast.add({
            title: t('auth.signup.success'),
            description: t('auth.signup.successDescription'),
            color: 'success',
        })
        // Redirect to login after successful signup
        await router.push('/auth/login')
    }
}
</script>

<template>
    <div
        class="flex flex-col items-center justify-center gap-4 p-4 bg-gradient-to-br from-[#45556C] to-[#00C16A] min-h-screen"
    >
        <Navbar mode="login" />
        <UPageCard class="w-full max-w-md">
            <UAuthForm
                :schema="schema"
                :title="t('auth.signup.title')"
                :description="t('auth.signup.description')"
                icon="i-heroicons-user-plus"
                :fields="fields"
                :providers="providers"
                :loading="loading"
                :submit-label="t('auth.signup.submit')"
                @submit="onSubmit"
            />
            <div class="mt-4 text-center">
                <UButton
                    variant="link"
                    color="neutral"
                    to="/auth/login"
                    class="text-sm"
                >
                    {{ t('auth.signup.hasAccount') }}
                </UButton>
            </div>
        </UPageCard>
    </div>
</template>

