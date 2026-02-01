<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"
import { useI18n } from "#imports"
const { t } = useI18n()
const props = defineProps({
    mode: {
        type: String,
        default: "landing", // landing | login | music | podcast
    },
})
const items: NavigationMenuItem[] = [
    {
        label: t("footer.links.releases"),
        to: "https://github.com/NicolasPoupon/Castium/releases",
        target: "_blank",
    },
    {
        label: t("footer.links.support"),
        to: "https://github.com/NicolasPoupon/Castium/releases",
        target: "_blank",
    },
    {
        label: t("footer.links.documentation"),
        to: "https://github.com/NicolasPoupon/Castium/releases",
        target: "_blank",
    },
    {
        label: t("footer.links.legal"),
        to: "https://github.com/NicolasPoupon/Castium/releases",
        target: "_blank",
    },
    {
        label: t("footer.links.contact"),
        to: "https://github.com/NicolasPoupon/Castium/releases",
        target: "_blank",
    },
]
</script>

<template>
    <UFooter class="mt-auto w-full border-t border-gray-800">
        <template #left>
            <p class="text-muted text-sm">
                © {{ new Date().getFullYear() }} {{ t("footer.rights") }}
            </p>
        </template>

        <UNavigationMenu :items="items" variant="link" />

        <template #right>
            <UButton
                v-if="props.mode === 'landing'"
                icon="i-simple-icons-discord"
                color="neutral"
                variant="ghost"
                to="https://discord.com"
                target="_blank"
                aria-label="Discord"
            />
            <UButton
                icon="i-simple-icons-x"
                color="neutral"
                variant="ghost"
                to="https://x.com"
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
