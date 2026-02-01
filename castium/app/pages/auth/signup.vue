<script setup lang="ts">
import * as z from "zod"
import { useI18n } from "#imports"
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui"

definePageMeta({
    title: "Signup",
})

const toast = useToast()
const { t } = useI18n()
const router = useRouter()
const { signUp, signInWithGoogle, loading, isAuthenticated } = useAuth()

// Redirect if already authenticated
watch(isAuthenticated, (authenticated) => {
    if (authenticated) {
        router.push("/app/movies")
    }
})

const fields: AuthFormField[] = [
    {
        name: "username",
        type: "text",
        label: t("auth.login.fields.username.label"),
        placeholder: t("auth.login.fields.username.placeholder"),
        required: true,
    },
    {
        name: "email",
        type: "email",
        label: t("auth.login.fields.email.label"),
        placeholder: t("auth.login.fields.email.placeholder"),
        required: true,
    },
    {
        name: "password",
        label: t("auth.login.fields.password.label"),
        type: "password",
        placeholder: t("auth.login.fields.password.placeholder"),
        required: true,
    },
    {
        name: "confirmPassword",
        label: t("auth.login.fields.confirmPassword.label"),
        type: "password",
        placeholder: t("auth.login.fields.confirmPassword.placeholder"),
        required: true,
    },
]

const providers = [
    {
        label: t("auth.login.providers.google"),
        icon: "i-simple-icons-google",
        onClick: async () => {
            const { error } = await signInWithGoogle()
            if (error) {
                toast.add({
                    title: t("auth.login.errors.google"),
                    description: error.message,
                    color: "error",
                })
            }
        },
    },
]

const schema = z
    .object({
        username: z
            .string()
            .min(1, t("auth.login.fields.username.error.required")),
        email: z.string().email(t("auth.login.fields.email.error.invalid")),
        password: z
            .string()
            .min(1, t("auth.login.fields.password.error.required"))
            .min(8, t("auth.login.fields.password.error.min")),
        confirmPassword: z
            .string()
            .min(1, t("auth.login.fields.confirmPassword.error.required")),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: t("auth.login.fields.confirmPassword.error.match"),
        path: ["confirmPassword"],
    })

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    const { error } = await signUp(payload.data.email, payload.data.password, {
        username: payload.data.username,
    })

    if (error) {
        toast.add({
            title: t("auth.login.errors.title"),
            description: error.message || t("auth.login.errors.invalid"),
            color: "error",
        })
    } else {
        toast.add({
            title: t("auth.login.success"),
            description: t("auth.login.successDescription"),
            color: "success",
        })
        // Redirect to login after successful signup
        await router.push("/auth/login")
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
                :title="t('auth.signUp.title')"
                :description="t('auth.signUp.description')"
                icon="i-heroicons-user-plus"
                :fields="fields"
                :providers="providers"
                :loading="loading"
                :submit-label="t('auth.signUp.submit')"
                @submit="onSubmit"
            />
            <div class="mt-4 text-center">
                <UButton
                    variant="link"
                    color="neutral"
                    to="/auth/login"
                    class="text-sm"
                >
                    {{ t("auth.signUp.hasAccount") }}
                </UButton>
            </div>
        </UPageCard>
    </div>
</template>
