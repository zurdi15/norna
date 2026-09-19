import {test, expect} from '../../support/fixtures'
import {UserFactory} from '../../factories/user'
import {setupApiUrl} from '../../support/authenticateUser'
import {TEST_PASSWORD} from '../../support/constants'

const USERNAME = 'astrid'

test.describe('Login', () => {
	test.beforeEach(async ({page}) => {
		await UserFactory.create(1, {username: USERNAME})
		await setupApiUrl(page)
	})

	test('signs in and lands on today', async ({page}) => {
		await page.goto('/login')
		await page.getByLabel('Username or email').fill(USERNAME)
		await page.getByLabel('Password', {exact: true}).fill(TEST_PASSWORD)
		await page.getByRole('button', {name: 'Sign in'}).click()

		await expect(page).toHaveURL('/')
		await expect(page.getByRole('navigation', {name: 'Navigation'}).first()).toBeVisible()
	})

	test('rejects a wrong password and stays on the login page', async ({page}) => {
		await page.goto('/login')
		await page.getByLabel('Username or email').fill(USERNAME)
		await page.getByLabel('Password', {exact: true}).fill('wrong-password')
		await page.getByRole('button', {name: 'Sign in'}).click()

		await expect(page.getByRole('alert')).toContainText('Wrong username or password')
		await expect(page).toHaveURL('/login')
	})

	test('asks for both fields before sending anything', async ({page}) => {
		let loginRequests = 0
		page.on('request', request => {
			if (request.url().endsWith('/login') && request.method() === 'POST') {
				loginRequests++
			}
		})
		await page.goto('/login')
		await page.getByRole('button', {name: 'Sign in'}).click()

		await expect(page.getByText('Enter your username or email.')).toBeVisible()
		await expect(page.getByText('Enter your password.')).toBeVisible()
		expect(loginRequests).toBe(0)
	})

	test('sends a signed-out visitor to the login page and back after signing in', async ({page}) => {
		await page.goto('/labels')
		await expect(page).toHaveURL(/\/login/)

		await page.getByLabel('Username or email').fill(USERNAME)
		await page.getByLabel('Password', {exact: true}).fill(TEST_PASSWORD)
		await page.getByRole('button', {name: 'Sign in'}).click()

		await expect(page).toHaveURL('/labels')
	})

	test('can show the typed password', async ({page}) => {
		await page.goto('/login')
		const password = page.getByLabel('Password', {exact: true})
		await password.fill('secret-value')
		await expect(password).toHaveAttribute('type', 'password')

		await page.getByRole('button', {name: 'Show password'}).click()

		await expect(password).toHaveAttribute('type', 'text')
	})
})

test.describe('Logout', () => {
	test('signs out from the account menu', async ({authenticatedPage: page, currentUser}) => {
		await page.goto('/')
		await page.getByRole('button', {name: currentUser.username}).click()
		await page.getByRole('menuitem', {name: 'Log out'}).click()

		await expect(page).toHaveURL(/\/login/)
		const token = await page.evaluate(() => localStorage.getItem('token'))
		expect(token).toBeNull()
	})
})
