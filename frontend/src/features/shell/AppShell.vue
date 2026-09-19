<script setup lang="ts">
import {computed, onBeforeUnmount, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {toast} from 'vue-sonner'
import {useOnline} from '@vueuse/core'

import {useNotifications} from '@/composables/useNotifications'
import {useRenewTokenOnFocus} from '@/composables/useRenewTokenOnFocus'
import {useWebSocket} from '@/composables/useWebSocket'
import TaskDetailPanel from '@/features/tasks/detail/TaskDetailPanel.vue'
import QuickAddDialog from '@/features/tasks/quick-add/QuickAddDialog.vue'
import {useBaseStore} from '@/stores/base'
import {useShellStore} from '@/stores/shell'
import {useBreakpoints} from '@/ui/composables/useBreakpoints'
import UiDialog from '@/ui/UiDialog.vue'
import UiDrawer from '@/ui/UiDrawer.vue'

import AppSidebar from './AppSidebar.vue'
import BottomNav from './BottomNav.vue'
import CommandPalette from './CommandPalette.vue'
import ShortcutsDialog from './ShortcutsDialog.vue'
import {useRouteBackdrop} from './useRouteBackdrop'

const {t} = useI18n()
const route = useRoute()
const router = useRouter()
const shell = useShellStore()
const baseStore = useBaseStore()
const {isMd, isLg} = useBreakpoints()

useRenewTokenOnFocus()

// A task opened from a page shows beside it on wide screens; elsewhere it takes the whole page.
// Dialog routes (settings, create forms) open over the page they were linked from.
const {kind: backdropKind, backdrop, close: closeBackdrop} = useRouteBackdrop()
const taskPanel = computed(() => backdropKind.value === 'panel' && isLg.value && backdrop.value !== null)
const routeDialog = computed(() => backdropKind.value === 'modal' && backdrop.value !== null)
const behind = computed(() => taskPanel.value || routeDialog.value ? backdrop.value ?? undefined : undefined)
const dialogOpen = computed({
	get: () => routeDialog.value,
	set: open => {
		if (!open) {
			closeBackdrop()
		}
	},
})

const {connect, subscribe} = useWebSocket()
connect()
const {refetch: refetchNotifications} = useNotifications()
// The socket only says something happened; the live query fetches what.
const unsubscribeNotifications = subscribe('notification.created', () => refetchNotifications())

// Routes that belong to no project clear the highlighted project in the sidebar.
const PROJECT_ROUTE = /^(project|projects|filter|task)\./
watch(() => route.name, name => {
	shell.drawerOpen = false
	if (typeof name === 'string' && !PROJECT_ROUTE.test(name)) {
		baseStore.setCurrentProject(null)
	}
})

const online = useOnline()
watch(online, isOnline => {
	if (isOnline) {
		toast.dismiss('offline')
	} else {
		toast.warning(t('shell.offline'), {id: 'offline', duration: Infinity})
	}
}, {immediate: true})

// The desktop quick-entry window asks the main window to open what it just created.
const quickEntryChannel = new BroadcastChannel('norna-task-updates')
quickEntryChannel.onmessage = event => {
	if (event.data?.type === 'task-created-open' && event.data?.taskId) {
		router.push({name: 'task.detail', params: {id: event.data.taskId}})
	}
}

onBeforeUnmount(() => {
	quickEntryChannel.close()
	unsubscribeNotifications?.()
})

function focusMain() {
	// Activating the skip link only scrolls; focus must move explicitly. A frame later
	// because a synchronous focus() didn't stick in Safari.
	requestAnimationFrame(() => document.getElementById('main-content')?.focus())
}
</script>

<template>
	<a
		href="#main-content"
		class="
			sr-only
			focus:not-sr-only focus:fixed focus:inset-s-3 focus:top-3 focus:z-(--z-toast) focus:rounded-md
			focus:bg-surface-raised focus:px-3 focus:py-2 focus:shadow-overlay
		"
		@click.prevent="focusMain"
	>
		{{ t('shell.skipToContent') }}
	</a>
	<div class="flex min-h-dvh">
		<div
			v-if="isLg"
			class="sticky top-0 h-dvh shrink-0"
		>
			<AppSidebar />
		</div>
		<UiDrawer
			v-else
			v-model:open="shell.drawerOpen"
			:title="t('shell.navigation')"
		>
			<AppSidebar in-drawer />
		</UiDrawer>

		<main
			id="main-content"
			tabindex="-1"
			class="min-w-0 flex-1 pb-[calc(3.75rem+env(safe-area-inset-bottom))] focus:outline-none md:pb-0"
		>
			<!-- One RouterView either way, so the page behind a panel or dialog isn't remounted when it opens. -->
			<RouterView :route="behind" />
		</main>
		<TaskDetailPanel
			v-if="taskPanel"
			@close="closeBackdrop"
		>
			<RouterView v-slot="{Component}">
				<component
					:is="Component"
					in-panel
					@close="closeBackdrop"
				/>
			</RouterView>
		</TaskDetailPanel>
		<UiDialog
			v-if="routeDialog"
			v-model:open="dialogOpen"
			:title="shell.dialogTitle || (route.meta.title ? t(route.meta.title) : '')"
			size="lg"
		>
			<RouterView v-slot="{Component}">
				<component
					:is="Component"
					in-modal
					@close="closeBackdrop"
				/>
			</RouterView>
		</UiDialog>
	</div>
	<BottomNav v-if="!isMd" />
	<CommandPalette />
	<ShortcutsDialog />
	<QuickAddDialog />
</template>
