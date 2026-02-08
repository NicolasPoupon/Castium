export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const body = await readBody<{ code?: string; redirectUri?: string }>(event)
    const code = body?.code

    if (!code) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Authorization code is required',
        })
    }

    const clientId = config.public.spotifyClientId
    const clientSecret = config.spotifyClientSecret
    const redirectUri =
        body?.redirectUri ||
        config.public.spotifyRedirectUri ||
        `${getRequestURL(event).origin}/auth/spotify/callback`

    if (!clientId || !clientSecret) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Spotify API credentials are not configured',
        })
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            throw createError({
                statusCode: response.status,
                statusMessage:
                    data?.error_description || data?.error || 'Failed to exchange Spotify token',
            })
        }

        if (!data?.access_token) {
            throw createError({
                statusCode: 502,
                statusMessage: 'Spotify token response did not include access_token',
            })
        }

        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
        }
    } catch (error: any) {
        if (error?.statusCode) {
            throw error
        }
        throw createError({
            statusCode: 500,
            statusMessage: error?.message || 'Spotify authentication failed',
        })
    }
})
