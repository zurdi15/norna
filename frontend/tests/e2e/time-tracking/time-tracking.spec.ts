import {test, expect} from '../../support/fixtures'
import {seedProject, seedTasks} from '../tasks/seed'

test.describe('Time tracking', () => {
	test.beforeEach(async ({currentUser}) => {
		await seedProject(currentUser.id)
		await seedTasks(currentUser.id, [{title: 'Replace the sdb disk'}, {title: 'Write the backup script'}])
	})

	test('starts a timer on a task and stops it', async ({authenticatedPage: page}) => {
		await page.goto('/time-tracking')
		const timer = page.getByRole('region', {name: 'Timer'})

		await timer.getByRole('button', {name: 'Start timer'}).click()
		await page.getByRole('option', {name: /Replace the sdb disk/}).click()

		await expect(timer.getByRole('link', {name: 'Replace the sdb disk'})).toBeVisible()
		await expect(timer.getByRole('timer')).toHaveText(/^0:0\d:\d\d$/)

		await timer.getByRole('button', {name: 'Stop'}).click()

		await expect(timer.getByText('No timer running')).toBeVisible()
		await expect(page.getByRole('button', {name: 'Replace the sdb disk'})).toBeVisible()
	})

	test('logs time by hand and deletes it', async ({authenticatedPage: page}) => {
		await page.goto('/time-tracking')

		await page.getByRole('button', {name: 'Log time'}).click()
		const dialog = page.getByRole('dialog', {name: 'Log time'})
		await dialog.getByRole('button', {name: 'Save'}).click()
		await expect(dialog.getByText('Pick the task this time goes on.')).toBeVisible()

		await dialog.getByLabel('Task').click()
		await page.getByRole('option', {name: /Write the backup script/}).click()
		await dialog.getByLabel('Duration').fill('45m')
		await dialog.getByLabel('Note').fill('First draft')
		await dialog.getByRole('button', {name: 'Save'}).click()

		await expect(dialog).toBeHidden()
		const row = page.locator('[data-time-entry]').filter({hasText: 'Write the backup script'})
		await expect(row).toContainText('First draft')
		await expect(row).toContainText('45m')
		await expect(page.locator('[data-time-total]')).toHaveText('45m')

		await row.getByRole('button', {name: 'Write the backup script'}).click()
		const edit = page.getByRole('dialog', {name: 'Edit entry'})
		await edit.getByRole('button', {name: 'Delete'}).click()
		await page.getByRole('dialog', {name: 'Delete this entry?'}).getByRole('button', {name: 'Delete'}).click()

		await expect(row).toHaveCount(0)
		await expect(page.getByText('No time tracked')).toBeVisible()
	})

	test('tracks time from the task itself', async ({authenticatedPage: page}) => {
		await page.goto('/tasks/1')

		await page.getByRole('button', {name: 'Start', exact: true}).click()
		const stop = page.getByRole('button', {name: /^Stop 0:0\d:\d\d$/})
		await expect(stop).toBeVisible()
		await stop.click()

		await expect(page.locator('[data-time-entry]')).toHaveCount(1)
		await expect(page.getByRole('button', {name: 'Start', exact: true})).toBeVisible()
	})
})
