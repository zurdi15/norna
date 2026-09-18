import type {Page} from '@playwright/test'

import {test, expect} from '../../support/fixtures'
import {ProjectFactory} from '../../factories/project'

// Keyboard shortcuts only exist once the shell has mounted, after /info and the session check.
async function openShell(page: Page) {
	await page.goto('/')
	await expect(page.getByRole('navigation', {name: 'Navigation'}).first()).toBeVisible()
}

test.describe('Shell navigation', () => {
	test('lists projects in the sidebar and opens one', async ({authenticatedPage: page, currentUser}) => {
		await ProjectFactory.create(1, {id: 101, title: 'Homelab', owner_id: currentUser.id})
		await page.goto('/')

		const sidebar = page.getByRole('navigation', {name: 'Navigation'})
		await sidebar.getByRole('link', {name: 'Homelab'}).click()

		await expect(page).toHaveURL(/\/projects\/101/)
	})

	test('finds a project from the command palette', async ({authenticatedPage: page, currentUser}) => {
		await ProjectFactory.create(1, {id: 102, title: 'Viaje a Noruega', owner_id: currentUser.id})
		await openShell(page)

		await page.keyboard.press('ControlOrMeta+k')
		const palette = page.getByRole('dialog', {name: 'Search and commands'})
		await palette.getByPlaceholder('Search projects or type a command…').fill('noruega')
		// The projects load with the shell; Enter picks the top match once it is listed.
		await expect(palette.getByRole('option', {name: 'Viaje a Noruega'})).toHaveAttribute('aria-selected', 'true')
		await page.keyboard.press('Enter')

		await expect(page).toHaveURL(/\/projects\/102/)
	})

	test('goes to labels with the g then a shortcut', async ({authenticatedPage: page}) => {
		await openShell(page)
		await page.keyboard.press('g')
		await page.keyboard.press('a')

		await expect(page).toHaveURL('/labels')
	})

	test('collapses the sidebar to a rail and remembers it', async ({authenticatedPage: page}) => {
		await page.goto('/')
		await page.getByRole('button', {name: 'Collapse sidebar'}).click()
		await expect(page.getByRole('button', {name: 'Expand sidebar'})).toBeVisible()

		await page.reload()

		await expect(page.getByRole('button', {name: 'Expand sidebar'})).toBeVisible()
	})

	test('switches the theme from the account menu and keeps it after a reload', async ({authenticatedPage: page, currentUser}) => {
		await openShell(page)
		await page.getByRole('button', {name: currentUser.username}).click()
		await page.getByRole('menuitem', {name: 'Dark'}).click()

		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
		await page.reload()
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
	})
})

test.describe('Shell on a phone @mobile', () => {
	test('navigates with the bottom bar', async ({authenticatedPage: page}) => {
		await page.goto('/')
		const bottomBar = page.getByRole('navigation', {name: 'Navigation'}).last()

		await bottomBar.getByRole('link', {name: 'Upcoming'}).click()
		await expect(page).toHaveURL(/\/tasks\/by\/upcoming/)

		await bottomBar.getByRole('link', {name: 'Projects'}).click()
		await expect(page).toHaveURL('/projects')
	})

	test('opens the account menu as a sheet', async ({authenticatedPage: page}) => {
		await page.goto('/')
		await page.getByRole('button', {name: 'Account'}).click()

		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByRole('button', {name: 'Log out'})).toBeVisible()
	})
})
