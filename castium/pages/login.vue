<template>
    <div>
        <h1>Connexion / Inscription</h1>

        <input v-model="email" placeholder="Email" />
        <input v-model="password" placeholder="Mot de passe" type="password" />

        <button @click="login">Se connecter</button>
        <button @click="signup">Créer un compte</button>

        <p>{{ message }}</p>
    </div>
</template>

<script setup>
const email = ref('')
const password = ref('')
const message = ref('')

const { $supabase } = useNuxtApp()

const login = async () => {
    const { error } = await $supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
    })

    message.value = error ? error.message : 'Connexion réussie !'
}

const signup = async () => {
    const { error } = await $supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
            emailRedirectTo: 'https://ton-site.vercel.app/confirm',
        },
    })

    message.value = error ? error.message : 'Vérifie ta boîte mail pour confirmer ton compte.'
}
</script>
