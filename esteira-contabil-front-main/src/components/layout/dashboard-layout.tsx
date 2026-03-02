import { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import SystemLayout from './system-layout';

type LayoutProps = {
	children: ReactNode;
	className?: string;
	title?: string;
	description?: string;
	goBackButton?: boolean;
	rightSection?: ReactNode;
};

export default function DashboardLayout({ children, className, title, description, rightSection }: LayoutProps) {
	return (
		<SystemLayout className='grid min-h-0 min-w-0 grid-rows-[auto_1fr] gap-4 overflow-hidden p-4 lg:gap-6 lg:p-6'>
			<div className='flex shrink-0 items-center justify-between gap-8'>
				<div hidden={!title && !description} className='space-y-0.5'>
					<h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
					<p className='text-muted-foreground'>{description}</p>
				</div>
				{rightSection}
			</div>
			<div className={cn('min-h-0 min-w-0 overflow-hidden', className)}>{children}</div>
		</SystemLayout>
	);
}
