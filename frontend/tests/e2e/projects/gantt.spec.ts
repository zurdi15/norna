import {test, expect} from '../../support/fixtures'
import {dayAt, seedProject, seedTasks} from './seed'

test.describe('Gantt view', () => {
	test.beforeEach(async ({currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await seedTasks(1, currentUser.id, [
			{title: 'Replace the UPS battery', start: dayAt(1, 9), end: dayAt(3, 18)},
			{title: 'Document the network'},
		])
	})

	test('draws dated tasks and shows undated ones on demand', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/11')

		const chart = page.getByRole('region', {name: 'Gantt chart'})
		await expect(chart.getByRole('button', {name: /^Replace the UPS battery, /})).toBeVisible()
		await expect(chart.getByText('Document the network')).toHaveCount(0)

		await page.getByRole('switch', {name: 'Show tasks without dates'}).click()

		await expect(page).toHaveURL(/showTasksWithoutDates=true/)
		await expect(chart.getByText('Document the network')).toBeVisible()
	})

	test('moves a bar a day with the keyboard and keeps it', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/11')

		const bar = page.getByRole('region', {name: 'Gantt chart'}).getByRole('button', {name: /^Replace the UPS battery, /})
		const before = await bar.getAttribute('aria-label')
		await bar.focus()
		await page.keyboard.press('ArrowRight')

		await expect(page.getByText('Dates changed: Replace the UPS battery')).toBeVisible()
		const after = await bar.getAttribute('aria-label')
		expect(after).not.toBe(before)

		await page.reload()
		await expect(page.getByRole('region', {name: 'Gantt chart'}).getByRole('button', {name: after!})).toBeVisible()
	})

	test('opens a task from its bar', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/11')

		await page.getByRole('region', {name: 'Gantt chart'}).getByRole('button', {name: /^Replace the UPS battery, /}).click()

		await expect(page).toHaveURL(/\/tasks\/1$/)
		await expect(page.getByRole('textbox', {name: 'Task title'})).toHaveValue('Replace the UPS battery')
	})
})
