// What made TaskEditor emit `save`: leaving the editor with changes, Mod+Enter / Mod+S,
// or ticking a checklist item outside of editing. A comment composer posts on 'shortcut' only.
export type SaveTrigger = 'blur' | 'shortcut' | 'checklist'
