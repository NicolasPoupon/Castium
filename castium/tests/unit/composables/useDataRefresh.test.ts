import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runMounted, runUnmounted } from '../../test-setup'

describe('useDataRefresh', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('onRefresh subscribes and unsubscribe removes callback', async () => {
        const { useDataRefresh } = await import('~/composables/useDataRefresh')
        const { onRefresh, triggerRefresh } = useDataRefresh()
        const cb = vi.fn()
        const unsub = onRefresh('music', cb)
        await triggerRefresh('music')
        expect(cb).toHaveBeenCalledTimes(1)
        unsub()
        await triggerRefresh('music')
        expect(cb).toHaveBeenCalledTimes(1)
    })

    it('triggerRefresh calls category and "all" subscribers', async () => {
        const { useDataRefresh } = await import('~/composables/useDataRefresh')
        const { onRefresh, triggerRefresh } = useDataRefresh()
        const musicCb = vi.fn()
        const allCb = vi.fn()
        onRefresh('music', musicCb)
        onRefresh('all', allCb)
        await triggerRefresh('music')
        expect(musicCb).toHaveBeenCalledTimes(1)
        expect(allCb).toHaveBeenCalledTimes(1)
    })

    it('useRefreshSubscription registers on mount and unsubscribes on unmount', async () => {
        const { useDataRefresh } = await import('~/composables/useDataRefresh')
        const { useRefreshSubscription, triggerRefresh } = useDataRefresh()
        const cb = vi.fn()
        useRefreshSubscription('podcasts', cb)
        runMounted()
        await triggerRefresh('podcasts')
        expect(cb).toHaveBeenCalledTimes(1)
        runUnmounted()
        await triggerRefresh('podcasts')
        expect(cb).toHaveBeenCalledTimes(1)
    })
})
