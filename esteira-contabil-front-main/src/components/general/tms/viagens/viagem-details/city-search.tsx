import React, { useMemo, useState } from 'react';
import { MapPin, Search, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export interface CitySearchProps {
	value: string;
	onChange: (city: string) => void;
	cities: string[];
	placeholder?: string;
	label?: string;
	required?: boolean;
}

export const CitySearch: React.FC<CitySearchProps> = ({
	value,
	onChange,
	cities,
	placeholder = 'Selecione a cidade...',
	label = 'Cidade',
	required = false,
}) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [open, setOpen] = useState(false);

	const filteredCities = useMemo(() => {
		if (!searchTerm.trim()) return cities;
		const search = searchTerm.toLowerCase();
		return cities.filter((city) => city.toLowerCase().includes(search));
	}, [searchTerm, cities]);

	const handleSelect = (city: string) => {
		onChange(city);
		setOpen(false);
		setSearchTerm('');
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<div className='space-y-1.5'>
					<label className='text-[10px] font-black tracking-widest text-gray-500 uppercase'>
						{label} {required && <span className='text-red-500'>*</span>}
					</label>
					<Input value={value} readOnly placeholder={placeholder} className='w-full cursor-pointer' onClick={() => setOpen(true)} />
				</div>
			</PopoverTrigger>
			<PopoverContent className='z-[10010] w-80 overflow-hidden p-0' align='start'>
				<div className='flex max-h-96 flex-col'>
					{/* campo de busca */}
					<div className='flex-shrink-0 border-b p-3'>
						<div className='relative'>
							<Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
							<Input
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder='Digite para buscar...'
								className='pl-10'
								autoFocus
							/>
						</div>
					</div>
					{/* resultados */}
					<div
						className='flex-1 overflow-y-auto scroll-smooth'
						style={{
							scrollbarWidth: 'thin',
							scrollbarColor: 'hsl(var(--border)) transparent',
							overscrollBehavior: 'contain',
						}}
						onWheel={(e) => {
							e.stopPropagation();
						}}
					>
						{filteredCities.length > 0 ? (
							<div className='p-2'>
								{filteredCities.map((city) => (
									<div
										key={city}
										className='cursor-pointer rounded-md p-3 transition-colors hover:bg-gray-100'
										onClick={() => handleSelect(city)}
									>
										<div className='flex items-center justify-between'>
											<span className='text-sm font-medium text-gray-900'>{city}</span>
											{value === city && <Check size={16} className='text-green-600' />}
										</div>
									</div>
								))}
							</div>
						) : searchTerm ? (
							<div className='flex flex-col items-center justify-center p-6 text-center'>
								<MapPin className='mb-2 h-8 w-8 text-gray-400' />
								<p className='text-sm text-gray-600'>Nenhuma cidade encontrada</p>
								<p className='mt-1 text-xs text-gray-400'>Tente outro termo de busca</p>
							</div>
						) : (
							<div className='flex flex-col items-center justify-center p-6 text-center'>
								<MapPin className='mb-2 h-8 w-8 text-gray-400' />
								<p className='text-sm text-gray-600'>Nenhuma cidade disponível</p>
							</div>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};
