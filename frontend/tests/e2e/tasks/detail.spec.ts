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

	test('links the selected words of the description', async ({authenticatedPage: page}) => {
		await page.goto('/tasks/1')
		const description = page.getByRole('textbox', {name: 'Add notes, a checklist, links… type / for more'})

		await description.click()
		await page.keyboard.type('See the wiki')
		await page.keyboard.press('Shift+ArrowLeft')
		await page.keyboard.press('Shift+ArrowLeft')
		await page.keyboard.press('Shift+ArrowLeft')
		await page.keyboard.press('Shift+ArrowLeft')
		await page.getByRole('button', {name: 'Link', exact: true}).click()
		const url = page.getByRole('dialog', {name: 'Link'}).getByRole('textbox', {name: 'URL'})
		await url.fill('wiki.example.com')
		await url.press('Enter')

		await expect(description.getByRole('link', {name: 'wiki'})).toHaveAttribute('href', 'https://wiki.example.com')
		// The focus is back in the text, ready to keep writing.
		await expect(description).toBeFocused()
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
