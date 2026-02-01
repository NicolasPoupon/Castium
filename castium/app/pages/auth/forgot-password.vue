<script setup lang="ts">
import * as z from "zod"
import { useI18n } from "#imports"

definePageMeta({
    title: "Forgot Password",
})

const toast = useToast()
const { t } = useI18n()
const router = useRouter()
const { resetPassword, loading } = useAuth()

const email = ref("")
const submitted = ref(false)

const schema = z.object({
    email: z
        .string()
        .email(t("auth.forgotPassword.fields.email.error.invalid")),
})

type Schema = z.output<typeof schema>

async function onSubmit() {
    if (!email.value) {
        toast.add({
            title: t("auth.forgotPassword.errors.title"),
            description: t("auth.forgotPassword.fields.email.error.required"),
            color: "error",
        })
        return
    }

    const { error } = await resetPassword(email.value)

    if (error) {
        toast.add({
            title: t("auth.forgotPassword.errors.title"),
            description:
                error.message || t("auth.forgotPassword.errors.invalid"),
            color: "error",
        })
    } else {
        submitted.value = true
        toast.add({
            title: t("auth.forgotPassword.success"),
            description: t("auth.forgotPassword.successDescription"),
            color: "success",
        })
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
                <UIcon
                    name="i-heroicons-key"
                    class="w-12 h-12 mx-auto mb-4 text-castium-green"
                />
                <h1 class="text-2xl font-bold mb-2">
                    {{ t("auth.forgotPassword.title") }}
                </h1>
                <p class="text-gray-600 dark:text-gray-400">
                    {{ t("auth.forgotPassword.description") }}
                </p>
            </div>

            <div v-if="!submitted" class="space-y-4">
                <UForm :schema="schema" :state="{ email }" @submit="onSubmit">
                    <UFormGroup
                        :label="t('auth.forgotPassword.fields.email.label')"
                        name="email"
                        required
                    >
                        <UInput
                            v-model="email"
                            type="email"
                            :placeholder="
                                t(
                                    'auth.forgotPassword.fields.email.placeholder',
                                )
                            "
                            size="lg"
                            :disabled="loading"
                        />
                    </UFormGroup>

                    <UButton
                        type="submit"
                        block
                        size="lg"
                        :loading="loading"
                        class="mt-4"
                    >
                        {{ t("auth.forgotPassword.submit") }}
                    </UButton>
                </UForm>

                <div class="text-center mt-4">
                    <UButton
                        variant="link"
                        color="neutral"
                        to="/auth/login"
                        class="text-sm"
                    >
                        {{ t("auth.forgotPassword.backToLogin") }}
                    </UButton>
                </div>
            </div>

            <div v-else class="text-center space-y-4">
                <UIcon
                    name="i-heroicons-check-circle"
                    class="w-16 h-16 mx-auto text-green-500"
                />
                <p class="text-gray-600 dark:text-gray-400">
                    {{ t("auth.forgotPassword.successDescription") }}
                </p>
                <UButton variant="outline" block to="/auth/login" class="mt-4">
                    {{ t("auth.forgotPassword.backToLogin") }}
                </UButton>
            </div>
        </UPageCard>
    </div>
</template>
