import {test, expect} from '../../support/fixtures'
import {dayAt, seedProject, seedTasks} from './seed'

test.describe('Task detail', () => {
	test.beforeEach(async ({currentUser}) => {
		await seedProject(currentUser.id)
		await seedTasks(currentUser.id, [{title: 'Replace the sdb disk', due: dayAt(1)}])
	})

	test('renames a task in place', async ({authenticatedPage: page}) => {
		await page.goto('/tasks/1')
		const title = page.getByRole('textbox', {name: 'Task title'})

		await title.fill('Replace the sdb disk in the ZFS pool')
		await title.press('Enter')
		await page.waitForResponse(response => response.url().includes('/tasks/1') && response.request().method() === 'PATCH')

		await page.reload()
		await expect(page.getByRole('textbox', {name: 'Task title'})).toHaveValue('Replace the sdb disk in the ZFS pool')
	})

	test('adds a property through "Add property"', async ({authenticatedPage: page}) => {
		await page.goto('/tasks/1')

		await page.getByRole('button', {name: 'Add property'}).click()
		await page.getByRole('menuitem', {name: 'Priority'}).click()
		await page.getByRole('option', {name: 'Urgent'}).click()

		await expect(page.getByRole('button', {name: /^Priority Urgent/})).toBeVisible()
		await page.reload()
		await expect(page.getByRole('button', {name: /^Priority Urgent/})).toBeVisible()
	})

	test('adds a subtask', async ({authenticatedPage: page}) => {
		await page.goto('/tasks/1')

		const input = page.getByRole('textbox', {name: 'Add a subtask'})
		await input.fill('Order a spare disk')
		await input.press('Enter')

		await expect(page.getByRole('link', {name: 'Order a spare disk'})).toBeVisible()
		await expect(input).toHaveValue('')
	})

	test('deletes a task after confirming', async ({authenticatedPage: page}) => {
		await page.goto('/')
		await page.getByRole('link', {name: 'Replace the sdb disk'}).click()
		const panel = page.getByRole('complementary', {name: 'Task detail'})

		await panel.getByRole('button', {name: 'Task actions'}).click()
		await page.getByRole('menuitem', {name: 'Delete'}).click()
		await page.getByRole('dialog', {name: 'Delete this task?'}).getByRole('button', {name: 'Delete'}).click()

		await expect(page).toHaveURL('/')
		await expect(page.getByRole('link', {name: 'Replace the sdb disk'})).toHaveCount(0)
	})
})
