<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {keepPreviousData, useInfiniteQuery} from '@tanstack/vue-query'
import {refDebounced} from '@vueuse/core'
import {ArrowUpRight, FolderKanban, Search, UserRoundPen} from '@lucide/vue'

import {adminProjectsQuery, type AdminProject} from '@/client/queries/admin'
import {useProjects} from '@/composables/useProjects'
import {useTaskDateFormat} from '@/composables/useTaskDateFormat'
import AdminListFooter from '@/features/admin/AdminListFooter.vue'
import AdminMenuRow from '@/features/admin/AdminMenuRow.vue'
import ChangeOwnerDialog from '@/features/admin/ChangeOwnerDialog.vue'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import type {UiMenuEntry} from '@/ui/menu'
import UiAlert from '@/ui/UiAlert.vue'
import UiChip from '@/ui/UiChip.vue'
import UiColorDot from '@/ui/UiColorDot.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** Every project on the instance, archived and other people's too, and who owns it. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const router = useRouter()
const dates = useTaskDateFormat()
const ownProjects = useProjects()

const search = ref('')
const debouncedSearch = refDebounced(search, 250)
const projects = useInfiniteQuery(computed(() => ({
	...adminProjectsQuery(debouncedSearch.value),
	placeholderData: keepPreviousData,
})))
const list = computed(() => projects.data.value?.pages.flatMap(page => page.items) ?? [])
const total = computed(() => projects.data.value?.pages[0]?.total ?? 0)

const ownerOpen = ref(false)
const target = ref<AdminProject | null>(null)

function changeOwner(project: AdminProject) {
	target.value = project
	ownerOpen.value = true
}

// Only projects the admin can see themselves open; the rest would be a 403.
function menuItems(project: AdminProject): UiMenuEntry[] {
	return [
		...(ownProjects.projects[project.id]
			? [{label: t('admin.projects.open'), icon: ArrowUpRight, onSelect: () => void router.push({name: 'project.index', params: {projectId: project.id}})}]
			: []),
		{label: t('admin.projects.changeOwner'), icon: UserRoundPen, onSelect: () => changeOwner(project)},
	]
}
</script>

<template>
	<div class="@container mx-auto max-w-4xl pb-10">
		<div class="px-4 pt-4 pb-2 md:pt-6 @2xl:px-6">
			<UiInput
				v-model="search"
				type="search"
				:placeholder="t('admin.projects.search')"
				:aria-label="t('admin.projects.search')"
			>
				<template #leading>
					<UiIcon :icon="Search" />
				</template>
			</UiInput>
		</div>

		<UiAlert
			v-if="projects.isError.value"
			tone="danger"
			class="mx-4 mt-2 @2xl:mx-6"
		>
			{{ t('admin.loadFailed') }}
		</UiAlert>
		<div
			v-else-if="projects.isPending.value"
			class="grid gap-4 px-4 pt-4 @2xl:px-6"
			aria-hidden="true"
		>
			<UiSkeleton
				v-for="index in 5"
				:key="index"
				class="h-8"
			/>
		</div>
		<UiEmptyState
			v-else-if="!list.length"
			:title="debouncedSearch ? t('admin.projects.noMatchTitle') : t('admin.projects.emptyTitle')"
			class="py-16"
		>
			<template #illustration>
				<UiIcon
					:icon="FolderKanban"
					size="xl"
					class="mb-4 text-ink-faint"
				/>
			</template>
		</UiEmptyState>
		<template v-else>
			<ul
				role="list"
				:aria-label="t('admin.nav.projects')"
				class="divide-y divide-line border-y border-line"
			>
				<li
					v-for="project in list"
					:key="project.id"
				>
					<AdminMenuRow
						:items="menuItems(project)"
						:title="project.title ?? ''"
						data-admin-project
					>
						<UiColorDot
							:color="project.hex_color"
							class="size-2.5"
						/>
						<div class="min-w-0 flex-1">
							<p class="flex min-w-0 items-center gap-2">
								<span
									class="truncate text-base pointer-coarse:text-md"
									:class="project.is_archived && 'text-ink-muted'"
								>{{ project.title }}</span>
								<UiChip
									v-if="project.is_archived"
									size="sm"
									class="shrink-0"
								>
									{{ t('admin.projects.archived') }}
								</UiChip>
							</p>
							<p class="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-faint @2xl:hidden">
								<span class="font-mono">#{{ project.id }}</span>
								<template v-if="project.owner">
									<span aria-hidden="true">·</span>
									<span class="truncate">{{ project.owner.name || project.owner.username }}</span>
								</template>
							</p>
						</div>
						<span class="hidden w-14 shrink-0 font-mono text-2xs text-ink-faint @2xl:block">#{{ project.id }}</span>
						<span
							v-if="project.owner"
							class="hidden w-44 min-w-0 shrink-0 items-center gap-2 text-sm text-ink-muted @2xl:flex"
						>
							<UserAvatar
								:username="project.owner.username"
								:name="project.owner.name || project.owner.username"
								size="sm"
							/>
							<span class="truncate">{{ project.owner.name || project.owner.username }}</span>
						</span>
						<span class="hidden w-20 shrink-0 text-end font-mono text-2xs text-ink-faint tabular-nums @2xl:block">
							{{ project.created ? dates.short(new Date(project.created)) : '' }}
						</span>
					</AdminMenuRow>
				</li>
			</ul>
			<AdminListFooter
				:shown="list.length"
				:total="total"
				:has-more="projects.hasNextPage.value"
				:loading="projects.isFetchingNextPage.value"
				@more="projects.fetchNextPage()"
			/>
		</template>
	</div>

	<ChangeOwnerDialog
		v-model:open="ownerOpen"
		:project="target"
	/>
</template>
