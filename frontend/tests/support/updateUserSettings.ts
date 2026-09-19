import type {APIRequestContext} from '@playwright/test'

/** Changes some of the user's general settings, given as the api names them (snake_case). */
export async function updateUserSettings(apiContext: APIRequestContext, token: string, settings: Record<string, any>) {
	const apiUrl = (process.env.API_URL || 'http://localhost:3456/api/v1').replace(/\/+$/, '')

	const userResponse = await apiContext.get(`${apiUrl}/user`, {
		headers: {
			'Authorization': `Bearer ${token}`,
		},
	})

	const userData = await userResponse.json()
	// GET /user returns { settings: { frontend_settings: ... }, ... }
	// POST /user/settings/general expects { frontend_settings: ... } at the top level
	const oldSettings = userData.settings || {}

	const mergedSettings = {
		...oldSettings,
		...settings,
	}

	if (settings.frontend_settings) {
		mergedSettings.frontend_settings = {
			...(oldSettings.frontend_settings || {}),
			...settings.frontend_settings,
		}
	}

	const response = await apiContext.post(`${apiUrl}/user/settings/general`, {
		headers: {
			'Authorization': `Bearer ${token}`,
		},
		data: mergedSettings,
	})
	if (!response.ok()) {
		throw new Error(`Updating the user settings failed: ${response.status()} ${await response.text()}`)
	}
}
