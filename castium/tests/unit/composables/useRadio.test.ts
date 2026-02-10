import { describe, it, expect, beforeEach, vi } from 'vitest'

interface MockStation {
    stationuuid: string
    name: string
    url_resolved: string
    favicon: string
    country: string
    countrycode: string
    language: string
    tags: string
    codec: string
    bitrate: number
    hls: number
    lastcheckok: number
    votes: number
    clickcount: number
}

const createApiStation = (overrides: Partial<MockStation> = {}): MockStation => ({
    stationuuid: 'station-1',
    name: 'Rock FM',
    url_resolved: 'https://stream.example/rock',
    favicon: 'https://img.example/rock.png',
    country: 'France',
    countrycode: 'FR',
    language: 'French',
    tags: 'rock',
    codec: 'mp3',
    bitrate: 128,
    hls: 1,
    lastcheckok: 1,
    votes: 10,
    clickcount: 20,
    ...overrides,
})

const createSupabaseMock = (favoriteIds: string[] = [], selectError: unknown = null) => {
    const selectEq = vi
        .fn()
        .mockResolvedValue({ data: favoriteIds.map((id) => ({ station_id: id })), error: selectError })
    const select = vi.fn(() => ({ eq: selectEq }))

    const deleteEqStation = vi.fn().mockResolvedValue({ data: null, error: null })
    const deleteEqUser = vi.fn(() => ({ eq: deleteEqStation }))
    const remove = vi.fn(() => ({ eq: deleteEqUser }))

    const insert = vi.fn().mockResolvedValue({ data: null, error: null })

    const from = vi.fn(() => ({
        select,
        delete: remove,
        insert,
    }))

    return {
        client: { from },
        spies: { from, select, selectEq, remove, deleteEqUser, deleteEqStation, insert },
    }
}

describe('useRadio', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
        vi.spyOn(console, 'log').mockImplementation(() => {})
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('loads stations, filters broken entries and applies favorites', async () => {
        const supabase = createSupabaseMock(['station-1'])
        vi.stubGlobal('useSupabase', () => supabase.client)
        vi.stubGlobal('useAuth', () => ({ user: { value: { id: 'user-1' } } }))
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve([
                        createApiStation({ stationuuid: 'station-1', name: 'Rock FM' }),
                        createApiStation({
                            stationuuid: 'station-2',
                            name: 'Broken',
                            lastcheckok: 0,
                        }),
                        createApiStation({
                            stationuuid: 'station-3',
                            name: 'No URL',
                            url_resolved: '',
                        }),
                        createApiStation({
                            stationuuid: 'station-4',
                            name: 'Jazz One',
                            country: 'Canada',
                            language: 'English',
                            url_resolved: 'https://stream.example/jazz',
                        }),
                    ]),
            })
        )

        const { useRadio } = await import('~/composables/useRadio')
        const radio = useRadio()

        await radio.loadStations()

        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        expect(radio.loading.value).toBe(false)
        expect(radio.error.value).toBeNull()
        expect(radio.stations.value).toHaveLength(2)
        expect(radio.stations.value[0].id).toBe('station-1')
        expect(radio.stations.value[0].isFavorite).toBe(true)
        expect(radio.stations.value[1].isFavorite).toBe(false)
        expect(supabase.spies.selectEq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('does not re-fetch stations when already loaded and refreshes favorites', async () => {
        const supabase = createSupabaseMock(['station-1'])
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([createApiStation()]),
        })

        vi.stubGlobal('useSupabase', () => supabase.client)
        vi.stubGlobal('useAuth', () => ({ user: { value: { id: 'user-1' } } }))
        vi.stubGlobal('fetch', fetchMock)

        const { useRadio } = await import('~/composables/useRadio')
        const radio = useRadio()

        await radio.loadStations()
        await radio.loadStations()

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(supabase.spies.selectEq).toHaveBeenCalledTimes(2)
    })

    it('sets error when API fetch fails', async () => {
        const supabase = createSupabaseMock()
        vi.stubGlobal('useSupabase', () => supabase.client)
        vi.stubGlobal('useAuth', () => ({ user: { value: { id: 'user-1' } } }))
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                json: () => Promise.resolve([]),
            })
        )

        const { useRadio } = await import('~/composables/useRadio')
        const radio = useRadio()

        await radio.loadStations()

        expect(radio.loading.value).toBe(false)
        expect(radio.error.value).toBe('Failed to load radio stations from API')
        expect(radio.stations.value).toHaveLength(0)
    })

    it('toggles favorites and updates current station state', async () => {
        const supabase = createSupabaseMock([])
        vi.stubGlobal('useSupabase', () => supabase.client)
        vi.stubGlobal('useAuth', () => ({ user: { value: { id: 'user-1' } } }))
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([createApiStation()]),
            })
        )

        const { useRadio } = await import('~/composables/useRadio')
        const radio = useRadio()
        await radio.loadStations()

        const station = radio.stations.value[0]
        radio.playStation(station)

        await radio.toggleFavorite(station)
        expect(supabase.spies.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                station_id: station.id,
                station_name: station.name,
            })
        )
        expect(radio.stations.value[0].isFavorite).toBe(true)
        expect(radio.currentStation.value?.isFavorite).toBe(true)

        await radio.toggleFavorite(radio.stations.value[0])
        expect(supabase.spies.remove).toHaveBeenCalledTimes(1)
        expect(radio.stations.value[0].isFavorite).toBe(false)
        expect(radio.currentStation.value?.isFavorite).toBe(false)
    })

    it('filters stations by favorites, country and search query; returns sorted countries', async () => {
        const supabase = createSupabaseMock(['station-2'])
        vi.stubGlobal('useSupabase', () => supabase.client)
        vi.stubGlobal('useAuth', () => ({ user: { value: { id: 'user-1' } } }))
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve([
                        createApiStation({
                            stationuuid: 'station-1',
                            name: 'Rock FR',
                            country: 'France',
                            language: 'French',
                        }),
                        createApiStation({
                            stationuuid: 'station-2',
                            name: 'Jazz CA',
                            country: 'Canada',
                            language: 'English',
                            url_resolved: 'https://stream.example/jazz',
                        }),
                    ]),
            })
        )

        const { useRadio } = await import('~/composables/useRadio')
        const radio = useRadio()
        await radio.loadStations()

        expect(radio.countries.value).toEqual(['Canada', 'France'])

        radio.setShowFavoritesOnly(true)
        expect(radio.filteredStations.value).toHaveLength(1)
        expect(radio.filteredStations.value[0].id).toBe('station-2')

        radio.setShowFavoritesOnly(false)
        radio.setSelectedCountry('France')
        expect(radio.filteredStations.value).toHaveLength(1)
        expect(radio.filteredStations.value[0].country).toBe('France')

        radio.setSelectedCountry('')
        radio.setSearchQuery('jazz')
        expect(radio.filteredStations.value).toHaveLength(1)
        expect(radio.filteredStations.value[0].name).toContain('Jazz')
    })

    it('handles anonymous users and playback controls', async () => {
        const supabase = createSupabaseMock()
        vi.stubGlobal('useSupabase', () => supabase.client)
        vi.stubGlobal('useAuth', () => ({ user: { value: null } }))
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([createApiStation()]),
            })
        )

        const { useRadio } = await import('~/composables/useRadio')
        const radio = useRadio()
        await radio.loadStations()

        const station = radio.stations.value[0]
        await radio.toggleFavorite(station)

        expect(supabase.spies.select).not.toHaveBeenCalled()
        expect(supabase.spies.insert).not.toHaveBeenCalled()
        expect(supabase.spies.remove).not.toHaveBeenCalled()

        radio.playStation(station)
        expect(radio.currentStation.value?.id).toBe(station.id)
        expect(radio.isPlaying.value).toBe(true)

        radio.stopPlayback()
        expect(radio.currentStation.value).toBeNull()
        expect(radio.isPlaying.value).toBe(false)
    })
})
