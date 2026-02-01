/**
 * YouTube OAuth Token Exchange
 * Exchanges authorization code for access and refresh tokens
 */

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { code } = body

    console.log("[YouTube API] Token exchange requested")

    if (!code) {
        throw createError({
            statusCode: 400,
            statusMessage: "Authorization code is required",
        })
    }

    const config = useRuntimeConfig()

    const clientId = config.public.youtubeClientId
    const clientSecret = config.youtubeClientSecret
    const redirectUri = config.public.youtubeRedirectUri

    console.log("[YouTube API] Client ID:", clientId ? "present" : "missing")
    console.log("[YouTube API] Client Secret:", clientSecret ? "present" : "missing")
    console.log("[YouTube API] Redirect URI:", redirectUri)

    if (!clientId || !clientSecret) {
        throw createError({
            statusCode: 500,
            statusMessage: "YouTube API credentials not configured",
        })
    }

    try {
        const requestBody = new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri:
                redirectUri ||
                `${getRequestURL(event).origin}/auth/youtube/callback`,
            grant_type: "authorization_code",
        })

        console.log("[YouTube API] Making token request to Google...")

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: requestBody,
        })

        const data = await response.json()

        if (!response.ok) {
            console.error("[YouTube API] Token exchange error:", data)
            throw createError({
                statusCode: response.status,
                statusMessage:
                    data.error_description || data.error || "Failed to exchange token",
            })
        }

        console.log("[YouTube API] Token exchange successful!")
        console.log("[YouTube API] Access token:", data.access_token ? "received" : "missing")
        console.log("[YouTube API] Refresh token:", data.refresh_token ? "received" : "missing")

        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
        }
    } catch (error: any) {
        console.error("[YouTube API] Token exchange failed:", error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage:
                error.statusMessage || error.message || "Failed to authenticate with YouTube",
        })
    }
})
