# Changelog

All notable changes to this project are documented in this file.

## 0.3.0 - 2026-09-22

### Cambiado
- Los «tipos de tarea» pasan a ser **etiquetas destacadas** y ahora puedes marcar **varias** al añadir una tarea (fix y ui/ux a la vez), de un toque y sin escribir el asterisco. Las que ya tenías marcadas se mantienen.
- Las etiquetas destacadas van por delante del título allá donde salga la tarea: lista, kanban, tabla, gantt, detalle, Hoy y Próximas.

## 0.2.3 - 2026-09-22

### Arreglado
- Al cerrar el drawer de «nueva tarea» en el móvil, la barra de abajo ya no da un salto raro: el teclado se va con el drawer y la barra espera a que la pantalla se asiente antes de volver.

## 0.2.2 - 2026-09-22

### Arreglado
- En el móvil, al hacer scroll por la lista de un proyecto, las casillas de las tareas ya no se pintan por encima de la cabecera, las pestañas de vista ni el buscador.
- Los iconos de la barra de abajo ya no parpadean al cerrar un drawer.

## 0.2.1 - 2026-09-20

### Arreglado
- La caja de texto de «nueva tarea» mide siempre dos líneas: el drawer ya no daba un salto al escribir la primera letra ni crecía con el título. Los títulos largos hacen scroll dentro de la caja.

## 0.2.0 - 2026-09-19

### Añadido
- **Tipos de tarea**: en Ajustes → Tareas marcas qué etiquetas son tipos (fix, feat, core…); al crear una tarea eliges uno con un toque y en la lista y el kanban sale como chip delante del título.
- **Tokens que no caducan**: los tokens de API y de MCP pueden crearse con la caducidad «Nunca».

### Arreglado
- Ya se puede borrar el proyecto por defecto (el Inbox); antes el borrado fallaba sin avisar y el proyecto reaparecía.
- Si borrar, archivar, editar, crear o duplicar un proyecto falla, ahora sale un aviso con el motivo.
- En el móvil, las letras de una tarea nueva se ven mientras escribes, también en «Añadir tarea» del kanban.

## 0.1.0 - 2026-09-19

Primera versión de Norna: una interfaz nueva de arriba abajo, pensada primero para el móvil.

### Añadido
- **Hoy y Próximas**: vencidas, hoy y los próximos 7 días (Urðr, Verðandi, Skuld), o el rango que elijas.
- **Quick add con magia**: fecha, etiquetas, proyecto y prioridad escritos en el título, resaltados mientras escribes; fechas en español e inglés; una tarea por línea.
- **Cuatro vistas por proyecto**: lista con subtareas y orden manual, tabla con columnas a elegir, kanban (arrastrar en escritorio, «Mover a…» en el móvil) y gantt con barras que se arrastran o se mueven con el teclado.
- **Detalle de tarea**: panel al lado en escritorio y página en el móvil; propiedades en filas, descripción con checklists, adjuntos, comentarios, relaciones y registro de tiempo.
- **Filtros** con autocompletado en cualquier vista y filtros guardados.
- **Selección múltiple** (`x`) y acciones en bloque, paleta de comandos (Ctrl/⌘ K) y atajos para todo.
- **Gestión**: proyectos, vistas, etiquetas, equipos, compartir (personas, equipos y enlaces), webhooks y fondos.
- **Ajustes** completos, integraciones (tokens de API, CalDAV, MCP, feeds, bots), importar desde otros servicios y exportar la cuenta.
- **Panel de admin** y **registro de tiempo**, disponibles sin licencia.
- Tema claro y oscuro, español e inglés, e instalable como PWA.
