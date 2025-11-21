<script setup lang="ts"></script>

<template>
    <div class="min-h-screen bg-[#0F172B]">
        <Navbar mode="landing" />
        <div
            class="bg-fixed bg-gradient-to-br from-gray-700 to-[#020618] py-14 pt-16 flex flex-col items-center"
        >
            <h1 class="text-white mt-10 text-7xl font-bold text-center">
                Votre univers multimédia
            </h1>
            <h1 class="gradient-text mt-4 text-7xl font-bold text-center">réuni au même endroit</h1>
            <p class="text-gray-300 mt-10 text-lg text-center max-w-2xl px-4">
                Castium est une plateforme personnelle et moderne qui centralise vos films, séries,
                musiques, podcasts et contenus personnels dans une seule interface élégante,
                accessible depuis n'importe où.
            </p>
            <UButton
                to="/auth/login"
                trailing-icon="i-lucide-arrow-right"
                class="mt-8 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md text-lg font-bold transition-colors"
            >
                Inscrivez-vous pour la bêta
            </UButton>
        </div>
        <div class="w-full mt-8 py-8 flex flex-col items-center">
            <h2 class="text-white text-4xl font-bold mb-6">Simple. Rapide. Puissant.</h2>
            <p class="text-gray-300 max-w-3xl text-center text-lg px-4">
                Tout ce dont vous avez besoin pour gérer votre bibliothèque multimédia personnelle.
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
                Bientôt disponible en version bêta !
            </UButton>
            <h2 class="text-white mt-12 text-6xl font-bold">Castium arrive bientôt</h2>
            <p class="text-gray-300 mt-6 max-w-2xl text-lg text-center px-4">
                Nous mettons la touche finale à une plateforme élégante, moderne, et pensée pour
                durer. Rejoignez-nous et soyez parmi les premiers à tester Castium.
            </p>
            <div class="mt-8 mx-auto flex items-center gap-4">
                <UInput
                    trailing-icon="i-lucide-at-sign"
                    placeholder="Enter your email"
                    size="md"
                    color="neutral"
                    variant="outline"
                />
                <UButton
trailing-icon="i-heroicons-arrow-right" color="neutral"
variant="outline"
>
                    S'inscrire
                </UButton>
            </div>
            <p class="text-gray-300 mb-4 mt-4 max-w-2xl text-sm text-center px-4">
                Accédez à la version bêta en avant-première
            </p>
        </div>
        <Footer mode="landing" />
    </div>
</template>
