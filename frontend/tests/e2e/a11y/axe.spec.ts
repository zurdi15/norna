import AxeBuilder from '@axe-core/playwright'
import type {Page} from '@playwright/test'

import {test, expect} from '../../support/fixtures'
import {dayAt, seedBoard, seedProject, seedTasks} from '../projects/seed'

// Serious and critical violations fail; lesser ones are for review, not a gate.
async function audit(page: Page, name: string) {
	// The websocket keeps the network busy: wait for the page's heading, then for it to settle.
	await page.locator('h1').first().waitFor({state: 'attached'})
	await page.waitForTimeout(800)
	const {violations} = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
	const blocking = violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
	const report = blocking.map(violation =>
		`${violation.id} (${violation.impact}): ${violation.help}\n${violation.nodes.map(node => `  ${node.target.join(' ')}`).join('\n')}`)
	expect(report, `${name}\n${report.join('\n')}`).toEqual([])
}

test.describe('Accessibility', () => {
	test.beforeEach(async ({currentUser}) => {
		await seedProject(currentUser.id, 1, 'Homelab')
		await seedTasks(1, currentUser.id, [
			{title: 'Renew the TLS certificate', due: dayAt(0, 18), start: dayAt(0, 9), end: dayAt(2, 18)},
			{title: 'Update Proxmox', due: dayAt(3)},
			{title: 'Document the network'},
		])
		await seedBoard(1, currentUser.id, ['To do', 'Doing', 'Done'], [0, 1, 2])
	})

	const pages = [
		['home', '/'],
		['upcoming', '/tasks/by/upcoming'],
		['projects', '/projects'],
		['list', '/projects/1/10'],
		['gantt', '/projects/1/11'],
		['table', '/projects/1/12'],
		['kanban', '/projects/1/13'],
		['task', '/tasks/1'],
		['labels', '/labels'],
		['teams', '/teams'],
		['settings', '/user/settings/general'],
		['api tokens', '/user/settings/api-tokens'],
		['time tracking', '/time-tracking'],
	] as const

	for (const [name, path] of pages) {
		test(`${name} has no serious violations`, async ({authenticatedPage: page}) => {
			await page.goto(path)
			await audit(page, name)
		})
	}
})

test.describe('Accessibility, signed out', () => {
	test('login has no serious violations', async ({page}) => {
		await page.goto('/login')
		await audit(page, 'login')
	})
})
