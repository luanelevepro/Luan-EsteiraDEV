'use client';

/**
 * AccordionDetails legado da tela Faturamento > Viagens e Cargas.
 * Usa dados ObjCte / ObjTravel / IDestino (mock do módulo faturamento).
 * O componente em evolução é ViagemAccordionDetails em
 * @/components/general/tms/viagens/viagem-accordion-details.tsx (TMS > Viagens).
 */

import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { badgeTripStatus, type Status } from '@/utils/functions';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ObjCte, ObjTravel, IDestino } from '.';

interface IProps {
	travel: ObjCte;
	onReorderDetalhes?: (travelId: string, newDetalhes: ObjTravel[]) => void;
	onReorderDestino?: (travelId: string, detalheIndex: number, newDestino: IDestino[]) => void;
}

const canReorderViagem = (travel: ObjCte) => !travel.viagemIniciada;
const canReorderCarga = (detalhe: ObjTravel) => !detalhe.cargaIniciada;

function SortableDestinoItem({
	destino,
	index,
	detalheIndex,
	travelId,
	badgeTripStatus,
}: {
	destino: IDestino;
	index: number;
	detalheIndex: number;
	travelId: string;
	badgeTripStatus: (status: Status) => string;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `destino-${travelId}-${detalheIndex}-${destino.id}`,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.85 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="mb-0 flex gap-4 items-center">
			<div
				{...attributes}
				{...listeners}
				className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing shrink-0"
			>
				<GripVertical size={16} />
			</div>
			<Badge variant={'cargo'} className="min-w-[86px] border-none px-4 py-2">
				{`Entrega ${index + 1}`}
			</Badge>
			<div className="min-w-[420px]">
				<p className="text-sm font-semibold">{destino.cidade}</p>
				<p className="text-[13px]">{destino.end}</p>
			</div>
			<div className="min-w-[204px]">
				<p className="text-sm font-semibold">Destinatário</p>
				<p className="text-[13px]">{destino.destino}</p>
			</div>
			<div className="min-w-[204px]">
				<p className="text-sm font-semibold">Docs</p>
				<div className="flex gap-2">
					{destino.docs?.map((doc, i) => (
						<Badge variant="successTwo" key={i} className="text-[13px]">
							{doc.doc}
						</Badge>
					))}
				</div>
			</div>
			<div className="min-w-[204px]">
				<p className="text-sm font-semibold">Status</p>
				<Badge variant={destino.status} className="border-transparent p-2">
					{badgeTripStatus(destino.status)}
				</Badge>
			</div>
		</div>
	);
}

function TrajetoCardContent({
	detalhe,
	index,
	travel,
	onReorderDestino,
	badgeTripStatusFn,
}: {
	detalhe: ObjTravel;
	index: number;
	travel: ObjCte;
	onReorderDestino?: (travelId: string, detalheIndex: number, newDestino: IDestino[]) => void;
	badgeTripStatusFn: (status: Status) => string;
}) {
	const canReorderEntregas = canReorderCarga(detalhe);
	const destinoIds = detalhe.destino.map(
		(d) => `destino-${travel.id}-${index}-${d.id}` as const
	);

	return (
		<>
			<div className="flex gap-4">
				<Badge variant="transit" className="min-w-[86px] border-none px-4 py-2">
					Origem
				</Badge>
				<div className="min-w-[420px]">
					<p className="text-sm font-semibold">{detalhe.origem.cidade}</p>
					<p className="text-[13px]">{detalhe.origem.endereco}</p>
				</div>
				<div className="min-w-[420px]">
					<p className="text-sm font-semibold">Centro de distribuição</p>
					<p className="text-[13px]">{detalhe.origem.ct}</p>
				</div>
			</div>

			{canReorderEntregas && onReorderDestino ? (
				<DndContext
					collisionDetection={closestCenter}
					onDragEnd={(event: DragEndEvent) => {
						const { active, over } = event;
						if (!over || active.id === over.id) return;
						const oldIndex = detalhe.destino.findIndex(
							(d) => `destino-${travel.id}-${index}-${d.id}` === active.id
						);
						const newIndex = detalhe.destino.findIndex(
							(d) => `destino-${travel.id}-${index}-${d.id}` === over.id
						);
						if (oldIndex !== -1 && newIndex !== -1) {
							const newDestino = arrayMove(detalhe.destino, oldIndex, newIndex);
							onReorderDestino(travel.id, index, newDestino);
						}
					}}
				>
					<SortableContext items={destinoIds} strategy={verticalListSortingStrategy}>
						{detalhe.destino.map((destino, destIndex) => (
							<SortableDestinoItem
								key={destino.id}
								destino={destino}
								index={destIndex}
								detalheIndex={index}
								travelId={travel.id}
								badgeTripStatus={badgeTripStatusFn}
							/>
						))}
					</SortableContext>
				</DndContext>
			) : (
				detalhe.destino.map((destino, destIndex) => (
					<div className="mb-0 flex gap-4" key={destino.id}>
						<Badge variant="cargo" className="min-w-[86px] border-none px-4 py-2">
							{`Entrega ${destIndex + 1}`}
						</Badge>
						<div className="min-w-[420px]">
							<p className="text-sm font-semibold">{destino.cidade}</p>
							<p className="text-[13px]">{destino.end}</p>
						</div>
						<div className="min-w-[204px]">
							<p className="text-sm font-semibold">Destinatário</p>
							<p className="text-[13px]">{destino.destino}</p>
						</div>
						<div className="min-w-[204px]">
							<p className="text-sm font-semibold">Docs</p>
							<div className="flex gap-2">
								{destino.docs?.map((doc, i) => (
									<Badge variant="successTwo" key={i} className="text-[13px]">
										{doc.doc}
									</Badge>
								))}
							</div>
						</div>
						<div className="min-w-[204px]">
							<p className="text-sm font-semibold">Status</p>
							<Badge variant={destino.status} className="border-transparent p-2">
								{badgeTripStatusFn(destino.status)}
							</Badge>
						</div>
					</div>
				))
			)}
		</>
	);
}

function SortableTrajetoItem({
	detalhe,
	index,
	travel,
	onReorderDestino,
	badgeTripStatusFn,
	showDragHandleCarga,
}: {
	detalhe: ObjTravel;
	index: number;
	travel: ObjCte;
	onReorderDestino?: (travelId: string, detalheIndex: number, newDestino: IDestino[]) => void;
	badgeTripStatusFn: (status: Status) => string;
	showDragHandleCarga: boolean;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: `detalhe-${travel.id}-${detalhe.id}`,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.85 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="bg-secondary flex flex-col gap-4 space-y-2 rounded-2xl p-6 text-sm">
			<div className="flex items-center gap-2">
				{showDragHandleCarga && (
					<div
						{...attributes}
						{...listeners}
						className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing shrink-0"
					>
						<GripVertical size={16} />
					</div>
				)}
				<p className="bg-foreground text-background m-0 w-fit rounded-md px-2 py-1 text-sm font-semibold">
					Trajeto {detalhe.id}
				</p>
			</div>
			<TrajetoCardContent
				detalhe={detalhe}
				index={index}
				travel={travel}
				onReorderDestino={onReorderDestino}
				badgeTripStatusFn={badgeTripStatusFn}
			/>
		</div>
	);
}

function TrajetoCardStatic({
	detalhe,
	index,
	travel,
	onReorderDestino,
	badgeTripStatusFn,
}: {
	detalhe: ObjTravel;
	index: number;
	travel: ObjCte;
	onReorderDestino?: (travelId: string, detalheIndex: number, newDestino: IDestino[]) => void;
	badgeTripStatusFn: (status: Status) => string;
}) {
	return (
		<div className="bg-secondary flex flex-col gap-4 space-y-2 rounded-2xl p-6 text-sm">
			<p className="bg-foreground text-background m-0 w-fit rounded-md px-2 py-1 text-sm font-semibold">
				Trajeto {detalhe.id}
			</p>
			<TrajetoCardContent
				detalhe={detalhe}
				index={index}
				travel={travel}
				onReorderDestino={onReorderDestino}
				badgeTripStatusFn={badgeTripStatusFn}
			/>
		</div>
	);
}

export function FaturamentoViagensCargasAccordionDetails({
	travel,
	onReorderDetalhes,
	onReorderDestino,
}: IProps) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	);

	const itemAndValue = (
		title: string,
		value: number,
		color?: string,
		isPercentage?: boolean
	) => (
		<div className="min-w-[120px]">
			<p className="text-[13px]">{title}</p>
			<p className={`text-base font-semibold ${color ?? ''}`}>
				{isPercentage
					? `${value}%`
					: value.toLocaleString('pt-br', {
							style: 'currency',
							currency: 'BRL',
						})}
			</p>
		</div>
	);

	const detalhes = travel?.detalhes ?? [];
	const canReorderCargas = canReorderViagem(travel) && !!onReorderDetalhes;
	const detalheIds = detalhes.map((d) => `detalhe-${travel.id}-${d.id}`);

	const content =
		canReorderCargas && onReorderDetalhes ? (
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={(event: DragEndEvent) => {
					const { active, over } = event;
					if (!over || active.id === over.id) return;
					const oldIndex = detalhes.findIndex(
						(d) => `detalhe-${travel.id}-${d.id}` === active.id
					);
					const newIndex = detalhes.findIndex(
						(d) => `detalhe-${travel.id}-${d.id}` === over.id
					);
					if (oldIndex !== -1 && newIndex !== -1) {
						const newDetalhes = arrayMove(detalhes, oldIndex, newIndex);
						onReorderDetalhes(travel.id, newDetalhes);
					}
				}}
			>
				<SortableContext items={detalheIds} strategy={verticalListSortingStrategy}>
					{detalhes.map((detalhe, index) => (
						<SortableTrajetoItem
							key={detalhe.id}
							detalhe={detalhe}
							index={index}
							travel={travel}
							onReorderDestino={onReorderDestino}
							badgeTripStatusFn={badgeTripStatus}
							showDragHandleCarga={true}
						/>
					))}
				</SortableContext>
			</DndContext>
		) : (
			detalhes.map((detalhe, index) => (
				<TrajetoCardStatic
					key={detalhe.id}
					detalhe={detalhe}
					index={index}
					travel={travel}
					onReorderDestino={onReorderDestino}
					badgeTripStatusFn={badgeTripStatus}
				/>
			))
		);

	return (
		<TableRow>
			<TableCell colSpan={10} className="p-5">
				<div className="flex flex-col gap-2">{content}</div>
				<h6 className="my-4 text-sm font-semibold">Detalhes dos custos</h6>
				<div className="bg-secondary flex gap-4 rounded-2xl p-6">
					{itemAndValue('Combustível', travel.costDetails.combustivel)}
					{itemAndValue('Pedágio', travel.costDetails.pedagio)}
					{itemAndValue('Outras despesas', travel.costDetails.outrasDepesas)}
					{itemAndValue('Custos pessoal', travel.costDetails.custosPessoal)}
					{itemAndValue('Custos total', travel.costDetails.custosTotal, 'text-[#D00000]')}
					{itemAndValue('Margem de lucro', travel.costDetails.margemLucro, 'text-[#38B000]', true)}
					{itemAndValue('Faturamento - custos totais', travel.costDetails.faturamento, 'text-[#38B000]')}
				</div>
			</TableCell>
		</TableRow>
	);
}

export default FaturamentoViagensCargasAccordionDetails;
