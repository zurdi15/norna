import {test, expect} from '../../support/fixtures'
import {ProjectFactory} from '../../factories/project'
import {UserFactory} from '../../factories/user'
import {login} from '../../support/authenticateUser'

test.describe('Admin users', () => {
	test.beforeEach(async ({page, apiContext}) => {
		const [admin] = await UserFactory.create(2, {
			username: (i: number) => i === 1 ? 'root-admin' : 'bo-user',
			email: (i: number) => i === 1 ? 'root@example.com' : 'bo@example.com',
			is_admin: (i: number) => i === 1,
		})
		await login(page, apiContext, admin)
	})

	test('lists every account and makes one an admin', async ({page}) => {
		await page.goto('/admin/users')

		const list = page.getByRole('list', {name: 'Users'})
		await expect(list.getByRole('listitem')).toHaveCount(2)
		const bo = list.getByRole('button', {name: /bo-user/})
		await expect(bo).toContainText('bo@example.com')
		await expect(bo).not.toContainText('Admin')

		await bo.click()
		await page.getByRole('menuitem', {name: 'Make admin'}).click()
		await page.getByRole('dialog', {name: 'Make bo-user an admin?'}).getByRole('button', {name: 'Make admin'}).click()

		await expect(bo).toContainText('Admin')
	})

	test('searches and creates accounts', async ({page}) => {
		await page.goto('/admin/users')
		const list = page.getByRole('list', {name: 'Users'})

		await page.getByRole('searchbox', {name: 'Search users'}).fill('bo@')
		await expect(list.getByRole('listitem')).toHaveCount(1)
		await page.getByRole('searchbox', {name: 'Search users'}).fill('')

		await page.getByRole('button', {name: 'New user'}).click()
		const dialog = page.getByRole('dialog', {name: 'New user'})
		await dialog.getByRole('textbox', {name: 'Username', exact: true}).fill('cy-user')
		await dialog.getByRole('textbox', {name: 'Email', exact: true}).fill('cy@example.com')
		await dialog.getByRole('textbox', {name: 'Password', exact: true}).fill('a-long-password')
		await dialog.getByRole('button', {name: 'Create user'}).click()

		await expect(dialog).toBeHidden()
		await expect(list.getByRole('button', {name: /cy-user/})).toBeVisible()
		await expect(list.getByRole('listitem')).toHaveCount(3)
	})

	test('shows the overview and the admin sections', async ({page}) => {
		await page.goto('/admin')

		await expect(page.getByRole('heading', {name: 'Administration'})).toBeVisible()
		const nav = page.getByRole('navigation', {name: 'Administration sections'})
		await expect(nav.getByRole('link', {name: 'Overview'})).toHaveAttribute('aria-current', 'page')
		await expect(page.getByRole('region', {name: 'Instance size'})).toContainText('Users')

		await nav.getByRole('link', {name: 'Projects'}).click()
		await expect(page).toHaveURL(/\/admin\/projects$/)
		await nav.getByRole('link', {name: 'Invite links'}).click()
		await expect(page.getByText('No invite links')).toBeVisible()
	})
})

test('hands a project to another account', async ({page, apiContext}) => {
	const [admin] = await UserFactory.create(2, {
		username: (i: number) => i === 1 ? 'root-admin' : 'bo-user',
		is_admin: (i: number) => i === 1,
	})
	await ProjectFactory.create(1, {title: 'Garden', owner_id: 1})
	await login(page, apiContext, admin)
	await page.goto('/admin/projects')

	const garden = page.getByRole('button', {name: /Garden/})
	await expect(garden).toContainText('root-admin')
	await garden.click()
	await page.getByRole('menuitem', {name: 'Change owner'}).click()
	const dialog = page.getByRole('dialog', {name: 'Change the owner of Garden'})
	await dialog.getByRole('option', {name: /bo-user/}).click()
	await dialog.getByRole('button', {name: 'Change owner'}).click()

	await expect(dialog).toBeHidden()
	await expect(garden).toContainText('bo-user')
})

test('a non-admin lands on the not-found page', async ({authenticatedPage: page}) => {
	await page.goto('/admin')

	await expect(page.getByText('Nothing woven here')).toBeVisible()
	await expect(page.getByRole('heading', {name: 'Administration'})).toHaveCount(0)
})
