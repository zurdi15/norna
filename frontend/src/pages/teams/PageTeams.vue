<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {RouterLink} from 'vue-router'
import {Plus, UsersRound} from '@lucide/vue'

import {useTeams} from '@/composables/useTeams'
import {useTitle} from '@/composables/useTitle'
import MobileRootActions from '@/features/shell/MobileRootActions.vue'
import PageHeader from '@/features/shell/PageHeader.vue'
import {useBackdropLink} from '@/features/shell/useRouteBackdrop'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

defineOptions({inheritAttrs: false})

/** The teams the user is in; a team shares projects with all its members at once. */
const {t} = useI18n()
useTitle(() => t('teams.title'))

const {teams, isPending} = useTeams()
const backdropLink = useBackdropLink()
</script>

<template>
	<PageHeader
		:title="t('teams.title')"
		large
	>
		<template #actions>
			<UiButton
				variant="primary"
				size="sm"
				:icon="Plus"
				:as="RouterLink"
				:to="backdropLink({name: 'teams.create'})"
			>
				{{ t('teams.new') }}
			</UiButton>
			<MobileRootActions />
		</template>
	</PageHeader>

	<div class="@container mx-auto max-w-3xl pb-10">
		<div
			v-if="isPending"
			class="grid gap-3 p-6"
			aria-hidden="true"
		>
			<UiSkeleton
				v-for="index in 4"
				:key="index"
				class="h-6 w-1/3"
			/>
		</div>
		<UiEmptyState
			v-else-if="!teams.length"
			:title="t('teams.emptyTitle')"
			:description="t('teams.emptyDescription')"
			class="py-16"
		>
			<template #illustration>
				<UiIcon
					:icon="UsersRound"
					size="xl"
					class="mb-4 text-ink-faint"
				/>
			</template>
		</UiEmptyState>
		<ul
			v-else
			role="list"
			class="pt-2"
		>
			<li
				v-for="team in teams"
				:key="team.id"
			>
				<RouterLink
					:to="{name: 'teams.edit', params: {id: team.id}}"
					class="
						flex min-h-12 items-center gap-3 px-4
						hover:bg-canvas-subtle
						focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent
						@xl:px-6
						pointer-coarse:min-h-14
					"
				>
					<span class="grid size-8 shrink-0 place-items-center rounded-md bg-accent-subtle font-semibold text-accent">
						{{ (team.name ?? '?').charAt(0).toUpperCase() }}
					</span>
					<span class="min-w-0 flex-1">
						<span class="block truncate text-base pointer-coarse:text-md">{{ team.name }}</span>
						<span
							v-if="team.description"
							class="block truncate text-sm text-ink-faint"
						>{{ team.description }}</span>
					</span>
					<span class="shrink-0 font-mono text-2xs text-ink-faint tabular-nums">{{ t('teams.memberCount', team.members?.length ?? 0) }}</span>
				</RouterLink>
			</li>
		</ul>
	</div>
</template>
