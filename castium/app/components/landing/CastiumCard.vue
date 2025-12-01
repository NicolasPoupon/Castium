<script setup lang="ts">
import { useI18n } from '#imports';
const { t } = useI18n();
const cards = ref([
    {
        key: 'organized',
        icon: 'i-heroicons-play-circle',
        iconColor: 'error',
        spotlight: true,
        spotlightColor: 'error',
    },
    {
        key: 'music',
        icon: 'i-heroicons-musical-note',
        iconColor: 'primary',
        spotlight: true,
        spotlightColor: 'primary',
    },
    {
        key: 'sync',
        icon: 'i-heroicons-cloud',
        iconColor: 'secondary',
        spotlight: true,
        spotlightColor: 'secondary',
    },
    {
        key: 'privacy',
        icon: 'i-heroicons-lock-closed',
        iconColor: 'neutral',
        spotlight: true,
        spotlightColor: 'neutral',
    },
    {
        key: 'interface',
        icon: 'i-heroicons-bolt',
        iconColor: 'info',
        spotlight: true,
        spotlightColor: 'info',
    },
    {
        key: 'auto',
        icon: 'i-heroicons-link',
        iconColor: 'warning',
        spotlight: true,
        spotlightColor: 'warning',
    },
]);
</script>

<template>
    <div class="mt-8 mb-8 w-full px-4 max-w-5xl">
        <UPageGrid>
            <UPageCard
                v-for="(card, index) in cards"
                :key="index"
                :title="t(`landing.features.cards.${card.key}.title`)"
                :description="t(`landing.features.cards.${card.key}.description`)"
                :icon="card.icon"
                :spotlight="card.spotlight"
                :color="card.iconColor"
                :spotlight-color="card.spotlightColor"
            />
        </UPageGrid>
    </div>
</template>
