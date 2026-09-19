<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {RouterLink, useRoute} from 'vue-router'
import {ChevronRight, ExternalLink} from '@lucide/vue'

import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'

import {useSettingsNav, type SettingsNavItem} from './settingsNav'

/**
 * The settings sections. Beside the page on wide screens (`aside`); on phones it is
 * the settings screen itself (`list`), each row opening its section.
 */
withDefaults(defineProps<{
	variant?: 'aside' | 'list'
}>(), {
	variant: 'aside',
})

const {t} = useI18n()
const route = useRoute()
const {groups, extraLinks} = useSettingsNav()

function isCurrent(item: SettingsNavItem, isActive: boolean): boolean {
	return isActive || (typeof route.name === 'string' && (item.also ?? []).includes(route.name))
}
</script>

<template>
	<nav
		:aria-label="t('settings.title')"
		:class="variant === 'aside' ? 'grid gap-5' : 'grid gap-6'"
	>
		<section
			v-for="group in groups"
			:key="group.key"
		>
			<h2
				:class="cn(
					'caption',
					variant === 'aside' ? 'px-2 pb-1.5' : 'px-4 pb-2',
				)"
			>
				{{ group.title }}
			</h2>
			<ul
				role="list"
				:class="variant === 'list' && 'border-y border-line bg-surface'"
			>
				<li
					v-for="item in group.items"
					:key="item.route"
					:class="variant === 'list' && '[&+li]:border-t [&+li]:border-line'"
				>
					<RouterLink
						v-slot="{href, navigate, isActive}"
						:to="{name: item.route}"
						custom
					>
						<a
							:href="href"
							:aria-current="isCurrent(item, isActive) ? 'page' : undefined"
							:class="cn(
								'flex items-center gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-accent',
								variant === 'aside'
									? `
										h-8 rounded-md px-2 text-sm text-ink-muted
										hover:bg-canvas-subtle hover:text-ink
										aria-[current=page]:bg-accent-subtle aria-[current=page]:font-medium
										aria-[current=page]:text-accent
									`
									: 'h-12 px-4 text-md text-ink active:bg-canvas-subtle',
								item.tone === 'danger' && 'text-danger hover:text-danger',
							)"
							@click="navigate"
						>
							<UiIcon
								:icon="item.icon"
								:size="variant === 'aside' ? 'sm' : 'md'"
								:class="variant === 'list' && item.tone !== 'danger' && 'text-ink-muted'"
							/>
							<span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
							<UiIcon
								v-if="variant === 'list'"
								:icon="ChevronRight"
								size="sm"
								class="text-ink-faint"
							/>
						</a>
					</RouterLink>
				</li>
			</ul>
		</section>
		<ul
			v-if="extraLinks.length"
			role="list"
			:class="variant === 'list' && 'border-y border-line bg-surface'"
		>
			<li
				v-for="link in extraLinks"
				:key="link.url"
			>
				<a
					:href="link.url"
					target="_blank"
					rel="noopener"
					:class="cn(
						'flex items-center gap-3 text-ink-muted transition-colors hover:text-ink',
						variant === 'aside' ? 'h-8 rounded-md px-2 text-sm hover:bg-canvas-subtle' : 'h-12 px-4 text-md',
					)"
				>
					<UiIcon
						:icon="ExternalLink"
						:size="variant === 'aside' ? 'sm' : 'md'"
					/>
					<span class="min-w-0 flex-1 truncate">{{ link.text }}</span>
				</a>
			</li>
		</ul>
	</nav>
</template>
