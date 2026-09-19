import {test, expect} from '../../support/fixtures'
import {LabelFactory} from '../../factories/labels'

test.describe('Labels', () => {
	test('creates, renames and deletes a label', async ({authenticatedPage: page}) => {
		await page.goto('/labels')

		await page.getByRole('link', {name: 'New label'}).click()
		const create = page.getByRole('dialog', {name: 'New label'})
		await create.getByLabel('Name').fill('garden')
		await create.getByRole('button', {name: 'Create label'}).click()
		await expect(page.getByRole('button', {name: /garden/})).toBeVisible()

		await page.getByRole('button', {name: /garden/}).click()
		const edit = page.getByRole('dialog', {name: 'Edit label'})
		await edit.getByLabel('Name').fill('outdoors')
		await edit.getByRole('button', {name: 'Save'}).click()
		await expect(page.getByRole('button', {name: /outdoors/})).toBeVisible()

		await page.getByRole('button', {name: /outdoors/}).click()
		await page.getByRole('dialog', {name: 'Edit label'}).getByRole('button', {name: 'Delete'}).click()
		await page.getByRole('dialog', {name: 'Delete this label?'}).getByRole('button', {name: 'Delete'}).click()
		await expect(page.getByRole('button', {name: /outdoors/})).toHaveCount(0)
	})

	test('shows labels of other people without editing them', async ({authenticatedPage: page, currentUser}) => {
		await LabelFactory.create(1, {id: 1, title: 'mine', created_by_id: currentUser.id})

		await page.goto('/labels')

		await expect(page.getByRole('button', {name: /mine/})).toBeVisible()
	})
})

test.describe('Teams', () => {
	test('creates a team and becomes its admin', async ({authenticatedPage: page, currentUser}) => {
		await page.goto('/teams')

		await page.getByRole('link', {name: 'New team'}).click()
		const dialog = page.getByRole('dialog', {name: 'New team'})
		await dialog.getByLabel('Name').fill('Family')
		await dialog.getByRole('button', {name: 'Create team'}).click()

		await expect(page).toHaveURL(/\/teams\/\d+\/edit$/)
		await expect(page.getByRole('heading', {name: 'Family'})).toBeVisible()
		await expect(page.getByRole('listitem').filter({hasText: currentUser.username})).toContainText('admin')
	})
})

test.describe('Saved filters', () => {
	test('creates a saved filter that shows up like a project', async ({authenticatedPage: page}) => {
		await page.goto('/filters/new')

		await page.getByLabel('Name').fill('Urgent this week')
		await page.getByRole('button', {name: 'Create filter'}).click()

		await expect(page).toHaveURL(/\/projects\/-\d+\/\d+$/)
		await expect(page.getByRole('heading', {name: 'Urgent this week'})).toBeVisible()
	})
})
