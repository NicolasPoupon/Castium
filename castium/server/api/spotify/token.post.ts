export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const body = await readBody(event)
    const { code } = body

    const clientId = config.public.spotifyClientId
    const clientSecret = config.spotifyClientSecret
    const redirectUri = config.public.spotifyRedirectUri

    const tokenUrl = "https://accounts.spotify.com/api/token"

    const params = new URLSearchParams()
    params.append("grant_type", "authorization_code")
    params.append("code", code)
    params.append("redirect_uri", redirectUri)

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: params.toString(),
    })

    const data = await response.json()
    return data
})
