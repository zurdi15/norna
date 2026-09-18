import {cva, type VariantProps} from 'class-variance-authority'

export const buttonVariants = cva(
	[
		`
			relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-medium
			whitespace-nowrap
		`,
		'transition-colors duration-150 ease-out select-none',
		'disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
	],
	{
		variants: {
			variant: {
				primary: 'bg-accent text-on-accent hover:bg-accent-hover',
				secondary: 'border border-line-strong bg-surface text-ink hover:bg-canvas-subtle',
				ghost: 'text-ink-muted hover:bg-canvas-subtle hover:text-ink',
				danger: 'border border-danger/40 bg-surface text-danger hover:bg-danger-subtle',
			},
			size: {
				sm: 'h-7 px-2.5 text-sm',
				md: 'h-8.5 px-3.5 text-base pointer-coarse:h-10 pointer-coarse:text-md',
				lg: 'h-11 px-5 text-lg',
			},
			block: {
				true: 'w-full',
			},
		},
		defaultVariants: {
			variant: 'secondary',
			size: 'md',
		},
	},
)

export const iconButtonSizes = {
	sm: 'size-7 px-0',
	md: 'size-8.5 px-0 pointer-coarse:size-10',
	lg: 'size-11 px-0',
} as const

export type ButtonVariants = VariantProps<typeof buttonVariants>
export type ButtonVariant = NonNullable<ButtonVariants['variant']>
export type ButtonSize = NonNullable<ButtonVariants['size']>
