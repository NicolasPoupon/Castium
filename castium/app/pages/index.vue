<script setup lang="ts">
import { useI18n } from '#imports'
const { t, locale } = useI18n()
watch(locale, () => {})

useHead({
    title: 'Castium — Your multimedia universe',
})

// Scroll-triggered reveal animation
const observerTargets = ref<Element[]>([])

onMounted(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed')
                    observer.unobserve(entry.target)
                }
            })
        },
        { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    )

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        observer.observe(el)
    })
})

// Parallax effect for hero
const heroParallax = ref(0)
const handleScroll = () => {
    if (typeof window !== 'undefined') {
        heroParallax.value = window.scrollY * 0.3
    }
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
})

// Feature showcase sections
const features = [
    {
        key: 'films',
        video: '/film.mp4',
        icon: 'i-heroicons-film',
        color: 'from-red-600/20 to-orange-600/20',
        borderColor: 'border-red-500/30',
        iconColor: 'text-red-400',
        reverse: false,
    },
    {
        key: 'music',
        video: '/music.mp4',
        icon: 'i-heroicons-musical-note',
        color: 'from-violet-600/20 to-purple-600/20',
        borderColor: 'border-violet-500/30',
        iconColor: 'text-violet-400',
        reverse: true,
    },
    {
        key: 'podcasts',
        video: '/podcasts.mp4',
        icon: 'i-heroicons-microphone',
        color: 'from-emerald-600/20 to-teal-600/20',
        borderColor: 'border-emerald-500/30',
        iconColor: 'text-emerald-400',
        reverse: false,
    },
    {
        key: 'tv',
        video: '/tv.mp4',
        icon: 'i-heroicons-tv',
        color: 'from-blue-600/20 to-cyan-600/20',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400',
        reverse: true,
    },
    {
        key: 'radio',
        video: '/radio.mp4',
        icon: 'i-heroicons-signal',
        color: 'from-amber-600/20 to-yellow-600/20',
        borderColor: 'border-amber-500/30',
        iconColor: 'text-amber-400',
        reverse: false,
    },
    {
        key: 'photos',
        video: '/photos.mp4',
        icon: 'i-heroicons-photo',
        color: 'from-pink-600/20 to-rose-600/20',
        borderColor: 'border-pink-500/30',
        iconColor: 'text-pink-400',
        reverse: true,
    },
    {
        key: 'lectures',
        video: '/lectures.mp4',
        icon: 'i-heroicons-play-circle',
        color: 'from-indigo-600/20 to-blue-600/20',
        borderColor: 'border-indigo-500/30',
        iconColor: 'text-indigo-400',
        reverse: false,
    },
]

const stats = [
    { key: 'categories', value: '7', icon: 'i-heroicons-squares-2x2' },
    { key: 'formats', value: '50+', icon: 'i-heroicons-document' },
    { key: 'price', value: '0€', icon: 'i-heroicons-currency-euro' },
    { key: 'ads', value: '0', icon: 'i-heroicons-eye-slash' },
]

const sellingPoints = [
    { key: 'privacy', icon: 'i-heroicons-shield-check' },
    { key: 'sync', icon: 'i-heroicons-cloud-arrow-up' },
    { key: 'auto', icon: 'i-heroicons-bolt' },
    { key: 'interface', icon: 'i-heroicons-paint-brush' },
    { key: 'local', icon: 'i-heroicons-folder-open' },
    { key: 'free', icon: 'i-heroicons-gift' },
]
</script>

<template>
    <div class="min-h-screen bg-[#060B18] overflow-hidden">
        <Navbar mode="landing" />

        <!-- ===== HERO SECTION ===== -->
        <section class="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
            <!-- Animated gradient background -->
            <div class="absolute inset-0 hero-gradient-bg" />

            <!-- Floating particles -->
            <div class="absolute inset-0 overflow-hidden pointer-events-none">
                <div v-for="i in 20" :key="i" class="floating-particle" :style="{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 8}s`,
                    animationDuration: `${6 + Math.random() * 8}s`,
                    width: `${2 + Math.random() * 4}px`,
                    height: `${2 + Math.random() * 4}px`,
                }" />
            </div>

            <!-- Radial glow -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[120px] animate-pulse-slow" />

            <div class="relative z-10 text-center px-4" :style="{ transform: `translateY(${heroParallax}px)` }">
                <!-- Badge -->
                <div class="reveal-on-scroll inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium mb-8 backdrop-blur-sm">
                    <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {{ t('landing.hero.badge') }}
                </div>

                <h1 class="reveal-on-scroll text-5xl sm:text-7xl lg:text-8xl font-bold text-white leading-tight tracking-tight">
                    {{ t('landing.hero.titleMain') }}
                </h1>

                <h1 class="reveal-on-scroll hero-gradient-text text-5xl sm:text-7xl lg:text-8xl font-bold leading-tight tracking-tight mt-1 pb-4">
                    {{ t('landing.hero.titleHighlight') }}
                </h1>

                <p class="reveal-on-scroll text-gray-400 text-lg sm:text-xl max-w-3xl mx-auto mt-8 leading-relaxed">
                    {{ t('landing.hero.description') }}
                </p>

                <div class="reveal-on-scroll flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                    <UButton
                        to="/auth/signup"
                        size="xl"
                        trailing-icon="i-heroicons-arrow-right"
                        class="hero-cta-btn px-8 py-3.5 text-lg font-semibold rounded-xl"
                    >
                        {{ t('landing.hero.cta') }}
                    </UButton>
                    <UButton
                        to="#features"
                        variant="ghost"
                        color="neutral"
                        size="xl"
                        trailing-icon="i-heroicons-chevron-down"
                        class="px-6 py-3.5 text-lg text-gray-300 hover:text-white rounded-xl"
                    >
                        {{ t('landing.hero.discover') }}
                    </UButton>
                </div>
            </div>

            <!-- Scroll indicator -->
            <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <div class="scroll-indicator" />
            </div>
        </section>

        <!-- ===== STATS BAR ===== -->
        <section class="relative py-16 border-y border-white/5">
            <div class="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div
                    v-for="(stat, i) in stats"
                    :key="stat.key"
                    class="reveal-on-scroll text-center"
                    :style="{ transitionDelay: `${i * 100}ms` }"
                >
                    <UIcon :name="stat.icon" class="w-6 h-6 text-gray-500 mx-auto mb-2" />
                    <div class="text-4xl font-bold text-white counter-anim">{{ stat.value }}</div>
                    <div class="text-gray-500 text-sm mt-1">{{ t(`landing.stats.${stat.key}`) }}</div>
                </div>
            </div>
        </section>

        <!-- ===== FEATURES SHOWCASE ===== -->
        <section id="features" class="relative py-24">
            <!-- Section header -->
            <div class="text-center mb-20 px-4">
                <h2 class="reveal-on-scroll text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
                    {{ t('landing.showcase.title') }}
                </h2>
                <p class="reveal-on-scroll text-gray-400 text-lg sm:text-xl mt-6 max-w-3xl mx-auto">
                    {{ t('landing.showcase.description') }}
                </p>
            </div>

            <!-- Feature sections with videos -->
            <div
                v-for="(feature, index) in features"
                :key="feature.key"
                class="reveal-on-scroll feature-section mb-24 last:mb-0"
                :style="{ transitionDelay: '100ms' }"
            >
                <div
                    class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
                    :class="{ 'lg:[direction:rtl]': feature.reverse }"
                >
                    <!-- Video -->
                    <div class="lg:[direction:ltr]">
                        <div
                            class="relative rounded-2xl overflow-hidden border shadow-2xl group"
                            :class="[feature.borderColor]"
                        >
                            <!-- Glow effect behind video -->
                            <div
                                class="absolute -inset-1 rounded-2xl bg-gradient-to-br opacity-50 blur-xl group-hover:opacity-75 transition-opacity duration-500"
                                :class="[feature.color]"
                            />
                            <video
                                :src="feature.video"
                                autoplay
                                loop
                                muted
                                playsinline
                                class="relative w-full rounded-2xl"
                            />
                        </div>
                    </div>

                    <!-- Text -->
                    <div class="lg:[direction:ltr] space-y-6">
                        <div class="inline-flex items-center gap-3">
                            <div
                                class="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br"
                                :class="[feature.color]"
                            >
                                <UIcon :name="feature.icon" class="w-6 h-6" :class="feature.iconColor" />
                            </div>
                            <span class="text-sm font-medium uppercase tracking-widest" :class="feature.iconColor">
                                {{ t(`landing.showcase.features.${feature.key}.tag`) }}
                            </span>
                        </div>

                        <h3 class="text-3xl sm:text-4xl font-bold text-white leading-snug">
                            {{ t(`landing.showcase.features.${feature.key}.title`) }}
                        </h3>

                        <p class="text-gray-400 text-lg leading-relaxed">
                            {{ t(`landing.showcase.features.${feature.key}.description`) }}
                        </p>

                        <!-- Feature bullet points -->
                        <ul class="space-y-3 pt-2">
                            <li
                                v-for="j in 3"
                                :key="j"
                                class="flex items-start gap-3"
                            >
                                <UIcon name="i-heroicons-check-circle-solid" class="w-5 h-5 mt-0.5 text-green-400 shrink-0" />
                                <span class="text-gray-300">
                                    {{ t(`landing.showcase.features.${feature.key}.bullets.${j}`) }}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===== SELLING POINTS GRID ===== -->
        <section class="relative py-24 overflow-hidden">
            <!-- Background decoration -->
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[150px]" />

            <div class="relative max-w-6xl mx-auto px-4">
                <h2 class="reveal-on-scroll text-4xl sm:text-5xl font-bold text-white text-center mb-4">
                    {{ t('landing.selling.title') }}
                </h2>
                <p class="reveal-on-scroll text-gray-400 text-lg text-center mb-16 max-w-2xl mx-auto">
                    {{ t('landing.selling.description') }}
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div
                        v-for="(point, i) in sellingPoints"
                        :key="point.key"
                        class="reveal-on-scroll selling-card group relative rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-8 hover:border-white/15 transition-all duration-500"
                        :style="{ transitionDelay: `${i * 80}ms` }"
                    >
                        <!-- Hover glow -->
                        <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div class="relative">
                            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600/20 to-red-600/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                <UIcon :name="point.icon" class="w-7 h-7 text-red-400" />
                            </div>
                            <h3 class="text-xl font-bold text-white mb-3">
                                {{ t(`landing.selling.points.${point.key}.title`) }}
                            </h3>
                            <p class="text-gray-400 leading-relaxed">
                                {{ t(`landing.selling.points.${point.key}.description`) }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===== SETTINGS PREVIEW ===== -->
        <section class="relative py-24">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div class="space-y-6">
                    <div class="reveal-on-scroll inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-600/30 bg-gray-600/10 text-gray-400 text-sm font-medium">
                        <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
                        {{ t('landing.showcase.features.settings.tag') }}
                    </div>
                    <h3 class="reveal-on-scroll text-3xl sm:text-4xl font-bold text-white leading-snug">
                        {{ t('landing.showcase.features.settings.title') }}
                    </h3>
                    <p class="reveal-on-scroll text-gray-400 text-lg leading-relaxed">
                        {{ t('landing.showcase.features.settings.description') }}
                    </p>
                    <ul class="reveal-on-scroll space-y-3 pt-2">
                        <li v-for="j in 3" :key="j" class="flex items-start gap-3">
                            <UIcon name="i-heroicons-check-circle-solid" class="w-5 h-5 mt-0.5 text-green-400 shrink-0" />
                            <span class="text-gray-300">
                                {{ t(`landing.showcase.features.settings.bullets.${j}`) }}
                            </span>
                        </li>
                    </ul>
                </div>
                <div class="reveal-on-scroll relative rounded-2xl overflow-hidden border border-gray-500/30 shadow-2xl group">
                    <div class="absolute -inset-1 rounded-2xl bg-gradient-to-br from-gray-600/20 to-gray-600/5 opacity-50 blur-xl group-hover:opacity-75 transition-opacity duration-500" />
                    <video
                        src="/settings.mp4"
                        autoplay
                        loop
                        muted
                        playsinline
                        class="relative w-full rounded-2xl"
                    />
                </div>
            </div>
        </section>

        <!-- ===== CTA / BETA SECTION ===== -->
        <section class="relative py-32 overflow-hidden">
            <!-- Animated gradient background -->
            <div class="absolute inset-0 cta-gradient-bg" />
            <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

            <div class="relative z-10 max-w-4xl mx-auto px-4 text-center">
                <div class="reveal-on-scroll inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium mb-8">
                    <UIcon name="i-heroicons-rocket-launch" class="w-4 h-4" />
                    {{ t('landing.beta.badge') }}
                </div>

                <h2 class="reveal-on-scroll text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight">
                    {{ t('landing.beta.title') }}
                </h2>

                <p class="reveal-on-scroll text-gray-300 text-lg sm:text-xl mt-8 max-w-2xl mx-auto leading-relaxed">
                    {{ t('landing.beta.description') }}
                </p>

                <div class="reveal-on-scroll mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <UButton
                        to="/auth/signup"
                        size="xl"
                        trailing-icon="i-heroicons-arrow-right"
                        class="hero-cta-btn px-8 py-3.5 text-lg font-semibold rounded-xl"
                    >
                        {{ t('landing.beta.ctaButton') }}
                    </UButton>
                </div>

                <p class="reveal-on-scroll text-gray-500 text-sm mt-6">
                    {{ t('landing.beta.helper') }}
                </p>
            </div>
        </section>

        <Footer mode="landing" />
    </div>
</template>

<style scoped>
/* Hero gradient background */
.hero-gradient-bg {
    background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(185, 28, 28, 0.15), transparent),
                radial-gradient(ellipse 60% 40% at 80% 50%, rgba(88, 28, 135, 0.08), transparent),
                radial-gradient(ellipse 60% 40% at 20% 50%, rgba(30, 64, 175, 0.08), transparent),
                linear-gradient(to bottom, #060B18, #0a0f1f);
}

/* Hero gradient text */
.hero-gradient-text {
    background: linear-gradient(135deg, #f87171 0%, #ef4444 30%, #dc2626 60%, #991b1b 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* CTA button with glow */
.hero-cta-btn {
    background: linear-gradient(135deg, #dc2626, #991b1b) !important;
    box-shadow: 0 0 30px rgba(220, 38, 38, 0.3), 0 0 60px rgba(220, 38, 38, 0.1);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.hero-cta-btn:hover {
    box-shadow: 0 0 40px rgba(220, 38, 38, 0.5), 0 0 80px rgba(220, 38, 38, 0.2);
    transform: translateY(-2px);
}

/* CTA gradient background */
.cta-gradient-bg {
    background: radial-gradient(ellipse 80% 60% at 50% 100%, rgba(185, 28, 28, 0.2), transparent),
                linear-gradient(to bottom, #060B18, #0d1225, #060B18);
}

/* Floating particles */
.floating-particle {
    position: absolute;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    animation: float-particle linear infinite;
}

@keyframes float-particle {
    0% {
        transform: translateY(0) translateX(0);
        opacity: 0;
    }
    10% {
        opacity: 1;
    }
    90% {
        opacity: 1;
    }
    100% {
        transform: translateY(-100vh) translateX(30px);
        opacity: 0;
    }
}

/* Scroll indicator */
.scroll-indicator {
    width: 24px;
    height: 40px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    position: relative;
}

.scroll-indicator::after {
    content: '';
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 8px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 2px;
    animation: scroll-bounce 2s ease-in-out infinite;
}

@keyframes scroll-bounce {
    0%, 100% {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
    50% {
        transform: translateX(-50%) translateY(12px);
        opacity: 0.3;
    }
}

/* Reveal on scroll animation */
.reveal-on-scroll {
    opacity: 0;
    transform: translateY(40px);
    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal-on-scroll.revealed {
    opacity: 1;
    transform: translateY(0);
}

/* Selling card hover */
.selling-card {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.selling-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

/* Slow pulse */
.animate-pulse-slow {
    animation: pulse-slow 6s ease-in-out infinite;
}

@keyframes pulse-slow {
    0%, 100% {
        opacity: 0.3;
        transform: translate(-50%, -50%) scale(1);
    }
    50% {
        opacity: 0.6;
        transform: translate(-50%, -50%) scale(1.1);
    }
}

/* Feature section */
.feature-section video {
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.feature-section:hover video {
    transform: scale(1.02);
}
</style>
