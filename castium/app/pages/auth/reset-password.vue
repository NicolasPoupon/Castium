<script setup lang="ts">
import * as z from 'zod'
import { useI18n } from '#imports'

definePageMeta({
    title: 'Reset Password',
})

const toast = useToast()
const { t } = useI18n()
const router = useRouter()
const { updatePassword, loading } = useAuth()

const password = ref('')
const confirmPassword = ref('')

const schema = z
    .object({
        password: z
            .string()
            .min(1, t('auth.resetPassword.fields.password.error.required'))
            .min(8, t('auth.resetPassword.fields.password.error.min')),
        confirmPassword: z
            .string()
            .min(1, t('auth.resetPassword.fields.confirmPassword.error.required')),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: t('auth.resetPassword.fields.confirmPassword.error.match'),
        path: ['confirmPassword'],
    })

type Schema = z.output<typeof schema>

async function onSubmit() {
    if (!password.value || !confirmPassword.value) {
        toast.add({
            title: t('auth.resetPassword.errors.title'),
            description: t('auth.resetPassword.fields.password.error.required'),
            color: 'error',
        })
        return
    }

    if (password.value !== confirmPassword.value) {
        toast.add({
            title: t('auth.resetPassword.errors.title'),
            description: t('auth.resetPassword.fields.confirmPassword.error.match'),
            color: 'error',
        })
        return
    }

    const { error } = await updatePassword(password.value)

    if (error) {
        toast.add({
            title: t('auth.resetPassword.errors.title'),
            description: error.message || t('auth.resetPassword.errors.invalid'),
            color: 'error',
        })
    } else {
        toast.add({
            title: t('auth.resetPassword.success'),
            description: t('auth.resetPassword.successDescription'),
            color: 'success',
        })
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
            <div class="text-center mb-6">
                <UIcon name="i-heroicons-key" class="w-12 h-12 mx-auto mb-4 text-castium-green" />
                <h1 class="text-2xl font-bold mb-2">
                    {{ t('auth.resetPassword.title') }}
                </h1>
                <p class="text-gray-600 dark:text-gray-400">
                    {{ t('auth.resetPassword.description') }}
                </p>
            </div>

            <UForm :schema="schema" :state="{ password, confirmPassword }" @submit="onSubmit">
                <UFormGroup
                    :label="t('auth.resetPassword.fields.password.label')"
                    name="password"
                    required
                >
                    <UInput
                        v-model="password"
                        type="password"
                        :placeholder="t('auth.resetPassword.fields.password.placeholder')"
                        size="lg"
                        :disabled="loading"
                    />
                </UFormGroup>

                <UFormGroup
                    :label="t('auth.resetPassword.fields.confirmPassword.label')"
                    name="confirmPassword"
                    required
                    class="mt-4"
                >
                    <UInput
                        v-model="confirmPassword"
                        type="password"
                        :placeholder="t('auth.resetPassword.fields.confirmPassword.placeholder')"
                        size="lg"
                        :disabled="loading"
                    />
                </UFormGroup>

                <UButton type="submit" block size="lg" :loading="loading" class="mt-6">
                    {{ t('auth.resetPassword.submit') }}
                </UButton>
            </UForm>

            <div class="text-center mt-4">
                <UButton variant="link" color="neutral" to="/auth/login" class="text-sm">
                    {{ t('auth.resetPassword.backToLogin') }}
                </UButton>
            </div>
        </UPageCard>
    </div>
</template>
