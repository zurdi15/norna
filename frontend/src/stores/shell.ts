import {ref} from 'vue'
import {acceptHMRUpdate, defineStore} from 'pinia'
import {useStorage} from '@vueuse/core'

// UI state of the authenticated shell: which overlays are open, and the sidebar mode.
export const useShellStore = defineStore('shell', () => {
	// Desktop only; below lg the sidebar is a drawer instead.
	const sidebarCollapsed = useStorage('norna:sidebar-collapsed', false)
	const drawerOpen = ref(false)
	const commandPaletteOpen = ref(false)
	const shortcutsOpen = ref(false)
	const quickAddOpen = ref(false)
	// Set by the page in a dialog route, when its title depends on data (e.g. archive or restore).
	const dialogTitle = ref('')

	function toggleSidebar() {
		sidebarCollapsed.value = !sidebarCollapsed.value
	}

	return {
		sidebarCollapsed,
		drawerOpen,
		commandPaletteOpen,
		shortcutsOpen,
		quickAddOpen,
		dialogTitle,
		toggleSidebar,
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useShellStore, import.meta.hot))
}
