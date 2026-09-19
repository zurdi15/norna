import {LabelFactory} from '../../factories/labels'
import {test, expect} from '../../support/fixtures'
import {seedProject as seedProjectWithViews} from '../projects/seed'
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

test.describe('Task types @mobile', () => {
	test('marks a label as a type, picks it for a new task and shows it before the title', async ({authenticatedPage: page, currentUser}) => {
		await seedProjectWithViews(currentUser.id, 1, 'Homelab')
		await LabelFactory.create(1, {id: 1, title: 'fix', created_by_id: currentUser.id})
		await LabelFactory.create(1, {id: 2, title: 'home', created_by_id: currentUser.id}, false)

		await page.goto('/user/settings/general')
		const types = page.getByRole('group', {name: 'Task types'})
		const saved = page.waitForResponse(response => response.url().includes('/user/settings/general') && response.request().method() === 'PUT')
		await types.getByRole('button', {name: 'fix'}).click()
		expect((await saved).ok()).toBe(true)

		await page.goto('/projects/1/10')
		await page.getByRole('navigation', {name: 'Navigation'}).last().getByRole('button', {name: 'New task'}).click()
		const dialog = page.getByRole('dialog')
		const picker = dialog.getByRole('group', {name: 'Type'})
		await expect(picker.getByRole('button')).toHaveText(['fix'])
		await picker.getByRole('button', {name: 'fix'}).click()
		await expect(picker.getByRole('button', {name: 'fix'})).toHaveAttribute('aria-pressed', 'true')
		await dialog.getByRole('textbox', {name: 'New task, with quick add magic'}).fill('Login fails *home')
		await dialog.getByRole('button', {name: 'Create task'}).click()
		await expect(page.getByText('Created: Login fails')).toBeVisible()

		await page.reload()
		const main = page.getByRole('main')
		const title = main.getByRole('link', {name: 'Login fails'})
		const type = main.getByText('fix', {exact: true})
		await expect(title).toBeVisible()
		await expect(type).toBeVisible()
		// The type sits before the title; the other labels stay with the rest of the details.
		expect((await type.boundingBox())!.x).toBeLessThan((await title.boundingBox())!.x)
		await expect(main.getByText('home', {exact: true})).toBeVisible()
	})
})
