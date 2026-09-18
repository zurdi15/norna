import {test, expect} from '../../support/fixtures'
import {UserFactory} from '../../factories/user'
import {setupApiUrl} from '../../support/authenticateUser'

test.describe('Registration', () => {
	test.beforeEach(async ({page}) => {
		await setupApiUrl(page)
	})

	test('creates an account and signs straight in', async ({page, apiContext}) => {
		await page.goto('/register')
		await page.getByLabel('Username').fill('leifberg')
		await page.getByLabel('Email').fill('leif@example.com')
		await page.getByLabel('Password', {exact: true}).fill('a-long-password')
		await page.getByRole('button', {name: 'Create account'}).click()

		await expect(page).toHaveURL('/')
		const login = await apiContext.post('login', {data: {username: 'leifberg', password: 'a-long-password'}})
		expect(login.ok()).toBe(true)
	})

	test('checks the fields before creating anything', async ({page}) => {
		await page.goto('/register')
		await page.getByLabel('Username').fill('has space')
		await page.getByLabel('Email').fill('not-an-email')
		await page.getByLabel('Password', {exact: true}).fill('short')
		await page.getByRole('button', {name: 'Create account'}).click()

		await expect(page.getByText('Usernames can\'t contain spaces.')).toBeVisible()
		await expect(page.getByText('Enter a valid email address.')).toBeVisible()
		await expect(page.getByText('Use at least 8 characters.')).toBeVisible()
		await expect(page).toHaveURL('/register')
	})

	test('shows the server\'s complaint about a taken username', async ({page}) => {
		await UserFactory.create(1, {username: 'taken'})
		await page.goto('/register')
		await page.getByLabel('Username').fill('taken')
		await page.getByLabel('Email').fill('someone@example.com')
		await page.getByLabel('Password', {exact: true}).fill('a-long-password')
		await page.getByRole('button', {name: 'Create account'}).click()

		await expect(page.getByRole('alert')).toBeVisible()
		await expect(page).toHaveURL('/register')
	})
})

test.describe('Password reset', () => {
	test('confirms that a reset link was sent', async ({page}) => {
		await UserFactory.create(1, {username: 'sigrid', email: 'sigrid@example.com'})
		await setupApiUrl(page)
		await page.goto('/get-password-reset')
		await page.getByLabel('Email').fill('sigrid@example.com')
		await page.getByRole('button', {name: 'Send reset link'}).click()

		await expect(page.getByRole('status')).toContainText('a reset link is on its way')
	})

	test('refuses a reset without a token', async ({page}) => {
		await setupApiUrl(page)
		await page.goto('/password-reset')

		await expect(page).toHaveURL(/\/login/)
	})
})
