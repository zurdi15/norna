<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus, Users} from '@lucide/vue'

import type {Team} from '@/client/generated'
import {
	normalizeSharePermission,
	useCreateProjectTeamShareMutation,
	useDeleteProjectTeamShareMutation,
	useUpdateProjectTeamShareMutation,
} from '@/client/queries/projectShares'
import type {Permission} from '@/constants/permissions'
import {useTeams} from '@/composables/useTeams'
import {confirm} from '@/ui/confirm'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiListbox from '@/ui/UiListbox.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

import ShareRow from './ShareRow.vue'
import {useProjectTeamShares, type TeamShare} from './useProjectShares'

/** The teams a project is shared with. New ones come from the teams the user is in. */
const props = defineProps<{
	projectId: number
	projectTitle: string
	canManage: boolean
}>()

const {t} = useI18n()
const {shares, isPending} = useProjectTeamShares(() => props.projectId)
const addOpen = ref(false)
const myTeams = useTeams({enabled: () => props.canManage})
const create = useCreateProjectTeamShareMutation()
const update = useUpdateProjectTeamShareMutation()
const remove = useDeleteProjectTeamShareMutation()

const sortedShares = computed(() => [...shares.value].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))
const candidates = computed(() => myTeams.teams.value.filter((team): team is Team & {id: number} =>
	team.id !== undefined && !shares.value.some(share => share.id === team.id)))

function memberCount(team: TeamShare): string | undefined {
	return team.members?.length ? t('teams.memberCount', team.members.length) : undefined
}

function add(teamId: number) {
	create.mutate({projectId: props.projectId, teamId})
	addOpen.value = false
}

function isBusy(share: TeamShare): boolean {
	return update.isPending.value && update.variables.value?.teamId === share.id
}

function change(share: TeamShare, permission: Permission) {
	update.mutate({projectId: props.projectId, teamId: share.id, permission})
}

async function removeShare(share: TeamShare) {
	const projectId = props.projectId
	const confirmed = await confirm({
		title: t('projectShare.teams.removeTitle'),
		description: t('projectShare.teams.removeDescription', {team: share.name ?? '', project: props.projectTitle}),
		confirmLabel: t('projectShare.teams.remove'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({projectId, teamId: share.id})
	}
}
</script>

<template>
	<section class="grid gap-1">
		<UiSectionHeading
			:title="t('teams.title')"
			:count="shares.length || undefined"
		>
			<template
				v-if="canManage"
				#actions
			>
				<UiAdaptivePopover
					v-model:open="addOpen"
					:title="t('projectShare.teams.add')"
					align="end"
				>
					<template #trigger>
						<UiButton
							variant="ghost"
							size="sm"
							:icon="Plus"
							class="-me-2 pointer-coarse:h-11"
						>
							{{ t('projectShare.teams.add') }}
						</UiButton>
					</template>
					<UiListbox
						:items="candidates"
						:item-key="team => team.id"
						:item-label="team => team.name ?? ''"
						:label="t('projectShare.teams.add')"
						:search-placeholder="t('projectShare.teams.search')"
						:empty-text="myTeams.teams.value.length ? undefined : t('projectShare.teams.noTeams')"
						:loading="myTeams.isPending.value"
						class="md:w-72"
						@select="add"
					>
						<template #item="{item}">
							<UiIcon
								:icon="Users"
								class="text-ink-faint"
							/>
							<span class="min-w-0 flex-1 truncate">{{ item.name }}</span>
						</template>
					</UiListbox>
				</UiAdaptivePopover>
			</template>
		</UiSectionHeading>
		<ul
			v-if="sortedShares.length"
			role="list"
		>
			<ShareRow
				v-for="share in sortedShares"
				:key="share.id"
				:name="share.name ?? ''"
				:detail="memberCount(share)"
				:permission="normalizeSharePermission(share.permission)"
				:editable="canManage"
				:busy="isBusy(share)"
				:remove-label="t('projectShare.teams.remove')"
				@change="permission => change(share, permission)"
				@remove="removeShare(share)"
			>
				<template #avatar>
					<span
						class="grid size-5 shrink-0 place-items-center rounded-sm bg-canvas-subtle text-ink-muted ring-1 ring-line"
						aria-hidden="true"
					>
						<UiIcon
							:icon="Users"
							size="xs"
						/>
					</span>
				</template>
			</ShareRow>
		</ul>
		<div
			v-else-if="isPending"
			class="grid gap-2 py-1"
			aria-hidden="true"
		>
			<UiSkeleton class="h-8" />
		</div>
		<p
			v-else
			class="py-1 text-sm text-pretty text-ink-faint"
		>
			{{ t('projectShare.teams.empty') }}
		</p>
	</section>
</template>
