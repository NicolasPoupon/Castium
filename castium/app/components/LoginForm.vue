<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const password = ref('')

const emit = defineEmits<{
    submit: [payload: { email: string; password: string }]
}>()

const handleSubmit = () => {
    emit('submit', {
        email: email.value,
        password: password.value,
    })
}
</script>

<template>
    <form class="space-y-4 max-w-sm" @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-1">
            <label for="email" class="text-sm font-medium">Email</label>
            <input
                id="email"
                v-model="email"
                type="email"
                class="border rounded px-3 py-2"
                placeholder="you@example.com"
            />
        </div>

        <div class="flex flex-col gap-1">
            <label for="password" class="text-sm font-medium">Mot de passe</label>
            <input
                id="password"
                v-model="password"
                type="password"
                class="border rounded px-3 py-2"
                placeholder="••••••••"
            />
        </div>

        <button
            type="submit"
            class="w-full px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
        >
            Se connecter
        </button>
    </form>
</template>
