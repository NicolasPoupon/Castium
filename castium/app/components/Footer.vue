<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
const props = defineProps({
    mode: {
        type: String,
        default: 'landing', // landing | login | music | podcast
    },
});
const items: NavigationMenuItem[] = [
    {
        label: 'Releases',
        to: 'https://github.com/NicolasPoupon/Castium/releases',
        target: '_blank',
    },
    {
        label: 'Support',
        to: 'https://github.com/NicolasPoupon/Castium/releases',
        target: '_blank',
    },
    {
        label: 'Documentation',
        to: 'https://github.com/NicolasPoupon/Castium/releases',
        target: '_blank',
    },
    {
        label: 'Legal',
        to: 'https://github.com/NicolasPoupon/Castium/releases',
        target: '_blank',
    },
    {
        label: 'Contact',
        to: 'https://github.com/NicolasPoupon/Castium/releases',
        target: '_blank',
    },
];
</script>

<template>
    <UFooter>
        <template #left>
            <p class="text-muted text-sm">
                © {{ new Date().getFullYear() }} Castium. Tous droits réservés • Made with ❤️
            </p>
        </template>

        <UNavigationMenu
:items="items" variant="link"
/>

        <template #right>
            <UButton
                v-if="props.mode === 'landing'"
                icon="i-simple-icons-discord"
                color="neutral"
                variant="ghost"
                to="https://go.nuxt.com/discord"
                target="_blank"
                aria-label="Discord"
            />
            <UButton
                icon="i-simple-icons-x"
                color="neutral"
                variant="ghost"
                to="https://go.nuxt.com/x"
                target="_blank"
                aria-label="X"
            />
            <UButton
                icon="i-simple-icons-github"
                color="neutral"
                variant="ghost"
                to="https://github.com/NicolasPoupon/Castium"
                target="_blank"
                aria-label="GitHub"
            />
        </template>
    </UFooter>
</template>
