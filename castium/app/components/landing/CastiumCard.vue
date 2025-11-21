<script setup lang="ts">
const cards = ref([
    {
        title: 'Films et séries organisés',
        description:
            'Importez votre collection, retrouvez automatiquement les affiches, descriptions, genres, acteurs et bien plus.',
        icon: 'i-heroicons-play-circle',
        iconColor: 'error',
        spotlight: true,
        spotlightColor: 'error',
    },
    {
        title: 'Musique & Podcasts',
        description:
            'Accédez à vos morceaux, albums et playlists en un clic. Découvrez vos podcasts et reprenez là où vous vous êtes arrêté.',
        icon: 'i-heroicons-musical-note',
        iconColor: 'primary',
        spotlight: true,
        spotlightColor: 'primary',
    },
    {
        title: 'Synchronisé partout',
        description:
            'PC, mobile, tablette ou TV - Castium reste fluide et intuitif. Votre médiathèque est accessible où que vous soyez.',
        icon: 'i-lucide-cloud',
        iconColor: 'secondary',
        spotlight: true,
        spotlightColor: 'secondary',
    },
    {
        title: 'Votre contenu, vos règles',
        description:
            'Castium ne vend pas vos données, ne piste pas votre activité et ne vous impose aucune publicité.',
        icon: 'i-heroicons-lock-closed',
        iconColor: 'neutral',
        spotlight: true,
        spotlightColor: 'neutral',
    },
    {
        title: 'Interface soignée',
        description:
            "Une expérience inspirée de Kodi et bien d'autres, mais pensée pour le cloud avec une interface moderne et minimaliste.",
        icon: 'i-heroicons-bolt',
        iconColor: 'info',
        spotlight: true,
        spotlightColor: 'info',
    },
    {
        title: 'Import automatique',
        description:
            'Les métadonnées sont récupérées automatiquement pour tous vos contenus. Plus besoin de tout faire manuellement.',
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
                v-bind="card"
                :icon="card.icon"
            />
        </UPageGrid>
    </div>
</template>
