import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
	'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
				secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
				destructive:
					'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
				outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
				success: 'border-green-500/20 bg-green-500/25 text-green-950 dark:bg-green-500/15 dark:text-green-300',
				danger: 'border-red-500/20 bg-red-500/25 text-red-950 dark:bg-red-500/15 dark:text-red-300',
				warning: 'border-yellow-500/20 bg-yellow-500/25 text-yellow-950 dark:bg-yellow-500/15 dark:text-yellow-300',
				info: 'border-blue-500/20 bg-blue-500/25 text-blue-950 dark:bg-blue-500/15 dark:text-blue-300',
				pending: 'border-orange-500/20 bg-orange-500/25 text-orange-950 dark:bg-orange-500/15 dark:text-orange-300',
				muted: 'border border-border bg-muted/50 text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground',
				transit: '!py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
				statusDanger: '!py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300',
				successTwo: '!py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-800 dark:bg-green-500/15 dark:text-green-300',
				cargo: '!py-1 rounded-full border border-purple-500/30 bg-purple-500/10 font-semibold text-purple-700 dark:text-purple-300',
				late: '!py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
				gray: 'rounded-full border border-border bg-muted text-muted-foreground dark:bg-muted/80 dark:text-muted-foreground',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

function Badge({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : 'span';

	return <Comp data-slot='badge' className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
