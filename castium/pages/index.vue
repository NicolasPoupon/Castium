<script setup>
const localePath = useLocalePath()

const redirectToLogin = () => navigateTo(localePath('login'), { replace: true })

definePageMeta({
    middleware: redirectToLogin,
})
</script>

<template>
    <div />
</template>
