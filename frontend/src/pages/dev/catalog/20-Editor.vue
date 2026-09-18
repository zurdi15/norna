<script setup lang="ts">
import {ref} from 'vue'
import {SendHorizontal} from '@lucide/vue'

import TaskEditor from '@/features/editor/TaskEditor.vue'
import type {SaveTrigger} from '@/features/editor/types'
import UiButton from '@/ui/UiButton.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSwitch from '@/ui/UiSwitch.vue'

// Dev-only page: the copy is sample content, not translated UI.
const TASK_URL = `${window.location.origin}/tasks/42`

const description = ref(`<h2>Migrar los backups a restic</h2>
<p>El NAS guarda las copias con <strong>rsync</strong> y sin versiones. Pasamos a <a target="_blank" rel="noopener noreferrer nofollow" href="https://restic.net">restic</a> con retención de <em>30 días</em> y una copia fuera de casa. Depende de <a target="_blank" rel="noopener noreferrer nofollow" href="${TASK_URL}">${TASK_URL}</a>.</p>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="true"><p>Inventario de volúmenes y tamaños</p></li>
<li data-type="taskItem" data-checked="true"><p>Crear el repositorio en el bucket de Hetzner</p></li>
<li data-type="taskItem" data-checked="false"><p>Programar <code>restic backup</code> cada noche</p></li>
<li data-type="taskItem" data-checked="false"><p>Probar una restauración completa</p></li>
</ul>
<h3>Comandos</h3>
<pre><code class="language-bash"># copia nocturna
restic -r s3:https://fsn1.example.com/backups backup /srv --exclude-caches
restic forget --keep-daily 30 --prune</code></pre>
<blockquote><p>Una copia que no se ha restaurado nunca no es una copia.</p></blockquote>
<table><tbody>
<tr><th><p>Volumen</p></th><th><p>Tamaño</p></th><th><p>Frecuencia</p></th></tr>
<tr><td><p>fotos</p></td><td><p>412 GB</p></td><td><p>diaria</p></td></tr>
<tr><td><p>documentos</p></td><td><p>18 GB</p></td><td><p>diaria</p></td></tr>
</tbody></table>
<ol><li><p>Parar los contenedores</p></li><li><p>Hacer el <em>snapshot</em></p></li><li><p>Levantarlos de nuevo</p></li></ol>
<hr>
<p>Revisar el coste del bucket a final de mes.</p>`)

const readOnly = ref(`<p>Checklist del viaje, se puede marcar sin entrar a editar:</p>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="true"><p>Reservar el ferry Hirtshals–Kristiansand</p></li>
<li data-type="taskItem" data-checked="false"><p>Comprar la tarjeta <strong>AutoPASS</strong></p></li>
<li data-type="taskItem" data-checked="false"><p>Descargar mapas offline de Lofoten</p></li>
</ul>`)

const lastSave = ref('')
function onSave(_value: string, trigger: SaveTrigger) {
	lastSave.value = `${trigger} · ${new Date().toLocaleTimeString()}`
}

const editable = ref(true)

interface DemoComment {
	id: number
	author: string
	html: string
}

const comments = ref<DemoComment[]>([
	{
		id: 1,
		author: 'Astrid Lund',
		html: '<p>He probado la restauración de <code>documentos</code>: <strong>18 GB en 6 minutos</strong>. <mention-user data-id="zurdi" data-label="zurdi"></mention-user> ¿subimos la retención a 60 días?</p>',
	},
])
const draft = ref('')

function post(value: string, trigger: SaveTrigger = 'shortcut') {
	// A composer posts on the shortcut or the button, never when it just loses the focus.
	if (trigger !== 'shortcut' || value === '') {
		return
	}
	comments.value = [...comments.value, {id: Date.now(), author: 'zurdi', html: value}]
	draft.value = ''
}
</script>

<template>
	<section class="grid gap-4">
		<UiSectionHeading
			title="Editor"
			caption="Texto enriquecido"
		>
			<template #actions>
				<label class="flex items-center gap-2 text-sm text-ink-muted">
					<UiSwitch v-model="editable" />
					Editable
				</label>
			</template>
		</UiSectionHeading>

		<div class="grid gap-2">
			<p class="caption">
				Descripción
			</p>
			<TaskEditor
				v-model="description"
				:editable="editable"
				placeholder="Añade una descripción…"
				@save="onSave"
			/>
			<p class="font-mono text-2xs text-ink-faint">
				save: {{ lastSave || '—' }}
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-2">
			<div class="grid content-start gap-2">
				<p class="caption">
					Solo lectura
				</p>
				<TaskEditor
					v-model="readOnly"
					:editable="false"
					@save="onSave"
				/>
			</div>

			<div class="grid content-start gap-3">
				<p class="caption">
					Comentarios
				</p>
				<article
					v-for="comment in comments"
					:key="comment.id"
					class="grid gap-1"
				>
					<p class="text-sm font-medium">
						{{ comment.author }}
					</p>
					<TaskEditor
						v-model="comment.html"
						:editable="false"
						variant="comment"
					/>
				</article>
				<TaskEditor
					v-model="draft"
					variant="comment"
					placeholder="Escribe un comentario…"
					@save="post"
				>
					<template #footer>
						<div class="flex items-center justify-end gap-2 px-2 pb-2">
							<UiButton
								variant="primary"
								size="sm"
								:icon="SendHorizontal"
								shortcut="Mod+Enter"
								:disabled="draft === ''"
								@click="post(draft)"
							>
								Comentar
							</UiButton>
						</div>
					</template>
				</TaskEditor>
			</div>
		</div>
	</section>
</template>
