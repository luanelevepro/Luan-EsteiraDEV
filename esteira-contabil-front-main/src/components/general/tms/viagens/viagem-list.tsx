// import React, { useState, useMemo } from 'react';
// import { Viagem, AvailableDocument, Carga } from '@/types/tms';
// import { Eye, Plus, Search, Calendar, Filter, ChevronUp, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
// import { TripDetails } from './viagem-details';

// interface TripListProps {
// 	trips: Viagem[];
// 	loads?: Carga[]; // cargas disponíveis para cada viagem
// 	availableDocs: AvailableDocument[];
// 	onCreateNew: () => void;
// 	onEditTrip: (trip: Viagem) => void;
// 	onDeleteTrip: (tripId: string) => void;
// 	// Handlers passed down to Details
// 	onAddDelivery: (tripId: string, legId: string, selectedDocs: AvailableDocument[]) => void;
// 	onAddDocument: (tripId: string, legId: string, deliveryId: string, doc: Omit<Document, 'id'>) => void;
// }

// export const TripList: React.FC<TripListProps> = ({
// 	trips,
// 	loads,
// 	availableDocs,
// 	onCreateNew,
// 	onEditTrip,
// 	onDeleteTrip,
// 	onAddDelivery,
// 	onAddDocument,
// }) => {
// 	const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
// 	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

// 	const toggleExpand = (tripId: string) => {
// 		setExpandedTripId((prev) => (prev === tripId ? null : tripId));
// 	};

// 	const handleSort = () => {
// 		setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
// 	};

// 	const sortedTrips = useMemo(() => {
// 		return [...trips].sort((a, b) => {
// 			// Try to parse IDs as numbers for correct sorting (so 10 comes after 2, not before)
// 			const numA = parseInt(a.id);
// 			const numB = parseInt(b.id);

// 			if (!isNaN(numA) && !isNaN(numB)) {
// 				return sortDirection === 'asc' ? numA - numB : numB - numA;
// 			}

// 			// Fallback for non-numeric IDs
// 			return sortDirection === 'asc'
// 				? a.id.localeCompare(b.id, undefined, { numeric: true })
// 				: b.id.localeCompare(a.id, undefined, { numeric: true });
// 		});
// 	}, [trips, sortDirection]);

// 	const handleDeleteClick = (tripId: string, e: React.MouseEvent) => {
// 		e.stopPropagation();
// 		if (window.confirm('Tem certeza que deseja excluir esta viagem?')) {
// 			onDeleteTrip(tripId);
// 		}
// 	};

// 	const handleEditClick = (trip: Viagem, e: React.MouseEvent) => {
// 		e.stopPropagation();
// 		onEditTrip(trip);
// 	};

// 	// Helper to calculate total revenue (Sum of all CTes)
// 	// const calculateTripRevenue = (trip: Viagem) => {
// 	// 	if (!trip.cargas) return 0;
// 	// 	return trip.cargas.reduce((total, leg) => {
// 	// 		return (
// 	// 			total +
// 	// 			leg.js_entregas.reduce((vl, delivery) => {
// 	// 				return (
// 	// 					legTotal +
// 	// 					delivery.documents
// 	// 						.filter((doc) => doc.type === 'CTe') // Only sum CTes
// 	// 						.reduce((docTotal, doc) => docTotal + doc.value, 0)
// 	// 				);
// 	// 			}, 0)
// 	// 		);
// 	// 	}, 0);
// 	// };

// 	const getStatusColor = (status: Viagem['status']) => {
// 		switch (status) {
// 			case 'In Transit':
// 				return 'bg-blue-100 text-blue-700';
// 			case 'Completed':
// 				return 'bg-green-100 text-green-700';
// 			case 'Delayed':
// 				return 'bg-orange-100 text-orange-700';
// 			default:
// 				return 'bg-muted text-foreground/90';
// 		}
// 	};

// 	return (
// 		<div className='min-h-screen bg-muted/40 p-6 transition-all'>
// 			{/* Header */}
// 			<div className='mb-8'>
// 				<div className='mb-2 flex items-center gap-2 text-xs text-muted-foreground'>
// 					<span>Transporte</span>
// 					<span className='text-muted-foreground'>/</span>
// 					<span className='font-medium text-foreground'>Viagens Cargas</span>
// 				</div>
// 				<h1 className='text-2xl font-bold text-foreground'>Viagens e Cargas</h1>
// 				<p className='text-sm text-muted-foreground'>Registros de Viagens e Cargas</p>
// 			</div>

// 			{/* Toolbar */}
// 			<div className='flex flex-col items-center justify-between gap-4 rounded-t-lg border border-b-0 border-border bg-card p-4 sm:flex-row'>
// 				<div className='relative w-full sm:w-96'>
// 					<Search className='absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground' size={18} />
// 					<input
// 						type='text'
// 						placeholder='Pesquisar por motorista, placa ou ID...'
// 						className='w-full rounded-lg border border-input py-2 pr-4 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none'
// 					/>
// 				</div>
// 				<div className='flex w-full gap-2 sm:w-auto'>
// 					<button className='flex items-center gap-2 rounded-lg border border-input bg-card px-4 py-2 text-sm font-medium text-foreground/90 hover:bg-muted/50'>
// 						<Calendar size={16} />
// 						Período
// 					</button>
// 					<button className='flex items-center gap-2 rounded-lg border border-input bg-card px-4 py-2 text-sm font-medium text-foreground/90 hover:bg-muted/50'>
// 						<Filter size={16} />
// 						Filtros
// 					</button>
// 					<button
// 						onClick={onCreateNew}
// 						className='flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90'
// 					>
// 						<Plus size={16} />
// 						Cadastrar Viagem
// 					</button>
// 				</div>
// 			</div>

// 			{/* Table */}
// 			<div className='overflow-x-auto rounded-b-lg border border-border bg-card shadow-sm'>
// 				<table className='w-full border-collapse text-left'>
// 					<thead>
// 						<tr className='border-b border-border bg-muted/40 text-xs tracking-wider text-muted-foreground uppercase'>
// 							<th
// 								className='group cursor-pointer px-6 py-4 font-medium transition-colors select-none hover:bg-muted'
// 								onClick={handleSort}
// 								title='Clique para ordenar'
// 							>
// 								<div className='flex items-center gap-1'>
// 									ID Viagem
// 									{sortDirection === 'asc' ? (
// 										<ArrowUp size={14} className='text-muted-foreground group-hover:text-blue-500' />
// 									) : (
// 										<ArrowDown size={14} className='text-muted-foreground group-hover:text-blue-500' />
// 									)}
// 								</div>
// 							</th>
// 							<th className='px-6 py-4 font-medium'>Cronograma</th>
// 							<th className='px-6 py-4 font-medium'>Cavalo + Carretas</th>
// 							<th className='px-6 py-4 font-medium'>Motorista</th>
// 							<th className='px-6 py-4 text-right font-medium'>Receita Frete</th>
// 							<th className='px-6 py-4 text-right font-medium'>Custo Viagem</th>
// 							<th className='px-6 py-4 text-center font-medium'>Status</th>
// 							<th className='px-6 py-4 text-center font-medium'>Ações</th>
// 						</tr>
// 					</thead>
// 					<tbody className='divide-y divide-gray-100'>
// 						{sortedTrips.map((trip) => {
// 							// Use scheduledDate if available, otherwise createdAt
// 							const dateToDisplay = new Date(trip.scheduledDate + 'T00:00:00');
// 							const isScheduled = !!trip.scheduledDate;
// 							const isExpanded = expandedTripId === trip.id;
// 							const isEditable = trip.status === 'Planned';
// 							const returnDate = trip.estimatedReturnDate ? new Date(trip.estimatedReturnDate + 'T00:00:00') : null;

// 							return (
// 								<React.Fragment key={trip.id}>
// 									<tr
// 										className={`cursor-pointer transition-colors hover:bg-muted/50 ${isExpanded ? 'bg-blue-50/30' : ''}`}
// 										onClick={() => toggleExpand(trip.id)}
// 									>
// 										<td className='px-6 py-4 text-sm font-medium text-foreground'>#{trip.id}</td>
// 										<td className='px-6 py-4 text-sm text-muted-foreground'>
// 											<div className='flex flex-col gap-1'>
// 												<div className='flex items-center gap-1.5' title='Data de Saída'>
// 													<span className={`h-1.5 w-1.5 rounded-full ${isScheduled ? 'bg-blue-500' : 'bg-muted-foreground'}`}></span>
// 													<span className={isScheduled ? 'font-semibold text-foreground/90' : ''}>
// 														{dateToDisplay.toLocaleDateString()}
// 													</span>
// 												</div>
// 												{returnDate && (
// 													<div className='flex items-center gap-1.5' title='Previsão de Retorno'>
// 														<span className='h-1.5 w-1.5 rounded-full bg-orange-400'></span>
// 														<span className='text-xs text-muted-foreground'>Até {returnDate.toLocaleDateString()}</span>
// 													</div>
// 												)}
// 												{!returnDate && !isScheduled && (
// 													<span className='pl-3 text-xs text-muted-foreground'>
// 														{dateToDisplay.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
// 													</span>
// 												)}
// 											</div>
// 										</td>
// 										<td className='px-6 py-4 text-sm text-foreground/90'>
// 											<div className='flex flex-col'>
// 												<span className='font-bold'>{trip.truckPlate}</span>
// 												<div className='mt-0.5 flex flex-col gap-0.5'>
// 													{trip.trailer1Plate && (
// 														<span className='flex items-center gap-1 text-xs text-muted-foreground'>
// 															<span className='h-1 w-1 rounded-full bg-muted-foreground'></span> {trip.trailer1Plate}
// 														</span>
// 													)}
// 													{trip.trailer2Plate && (
// 														<span className='flex items-center gap-1 text-xs text-muted-foreground'>
// 															<span className='h-1 w-1 rounded-full bg-muted-foreground'></span> {trip.trailer2Plate}
// 														</span>
// 													)}
// 												</div>
// 											</div>
// 										</td>
// 										<td className='px-6 py-4 text-sm text-foreground/90'>{trip.driverName}</td>
// 										<td className='px-6 py-4 text-right text-sm font-bold text-green-700'>
// 											{/* {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTripRevenue(trip))} */}
// 										</td>
// 										<td className='px-6 py-4 text-right text-sm font-medium text-red-600'>
// 											{/* {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trip.freightValue)} */}
// 										</td>
// 										<td className='px-6 py-4 text-center'>
// 											<span
// 												className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(trip.status)}`}
// 											>
// 												{trip.status === 'In Transit'
// 													? 'Em Trânsito'
// 													: trip.status === 'Completed'
// 														? 'Entregue'
// 														: trip.status === 'Delayed'
// 															? 'Atrasado'
// 															: 'Planejado'}
// 											</span>
// 										</td>
// 										<td className='px-6 py-4 text-center'>
// 											<div className='flex items-center justify-center gap-1' onClick={(e) => e.stopPropagation()}>
// 												<button
// 													onClick={() => toggleExpand(trip.id)}
// 													className={`rounded border p-1.5 transition-colors ${isExpanded ? 'border-blue-200 bg-blue-100 text-blue-700' : 'border-border bg-card text-muted-foreground hover:text-blue-600'}`}
// 													title='Visualizar Detalhes'
// 												>
// 													{isExpanded ? <ChevronUp size={14} /> : <Eye size={14} />}
// 												</button>

// 												<button
// 													onClick={(e) => handleEditClick(trip, e)}
// 													className={`rounded border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:border-blue-300 hover:text-blue-600`}
// 													title='Editar Viagem (Datas e Recursos)'
// 												>
// 													<Edit2 size={14} />
// 												</button>

// 												<button
// 													onClick={(e) => handleDeleteClick(trip.id, e)}
// 													disabled={!isEditable}
// 													className={`rounded border p-1.5 transition-colors ${isEditable ? 'border-border bg-card text-muted-foreground hover:border-red-300 hover:text-red-600' : 'cursor-not-allowed border-border bg-muted text-muted-foreground'}`}
// 													title={isEditable ? 'Excluir Viagem' : 'Viagem já iniciada, não é possível excluir.'}
// 												>
// 													<Trash2 size={14} />
// 												</button>
// 											</div>
// 										</td>
// 									</tr>
// 									{/* Expanded Details Row */}
// 									{isExpanded && (
// 										<tr>
// 											<td colSpan={8} className='border-b border-border p-0'>
// 												<TripDetails
// 													trip={trip}
// 													loads={loads}
// 													availableDocs={availableDocs}
// 													isInline={true}
// 													onBack={() => toggleExpand(trip.id)}
// 													onAddDelivery={onAddDelivery}
// 													onAddDocument={onAddDocument}
// 													onUpdateStatus={() => {}}
// 													onUpdateDeliveryStatus={() => {}}
// 												/>
// 											</td>
// 										</tr>
// 									)}
// 								</React.Fragment>
// 							);
// 						})}
// 					</tbody>
// 				</table>

// 				{trips.length === 0 && (
// 					<div className='p-12 text-center text-muted-foreground'>
// 						Nenhuma viagem cadastrada. Clique em &quot;Cadastrar Viagem&quot; para começar.
// 					</div>
// 				)}
// 			</div>
// 		</div>
// 	);
// };
