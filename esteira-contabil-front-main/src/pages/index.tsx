import Head from 'next/head';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { createClient } from '@/utils/supabase/server-props';
import { GetServerSidePropsContext } from 'next';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { systemModules } from '@/services/modules/system-modules';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { getModulosUsuario } from '@/services/api/modulos';
interface Modules {
	name: string;
	moduleName: string;
	description?: string;
	checked: boolean;
}
export default function Home({ user }: { user: User }) {
	const [modules, setModules] = useState<Modules[]>([]);

	const { data, isLoading } = useQuery({
		queryKey: ['get-usuario-modulos', user.id],
		queryFn: () => getModulosUsuario(user.id),
		staleTime: 1000 * 60 * 5,
	});

	function createModules(modules: { [s: string]: unknown } | ArrayLike<unknown>) {
		const mappedResponse = Object.entries(modules).map(([name, checked]) => {
			return { name, checked: Boolean(checked) };
		});

		const systemModulesFiltered = systemModules
			.filter((systemModule) => {
				return mappedResponse.some((module) => module.name === systemModule.moduleName);
			})
			.map((systemModule) => {
				const correspondingModule = mappedResponse.find((module) => module.name === systemModule.moduleName);
				return {
					...systemModule,
					checked: correspondingModule ? correspondingModule.checked : false,
				};
			});

		setModules(systemModulesFiltered);
	}

	useEffect(() => {
		if (!isLoading) {
			createModules(data);
		}
	}, [data, isLoading]);

	return (
		<>
			<Head>
				<title>Dashboard | Esteira</title>
			</Head>
			<DashboardLayout title='Visão Geral' description='Seus módulos ativos.'>
				<div className='flex flex-1 flex-col gap-4 pt-0'>
					<div className='3xl:grid-cols-5 4xl:grid-cols-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
						{modules.map((module) => (
							<Card
								key={module.name}
								className={`shadow-none ${module.checked ? 'cursor-pointer' : 'opacity-50'}`}
								onClick={() => {
									if (module.checked) {
										toast.info('Em breve');
									}
								}}
							>
								<CardHeader>
									<CardTitle>{module.name}</CardTitle>
									<CardDescription>{module.description}</CardDescription>
								</CardHeader>
								<CardFooter>
									<Badge variant={module.checked ? 'default' : 'outline'}>{module.checked ? 'Ativo' : 'Inativo'}</Badge>
								</CardFooter>
							</Card>
						))}
						{isLoading && (
							<>
								<div className='bg-muted aspect-video animate-pulse rounded-xl' />
								<div className='bg-muted aspect-video animate-pulse rounded-xl' />
								<div className='bg-muted aspect-video animate-pulse rounded-xl' />
							</>
						)}
					</div>
				</div>
			</DashboardLayout>
		</>
	);
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
	const supabase = createClient(context);
	const { data, error } = await supabase.auth.getUser();

	if (error || !data) {
		return {
			redirect: {
				destination: '/login',
				permanent: false,
			},
		};
	}

	return {
		props: {
			user: data.user,
		},
	};
}
