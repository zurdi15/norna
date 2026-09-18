import {test, expect} from '../../support/fixtures'
import {dayAt, seedProject, seedTasks} from './seed'

test.describe('Project views', () => {
	test.beforeEach(async ({currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await seedTasks(1, currentUser.id, [
			{title: 'Renew the TLS certificate', due: dayAt(1)},
			{title: 'Update Proxmox', due: dayAt(5)},
			{title: 'Document the network'},
		])
	})

	test('opens a project in its first view and lists its tasks', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1')

		await expect(page).toHaveURL(/\/projects\/1\/10$/)
		await expect(page.getByRole('heading', {name: 'Homelab'})).toBeVisible()
		await expect(page.getByRole('link', {name: 'Update Proxmox'})).toBeVisible()
		await expect(page.getByText('3 tasks')).toBeVisible()
	})

	test('switches views through their links', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/10')

		await page.getByRole('navigation', {name: 'Views'}).getByRole('link', {name: 'Table'}).click()

		await expect(page).toHaveURL(/\/projects\/1\/12$/)
		await expect(page.getByRole('columnheader', {name: 'Title'})).toBeVisible()
		await expect(page.getByRole('link', {name: 'Update Proxmox'})).toBeVisible()
	})

	test('searches the tasks of the view', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/10')
		await expect(page.getByRole('link', {name: 'Update Proxmox'})).toBeVisible()

		await page.getByRole('searchbox', {name: 'Search tasks…'}).fill('proxmox')

		await expect(page).toHaveURL(/s=proxmox/)
		await expect(page.getByRole('link', {name: 'Update Proxmox'})).toBeVisible()
		await expect(page.getByRole('link', {name: 'Document the network'})).toHaveCount(0)
	})

	test('keeps its search behind a task opened beside it', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/10?s=proxmox')
		await page.getByRole('link', {name: 'Update Proxmox'}).click()

		await expect(page).toHaveURL(/\/tasks\/2$/)
		await expect(page.getByRole('textbox', {name: 'Task title'})).toHaveValue('Update Proxmox')
		await expect(page.getByRole('searchbox', {name: 'Search tasks…'})).toHaveValue('proxmox')
		await expect(page.getByRole('link', {name: 'Document the network'})).toHaveCount(0)

		await page.getByRole('button', {name: 'Close'}).click()
		await expect(page).toHaveURL(/\/projects\/1\/10\?s=proxmox$/)
	})

	test('adds a task from the top of the list', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/10')

		const input = page.getByRole('textbox', {name: 'Add a task…'})
		await input.fill('Replace the UPS battery')
		await input.press('Enter')

		await expect(page.getByRole('link', {name: 'Replace the UPS battery'})).toBeVisible()
		await expect(input).toHaveValue('')
	})

	test('sorts the table by a column', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/12')
		const due = page.getByRole('columnheader', {name: 'Due'})

		await due.getByRole('button').click()

		await expect(due).toHaveAttribute('aria-sort', 'descending')
		await expect(page).toHaveURL(/sort=due_date(%3A|:)desc/)
		await expect(page.getByRole('row').nth(1)).toContainText('Update Proxmox')
	})
})

test.describe('Projects', () => {
	test('lists projects as a tree', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await seedProject(currentUser.id, 2, 'Backups', {parent_project_id: 1})

		await page.goto('/projects')
		await expect(page.getByRole('link', {name: 'Homelab'}).last()).toBeVisible()
		await expect(page.getByRole('link', {name: 'Backups'})).toHaveCount(0)

		await page.getByRole('main').getByRole('button', {name: 'Show the projects inside Homelab'}).click()

		await expect(page.getByRole('main').getByRole('link', {name: 'Backups'})).toBeVisible()
	})
})

test.describe('Projects on a phone @mobile', () => {
	test('opens a project from the projects tab', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await seedTasks(1, currentUser.id, [{title: 'Update Proxmox'}])

		await page.goto('/')
		await page.getByRole('navigation', {name: 'Navigation'}).last().getByRole('link', {name: 'Projects'}).click()
		await page.getByRole('main').getByRole('link', {name: 'Homelab'}).click()

		await expect(page.getByRole('link', {name: 'Update Proxmox'})).toBeVisible()
		await page.getByRole('button', {name: 'Back'}).click()
		await expect(page).toHaveURL('/projects')
	})
})

test.describe('Bulk actions', () => {
	test('selects tasks with x and completes them together', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await seedTasks(1, currentUser.id, [
			{title: 'Renew the TLS certificate'},
			{title: 'Update Proxmox'},
			{title: 'Document the network'},
		])
		await page.goto('/projects/1/10')
		await expect(page.getByRole('link', {name: 'Update Proxmox'})).toBeVisible()

		await page.keyboard.press('j')
		await page.keyboard.press('x')
		await page.keyboard.press('j')
		await page.keyboard.press('x')
		const toolbar = page.getByRole('toolbar', {name: 'Selected tasks'})
		await expect(toolbar).toContainText('2')

		await toolbar.getByRole('button', {name: 'Complete'}).click()

		await expect(page.getByText('2 tasks updated')).toBeVisible()
		await expect(toolbar).toHaveCount(0)
		await expect(page.getByRole('checkbox', {name: 'Reopen “Renew the TLS certificate”'})).toHaveAttribute('aria-checked', 'true')
		await expect(page.getByRole('checkbox', {name: 'Reopen “Update Proxmox”'})).toHaveAttribute('aria-checked', 'true')
	})
})
