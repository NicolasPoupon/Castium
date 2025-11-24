<script setup lang="ts">
import { useI18n } from '#imports';
const { t, locale } = useI18n();
watch(locale, () => {});

useHead({
    title: 'Castium — Your multimedia universe',
});
</script>

<template>
    <div class="min-h-screen bg-[#0F172B]">
        <Navbar mode="landing" />
        <div
            class="bg-fixed bg-gradient-to-br from-gray-700 to-[#020618] py-14 pt-18 flex flex-col items-center"
        >
            <div class="text-center mt-10 leading-snug overflow-visible">
                <h1 class="text-white text-7xl font-bold">
                    {{ t('landing.hero.titleMain') }}
                </h1>

                <h1 class="gradient-text text-7xl font-bold -mt-1 pb-4">
                    {{ t('landing.hero.titleHighlight') }}
                </h1>
            </div>
            <p class="text-gray-300 pt-14 text-lg text-center max-w-2xl px-4">
                {{ t('landing.hero.description') }}
            </p>
            <UButton
                to="/auth/login"
                trailing-icon="i-heroicons-arrow-right"
                class="mt-8 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md text-lg font-bold transition-colors"
            >
                {{ t('landing.hero.cta') }}
            </UButton>
        </div>
        <div class="w-full mt-8 py-8 flex flex-col items-center">
            <h2 class="text-white text-4xl font-bold mb-6">
                {{ t('landing.features.title') }}
            </h2>
            <p class="text-gray-300 max-w-3xl text-center text-lg px-4">
                {{ t('landing.features.description') }}
            </p>
            <LandingCastiumCard />
        </div>
        <div
            class="w-full bg-gradient-to-br from-[#0F172B] to-red-800 py-12 flex flex-col items-center"
        >
            <UButton
                icon="i-heroicons-bell-alert"
                class="px-4 py-2 bg-red-700 hover:bg-red-900 text-white rounded-full text-lg font-bold transition-colors"
            >
                {{ t('landing.beta.badge') }}
            </UButton>
            <h2 class="text-white mt-12 text-6xl font-bold">
                {{ t('landing.beta.title') }}
            </h2>
            <p class="text-gray-300 mt-6 max-w-2xl text-lg text-center px-4">
                {{ t('landing.beta.description') }}
            </p>
            <div class="mt-8 mx-auto flex items-center gap-4">
                <UInput
                    trailing-icon="i-heroicons-at-symbol"
                    :placeholder="t('landing.beta.emailPlaceholder')"
                    size="md"
                    color="neutral"
                    variant="outline"
                />
                <UButton trailing-icon="i-heroicons-arrow-right"
color="neutral" variant="outline">
                    {{ t('landing.beta.cta') }}
                </UButton>
            </div>
            <p class="text-gray-300 mb-4 mt-4 max-w-2xl text-sm text-center px-4">
                {{ t('landing.beta.helper') }}
            </p>
        </div>
        <Footer mode="landing" />
    </div>
</template>
