<script setup lang="ts">
import * as z from 'zod';
import { useI18n } from '#imports';
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui';

definePageMeta({
    title: 'Login',
});

const toast = useToast();
const { t } = useI18n();

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
];

const providers = [
    {
        label: 'Google',
        icon: 'i-simple-icons-google',
        onClick: () => {
            toast.add({
                title: t('auth.login.providers.google'),
                description: t('auth.login.providers.google'),
            });
        },
    },
];

const schema = z.object({
    email: z.email(t('auth.login.fields.email.error.invalid')),
    password: z
        .string(t('auth.login.fields.password.error.required'))
        .min(8, t('auth.login.fields.password.error.min')),
});

type Schema = z.output<typeof schema>;

function onSubmit(payload: FormSubmitEvent<Schema>) {
    console.log('Submitted', payload);
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
                @submit="onSubmit"
            />
        </UPageCard>
    </div>
</template>
