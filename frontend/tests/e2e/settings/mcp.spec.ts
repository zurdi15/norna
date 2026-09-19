import {test, expect} from '../../support/fixtures'

test.describe('MCP tokens', () => {
	test('creates a token that never expires', async ({authenticatedPage: page, apiContext, userToken}) => {
		await page.goto('/user/settings/mcp')

		await page.getByRole('button', {name: 'New token'}).click()
		const dialog = page.getByRole('dialog', {name: 'New MCP token'})
		await dialog.getByRole('group', {name: 'Expires'}).getByText('Never', {exact: true}).click()
		await expect(dialog.getByText('It never stops working.', {exact: false})).toBeVisible()
		await dialog.getByRole('button', {name: 'Create token'}).click()

		await expect(page.getByText('never expires')).toBeVisible()
		await page.reload()
		await expect(page.getByText('never expires')).toBeVisible()
		const response = await apiContext.get('tokens', {headers: {Authorization: `Bearer ${userToken}`}})
		const [token] = await response.json()
		expect(new Date(token.expires_at).getUTCFullYear()).toBe(9999)
	})
})
