<script setup lang="ts"></script>

<template>
    <div class="min-h-screen bg-gray-900">
        <Navbar mode="app" />
        <AppNav />

        <div class="pt-24 pb-12">
            <div class="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <div class="flex flex-col items-center justify-center min-h-[60vh]">
                    <div class="text-center max-w-2xl">
                        <UIcon
                            name="i-heroicons-microphone"
                            class="w-24 h-24 text-orange-400 mx-auto mb-6"
                        />
                        <h1 class="text-4xl font-bold text-white mb-4">Podcasts à venir</h1>
                        <p class="text-gray-400 text-lg">
                            La section podcasts sera bientôt disponible. Vous pourrez écouter et
                            gérer vos podcasts préférés.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <Footer mode="app" />
    </div>
</template>
