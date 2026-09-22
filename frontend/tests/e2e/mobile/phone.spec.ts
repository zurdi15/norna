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

	// The check of a row is above the link covering that row, and used to tie with the
	// sticky header, which it won by coming later in the document: the checks of the rows
	// scrolling by were painted over the header.
	test('scrolls the list under the header, not over it', async ({authenticatedPage: page, currentUser}) => {
		await seedTasks(1, currentUser.id, Array.from({length: 20}, (_, i) => ({title: `Filler ${i + 1}`})))
		await page.goto('/projects/1')
		await page.getByRole('checkbox', {name: 'Complete “Filler 1”'}).waitFor()

		await page.evaluate(() => window.scrollTo(0, 400))
		expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100)

		await expect(async () => {
			const overHeader = await page.evaluate(() => {
				const header = document.querySelector('header')!
				const {top, bottom} = header.getBoundingClientRect()
				const strays = new Set<string>()
				for (let x = 4; x < window.innerWidth; x += 12) {
					for (let y = top + 2; y < bottom - 2; y += 6) {
						const el = document.elementFromPoint(x, y)
						if (el && !header.contains(el)) {
							strays.add(el.getAttribute('aria-label') ?? el.tagName.toLowerCase())
						}
					}
				}
				return [...strays]
			})
			expect(overHeader).toEqual([])
		}).toPass()
	})

	// Chrome on Android flickers a fixed element with a backdrop filter while a sheet
	// animates over it: the bar's icons blinked every time a drawer closed.
	test('stops blurring the bottom bar while a drawer covers it', async ({authenticatedPage: page}) => {
		const barBlur = () => page.evaluate(() => {
			const bar = [...document.querySelectorAll('nav')]
				.find(el => getComputedStyle(el).position === 'fixed')
			return bar ? getComputedStyle(bar).backdropFilter : 'no bar yet'
		})

		await page.goto('/projects/1/12')
		await expect.poll(barBlur).toContain('blur')

		await page.getByRole('button', {name: 'Columns'}).click()
		await page.getByRole('dialog', {name: 'Columns'}).waitFor()
		expect(await barBlur()).toBe('none')

		// Still covered while the sheet animates away, and blurring again once it is gone.
		await page.keyboard.press('Escape')
		expect(await barBlur()).toBe('none')
		await expect.poll(barBlur).toContain('blur')
	})

	// The keyboard follows the focus, and it used to stay in the drawer until Reka unmounted
	// it: the page then resized a second time, after the drawer was gone, and the bar rode
	// that resize halfway up the screen before dropping into place.
	test('lets the keyboard go when the quick add closes', async ({authenticatedPage: page}) => {
		const bar = page.getByRole('navigation', {name: 'Navigation'})
		await page.goto('/')
		await expect(bar).toBeVisible()

		await bar.getByRole('button', {name: 'New task'}).click()
		await page.getByRole('textbox').first().fill('Buy cables')
		await expect(bar).toBeHidden()

		await page.keyboard.press('Escape')
		expect(await page.evaluate(() => document.activeElement?.tagName.toLowerCase())).not.toBe('textarea')
		await expect(bar).toBeVisible()
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
