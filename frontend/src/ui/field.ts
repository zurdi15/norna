import {cva} from 'class-variance-authority'
import {inject, provide, type ComputedRef, type InjectionKey} from 'vue'

export interface UiFieldContext {
	id: string
	describedBy: ComputedRef<string | undefined>
	invalid: ComputedRef<boolean>
}

const FIELD_KEY: InjectionKey<UiFieldContext> = Symbol('UiField')

export function provideField(context: UiFieldContext) {
	provide(FIELD_KEY, context)
}

// Controls pick up the id, description and invalid state from an enclosing UiField.
export function useFieldContext() {
	return inject(FIELD_KEY, null)
}

// The box shared by inputs, select triggers and combobox anchors. 16px text on touch
// keeps iOS from zooming into the field.
export const fieldBoxVariants = cva(
	[
		`
			flex w-full items-center gap-2 rounded-md border bg-surface text-ink transition-[border-color,box-shadow]
			duration-150
		`,
		'focus-within:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-60',
	],
	{
		variants: {
			size: {
				sm: 'h-8 px-2 text-sm',
				md: 'h-9 px-2.5 text-base pointer-coarse:h-11 pointer-coarse:text-lg',
			},
			invalid: {
				true: 'border-danger focus-within:ring-danger/20',
				false: 'border-line-strong focus-within:border-accent focus-within:ring-accent/20',
			},
		},
		defaultVariants: {
			size: 'md',
			invalid: false,
		},
	},
)
