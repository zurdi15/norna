<script setup lang="ts">
import {useI18n} from 'vue-i18n'

import NornaMark from './NornaMark.vue'

const {t} = useI18n()
</script>

<template>
	<div
		class="grid min-h-dvh place-items-center"
		role="status"
		:aria-label="t('shell.loading')"
	>
		<NornaMark class="size-12 animate-pulse rounded-lg" />
	</div>
</template>
