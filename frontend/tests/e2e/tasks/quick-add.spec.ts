import {test, expect} from '../../support/fixtures'
import {seedProject} from './seed'

test.describe('Quick add', () => {
	test('creates a task from its magic words', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id)
		await page.goto('/')
		await expect(page.getByRole('link', {name: 'Homelab'}).first()).toBeVisible()

		await page.keyboard.press('n')
		const composer = page.getByRole('textbox', {name: 'New task, with quick add magic'})
		await composer.fill('Pay the rent tomorrow *bills !4')
		await expect(page.getByRole('dialog').getByText('Urgent')).toBeVisible()
		await composer.press('Enter')

		await expect(page.getByText('Created: Pay the rent')).toBeVisible()
		await expect(composer).toHaveValue('')
		await page.keyboard.press('Escape')

		const upcoming = page.locator('section').filter({has: page.getByRole('heading', {name: 'Next 7 days'})})
		await expect(upcoming.getByRole('link', {name: 'Pay the rent'})).toBeVisible()
		await expect(upcoming.getByText('bills')).toBeVisible()
	})

	test('creates one task per line', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id)
		await page.goto('/tasks/by/upcoming?from=now&to=now%2B30d&showNulls=true&showOverdue=false')
		await expect(page.getByRole('heading', {name: 'Upcoming'})).toBeVisible()

		await page.keyboard.press('n')
		const composer = page.getByRole('textbox', {name: 'New task, with quick add magic'})
		await composer.fill('Buy milk')
		await composer.press('Shift+Enter')
		await composer.pressSequentially('Buy bread')
		await composer.press('Enter')

		await expect(page.getByText('2 tasks created')).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.getByRole('link', {name: 'Buy milk'})).toBeVisible()
		await expect(page.getByRole('link', {name: 'Buy bread'})).toBeVisible()
	})
})

test.describe('Quick add on a phone @mobile', () => {
	test('adds a task from the bottom bar', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id)
		await page.goto('/')

		await page.getByRole('navigation', {name: 'Navigation'}).last().getByRole('button', {name: 'New task'}).click()
		const composer = page.getByRole('textbox', {name: 'New task, with quick add magic'})
		await composer.fill('Water the plants today')
		await composer.press('Enter')

		await expect(page.getByText('Created: Water the plants')).toBeVisible()
	})

	test('shows a word while the keyboard is still composing it', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id)
		await page.goto('/')

		await page.getByRole('navigation', {name: 'Navigation'}).last().getByRole('button', {name: 'New task'}).click()
		const dialog = page.getByRole('dialog')
		await dialog.getByRole('textbox', {name: 'New task, with quick add magic'}).focus()
		// Phone keyboards type letters into an open composition, which only commits at a space or a symbol.
		const cdp = await page.context().newCDPSession(page)
		await cdp.send('Input.imeSetComposition', {text: 'Water', selectionStart: 5, selectionEnd: 5})

		await expect(dialog.getByText('Water')).toBeVisible()
		await expect(dialog.getByRole('button', {name: 'Create task'})).toBeEnabled()
	})
})
