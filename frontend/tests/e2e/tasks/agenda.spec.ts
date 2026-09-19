import {test, expect} from '../../support/fixtures'
import {dayAt, seedProject, seedTasks} from './seed'

test.describe('Home agenda', () => {
	test.beforeEach(async ({currentUser}) => {
		await seedProject(currentUser.id)
		await seedTasks(currentUser.id, [
			{title: 'Renew the TLS certificate', due: dayAt(-2)},
			{title: 'Update Proxmox', due: dayAt(0)},
			{title: 'Migrate backups to restic', due: dayAt(3)},
			{title: 'Someday task'},
		])
	})

	test('groups tasks into overdue, today and the next seven days', async ({authenticatedPage: page}) => {
		await page.goto('/')

		const overdue = page.locator('section').filter({has: page.getByRole('heading', {name: 'Overdue'})})
		const today = page.locator('section').filter({has: page.getByRole('heading', {name: 'Today', exact: true})})
		const upcoming = page.locator('section').filter({has: page.getByRole('heading', {name: 'Next 7 days'})})

		await expect(overdue.getByRole('link', {name: 'Renew the TLS certificate'})).toBeVisible()
		await expect(today.getByRole('link', {name: 'Update Proxmox'})).toBeVisible()
		await expect(upcoming.getByRole('link', {name: 'Migrate backups to restic'})).toBeVisible()
		await expect(page.getByRole('link', {name: 'Someday task'})).toHaveCount(0)
	})

	test('completes a task and undoes it from the toast', async ({authenticatedPage: page}) => {
		await page.goto('/')
		const check = page.getByRole('checkbox', {name: 'Complete “Update Proxmox”'})

		await check.click()

		// Finished today, it stays in Today, ticked.
		await expect(page.getByRole('checkbox', {name: 'Reopen “Update Proxmox”'})).toHaveAttribute('aria-checked', 'true')
		await page.getByRole('button', {name: 'Undo'}).click()
		await expect(page.getByRole('checkbox', {name: 'Complete “Update Proxmox”'})).toHaveAttribute('aria-checked', 'false')
	})

	test('opens a task beside the list and closes it with Escape', async ({authenticatedPage: page}) => {
		await page.goto('/')

		await page.getByRole('link', {name: 'Update Proxmox'}).click()

		await expect(page).toHaveURL(/\/tasks\/2$/)
		const panel = page.getByRole('complementary', {name: 'Task detail'})
		await expect(panel.getByRole('textbox', {name: 'Task title'})).toHaveValue('Update Proxmox')
		// The list it was opened from stays on screen.
		await expect(page.getByRole('link', {name: 'Migrate backups to restic'})).toBeVisible()

		await page.keyboard.press('Escape')
		await expect(page).toHaveURL('/')
		await expect(panel).toHaveCount(0)
	})

	test('moves through the list with j and k', async ({authenticatedPage: page}) => {
		await page.goto('/')
		await expect(page.getByRole('link', {name: 'Update Proxmox'})).toBeVisible()

		await page.keyboard.press('j')
		await page.keyboard.press('j')
		await page.keyboard.press('Enter')

		await expect(page).toHaveURL(/\/tasks\/2$/)
	})
})

test.describe('Upcoming', () => {
	test('lists the tasks of each day, with overdue ones on request', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id)
		await seedTasks(currentUser.id, [
			{title: 'Overdue chore', due: dayAt(-1)},
			{title: 'Book the cabin', due: dayAt(2)},
		])

		await page.goto('/tasks/by/upcoming')
		await expect(page.getByRole('link', {name: 'Book the cabin'})).toBeVisible()
		await expect(page.getByRole('link', {name: 'Overdue chore'})).toHaveCount(0)

		await page.getByRole('button', {name: 'Overdue'}).click()

		await expect(page).toHaveURL(/showOverdue=true/)
		await expect(page.getByRole('link', {name: 'Overdue chore'})).toBeVisible()
	})
})

test.describe('Home on a phone @mobile', () => {
	test('opens a task as its own page and goes back', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id)
		await seedTasks(currentUser.id, [{title: 'Water the plants', due: dayAt(0)}])

		await page.goto('/')
		await page.getByRole('link', {name: 'Water the plants'}).click()

		await expect(page.getByRole('textbox', {name: 'Task title'})).toHaveValue('Water the plants')
		await expect(page.getByRole('complementary', {name: 'Task detail'})).toHaveCount(0)
		await page.getByRole('button', {name: 'Back'}).click()
		await expect(page).toHaveURL('/')
	})
})
