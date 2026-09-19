import type {Page} from '@playwright/test'

import {test, expect} from '../../support/fixtures'
import {seedBoard, seedProject, seedTasks} from './seed'

function column(page: Page, title: string) {
	return page.getByRole('list', {name: title})
}

test.describe('Kanban view', () => {
	test.beforeEach(async ({currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await seedTasks(1, currentUser.id, [
			{title: 'Renew the TLS certificate'},
			{title: 'Update Proxmox'},
			{title: 'Document the network'},
		])
		await seedBoard(1, currentUser.id, ['To do', 'Doing', 'Done'], [0, 0, 1])
	})

	test('shows each column with its tasks', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/13')

		await expect(column(page, 'To do').getByRole('link', {name: 'Renew the TLS certificate'})).toBeVisible()
		await expect(column(page, 'To do').getByRole('link', {name: 'Update Proxmox'})).toBeVisible()
		await expect(column(page, 'Doing').getByRole('link', {name: 'Document the network'})).toBeVisible()
		await expect(column(page, 'Done').getByRole('listitem')).toHaveCount(0)
	})

	test('moves a task to another column from its menu', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/13')

		const card = column(page, 'To do').getByRole('listitem').filter({hasText: 'Update Proxmox'})
		await card.hover()
		await card.getByRole('button', {name: 'Task actions'}).click()
		await page.getByRole('menuitem', {name: 'Move to…'}).click()
		await page.getByRole('dialog', {name: 'Move to column'}).getByRole('button', {name: 'Doing'}).click()

		await expect(column(page, 'Doing').getByRole('link', {name: 'Update Proxmox'})).toBeVisible()
		await page.reload()
		await expect(column(page, 'Doing').getByRole('link', {name: 'Update Proxmox'})).toBeVisible()
		await expect(column(page, 'To do').getByRole('link', {name: 'Update Proxmox'})).toHaveCount(0)
	})

	test('drags a task into another column', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/13')

		const card = column(page, 'To do').getByRole('link', {name: 'Renew the TLS certificate'})
		const from = await card.boundingBox()
		const to = await column(page, 'Done').boundingBox()
		if (!from || !to) {
			throw new Error('The board did not render')
		}
		await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
		await page.mouse.down()
		await page.mouse.move(to.x + to.width / 2, to.y + 20, {steps: 12})
		await page.mouse.move(to.x + to.width / 2, to.y + 24, {steps: 4})
		await page.mouse.up()

		await expect(column(page, 'Done').getByRole('link', {name: 'Renew the TLS certificate'})).toBeVisible()
		await page.reload()
		await expect(column(page, 'Done').getByRole('link', {name: 'Renew the TLS certificate'})).toBeVisible()
	})

	test('adds a task to a column', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/13')

		const doing = page.getByRole('region', {name: 'Doing'})
		await doing.getByRole('button', {name: 'Add a task…'}).click()
		await doing.getByRole('textbox', {name: 'Add a task…'}).fill('Replace the UPS battery')
		await page.keyboard.press('Enter')

		await expect(column(page, 'Doing').getByRole('link', {name: 'Replace the UPS battery'})).toBeVisible()
	})

	test('shows a new card\'s title while the keyboard is still composing it', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/13')

		const doing = page.getByRole('region', {name: 'Doing'})
		await doing.getByRole('button', {name: 'Add a task…'}).click()
		await doing.getByRole('textbox', {name: 'Add a task…'}).focus()
		const cdp = await page.context().newCDPSession(page)
		await cdp.send('Input.imeSetComposition', {text: 'Replace', selectionStart: 7, selectionEnd: 7})

		await expect(doing.locator('form').getByText('Replace')).toBeVisible()
	})

	test('adds a column', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/13')

		await page.getByRole('button', {name: 'Add column'}).click()
		await page.getByRole('textbox', {name: 'Column title'}).fill('Blocked')
		await page.keyboard.press('Enter')

		await expect(page.getByRole('region', {name: 'Blocked'})).toBeVisible()
	})
})
