import {test, expect} from '../../support/fixtures'
import {seedProject} from '../projects/seed'

test.describe('Project settings', () => {
	test('creates a project from the sidebar and lands in it', async ({authenticatedPage: page}) => {
		await page.goto('/')

		await page.getByRole('link', {name: 'New project'}).first().click()
		const dialog = page.getByRole('dialog', {name: 'New project'})
		await dialog.getByLabel('Name').fill('Garden')
		await dialog.getByRole('button', {name: 'Create project'}).click()

		await expect(page).toHaveURL(/\/projects\/\d+\/\d+$/)
		await expect(page.getByRole('heading', {name: 'Garden'})).toBeVisible()
	})

	test('edits a project over its page', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await page.goto('/projects/1/10')

		await page.getByRole('button', {name: 'Project actions'}).click()
		await page.getByRole('menuitem', {name: 'Edit'}).click()
		const dialog = page.getByRole('dialog', {name: 'Edit Homelab'})
		await dialog.getByLabel('Name').fill('Home lab')
		await dialog.getByRole('button', {name: 'Save'}).click()

		await expect(dialog).toHaveCount(0)
		await expect(page).toHaveURL(/\/projects\/1\/10$/)
		await expect(page.getByRole('heading', {name: 'Home lab'})).toBeVisible()
	})

	test('deletes a project once its name is typed', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await page.goto('/projects/1/10')

		await page.getByRole('button', {name: 'Project actions'}).click()
		await page.getByRole('menuitem', {name: 'Delete'}).click()
		const dialog = page.getByRole('dialog', {name: 'Delete project'})
		const confirm = dialog.getByRole('button', {name: 'Delete project'})
		await expect(confirm).toBeDisabled()
		await dialog.getByLabel('Type “Homelab” to confirm').fill('Homelab')
		await confirm.click()

		await expect(page).toHaveURL('/projects')
		await expect(page.getByRole('main').getByRole('link', {name: 'Homelab'})).toHaveCount(0)
	})

	test('adds a view', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await page.goto('/projects/1/10')

		await page.getByRole('button', {name: 'Project actions'}).click()
		await page.getByRole('menuitem', {name: 'Views'}).click()
		const dialog = page.getByRole('dialog', {name: 'Views'})
		await dialog.getByRole('button', {name: 'New view'}).click()
		await dialog.getByLabel('Name').fill('Urgent')
		await dialog.getByRole('button', {name: 'Create view'}).click()

		await expect(dialog.getByText('Urgent')).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.getByRole('navigation', {name: 'Views'}).getByRole('link', {name: 'Urgent'})).toBeVisible()
	})
})
