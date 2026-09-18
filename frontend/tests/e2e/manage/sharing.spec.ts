import {test, expect} from '../../support/fixtures'
import {TeamFactory} from '../../factories/team'
import {TeamMemberFactory} from '../../factories/team_member'
import {seedProject} from '../projects/seed'

async function openFromMenu(page: import('@playwright/test').Page, item: string) {
	await page.goto('/projects/1/10')
	await page.getByRole('button', {name: 'Project actions'}).click()
	await page.getByRole('menuitem', {name: item}).click()
}

test.describe('Project sharing', () => {
	test.beforeEach(async ({currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
	})

	test('shares a project with a team and changes its access', async ({authenticatedPage: page, currentUser}) => {
		await TeamFactory.create(1, {id: 1, name: 'Ops', created_by_id: currentUser.id})
		await TeamMemberFactory.create(1, {team_id: 1, user_id: currentUser.id, admin: true})
		await openFromMenu(page, 'Share')
		const dialog = page.getByRole('dialog', {name: 'Share Homelab'})

		await dialog.getByRole('button', {name: 'Add team'}).click()
		await page.getByRole('option', {name: 'Ops'}).click()

		const access = dialog.getByRole('button', {name: 'Access for Ops: Read only'})
		await expect(access).toBeVisible()
		await access.click()
		await page.getByRole('menuitem', {name: 'Read & write'}).click()
		await expect(dialog.getByRole('button', {name: 'Access for Ops: Read & write'})).toBeVisible()
		await expect(page.getByText('Access changed')).toBeVisible()
	})

	test('creates a public link', async ({authenticatedPage: page}) => {
		await openFromMenu(page, 'Share')
		const dialog = page.getByRole('dialog', {name: 'Share Homelab'})

		await dialog.getByRole('button', {name: 'New link'}).click()
		await dialog.getByLabel('Name (optional)').fill('Clients')
		await dialog.getByRole('button', {name: 'Create link'}).click()

		await expect(page.getByText('Link created')).toBeVisible()
		await expect(dialog.getByText('Clients')).toBeVisible()
		await expect(dialog.getByText(/\/share\/\w+\/auth/)).toBeVisible()
	})

	test('adds a webhook for some events', async ({authenticatedPage: page}) => {
		await openFromMenu(page, 'Webhooks')
		const dialog = page.getByRole('dialog', {name: 'Webhooks'})

		await dialog.getByRole('button', {name: 'New webhook'}).click()
		await dialog.getByLabel('Target URL').fill('https://hooks.example.com/norna')
		await dialog.getByLabel('Events').click()
		await page.getByRole('option', {name: 'task.created'}).click()
		await page.keyboard.press('Escape')
		await dialog.getByRole('button', {name: 'Create webhook'}).click()

		await expect(page.getByText('Webhook created')).toBeVisible()
		await expect(dialog.getByText('https://hooks.example.com/norna')).toBeVisible()
	})
})
