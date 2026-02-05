/**
 * Composable for managing data refresh events across the app
 * Allows components to subscribe to refresh events for specific categories
 */

type DataCategory = 'lectures' | 'music' | 'radio' | 'tv' | 'podcasts' | 'photos' | 'all'
type RefreshCallback = () => void | Promise<void>

// Global state for refresh subscribers
const subscribers = new Map<DataCategory, Set<RefreshCallback>>()

export function useDataRefresh() {
    // Subscribe to refresh events for a category
    const onRefresh = (category: DataCategory, callback: RefreshCallback) => {
        if (!subscribers.has(category)) {
            subscribers.set(category, new Set())
        }
        subscribers.get(category)!.add(callback)

        // Return unsubscribe function
        return () => {
            subscribers.get(category)?.delete(callback)
        }
    }

    // Trigger refresh for a specific category
    const triggerRefresh = async (category: DataCategory) => {
        const callbacks = subscribers.get(category)
        const allCallbacks = subscribers.get('all')

        const toCall: RefreshCallback[] = []

        if (callbacks) {
            toCall.push(...callbacks)
        }
        if (allCallbacks) {
            toCall.push(...allCallbacks)
        }

        // Execute all callbacks in parallel
        await Promise.allSettled(toCall.map((cb) => cb()))

        console.log(`[DataRefresh] Triggered refresh for category: ${category}`)
    }

    // Auto-subscribe on component mount, auto-unsubscribe on unmount
    const useRefreshSubscription = (category: DataCategory, callback: RefreshCallback) => {
        onMounted(() => {
            const unsubscribe = onRefresh(category, callback)
            onUnmounted(() => {
                unsubscribe()
            })
        })
    }

    return {
        onRefresh,
        triggerRefresh,
        useRefreshSubscription,
    }
}
