import { defineEventHandler, getQuery, setHeader, createError, sendStream } from 'h3'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { Readable } from 'node:stream'

function isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map((n) => Number(n))
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true

    const [a, b] = parts
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
}

function isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase()
    if (normalized === '::1') return true
    if (normalized.startsWith('fe80:')) return true
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
    return false
}

async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
    let url: URL
    try {
        url = new URL(rawUrl)
    } catch {
        throw createError({ statusCode: 400, statusMessage: 'Invalid url' })
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw createError({ statusCode: 400, statusMessage: 'Only http/https supported' })
    }

    const hostname = url.hostname.toLowerCase()
    if (hostname === 'localhost' || hostname.endsWith('.local')) {
        throw createError({ statusCode: 400, statusMessage: 'Blocked hostname' })
    }

    const ipType = isIP(hostname)
    const address = ipType ? hostname : (await lookup(hostname)).address
    const resolvedType = isIP(address)

    if (
        (resolvedType === 4 && isPrivateIPv4(address)) ||
        (resolvedType === 6 && isPrivateIPv6(address))
    ) {
        throw createError({ statusCode: 400, statusMessage: 'Blocked target address' })
    }

    return url
}

function rewriteM3U8Playlist(playlist: string, baseUrl: URL): string {
    const lines = playlist.split(/\r?\n/)
    const rewritten = lines.map((line) => {
        const trimmed = line.trim()
        if (!trimmed) return line

        // Rewrite key URIs inside tags
        if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/g, (_m, uriValue: string) => {
                const absolute = new URL(uriValue, baseUrl).toString()
                const proxied = `/api/radio-proxy?url=${encodeURIComponent(absolute)}`
                return `URI="${proxied}"`
            })
        }

        // Leave comments as-is
        if (trimmed.startsWith('#')) return line

        // Segment / variant playlist URL
        const absolute = new URL(trimmed, baseUrl).toString()
        return `/api/radio-proxy?url=${encodeURIComponent(absolute)}`
    })

    return rewritten.join('\n')
}

// Convert Web ReadableStream to Node.js Readable
function webStreamToNodeStream(webStream: ReadableStream<Uint8Array>): Readable {
    const reader = webStream.getReader()
    return new Readable({
        async read() {
            try {
                const { done, value } = await reader.read()
                if (done) {
                    this.push(null)
                } else {
                    this.push(Buffer.from(value))
                }
            } catch {
                this.destroy()
            }
        },
    })
}

export default defineEventHandler(async (event) => {
    if (event.method !== 'GET' && event.method !== 'HEAD') {
        throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
    }

    const { url: rawUrl } = getQuery(event)
    if (typeof rawUrl !== 'string' || !rawUrl) {
        throw createError({ statusCode: 400, statusMessage: 'Missing url query param' })
    }

    const targetUrl = await assertPublicHttpUrl(rawUrl)

    // For M3U8 playlists, rewrite segment URLs to go through the proxy too.
    const pathname = targetUrl.pathname.toLowerCase()
    const isPlaylist = pathname.endsWith('.m3u8') || pathname.endsWith('.m3u')

    // Add CORS headers
    setHeader(event, 'access-control-allow-origin', '*')
    setHeader(event, 'access-control-allow-headers', 'Range,Content-Type')

    if (isPlaylist) {
        const response = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers: {
                ...(event.node.req.headers.range
                    ? { range: String(event.node.req.headers.range) }
                    : {}),
            },
        })

        if (!response.ok) {
            throw createError({
                statusCode: response.status,
                statusMessage: 'Upstream playlist error',
            })
        }

        const text = await response.text()
        const rewritten = rewriteM3U8Playlist(text, targetUrl)
        setHeader(
            event,
            'content-type',
            response.headers.get('content-type') || 'application/vnd.apple.mpegurl',
        )
        setHeader(event, 'cache-control', 'no-store')
        return rewritten
    }

    // Stream everything else (mp3/aac/ts/etc.)
    try {
        const upstream = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers: {
                ...(event.node.req.headers.range
                    ? { range: String(event.node.req.headers.range) }
                    : {}),
                'user-agent': event.node.req.headers['user-agent'] || 'Castium/1.0',
            },
        })

        if (!upstream.ok) {
            throw createError({ statusCode: upstream.status, statusMessage: 'Upstream error' })
        }

        // Forward content-type
        setHeader(
            event,
            'content-type',
            upstream.headers.get('content-type') || 'application/octet-stream',
        )
        setHeader(event, 'cache-control', 'no-store')

        // Convert web stream to node stream and send
        if (upstream.body) {
            const nodeStream = webStreamToNodeStream(upstream.body)
            return sendStream(event, nodeStream)
        }

        return ''
    } catch {
        throw createError({ statusCode: 502, statusMessage: 'Proxy fetch failed' })
    }
})
