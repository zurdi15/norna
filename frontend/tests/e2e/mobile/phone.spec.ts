import type {Locator, Page} from '@playwright/test'

import {test, expect} from '../../support/fixtures'
import {dayAt, seedBoard, seedProject, seedTasks} from '../projects/seed'

function column(page: Page, title: string) {
	return page.getByRole('list', {name: title})
}

// A finger held on the element and lifted: real touch events, which Chromium turns into
// touch pointers (Playwright's touchscreen only taps).
async function longPress(page: Page, target: Locator) {
	const box = await target.boundingBox()
	if (!box) {
		throw new Error('Nothing to press')
	}
	const point = {x: box.x + box.width / 2, y: box.y + box.height / 2}
	const cdp = await page.context().newCDPSession(page)
	await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [point]})
	await page.waitForTimeout(700)
	await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []})
}

test.describe('Daily use on a phone @mobile', () => {
	test.beforeEach(async ({currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await seedTasks(1, currentUser.id, [
			{title: 'Renew the TLS certificate', due: dayAt(0, 18)},
			{title: 'Update Proxmox'},
			{title: 'Document the network'},
		])
	})

	test('completes a task from Home', async ({authenticatedPage: page}) => {
		await page.goto('/')

		await page.getByRole('checkbox', {name: 'Complete “Renew the TLS certificate”'}).click()

		await expect(page.getByRole('checkbox', {name: 'Reopen “Renew the TLS certificate”'})).toHaveAttribute('aria-checked', 'true')
	})

	test('moves a card to another column with "Move to…"', async ({authenticatedPage: page, currentUser}) => {
		await seedBoard(1, currentUser.id, ['To do', 'Doing', 'Done'], [0, 0, 1])
		await page.goto('/projects/1/13')

		// On a phone the card's menu is an action sheet, opened by a long press on the card.
		await longPress(page, page.locator('[data-task-id]').filter({hasText: 'Update Proxmox'}))
		await page.getByRole('dialog').getByRole('button', {name: 'Move to…'}).click()
		await page.getByRole('dialog', {name: 'Move to column'}).getByRole('button', {name: 'Doing'}).click()

		await page.getByRole('navigation', {name: 'Columns'}).getByRole('button', {name: /^Doing/}).click()
		await expect(column(page, 'Doing').getByRole('link', {name: 'Update Proxmox'})).toBeInViewport()
	})

	test('picks the table columns in a sheet', async ({authenticatedPage: page}) => {
		await page.goto('/projects/1/12')

		await page.getByRole('button', {name: 'Columns'}).click()
		const sheet = page.getByRole('dialog', {name: 'Columns'})
		await sheet.getByRole('checkbox', {name: 'Starts'}).click()
		await page.keyboard.press('Escape')

		await expect(page.getByRole('columnheader', {name: 'Starts'})).toBeAttached()
	})

	test('opens a settings section and goes back to the list', async ({authenticatedPage: page}) => {
		await page.goto('/user/settings')

		await page.getByRole('link', {name: 'General'}).click()
		await expect(page).toHaveURL('/user/settings/general')
		await expect(page.getByRole('heading', {name: 'General'})).toBeVisible()

		await page.getByRole('button', {name: 'Back'}).click()
		await expect(page).toHaveURL('/user/settings')
	})
})
