import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {computed} from 'vue'

import {configureApiClient} from '@/client/http'
import {useConfigStore} from './config'

describe('config store', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	describe('isProFeatureEnabled', () => {
		it('returns true when the feature is in the enabledProFeatures list', () => {
			const store = useConfigStore()
			store.enabled_pro_features = ['admin_panel']
			expect(store.isProFeatureEnabled('admin_panel')).toBe(true)
		})

		it('returns false for features not present in the list', () => {
			const store = useConfigStore()
			store.enabled_pro_features = ['admin_panel']
			expect(store.isProFeatureEnabled('time_tracking')).toBe(false)
		})

		it('returns false when the list is empty (free mode)', () => {
			const store = useConfigStore()
			store.enabled_pro_features = []
			expect(store.isProFeatureEnabled('admin_panel')).toBe(false)
		})

		it('reacts to store updates when wrapped in computed', () => {
			const store = useConfigStore()
			store.enabled_pro_features = []
			const enabled = computed(() => store.isProFeatureEnabled('admin_panel'))
			expect(enabled.value).toBe(false)
			store.enabled_pro_features = ['admin_panel']
			expect(enabled.value).toBe(true)
		})
	})
})

describe('config store update', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	// Goes through the real generated client and its request-context check, which
	// once rejected the per-request base URL before any request was sent.
	it('loads /info from the v2 api through the configured client', async () => {
		setActivePinia(createPinia())
		window.API_URL = 'http://localhost:3000/api/v1'
		configureApiClient()
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({version: 'v9', caldav_enabled: true}), {
			headers: {'Content-Type': 'application/json'},
		}))
		vi.stubGlobal('fetch', fetchMock)

		const store = useConfigStore()
		await store.update()

		expect((fetchMock.mock.calls[0] as unknown as [Request])[0].url).toBe('http://localhost:3000/api/v2/info')
		expect(store.version).toBe('v9')
		expect(store.caldav_enabled).toBe(true)
	})
})
