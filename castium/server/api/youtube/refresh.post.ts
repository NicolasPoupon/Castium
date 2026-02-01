/**
 * YouTube OAuth Token Refresh
 * Refreshes an expired access token using the refresh token
 */

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { refreshToken } = body

    if (!refreshToken) {
        throw createError({
            statusCode: 400,
            statusMessage: "Refresh token is required",
        })
    }

    const config = useRuntimeConfig()

    const clientId = config.public.youtubeClientId
    const clientSecret = config.youtubeClientSecret

    if (!clientId || !clientSecret) {
        throw createError({
            statusCode: 500,
            statusMessage: "YouTube API credentials not configured",
        })
    }

    try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "refresh_token",
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error("[YouTube] Token refresh error:", errorData)
            throw createError({
                statusCode: response.status,
                statusMessage:
                    errorData.error_description || "Failed to refresh token",
            })
        }

        const data = await response.json()

        return {
            access_token: data.access_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
        }
    } catch (error: any) {
        console.error("[YouTube] Token refresh failed:", error)
        throw createError({
            statusCode: 500,
            statusMessage: error.message || "Failed to refresh YouTube token",
        })
    }
})
