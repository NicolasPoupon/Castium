<script setup lang="ts">
/**
 * YouTube OAuth Callback Page
 * Handles the OAuth callback from Google and exchanges the code for tokens
 */

definePageMeta({
    layout: "default",
    auth: false,
})

const route = useRoute()
const router = useRouter()
const { handleCallback, error } = useYouTube()

const processing = ref(true)
const success = ref(false)
const errorMessage = ref<string | null>(null)

onMounted(async () => {
    const code = route.query.code as string
    const callbackError = route.query.error as string

    console.log("[YouTube Callback] Processing callback...")
    console.log("[YouTube Callback] Code:", code ? "present" : "missing")
    console.log("[YouTube Callback] Error:", callbackError || "none")

    if (callbackError) {
        errorMessage.value =
            callbackError === "access_denied"
                ? "Access was denied. Please try again and allow the required permissions."
                : `Authentication failed: ${callbackError}`
        processing.value = false
        return
    }

    if (!code) {
        errorMessage.value = "No authorization code received"
        processing.value = false
        return
    }

    try {
        console.log("[YouTube Callback] Calling handleCallback...")
        const result = await handleCallback(code)
        console.log("[YouTube Callback] Result:", result)

        if (result) {
            success.value = true
            console.log("[YouTube Callback] Success! Redirecting in 1.5s...")
            // Redirect to lectures page after short delay
            setTimeout(() => {
                router.push("/app/lectures")
            }, 1500)
        } else {
            console.error("[YouTube Callback] Failed:", error.value)
            errorMessage.value =
                error.value || "Failed to authenticate with YouTube"
        }
    } catch (e: any) {
        console.error("[YouTube Callback] Exception:", e)
        errorMessage.value = e.message || "An unexpected error occurred"
    } finally {
        processing.value = false
    }
})
</script>

<template>
    <div class="min-h-screen bg-gray-900 flex items-center justify-center">
        <div class="max-w-md w-full mx-4">
            <div class="bg-gray-800 rounded-2xl p-8 text-center">
                <!-- Processing -->
                <div v-if="processing" class="py-8">
                    <div class="w-16 h-16 mx-auto mb-6 relative">
                        <div
                            class="absolute inset-0 border-4 border-red-600/30 rounded-full"
                        ></div>
                        <div
                            class="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"
                        ></div>
                    </div>
                    <h2 class="text-xl font-semibold text-white mb-2">
                        Connecting to YouTube...
                    </h2>
                    <p class="text-gray-400">
                        Please wait while we complete the authentication
                    </p>
                </div>

                <!-- Success -->
                <div v-else-if="success" class="py-8">
                    <div
                        class="w-16 h-16 mx-auto mb-6 bg-green-600 rounded-full flex items-center justify-center"
                    >
                        <UIcon
                            name="i-heroicons-check"
                            class="w-10 h-10 text-white"
                        />
                    </div>
                    <h2 class="text-xl font-semibold text-white mb-2">
                        Connected to YouTube!
                    </h2>
                    <p class="text-gray-400">
                        Redirecting to your video library...
                    </p>
                </div>

                <!-- Error -->
                <div v-else class="py-8">
                    <div
                        class="w-16 h-16 mx-auto mb-6 bg-red-600 rounded-full flex items-center justify-center"
                    >
                        <UIcon
                            name="i-heroicons-x-mark"
                            class="w-10 h-10 text-white"
                        />
                    </div>
                    <h2 class="text-xl font-semibold text-white mb-2">
                        Connection Failed
                    </h2>
                    <p class="text-red-400 mb-6">
                        {{ errorMessage }}
                    </p>
                    <div class="flex gap-4 justify-center">
                        <UButton
                            color="neutral"
                            variant="ghost"
                            label="Go Back"
                            @click="router.push('/app/lectures')"
                        />
                        <UButton
                            color="primary"
                            label="Try Again"
                            class="bg-red-600 hover:bg-red-700"
                            @click="router.push('/app/lectures')"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
