import {LabelFactory} from '../../factories/labels'
import {LabelTaskFactory} from '../../factories/label_task'
import {test, expect} from '../../support/fixtures'
import {updateUserSettings} from '../../support/updateUserSettings'
import {dayAt, seedBoard, seedProject as seedProjectWithViews, seedTasks as seedProjectTasks} from '../projects/seed'
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

	test('keeps its height whatever the title', async ({authenticatedPage: page, currentUser}) => {
		await seedProject(currentUser.id)
		await page.goto('/')

		await page.getByRole('navigation', {name: 'Navigation'}).last().getByRole('button', {name: 'New task'}).click()
		const dialog = page.getByRole('dialog')
		const empty = (await dialog.boundingBox())!.height

		await dialog.getByRole('textbox', {name: 'New task, with quick add magic'}).fill('Water the plants')
		await expect(dialog.getByText('Water the plants')).toBeVisible()
		expect((await dialog.boundingBox())!.height).toBe(empty)

		// A title too long for the box scrolls inside it instead of growing the drawer.
		await dialog.getByRole('textbox', {name: 'New task, with quick add magic'}).fill('Water all the plants on the balcony and the ones in the living room as well')
		await expect(dialog.getByText('Water all the plants')).toBeVisible()
		expect((await dialog.boundingBox())!.height).toBe(empty)

		// What the magic understood still gets its row, which does make the drawer taller.
		await dialog.getByRole('textbox', {name: 'New task, with quick add magic'}).fill('Water the plants tomorrow')
		await expect.poll(async () => (await dialog.boundingBox())!.height).toBeGreaterThan(empty)
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

test.describe('Featured labels @mobile', () => {
	test('marks labels as featured, picks two for a new task and shows them before the title', async ({authenticatedPage: page, currentUser}) => {
		await seedProjectWithViews(currentUser.id, 1, 'Homelab')
		await LabelFactory.create(1, {id: 1, title: 'fix', created_by_id: currentUser.id})
		await LabelFactory.create(1, {id: 2, title: 'ui', created_by_id: currentUser.id}, false)
		await LabelFactory.create(1, {id: 3, title: 'home', created_by_id: currentUser.id}, false)

		await page.goto('/user/settings/general')
		const featured = page.getByRole('group', {name: 'Featured labels'})
		for (const name of ['fix', 'ui']) {
			const saved = page.waitForResponse(response => response.url().includes('/user/settings/general') && response.request().method() === 'PUT')
			await featured.getByRole('button', {name, exact: true}).click()
			expect((await saved).ok()).toBe(true)
		}

		await page.goto('/projects/1/10')
		await page.getByRole('navigation', {name: 'Navigation'}).last().getByRole('button', {name: 'New task'}).click()
		const dialog = page.getByRole('dialog')
		const picker = dialog.getByRole('group', {name: 'Featured labels'})
		await expect(picker.getByRole('button')).toHaveText(['fix', 'ui'])
		// Both at once: a task can be a fix and a piece of interface.
		await picker.getByRole('button', {name: 'fix'}).click()
		await picker.getByRole('button', {name: 'ui'}).click()
		await expect(picker.getByRole('button', {name: 'fix'})).toHaveAttribute('aria-pressed', 'true')
		await expect(picker.getByRole('button', {name: 'ui'})).toHaveAttribute('aria-pressed', 'true')
		await dialog.getByRole('textbox', {name: 'New task, with quick add magic'}).fill('Login fails *home')
		await dialog.getByRole('button', {name: 'Create task'}).click()
		await expect(page.getByText('Created: Login fails')).toBeVisible()

		await page.reload()
		const main = page.getByRole('main')
		const title = main.getByRole('link', {name: 'Login fails'})
		await expect(title).toBeVisible()
		// Both featured labels lead the title; the rest stays with the other details.
		for (const name of ['fix', 'ui']) {
			const chip = main.getByText(name, {exact: true})
			await expect(chip).toBeVisible()
			expect((await chip.boundingBox())!.x).toBeLessThan((await title.boundingBox())!.x)
		}
		await expect(main.getByText('home', {exact: true})).toBeVisible()
	})

	test('takes a featured label off with a second tap', async ({authenticatedPage: page, currentUser}) => {
		await seedProjectWithViews(currentUser.id, 1, 'Homelab')
		await LabelFactory.create(1, {id: 1, title: 'fix', created_by_id: currentUser.id})

		await page.goto('/user/settings/general')
		const saved = page.waitForResponse(response => response.url().includes('/user/settings/general') && response.request().method() === 'PUT')
		await page.getByRole('group', {name: 'Featured labels'}).getByRole('button', {name: 'fix'}).click()
		expect((await saved).ok()).toBe(true)

		await page.goto('/projects/1/10')
		await page.getByRole('navigation', {name: 'Navigation'}).last().getByRole('button', {name: 'New task'}).click()
		const dialog = page.getByRole('dialog')
		const chip = dialog.getByRole('group', {name: 'Featured labels'}).getByRole('button', {name: 'fix'})
		await chip.click()
		await expect(chip).toHaveAttribute('aria-pressed', 'true')
		await chip.click()
		await expect(chip).toHaveAttribute('aria-pressed', 'false')

		await dialog.getByRole('textbox', {name: 'New task, with quick add magic'}).fill('No label for this one')
		await dialog.getByRole('button', {name: 'Create task'}).click()
		await expect(page.getByText('Created: No label')).toBeVisible()

		await page.reload()
		await expect(page.getByRole('main').getByRole('link', {name: 'No label for this one'})).toBeVisible()
		await expect(page.getByRole('main').getByText('fix', {exact: true})).toBeHidden()
	})
})

test.describe('Featured labels in every view', () => {
	test.beforeEach(async ({currentUser, apiContext, userToken}) => {
		await seedProjectWithViews(currentUser.id, 1, 'Homelab')
		await seedProjectTasks(1, currentUser.id, [{title: 'Login fails', start: dayAt(0), end: dayAt(3)}])
		await seedBoard(1, currentUser.id, ['To do'], [0])
		await LabelFactory.create(1, {id: 1, title: 'fix', created_by_id: currentUser.id})
		await LabelFactory.create(1, {id: 2, title: 'home', created_by_id: currentUser.id}, false)
		await LabelTaskFactory.create(1, {id: 1, task_id: 1, label_id: 1})
		await LabelTaskFactory.create(1, {id: 2, task_id: 1, label_id: 2}, false)
		await updateUserSettings(apiContext, userToken, {frontend_settings: {featured_label_ids: [1]}})
	})

	// The chip leads the task's title wherever the task shows up, not only in the list.
	for (const [view, path] of [['table', '/projects/1/12'], ['gantt', '/projects/1/11'], ['kanban', '/projects/1/13']] as const) {
		test(`leads the title in the ${view}`, async ({authenticatedPage: page}) => {
			await page.goto(path)

			const main = page.getByRole('main')
			const chip = main.getByText('fix', {exact: true}).first()
			await expect(chip).toBeVisible()
			const title = main.getByText('Login fails', {exact: true}).first()
			await expect(title).toBeVisible()

			// Before the title: to its left, or on the line above it in a card.
			const [chipBox, titleBox] = [(await chip.boundingBox())!, (await title.boundingBox())!]
			expect(chipBox.y < titleBox.y || chipBox.x < titleBox.x).toBe(true)
		})
	}

	test('leads the title in the task detail', async ({authenticatedPage: page}) => {
		await page.goto('/tasks/1')

		const chip = page.getByRole('main').getByText('fix', {exact: true}).first()
		await expect(chip).toBeVisible()
		expect((await chip.boundingBox())!.y).toBeLessThan((await page.getByRole('heading', {name: 'Login fails'}).boundingBox())!.y)
	})
})
