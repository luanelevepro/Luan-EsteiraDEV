import React, { useState, useMemo } from 'react';
import { Carga, Veiculo } from '@/types/tms';
import { Button } from '@/components/ui/button';
import {
	X,
	Check,
	Plus,
	Truck,
	Weight,
	Box,
	Package,
	Clock,
	DollarSign,
	Shield,
	Tag,
	AlertTriangle,
	Zap,
	SlidersHorizontal,
	CheckCircle,
	Info,
	Search,
	MapPin,
	LucideProps,
} from 'lucide-react';
import { getFisClientes, getSegmentos, getEmbarcadores, getArmadores, getVeiculos } from '@/services/api/tms/tms';
import { getCidades } from '@/services/api/sistema';
import {
	createCarga,
	updateCarga,
	parseDocumentosParaCarga,
	createCargaComEntregas,
	type CargaPayload,
	type TipoCarroceria,
	type PrioridadeCarga,
	type CargaPreenchidaDTO,
	type CargaComEntregasPayload,
} from '@/services/api/tms/cargas';
import { getDocumentosDisponiveis } from '@/services/api/tms/documentos';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCompanyContext } from '@/context/company-context';
import { classificarDocBucket, docBadgeFromBucket } from '@/utils/tms/classificar-documento-dfe';
import { DocumentSelectTwoColumns, type SelectableDocWithBucket } from '@/components/general/tms/viagens/document-select-two-columns';
import type { Doc } from '@/types/tms';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { SegmentoData } from '@/pages/tms/segmentos';

const VEHICLE_TYPE_TO_API: Record<string, string> = {
	Graneleiro: 'GRANELEIRO',
	Baú: 'BAU',
	Sider: 'SIDER',
	Frigorífico: 'FRIGORIFICO',
	Tanque: 'TANQUE',
	'Porta-Container': 'PORTA_CONTAINER',
};

interface CitySearchProps {
	value: string;
	onChange: (city: string) => void;
	cities: string[];
	placeholder?: string;
	label?: string;
	required?: boolean;
}

const CitySearch: React.FC<CitySearchProps> = ({
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
					<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
						{label} {required && <span className='text-red-500'>*</span>}
					</label>
					<Input value={value} readOnly placeholder={placeholder} className='w-full cursor-pointer' onClick={() => setOpen(true)} />
				</div>
			</PopoverTrigger>
			<PopoverContent className='z-[10010] w-80 overflow-hidden p-0' align='start'>
				<div className='flex max-h-96 flex-col'>
					<div className='flex-shrink-0 border-b p-3'>
						<div className='relative'>
							<Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
							<Input
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder='Digite para buscar...'
								className='pl-10'
								autoFocus
							/>
						</div>
					</div>
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
										className='hover:bg-muted cursor-pointer rounded-md p-3 transition-colors'
										onClick={() => handleSelect(city)}
									>
										<div className='flex items-center justify-between'>
											<span className='text-foreground text-sm font-medium'>{city}</span>
											{value === city && <Check size={16} className='text-green-600' />}
										</div>
									</div>
								))}
							</div>
						) : searchTerm ? (
							<div className='flex flex-col items-center justify-center p-6 text-center'>
								<MapPin className='text-muted-foreground mb-2 h-8 w-8' />
								<p className='text-muted-foreground text-sm'>Nenhuma cidade encontrada</p>
								<p className='text-muted-foreground mt-1 text-xs'>Tente outro termo de busca</p>
							</div>
						) : (
							<div className='flex flex-col items-center justify-center p-6 text-center'>
								<MapPin className='text-muted-foreground mb-2 h-8 w-8' />
								<p className='text-muted-foreground text-sm'>Nenhuma cidade disponível</p>
							</div>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};

interface CreateLoadModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSaveLoad: (loadData: Carga, vehicle: Veiculo | null, isEdit: boolean) => void;
	editingLoad?: Carga | null;
	onCreated?: (carga: Carga) => void;
}

const PRIORITY_OPTIONS: {
	value: 'low' | 'normal' | 'high' | 'urgent';
	label: string;
	color: string;
	icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>> | null;
}[] = [
	{ value: 'low', label: 'Baixa', color: 'border-blue-300 bg-blue-50 text-blue-700', icon: null },
	{ value: 'normal', label: 'Normal', color: 'border-input bg-muted/40 text-foreground/90', icon: null },
	{ value: 'high', label: 'Alta', color: 'border-orange-300 bg-orange-50 text-orange-700', icon: AlertTriangle },
	{ value: 'urgent', label: 'Urgente', color: 'border-red-400 bg-red-50 text-red-700', icon: Zap },
];

type StepId = 'documentos' | 'revisao';

export const CreateLoadModal: React.FC<CreateLoadModalProps> = ({ isOpen, onClose, editingLoad, onCreated }) => {
	type TabId = 'basic' | 'config' | 'physical' | 'sla' | 'requirements';
	const [activeTab, setActiveTab] = useState<TabId>('config');
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [defineJanelaColeta, setDefineJanelaColeta] = useState(false);

	const [step, setStep] = useState<StepId>('documentos');
	const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
	const [docFilterText, setDocFilterText] = useState('');
	const [parserResult, setParserResult] = useState<{
		dados: CargaPreenchidaDTO;
		warnings: { codigo?: string; mensagem: string }[];
	} | null>(null);
	const [parserLoading, setParserLoading] = useState(false);

	// Buscar clientes fiscais (fis_clientes) — cadastro do tomador/cliente com CNPJ
	const { data: fisClientesData } = useQuery({
		queryKey: ['get-fis-clientes-all'],
		queryFn: () => getFisClientes(),
		staleTime: 1000 * 60 * 5, // 5 minutos
		enabled: isOpen,
	});

	// Opções do select Cliente: fis_clientes (id, nome, documento) + tomador do CT-e (parser) quando existir
	const clientOptions = React.useMemo(() => {
		const base = (fisClientesData ?? []).map((c: { id: string; ds_nome: string; ds_documento: string | null }) => ({
			id: c.id,
			name: c.ds_nome,
			document: c.ds_documento ?? '',
		}));
		const parserCliente = parserResult?.dados?.cliente;
		if (!parserCliente?.ds_nome) return base;
		const alreadyExists = base.some((c: { name: string }) => c.name === parserCliente.ds_nome);
		if (alreadyExists) return base;
		return [{ id: '__parser__', name: parserCliente.ds_nome, document: parserCliente.ds_documento ?? '' }, ...base];
	}, [fisClientesData, parserResult?.dados?.cliente]);

	// Buscar embarcadores da API
	const { data: embarcadoresData } = useQuery({
		queryKey: ['get-embarcadores-all'],
		queryFn: () => getEmbarcadores(),
		staleTime: 1000 * 60 * 5,
		enabled: isOpen,
	});

	const embarcadores = React.useMemo(() => {
		if (!embarcadoresData) return [];
		return embarcadoresData.map((e: { id: string; ds_nome: string; ds_documento: string | null }) => ({
			id: e.id,
			name: e.ds_nome,
			document: e.ds_documento ?? '',
		}));
	}, [embarcadoresData]);

	// Opções do select Embarcador: cadastro + opção do parser (expedidor do CT-e) quando existir
	const embarcadorOptions = React.useMemo(() => {
		const base = embarcadores ?? [];
		const parserEmb = parserResult?.dados?.embarcador;
		if (!parserEmb?.ds_nome) return base;
		const alreadyExists = base.some((x: { name: string }) => x.name === parserEmb.ds_nome);
		if (alreadyExists) return base;
		return [{ id: '__parser__', name: parserEmb.ds_nome, document: parserEmb.ds_documento ?? '' }, ...base];
	}, [embarcadores, parserResult?.dados?.embarcador]);

	// Buscar cidades da API
	const { data: cidadesData } = useQuery({
		queryKey: ['get-cidades-all'],
		queryFn: () => getCidades({ page: 1, pageSize: 10000, search: '', orderBy: 'asc', orderColumn: 'ds_city' }),
		staleTime: 1000 * 60 * 60, // 1 hora
	});

	// Transformar os dados da API em array de strings no formato "Cidade - UF"
	const cities = React.useMemo(() => {
		if (!cidadesData?.cities) return [];
		return cidadesData.cities.map((city) => `${city.ds_city} - ${city.js_uf.ds_uf}`);
	}, [cidadesData]);

	// Buscar segmentos da API
	const { data: segmentosData } = useQuery({
		queryKey: ['get-segmentos-all'],
		queryFn: () => getSegmentos(),
		staleTime: 1000 * 60 * 5, // 5 minutos
		enabled: isOpen,
	});

	// Buscar armadores (cadastro global - operação container)
	const { data: armadoresData } = useQuery({
		queryKey: ['get-armadores'],
		queryFn: () => getArmadores(),
		staleTime: 1000 * 60 * 5,
		enabled: isOpen,
	});
	const armadores = React.useMemo(() => armadoresData ?? [], [armadoresData]);

	const { state: empresaId } = useCompanyContext();

	// Veículos (para carroceria planejada): apenas carrocerias, opcionalmente filtradas pelo tipo necessário
	const { data: veiculosData } = useQuery({
		queryKey: ['get-veiculos-tms', empresaId],
		queryFn: () => getVeiculos(empresaId ?? '', true),
		staleTime: 1000 * 60 * 5,
		enabled: isOpen && !!empresaId,
	});
	const dataInicio = React.useMemo(() => {
		const d = new Date();
		d.setMonth(d.getMonth() - 3);
		return d.toISOString().slice(0, 10);
	}, []);
	const dataFim = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

	const { data: documentosDisponiveis = [] } = useQuery({
		queryKey: ['tms-documentos-disponiveis', dataInicio, dataFim],
		queryFn: () => getDocumentosDisponiveis({ dataInicio, dataFim, tipo: 'AMBOS', backfill: false }),
		enabled: isOpen && step === 'documentos',
	});

	// Mapear documentos para formato com classificação + relatedDocIds (para seleção em cascata)
	const documentosComBucket = React.useMemo(() => {
		const docs = documentosDisponiveis as Doc[];
		if (!Array.isArray(docs)) return [];
		const chaveToId = new Map<string, string>();
		docs.forEach((d) => {
			const nfeKey = d.js_nfe?.ds_chave;
			const cteKey = d.js_cte?.ds_chave;
			if (nfeKey) chaveToId.set(String(nfeKey), String(d.id));
			if (cteKey) chaveToId.set(String(cteKey), String(d.id));
		});
		const resolveId = (val: string | number | undefined | null) => {
			if (val == null) return undefined;
			const s = String(val);
			return chaveToId.get(s) ?? s;
		};
		type RelRow = {
			id_documento_origem?: string;
			id_documento_referenciado?: string;
			fis_documento_origem?: { id?: string };
			fis_documento_referenciado?: { id?: string };
		};
		return docs.map((doc): SelectableDocWithBucket => {
			const isNFe = doc.ds_tipo === 'NFE';
			const isCTe = doc.ds_tipo === 'CTE';
			const nfeData = doc.js_nfe;
			const cteData = doc.js_cte;
			const relatedDocIds: string[] = [];
			if (doc.fis_documento_relacionado && Array.isArray(doc.fis_documento_relacionado)) {
				(doc.fis_documento_relacionado as RelRow[]).forEach((rel) => {
					if (rel.fis_documento_origem?.id)
						relatedDocIds.push(resolveId(rel.fis_documento_origem.id) ?? (rel.fis_documento_origem.id as string));
					if (rel.id_documento_referenciado)
						relatedDocIds.push(resolveId(rel.id_documento_referenciado) ?? rel.id_documento_referenciado);
				});
			}
			if (doc.fis_documento_origem && Array.isArray(doc.fis_documento_origem)) {
				(doc.fis_documento_origem as RelRow[]).forEach((orig) => {
					if (orig.fis_documento_referenciado?.id)
						relatedDocIds.push(resolveId(orig.fis_documento_referenciado.id) ?? (orig.fis_documento_referenciado.id as string));
					if (orig.id_documento_origem) relatedDocIds.push(resolveId(orig.id_documento_origem) ?? orig.id_documento_origem);
				});
			}
			if (nfeData && Array.isArray(nfeData.js_nfes_referenciadas)) {
				nfeData.js_nfes_referenciadas.forEach((ch: string) => {
					const id = resolveId(ch);
					if (id) relatedDocIds.push(id);
				});
			}
			if (cteData && Array.isArray(cteData.js_documentos_anteriores)) {
				cteData.js_documentos_anteriores.forEach((ch: string) => {
					const id = resolveId(ch);
					if (id) relatedDocIds.push(id);
				});
			}
			if (cteData && Array.isArray(cteData.js_chaves_nfe)) {
				cteData.js_chaves_nfe.forEach((ch: string) => {
					const id = resolveId(ch);
					if (id) relatedDocIds.push(id);
				});
			}
			// Backend é a fonte da verdade: usa docBucket quando retornado pela API
			const docBucket =
				(doc as { docBucket?: 'CTE_PROPRIO' | 'DFE_RELACIONADO' }).docBucket ??
				classificarDocBucket(doc, empresaId || '');
			const docBadge = docBadgeFromBucket(docBucket, doc.ds_tipo);
			return {
				id: doc.id,
				ds_numero: isNFe ? nfeData?.ds_numero || 'S/N' : isCTe ? cteData?.ds_numero || 'S/N' : 'S/N',
				ds_tipo: (isNFe ? 'NFE' : 'CTE') as 'NFE' | 'CTE',
				ds_controle: doc.ds_controle,
				ds_chave: isNFe ? nfeData?.ds_chave || '' : isCTe ? cteData?.ds_chave || '' : '',
				valor: isNFe ? parseFloat(nfeData?.vl_nf || '0') / 100 : isCTe ? parseFloat(cteData?.vl_total || '0') / 100 : 0,
				vl_peso_bruto: 0,
				ds_destinatario: isNFe
					? nfeData?.ds_razao_social_destinatario || 'Destinatário não informado'
					: isCTe
						? cteData?.ds_razao_social_destinatario || 'Destinatário não informado'
						: 'Não informado',
				ds_cidade_destino: isNFe
					? 'Cidade não informada'
					: isCTe
						? cteData?.ds_nome_mun_fim || 'Cidade não informada'
						: 'Não informada',
				ds_endereco_destino: isCTe ? (cteData?.ds_endereco_destino ?? '') : '',
				ds_complemento_destino: isCTe ? (cteData?.ds_complemento_destino ?? '') : '',
				dt_emissao: doc.dt_emissao || '',
				docBucket,
				docBadge,
				relatedDocIds: Array.from(new Set(relatedDocIds.filter(Boolean))),
			};
		});
	}, [documentosDisponiveis, empresaId]);

	// Seleção em cascata: ao selecionar um CT-e (ou qualquer doc), seleciona também os DFe da cadeia; ao desmarcar, desmarca a cadeia
	const getAllRelatedDocIds = React.useCallback(
		(docId: string, visited = new Set<string>()): Set<string> => {
			if (visited.has(docId)) return visited;
			visited.add(docId);
			const doc = documentosComBucket.find((d) => d.id === docId);
			if (!doc?.relatedDocIds?.length) return visited;
			doc.relatedDocIds.forEach((id) => {
				if (!visited.has(id)) getAllRelatedDocIds(id, visited);
			});
			return visited;
		},
		[documentosComBucket],
	);
	const toggleDocSelectionWithCascade = React.useCallback(
		(docId: string) => {
			setSelectedDocIds((prev) => {
				const newSet = new Set(prev);
				const allRelated = getAllRelatedDocIds(docId);
				if (newSet.has(docId)) {
					allRelated.forEach((id) => newSet.delete(id));
				} else {
					allRelated.forEach((id) => newSet.add(id));
				}
				return Array.from(newSet);
			});
		},
		[getAllRelatedDocIds],
	);

	// Transformar os dados da API para o formato esperado
	const segments = React.useMemo(() => {
		if (!segmentosData) return [];
		return segmentosData
			.filter((seg: SegmentoData) => seg.is_ativo)
			.map((seg: SegmentoData) => ({
				id: seg.id,
				name: seg.ds_nome,
				description: seg.cd_identificador,
			}));
	}, [segmentosData]);

	const [form, setForm] = useState({
		// Básico (cliente = fis_clientes)
		clientName: '',
		clienteDocumento: '',
		id_fis_cliente: '',
		originCity: '',
		destinationCity: '',
		vehicleTypeReq: 'Graneleiro',
		segment: '',
		observations: '',
		embarcadorNome: '',
		embarcadorDocumento: '',
		id_embarcador: '',

		// Físico
		weight: '',
		volume: '',
		packages: '',
		maxStacking: '',

		// SLA / Tempo
		collectionDate: '',
		collectionTime: '', // hora opcional (HH:mm); default visual 18:00
		collectionWindowStart: '',
		collectionWindowEnd: '',
		deliveryDeadline: '',
		priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',

		// Financeiro
		merchandiseValue: '',
		insuranceRequired: false,
		produtoPredominante: '',

		// Container (somente quando carroceria = Porta-Container)
		id_armador: '',
		nr_container: '',
		nr_lacre_container: '',
		ds_destino_pais: '',
		ds_setor_container: '',
		// Carroceria planejada (veículo/carreta escolhida para a carga)
		id_carroceria_planejada: '',
	});

	const carroceriasCompatíveis = React.useMemo(() => {
		const list = (veiculosData ?? []) as Array<{
			id: string;
			ds_placa: string;
			ds_nome: string;
			ds_tipo_unidade?: 'CARROCERIA' |  null;
			ds_tipo_carroceria_carga?: string | null;
		}>;
		const onlyCarrocerias = list.filter((v) => v.ds_tipo_unidade === 'CARROCERIA');
		const tipoRequerido = VEHICLE_TYPE_TO_API[form.vehicleTypeReq];
		if (!tipoRequerido) return onlyCarrocerias;
		return onlyCarrocerias.filter((v) => !v.ds_tipo_carroceria_carga || v.ds_tipo_carroceria_carga.toUpperCase() === tipoRequerido);
	}, [veiculosData, form.vehicleTypeReq]);

	React.useEffect(() => {
		if (editingLoad) setStep('revisao');
		else if (isOpen) {
			setStep('documentos');
			setParserResult(null);
			setSelectedDocIds([]);
			setDocFilterText('');
		}
	}, [editingLoad, isOpen]);

	React.useEffect(() => {
		if (editingLoad) {
			// Mapear tipo de veículo de volta para o formato do form
			const vehicleTypeReverseMap: Record<string, string> = {
				GRANELEIRO: 'Graneleiro',
				BAU: 'Baú',
				SIDER: 'Sider',
				FRIGORIFICO: 'Frigorífico',
				TANQUE: 'Tanque',
				PORTA_CONTAINER: 'Porta-Container',
			};

			// Mapear prioridade de volta para o formato do form
			const priorityReverseMap: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
				BAIXA: 'low',
				NORMAL: 'normal',
				ALTA: 'high',
				URGENTE: 'urgent',
			};

			// Montar origem e destino no formato "Cidade - UF"
			const originCity = editingLoad.sis_cidade_origem
				? `${editingLoad.sis_cidade_origem.ds_city} - ${editingLoad.sis_cidade_origem.js_uf?.ds_uf || ''}`
				: '';
			const destinationCity = editingLoad.sis_cidade_destino
				? `${editingLoad.sis_cidade_destino.ds_city} - ${editingLoad.sis_cidade_destino.js_uf?.ds_uf || ''}`
				: '';

			const dtColeta = editingLoad.dt_coleta || editingLoad.dt_coleta_inicio;
			const coletaDate = dtColeta ? new Date(dtColeta).toISOString().split('T')[0] : '';
			const coletaTime = dtColeta ? new Date(dtColeta).toISOString().slice(11, 16) : '';
			const deadline = editingLoad.dt_limite_entrega;
			const fisCliente = (
				editingLoad as { fis_clientes?: { ds_nome: string; ds_documento?: string | null }; id_fis_cliente?: string | null }
			)?.fis_clientes;
			const tmsCliente = editingLoad.tms_clientes;
			setForm({
				clientName: fisCliente?.ds_nome || tmsCliente?.ds_nome || (editingLoad as { ds_nome?: string }).ds_nome || '',
				clienteDocumento: fisCliente?.ds_documento ?? '',
				id_fis_cliente: (editingLoad as { id_fis_cliente?: string | null })?.id_fis_cliente ?? '',
				originCity,
				destinationCity,
				vehicleTypeReq: editingLoad.ds_tipo_carroceria ? vehicleTypeReverseMap[editingLoad.ds_tipo_carroceria] || 'Graneleiro' : 'Graneleiro',
				segment: editingLoad.tms_segmentos?.ds_nome || '',
				observations: editingLoad.ds_observacoes || '',
				embarcadorNome: (editingLoad as { tms_embarcadores?: { ds_nome: string } })?.tms_embarcadores?.ds_nome ?? '',
				embarcadorDocumento:
					(editingLoad as { tms_embarcadores?: { ds_documento?: string | null } })?.tms_embarcadores?.ds_documento ?? '',
				id_embarcador: (editingLoad as { id_embarcador?: string | null })?.id_embarcador ?? '',
				weight: editingLoad.vl_peso_bruto?.toString() || '',
				volume: editingLoad.vl_cubagem?.toString() || '',
				packages: editingLoad.vl_qtd_volumes?.toString() || '',
				maxStacking: editingLoad.vl_limite_empilhamento?.toString() || '',
				collectionDate: coletaDate,
				collectionTime: coletaTime,
				collectionWindowStart: editingLoad.dt_coleta_inicio ? new Date(editingLoad.dt_coleta_inicio).toISOString().slice(0, 16) : '',
				collectionWindowEnd: editingLoad.dt_coleta_fim ? new Date(editingLoad.dt_coleta_fim).toISOString().slice(0, 16) : '',
				deliveryDeadline: deadline ? new Date(deadline).toISOString().slice(0, 16) : '',
				priority: editingLoad.ds_prioridade ? priorityReverseMap[editingLoad.ds_prioridade] || 'normal' : 'normal',
				merchandiseValue: '',
				insuranceRequired: editingLoad.fl_requer_seguro || false,
				produtoPredominante:
					(editingLoad as { ds_produto_predominante?: string | null })?.ds_produto_predominante?.trim() ||
					(editingLoad as { js_entregas?: { js_produtos?: string[] }[] })?.js_entregas?.[0]?.js_produtos?.[0] ||
					'',
				id_armador: editingLoad.tms_cargas_container?.id_armador ?? '',
				nr_container: editingLoad.tms_cargas_container?.nr_container ?? '',
				nr_lacre_container: editingLoad.tms_cargas_container?.nr_lacre_container ?? '',
				ds_destino_pais: editingLoad.tms_cargas_container?.ds_destino_pais ?? '',
				ds_setor_container: editingLoad.tms_cargas_container?.ds_setor_container ?? '',
				id_carroceria_planejada: editingLoad.id_carroceria_planejada ?? editingLoad.tms_carroceria_planejada?.id ?? '',
			});
			setDefineJanelaColeta(!!(editingLoad.dt_coleta_inicio || editingLoad.dt_coleta_fim));
		} else {
			setForm({
				clientName: '',
				clienteDocumento: '',
				id_fis_cliente: '',
				originCity: '',
				destinationCity: '',
				vehicleTypeReq: 'Graneleiro',
				segment: '',
				observations: '',
				embarcadorNome: '',
				embarcadorDocumento: '',
				id_embarcador: '',
				weight: '',
				volume: '',
				packages: '',
				maxStacking: '',
				collectionDate: '',
				collectionTime: '',
				collectionWindowStart: '',
				collectionWindowEnd: '',
				deliveryDeadline: '',
				priority: 'normal',
				merchandiseValue: '',
				insuranceRequired: false,
				produtoPredominante: '',
				id_armador: '',
				nr_container: '',
				nr_lacre_container: '',
				ds_destino_pais: '',
				ds_setor_container: '',
				id_carroceria_planejada: '',
			});
			setDefineJanelaColeta(false);
		}
	}, [editingLoad, isOpen]);

	const handleUsarDocumentos = async () => {
		if (selectedDocIds.length === 0) {
			alert('Selecione ao menos um documento.');
			return;
		}
		setParserLoading(true);
		try {
			const result = await parseDocumentosParaCarga(selectedDocIds);
			setParserResult({ dados: result.dados, warnings: result.warnings });

			const d = result.dados;
			const cities = cidadesData?.cities ?? [];
			const fmtCity = (c: { ds_city: string; js_uf: { ds_uf: string } }) => `${c.ds_city} - ${c.js_uf.ds_uf}`;
			const origemStr =
				d.origem?.id_cidade != null && cities.length
					? (() => {
							const c = cities.find((ci: { id: number }) => Number(ci.id) === Number(d.origem!.id_cidade));
							return c ? fmtCity(c) : d.origem?.ds_nome_mun && d.origem?.ds_uf ? `${d.origem.ds_nome_mun} - ${d.origem.ds_uf}` : '';
						})()
					: d.origem?.ds_nome_mun && d.origem?.ds_uf
						? `${d.origem.ds_nome_mun} - ${d.origem.ds_uf}`
						: '';
			const destinoStr =
				d.destino?.id_cidade != null && cities.length
					? (() => {
							const c = cities.find((ci: { id: number }) => Number(ci.id) === Number(d.destino!.id_cidade));
							return c
								? fmtCity(c)
								: d.destino?.ds_nome_mun && d.destino?.ds_uf
									? `${d.destino.ds_nome_mun} - ${d.destino.ds_uf}`
									: '';
						})()
					: d.destino?.ds_nome_mun && d.destino?.ds_uf
						? `${d.destino.ds_nome_mun} - ${d.destino.ds_uf}`
						: '';
			const clienteNome = d.cliente?.ds_nome ?? '';
			setForm((prev) => ({
				...prev,
				clientName: clienteNome,
				clienteDocumento: d.cliente?.ds_documento ?? prev.clienteDocumento,
				id_fis_cliente: '', // parser preenche nome/doc; id_fis_cliente só quando usuário escolher do cadastro
				originCity: origemStr,
				destinationCity: destinoStr,
				weight: d.caracteristicas?.vl_peso_bruto?.toString() ?? prev.weight,
				volume: d.caracteristicas?.vl_cubagem?.toString() ?? prev.volume,
				packages: d.caracteristicas?.vl_qtd_volumes?.toString() ?? prev.packages,
				merchandiseValue: d.caracteristicas?.vl_mercadoria?.toString() ?? prev.merchandiseValue,
				embarcadorNome: d.embarcador?.ds_nome ?? prev.embarcadorNome,
				embarcadorDocumento: d.embarcador?.ds_documento ?? prev.embarcadorDocumento,
				id_embarcador: '', // parser preenche nome/doc; id só se usuário escolher do cadastro depois
				produtoPredominante:
					(d.caracteristicas as { ds_produto_predominante?: string } | undefined)?.ds_produto_predominante ?? prev.produtoPredominante,
			}));
			setStep('revisao');
			const soCte = d.documentos?.length > 0 && d.documentos.every((doc: { tipo: string }) => doc.tipo === 'CTE');
			if (soCte) setActiveTab('config');
		} catch (err: unknown) {
			console.error(err);
			alert(err instanceof Error ? err.message : 'Erro ao processar documentos.');
		} finally {
			setParserLoading(false);
		}
	};

	const handlePreencherManual = () => {
		setParserResult(null);
		setStep('revisao');
		setActiveTab('config');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const comEntregas = !!parserResult?.dados?.entregas?.length;
		if (!comEntregas && !form.clientName) {
			alert('Preencha o cliente (obrigatório quando não há documentos/entregas).');
			return;
		}

		setIsSubmitting(true);

		try {
			// Encontrar IDs das cidades: origem e destino opcionais; quando preenchidos, validar
			const cities = cidadesData?.cities ?? [];
			let originCityObj: { id: number } | undefined = form.originCity
				? cities.find((c: { ds_city: string; js_uf: { ds_uf: string } }) => `${c.ds_city} - ${c.js_uf.ds_uf}` === form.originCity)
				: undefined;
			if (form.originCity && !originCityObj && parserResult?.dados?.origem?.id_cidade != null) {
				originCityObj = cities.find((c: { id: number }) => Number(c.id) === Number(parserResult!.dados!.origem!.id_cidade));
			}
			let destCityObj: { id: number } | undefined = form.destinationCity
				? cities.find((c: { ds_city: string; js_uf: { ds_uf: string } }) => `${c.ds_city} - ${c.js_uf.ds_uf}` === form.destinationCity)
				: undefined;
			if (form.destinationCity && !destCityObj && parserResult?.dados?.destino?.id_cidade != null) {
				destCityObj = cities.find((c: { id: number }) => Number(c.id) === Number(parserResult!.dados!.destino!.id_cidade));
			}
			const clientObj = (clientOptions as Array<{ id: string; name: string }>)?.find((c) => c.name === form.clientName);
			const idFisCliente = form.id_fis_cliente?.trim() || (clientObj?.id && clientObj.id !== '__parser__' ? clientObj.id : undefined);
			const segmentObj = segmentosData?.find((s: { id: string; ds_nome: string }) => s.ds_nome === form.segment);

			// Só alertar quando o usuário preencheu origem mas o valor não corresponde a nenhuma cidade
			if (form.originCity?.trim() && !originCityObj) {
				alert('Cidade de origem inválida.');
				setIsSubmitting(false);
				return;
			}
			if (form.destinationCity?.trim() && !destCityObj) {
				alert('Cidade de destino inválida.');
				setIsSubmitting(false);
				return;
			}

			// Mapear prioridade para o padrão da API
			const priorityMap: Record<string, PrioridadeCarga> = {
				low: 'BAIXA',
				normal: 'NORMAL',
				high: 'ALTA',
				urgent: 'URGENTE',
			};

			// Mapear tipo de carroceria para o padrão da API
			const vehicleTypeMap: Record<string, TipoCarroceria> = {
				Graneleiro: 'GRANELEIRO',
				Baú: 'BAU',
				Sider: 'SIDER',
				Frigorífico: 'FRIGORIFICO',
				Tanque: 'TANQUE',
				'Porta-Container': 'PORTA_CONTAINER',
			};

			// Montar payload para API: Data de Coleta quando informada; Janela de Coleta só quando início e fim informados (undefined para limpar se não preenchido)
			const ct = form.collectionTime?.trim() || '00:00';
			const coletaTimeIso = ct.length === 5 ? ct + ':00' : ct;
			const isPortaContainer = (vehicleTypeMap[form.vehicleTypeReq] || 'GRANELEIRO') === 'PORTA_CONTAINER';
			const payload: CargaPayload = {
				// Criação: não enviar cd_carga para o backend gerar sequência (CARGA-1, CARGA-2, ...). Edição: manter cd_carga atual.
				cd_carga: editingLoad ? (editingLoad as Carga).cd_carga : undefined,
				ds_nome: form.clientName,
				dt_coleta: form.collectionDate?.trim() ? new Date(form.collectionDate + 'T' + coletaTimeIso).toISOString() : undefined,
				dt_coleta_inicio: form.collectionWindowStart?.trim() ? form.collectionWindowStart : undefined,
				dt_coleta_fim: form.collectionWindowEnd?.trim() ? form.collectionWindowEnd : undefined,
				dt_limite_entrega: form.deliveryDeadline,
				ds_observacoes: form.observations,
				ds_tipo_carroceria: vehicleTypeMap[form.vehicleTypeReq] || 'GRANELEIRO',
				ds_prioridade: priorityMap[form.priority] || 'NORMAL',
				vl_peso_bruto: form.weight ? parseFloat(form.weight) : undefined,
				vl_cubagem: form.volume ? parseFloat(form.volume) : undefined,
				vl_qtd_volumes: form.packages ? parseInt(form.packages) : undefined,
				vl_limite_empilhamento: form.maxStacking ? parseInt(form.maxStacking) : undefined,
				fl_requer_seguro: form.insuranceRequired,
				id_cidade_origem: originCityObj?.id,
				id_cidade_destino: destCityObj?.id,
				id_fis_cliente: idFisCliente,
				id_segmento: segmentObj?.id,
				id_embarcador: form.id_embarcador?.trim() || undefined,
				id_carroceria_planejada: form.id_carroceria_planejada?.trim() || undefined,
				ds_produto_predominante: form.produtoPredominante?.trim() || undefined,
				...(isPortaContainer && {
					container: {
						id_armador: form.id_armador?.trim() || undefined,
						nr_container: form.nr_container?.trim() || undefined,
						nr_lacre_container: form.nr_lacre_container?.trim() || undefined,
						ds_destino_pais: form.ds_destino_pais?.trim() || undefined,
						ds_setor_container: form.ds_setor_container?.trim() || undefined,
					},
				}),
			};

			// Chamar API
			let created: Carga | null = null;
			if (editingLoad?.id) {
				created = (await updateCarga(editingLoad.id, payload)) as Carga;
			} else if (parserResult?.dados?.entregas?.length) {
				// Criação com entregas (documentos) exige origem para o payload da API
				if (originCityObj == null) {
					alert('Para criar carga a partir de documentos, preencha a origem.');
					setIsSubmitting(false);
					return;
				}
				const clienteFromForm = form.clientName?.trim()
					? { ds_nome: form.clientName.trim(), ds_documento: form.clienteDocumento?.trim() || undefined }
					: undefined;
				const embarcadorFromForm =
					!form.id_embarcador?.trim() && form.embarcadorNome?.trim()
						? { ds_nome: form.embarcadorNome.trim(), ds_documento: form.embarcadorDocumento?.trim() || undefined }
						: undefined;
				const entregasPayload: CargaComEntregasPayload = {
					cd_carga: payload.cd_carga ?? undefined,
					ds_status: payload.ds_status,
					dt_coleta: payload.dt_coleta,
					dt_coleta_inicio: payload.dt_coleta_inicio,
					dt_coleta_fim: payload.dt_coleta_fim,
					ds_observacoes: payload.ds_observacoes,
					ds_tipo_carroceria: payload.ds_tipo_carroceria,
					ds_prioridade: payload.ds_prioridade,
					vl_peso_bruto: payload.vl_peso_bruto,
					vl_cubagem: payload.vl_cubagem,
					vl_qtd_volumes: payload.vl_qtd_volumes,
					fl_requer_seguro: form.insuranceRequired,
					id_cidade_origem: originCityObj.id,
					id_cidade_destino: destCityObj?.id,
					id_fis_cliente: idFisCliente,
					id_embarcador: form.id_embarcador?.trim() || undefined,
					cliente: clienteFromForm ?? parserResult.dados.cliente ?? undefined,
					embarcador: embarcadorFromForm ?? (form.id_embarcador ? undefined : (parserResult.dados.embarcador ?? undefined)),
					id_carroceria_planejada: form.id_carroceria_planejada?.trim() || undefined,
					...(isPortaContainer && {
						container: {
							id_armador: form.id_armador?.trim() || undefined,
							nr_container: form.nr_container?.trim() || undefined,
							nr_lacre_container: form.nr_lacre_container?.trim() || undefined,
							ds_destino_pais: form.ds_destino_pais?.trim() || undefined,
							ds_setor_container: form.ds_setor_container?.trim() || undefined,
						},
					}),
					entregas: (() => {
						const vlTotalMercadoria = form.merchandiseValue?.trim() ? parseFloat(form.merchandiseValue) : undefined;
						const entregasDto = parserResult.dados.entregas as CargaPreenchidaDTO['entregas'];
						// Backend já agrupa por cadeia de CT-e (1 entrega por grupo); apenas mapear e ajustar destino/valor quando necessário
						return entregasDto
							.map((ent) => ({
								id_cidade_destino: ent.id_cidade_destino ?? destCityObj?.id,
								ds_endereco: ent.ds_endereco,
								ds_complemento: ent.ds_complemento,
								ds_nome_recebedor: ent.ds_nome_recebedor,
								ds_documento_recebedor: ent.ds_documento_recebedor,
								ds_nome_destinatario: ent.ds_nome_destinatario,
								ds_documento_destinatario: ent.ds_documento_destinatario,
								vl_total_mercadoria: ent.vl_total_mercadoria ?? vlTotalMercadoria,
								js_produtos: ent.js_produtos,
								documentos: (ent.documentos ?? []).map((doc, idx) => ({ id: doc.id, tipo: doc.tipo, ordem: idx + 1 })),
							}))
							.filter((e) => e.id_cidade_destino != null) as CargaComEntregasPayload['entregas'];
					})(),
				};
				created = (await createCargaComEntregas(entregasPayload)) as Carga;
			} else {
				created = (await createCarga(payload)) as Carga;
			}

			if (created && onCreated) {
				onCreated(created);
			}

			// Invalidar cache de cargas e listas paginadas (para a tabela atualizar sem F5)
			await queryClient.invalidateQueries({ queryKey: ['get-cargas-all'] });
			await queryClient.invalidateQueries({ queryKey: ['get-viagens-all'] });
			await queryClient.invalidateQueries({ queryKey: ['get-cargas-paginado'] });
			await queryClient.invalidateQueries({ queryKey: ['get-viagens-paginado'] });

			// Chamar callback original para manter compatibilidade
			// onSaveLoad(
			// 	{
			// 		id: cargaId,
			// 		clientName: form.clientName,
			// 		originCity: form.originCity,
			// 		destinationCity: form.destinationCity,
			// 		vehicleTypeReq: form.vehicleTypeReq,
			// 		segment: form.segment || undefined,
			// 		collectionDate: form.collectionDate || new Date().toISOString(),
			// 		collectionWindowStart: form.collectionWindowStart || undefined,
			// 		collectionWindowEnd: form.collectionWindowEnd || undefined,
			// 		deliveryDeadline: form.deliveryDeadline || undefined,
			// 		priority: form.priority,
			// 		weight: form.weight ? parseFloat(form.weight) : undefined,
			// 		volume: form.volume ? parseFloat(form.volume) : undefined,
			// 		packages: form.packages ? parseInt(form.packages) : undefined,
			// 		maxStacking: form.maxStacking ? parseInt(form.maxStacking) : undefined,
			// 		merchandiseValue: form.merchandiseValue ? parseFloat(form.merchandiseValue) : undefined,
			// 		insuranceRequired: form.insuranceRequired,
			// 		requirements: form.requirements,
			// 		observations: form.observations,
			// 	},
			// 	null,
			// 	!!editingLoad,
			// );
			onClose();
			// Reset form
			setForm({
				clientName: '',
				clienteDocumento: '',
				id_fis_cliente: '',
				originCity: '',
				destinationCity: '',
				vehicleTypeReq: 'Graneleiro',
				segment: '',
				observations: '',
				embarcadorNome: '',
				embarcadorDocumento: '',
				id_embarcador: '',
				weight: '',
				volume: '',
				packages: '',
				maxStacking: '',
				collectionDate: '',
				collectionTime: '',
				collectionWindowStart: '',
				collectionWindowEnd: '',
				deliveryDeadline: '',
				priority: 'normal',
				merchandiseValue: '',
				insuranceRequired: false,
				produtoPredominante: '',
				id_armador: '',
				nr_container: '',
				nr_lacre_container: '',
				ds_destino_pais: '',
				ds_setor_container: '',
				id_carroceria_planejada: '',
			});
			setDefineJanelaColeta(false);
			setActiveTab('config');
		} catch (error) {
			console.error('Erro ao salvar carga:', error);
			const msg = error instanceof Error ? error.message : 'Erro ao salvar carga. Tente novamente.';
			alert(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	// Ordem: Configurações | Prazos | Dados Básicos | Características (em todos os casos)
	const tabs: {
		id: TabId;
		label: string;
		icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>;
	}[] = [
		{ id: 'config', label: 'Configurações', icon: SlidersHorizontal },
		{ id: 'sla', label: 'Prazos', icon: Clock },
		{ id: 'basic', label: 'Dados Básicos', icon: Package },
		{ id: 'physical', label: 'Características', icon: Weight },
	];

	const vehicleTypes = [
		{ id: 'Graneleiro', label: 'Graneleiro', icon: Truck },
		{ id: 'Baú', label: 'Baú', icon: Truck },
		{ id: 'Sider', label: 'Sider', icon: Truck },
		{ id: 'Frigorífico', label: 'Frigorífico', icon: Truck },
		{ id: 'Tanque', label: 'Tanque', icon: Truck },
		{ id: 'Porta-Container', label: 'Porta-Container', icon: Truck },
	];

	return (
		<div className='fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4'>
			<div className='animate-in zoom-in-95 bg-card flex max-h-[75vh] w-full max-w-3xl flex-col overflow-visible rounded-2xl shadow-2xl duration-200'>
				{/* Header */}
				<div className='border-border/70 bg-muted/40 flex items-center justify-between border-b p-6'>
					<div>
						<h3 className='text-foreground text-xl font-black tracking-tight uppercase'>
							{editingLoad ? 'Editar Carga' : 'Nova Carga'}
						</h3>
						<p className='text-muted-foreground text-xs'>
							{editingLoad ? 'Atualizar dados da carga selecionada' : 'Cadastrar carga com dados completos para Torre de Controle'}
						</p>
					</div>
					<button
						onClick={onClose}
						className='text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-2 transition-colors'
					>
						<X size={20} />
					</button>
				</div>

				{step === 'revisao' && (
					<>
						{/* Tabs */}
						<div className='border-border bg-card border-b px-6'>
							<div className='flex justify-around gap-1'>
								{tabs.map((tab) => (
									<button
										key={tab.id}
										type='button'
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center gap-2 border-b-2 px-4 py-3 text-[10px] font-black tracking-widest uppercase transition-all ${
											activeTab === tab.id
												? 'text-foreground border-black'
												: 'text-muted-foreground hover:text-foreground border-transparent'
										} `}
									>
										<tab.icon size={14} />
										{tab.label}
									</button>
								))}
							</div>
						</div>
					</>
				)}

				{step === 'documentos' && !editingLoad && (
					<div className='custom-scrollbar bg-background flex-1 overflow-y-auto p-6'>
						<p className='text-muted-foreground mb-4 text-xs'>
							Selecione os documentos (CT-e / NF-e) para pré-preencher a carga. Ou preencha manualmente.
						</p>
						<div className='mb-4'>
							<DocumentSelectTwoColumns
								documents={documentosComBucket}
								selectedIds={new Set(selectedDocIds)}
								filterText={docFilterText}
								onFilterChange={setDocFilterText}
								onToggle={toggleDocSelectionWithCascade}
								variant='compact'
							/>
						</div>
						<div className='flex flex-wrap gap-3'>
							<Button
								type='button'
								variant='secondary'
								onClick={handleUsarDocumentos}
								disabled={parserLoading || selectedDocIds.length === 0}
								className='border-border bg-muted/60 text-foreground hover:bg-muted flex items-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-black tracking-widest uppercase shadow-sm disabled:opacity-50'
							>
								{parserLoading ? 'Processando...' : 'Usar estes documentos e preencher carga'}
							</Button>
							<Button
								type='button'
								variant='secondary'
								onClick={handlePreencherManual}
								className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-5 py-2.5 text-xs font-black tracking-widest uppercase shadow-sm'
							>
								Preencher manualmente
							</Button>
						</div>
					</div>
				)}

				{step === 'revisao' && (
					<form onSubmit={handleSubmit} className='custom-scrollbar bg-card flex-1 overflow-y-auto p-6'>
						{parserResult?.warnings?.length ? (
							<div className='mb-4 rounded-xl border border-amber-500/40 bg-amber-500/15 p-3 text-xs text-amber-800 dark:border-amber-500/50 dark:bg-amber-900/40 dark:text-amber-200'>
								{parserResult.warnings.map((w, i) => (
									<div key={i}>{w.mensagem}</div>
								))}
							</div>
						) : null}
						{/* TAB: Dados Básicos */}
						{activeTab === 'basic' && (
							<div className='space-y-5'>
								<p className='text-muted-foreground text-[10px]'>
									Cliente = tomador do CT-e. Embarcador = expedidor do CT-e. Se vier do XML, preenchidos automaticamente; caso
									contrário, opcional informar.
								</p>
								{/* Cliente/Tomador e Embarcador/Expedidor */}
								<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
									<div className='space-y-1.5'>
										<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
											Cliente (tomador)
										</label>
										<div className='space-y-2'>
											<select
												className='border-border focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
												value={form.clientName}
												onChange={(e) => {
													const opt = (clientOptions as Array<{ id: string; name: string; document: string }>).find(
														(o) => o.name === e.target.value,
													);
													if (opt) {
														setForm({
															...form,
															clientName: opt.name,
															clienteDocumento: opt.document ?? '',
															id_fis_cliente: opt.id === '__parser__' ? '' : opt.id,
														});
													}
												}}
											>
												<option value=''>Selecione...</option>
												{(clientOptions ?? []).map((c: { id: string; name: string; document?: string }) => (
													<option key={c.id} value={c.name}>
														{c.name}
													</option>
												))}
											</select>
											<input
												type='text'
												placeholder='Documento (CPF/CNPJ)'
												className='border-border focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
												value={form.clienteDocumento}
												onChange={(e) => setForm({ ...form, clienteDocumento: e.target.value })}
											/>
										</div>
									</div>
									<div className='space-y-1.5'>
										<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
											Embarcador (expedidor)
										</label>
										<div className='space-y-2'>
											<select
												className='border-border focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
												value={form.embarcadorNome}
												onChange={(e) => {
													const opt = (embarcadorOptions as Array<{ id: string; name: string; document: string }>).find(
														(o) => o.name === e.target.value,
													);
													if (opt) {
														setForm({
															...form,
															embarcadorNome: opt.name,
															embarcadorDocumento: opt.document ?? '',
															id_embarcador: opt.id === '__parser__' ? '' : opt.id,
														});
													}
												}}
											>
												<option value=''>Selecione...</option>
												{(embarcadorOptions ?? []).map((opt: { id: string; name: string; document: string }) => (
													<option key={opt.id} value={opt.name}>
														{opt.name}
													</option>
												))}
											</select>
											<input
												type='text'
												placeholder='Documento (CPF/CNPJ)'
												className='border-border focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
												value={form.embarcadorDocumento}
												onChange={(e) => setForm({ ...form, embarcadorDocumento: e.target.value })}
											/>
										</div>
									</div>
								</div>

								{/* Origem e Destino */}
								<div className='grid grid-cols-2 gap-4'>
									<CitySearch
										value={form.originCity}
										onChange={(city) => setForm({ ...form, originCity: city })}
										cities={cities ?? []}
										label='Origem'
										placeholder='Selecione a origem...'
										required
									/>
									<CitySearch
										value={form.destinationCity}
										onChange={(city) => setForm({ ...form, destinationCity: city })}
										cities={cities ?? []}
										label='Destino'
										placeholder='Selecione o destino...'
									/>
								</div>

								{/* Observações (opcional) */}
								<div className='space-y-1.5'>
									<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
										Observações <span className='text-muted-foreground/80 font-normal normal-case'>(opcional)</span>
									</label>
									<p className='text-muted-foreground text-[10px]'>
										Instruções para a operação, restrições de carga ou detalhes que a Torre de Controle precise saber.
									</p>
									<textarea
										className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 min-h-[100px] w-full resize-y rounded-xl border p-3.5 text-sm font-medium transition-all outline-none focus:ring-2'
										placeholder='Ex.: Horário de descarga, contato no destino, cuidados com a mercadoria...'
										value={form.observations}
										onChange={(e) => setForm({ ...form, observations: e.target.value })}
										rows={4}
									/>
								</div>

								{/* Operação de Container - somente quando carroceria = Porta-Container */}
								{form.vehicleTypeReq === 'Porta-Container' && (
									<div className='border-border/70 bg-muted/30 space-y-4 rounded-2xl border p-5'>
										<h4 className='text-muted-foreground flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase'>
											<Package size={12} /> Operação de Container
										</h4>
										<p className='text-muted-foreground text-[10px]'>Campos opcionais. Preencha agora ou mais tarde.</p>
										<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
											<div className='space-y-1.5'>
												<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
													Armador
												</label>
												<select
													className='border-border bg-input/50 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
													value={form.id_armador}
													onChange={(e) => setForm({ ...form, id_armador: e.target.value })}
												>
													<option value=''>Selecione...</option>
													{armadores.map((a: { id: string; ds_nome: string }) => (
														<option key={a.id} value={a.id}>
															{a.ds_nome}
														</option>
													))}
												</select>
											</div>
											<div className='space-y-1.5'>
												<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
													Nº Container
												</label>
												<input
													type='text'
													placeholder='Ex.: ABCD1234567'
													className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
													value={form.nr_container}
													onChange={(e) => setForm({ ...form, nr_container: e.target.value })}
												/>
											</div>
											<div className='space-y-1.5'>
												<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
													Nº Lacre Container
												</label>
												<input
													type='text'
													placeholder='Opcional'
													className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
													value={form.nr_lacre_container}
													onChange={(e) => setForm({ ...form, nr_lacre_container: e.target.value })}
												/>
											</div>
											<div className='space-y-1.5'>
												<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
													Destino (país)
												</label>
												<input
													type='text'
													placeholder='Ex.: Brasil, Argentina'
													className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
													value={form.ds_destino_pais}
													onChange={(e) => setForm({ ...form, ds_destino_pais: e.target.value })}
												/>
											</div>
											<div className='space-y-1.5 sm:col-span-2'>
												<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
													Setor Container
												</label>
												<input
													type='text'
													placeholder='A definir'
													className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
													value={form.ds_setor_container}
													onChange={(e) => setForm({ ...form, ds_setor_container: e.target.value })}
												/>
											</div>
										</div>
									</div>
								)}
							</div>
						)}

						{/* TAB: Configurações */}
						{activeTab === 'config' && (
							<div className='animate-in fade-in slide-in-from-bottom-2 space-y-8 duration-300'>
								{/* Info Alert */}
								<div className='flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4'>
									<div className='rounded-xl border border-blue-500/30 bg-blue-500/10 p-2 shadow-sm'>
										<Info size={18} className='text-blue-700 dark:text-blue-300' />
									</div>
									<div>
										<div className='text-xs font-black tracking-wide text-blue-900 uppercase dark:text-blue-100'>
											Parâmetros Operacionais
										</div>
										<p className='mt-0.5 text-[11px] leading-relaxed font-medium text-blue-700 dark:text-blue-300'>
											Defina o segmento e o tipo de veículo para que a Torre de Controle possa otimizar a alocação e garantir a
											compatibilidade.
										</p>
									</div>
								</div>

								{/* Segment Selection */}
								<div className='space-y-4'>
									<h4 className='text-muted-foreground flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase'>
										<Tag size={12} /> Segmento Gerencial
									</h4>
									<div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
										{(Array.isArray(segments) ? segments : []).map((seg) => {
											const isSelected = form.segment === seg.name;
											return (
												<button
													key={seg.id}
													type='button'
													onClick={() => setForm({ ...form, segment: seg.name })}
													className={`group relative flex flex-col gap-2 overflow-hidden rounded-2xl border-2 p-4 text-left transition-all ${
														isSelected
															? 'border-primary bg-primary text-primary-foreground -translate-y-1 shadow-xl'
															: 'border-border/70 bg-muted/40 text-muted-foreground hover:border-input hover:bg-card'
													} `}
												>
													<div
														className={`text-sm font-black tracking-tight uppercase ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}
													>
														{seg.name}
													</div>
													<div
														className={`text-[9px] leading-tight font-bold ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
													>
														{seg.description}
													</div>
													{isSelected && (
														<div className='absolute top-2 right-2'>
															<CheckCircle size={14} className='text-primary-foreground' />
														</div>
													)}
												</button>
											);
										})}
									</div>
								</div>

								{/* Vehicle Type Selection */}
								<div className='space-y-4'>
									<h4 className='text-muted-foreground flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase'>
										<Truck size={12} /> Tipo de Carroceria Necessário
									</h4>
									<div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
										{vehicleTypes.map((type) => {
											const isSelected = form.vehicleTypeReq === type.id;
											const Icon = type.icon;
											return (
												<button
													key={type.id}
													type='button'
													onClick={() => setForm({ ...form, vehicleTypeReq: type.id, id_carroceria_planejada: '' })}
													className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition-all ${
														isSelected
															? 'border-primary bg-primary text-primary-foreground -translate-y-1 shadow-xl'
															: 'border-border/70 bg-muted/40 text-muted-foreground hover:border-input hover:bg-card'
													} `}
												>
													<div
														className={`rounded-xl p-2 transition-all ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-card text-muted-foreground group-hover:text-foreground shadow-sm'}`}
													>
														<Icon size={20} />
													</div>
													<div className='text-[10px] font-black tracking-widest uppercase'>{type.label}</div>
													{isSelected && (
														<div className='absolute top-2 right-2'>
															<CheckCircle size={14} className='text-primary-foreground' />
														</div>
													)}
												</button>
											);
										})}
									</div>
								</div>

								{/* Carroceria planejada */}
								<div className='space-y-4'>
									<h4 className='text-muted-foreground flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase'>
										<Truck size={12} /> Carroceria planejada
									</h4>
									<p className='text-muted-foreground text-[11px]'>
										Opcional. Selecione a carreta planejada para esta carga (apenas veículos do mesmo tipo necessário são
										listados).
									</p>
									<select
										className='border-border bg-input/50 text-foreground focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
										value={form.id_carroceria_planejada}
										onChange={(e) => setForm({ ...form, id_carroceria_planejada: e.target.value })}
									>
										<option value=''>Nenhuma</option>
										{carroceriasCompatíveis.map((v) => (
											<option key={v.id} value={v.id}>
												{v.ds_placa}
											</option>
										))}
									</select>
								</div>
							</div>
						)}

						{/* TAB: Características Físicas */}
						{activeTab === 'physical' && (
							<div className='space-y-6'>
								<p className='text-muted-foreground text-[11px]'>
									Preencha as características físicas para validação automática de capacidade dos veículos. Todos os campos são
									opcionais.
								</p>

								<div className='space-y-4'>
									<h4 className='text-foreground text-[10px] font-black tracking-widest uppercase'>Dimensões e pesos</h4>
									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-1.5'>
											<label className='text-muted-foreground flex items-center gap-1 text-[10px] font-black tracking-widest uppercase'>
												<Weight size={10} /> Peso Bruto (kg)
											</label>
											<input
												type='number'
												placeholder='Ex: 12500'
												className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
												value={form.weight}
												onChange={(e) => setForm({ ...form, weight: e.target.value })}
											/>
										</div>
										<div className='space-y-1.5'>
											<label className='text-muted-foreground flex items-center gap-1 text-[10px] font-black tracking-widest uppercase'>
												<Box size={10} /> Cubagem (m³)
											</label>
											<input
												type='number'
												step='0.1'
												placeholder='Ex: 45.5'
												className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
												value={form.volume}
												onChange={(e) => setForm({ ...form, volume: e.target.value })}
											/>
										</div>
									</div>

									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-1.5'>
											<label className='text-muted-foreground flex items-center gap-1 text-[10px] font-black tracking-widest uppercase'>
												<Package size={10} /> Quantidade de Volumes
											</label>
											<input
												type='number'
												placeholder='Ex: 380'
												className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
												value={form.packages}
												onChange={(e) => setForm({ ...form, packages: e.target.value })}
											/>
										</div>
										<div className='space-y-1.5'>
											<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
												Empilhamento Máximo
											</label>
											<input
												type='number'
												placeholder='Ex: 3'
												className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
												value={form.maxStacking}
												onChange={(e) => setForm({ ...form, maxStacking: e.target.value })}
											/>
										</div>
									</div>
								</div>

								{/* Produto Predominante e Informações Financeiras */}
								<div className='border-border/70 space-y-4 border-t pt-5'>
									<div className='space-y-1.5'>
										<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
											Produto Predominante <span className='text-muted-foreground/80 font-normal normal-case'>(opcional)</span>
										</label>
										<input
											type='text'
											placeholder='Ex: Estrado de Madeira Tratado, PE SUINO TRASEIRO...'
											className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
											value={form.produtoPredominante}
											onChange={(e) => setForm({ ...form, produtoPredominante: e.target.value })}
										/>
									</div>

									<h4 className='text-muted-foreground flex items-center gap-1 pt-1 text-[10px] font-black tracking-widest uppercase'>
										<DollarSign size={10} /> Informações Financeiras
									</h4>
									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-1.5'>
											<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
												Valor da Mercadoria (R$)
											</label>
											<input
												type='number'
												step='0.01'
												placeholder='Ex: 185000.00'
												className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full rounded-xl border p-3 text-sm font-bold transition-all outline-none focus:ring-2'
												value={form.merchandiseValue}
												onChange={(e) => setForm({ ...form, merchandiseValue: e.target.value })}
											/>
										</div>
										<div className='flex items-end'>
											<label
												onClick={() => setForm({ ...form, insuranceRequired: !form.insuranceRequired })}
												className={`border-border bg-input/30 flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
													form.insuranceRequired
														? 'border-primary/50 bg-primary/10 text-foreground'
														: 'text-muted-foreground hover:bg-muted/50'
												}`}
											>
												<div
													className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${form.insuranceRequired ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card'}`}
												>
													{form.insuranceRequired && <Check size={12} strokeWidth={4} />}
												</div>
												<div className='flex items-center gap-2'>
													<Shield size={16} />
													<span className='text-xs font-bold uppercase'>Requer Seguro</span>
												</div>
											</label>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* TAB: SLA / Prazos — hierarquia: principais primeiro, opcionais depois */}
						{activeTab === 'sla' && (
							<div className='space-y-6'>
								<p className='text-muted-foreground text-[11px]'>
									Defina os prazos para que a Torre de Controle alerte automaticamente sobre cargas próximas do vencimento.
								</p>

								{/* Seção: Prazos principais */}
								<div className='space-y-4'>
									<h4 className='text-foreground text-[10px] font-black tracking-widest uppercase'>Prazos principais</h4>

									{/* Data e hora da coleta (obrigatório) */}
									<div className='space-y-1.5'>
										<label className='text-foreground text-[10px] font-black tracking-widest uppercase'>
											Data da coleta <span className='text-destructive'>(obrigatório)</span>
										</label>
										<p className='text-muted-foreground text-[10px]'>Selecione a data da coleta.</p>
										<div className='flex flex-wrap gap-3'>
											<div className='flex min-w-0 flex-1 basis-32'>
												<input
													type='date'
													className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full cursor-pointer rounded-xl border-2 py-3 pr-3 pl-3 text-sm font-bold transition-all outline-none focus:ring-2'
													value={form.collectionDate}
													onChange={(e) => setForm({ ...form, collectionDate: e.target.value })}
													title='Clique para escolher a data'
												/>
											</div>
											<div className='flex min-w-0 flex-1 basis-24'>
												<input
													type='time'
													className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full cursor-pointer rounded-xl border-2 py-3 pr-3 pl-3 text-sm font-bold transition-all outline-none focus:ring-2'
													value={form.collectionTime}
													onChange={(e) => setForm({ ...form, collectionTime: e.target.value })}
													title='Hora (opcional)'
												/>
											</div>
										</div>
										<p className='text-muted-foreground text-[9px]'>Hora (opcional). Se não informar, será usado 00:00.</p>
									</div>

									{/* Prazo limite de entrega (obrigatório) */}
									<div className='space-y-1.5'>
										<label className='text-foreground flex items-center gap-1 text-[10px] font-black tracking-widest uppercase'>
											<Clock size={10} /> Prazo de entrega <span className='text-destructive'>(obrigatório)</span>
										</label>
										<p className='text-muted-foreground text-[10px]'>Informe o prazo limite de entrega.</p>
										{(() => {
											const d = form.deliveryDeadline ? form.deliveryDeadline.slice(0, 10) : '';
											const t = form.deliveryDeadline ? form.deliveryDeadline.slice(11, 16) : '';
											return (
												<div className='flex flex-wrap gap-3'>
													<div className='flex min-w-0 flex-1 basis-32'>
														<input
															type='date'
															className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full cursor-pointer rounded-xl border-2 py-3 pr-3 pl-3 text-sm font-bold transition-all outline-none focus:ring-2'
															value={d}
															onChange={(e) =>
																setForm({
																	...form,
																	deliveryDeadline:
																		e.target.value && t
																			? e.target.value + 'T' + t
																			: e.target.value
																				? e.target.value + 'T18:00'
																				: '',
																})
															}
															title='Clique para escolher a data'
														/>
													</div>
													<div className='flex min-w-0 flex-1 basis-24'>
														<input
															type='time'
															className='border-border bg-input/50 text-foreground placeholder:text-muted-foreground/80 focus:border-ring focus:ring-ring/20 w-full cursor-pointer rounded-xl border-2 py-3 pr-3 pl-3 text-sm font-bold transition-all outline-none focus:ring-2'
															value={t}
															onChange={(e) =>
																setForm({
																	...form,
																	deliveryDeadline: d ? d + 'T' + (e.target.value || '18:00') : '',
																})
															}
															title='Hora (opcional)'
														/>
													</div>
												</div>
											);
										})()}
										<p className='text-muted-foreground text-[9px]'>
											A Torre de Controle alertará quando o prazo estiver próximo (&lt;48h, &lt;24h, &lt;12h).
										</p>
									</div>
								</div>

								{/* Seção: Opções de coleta (opcional) — progressive disclosure */}
								<div className='border-border/70 space-y-3 border-t pt-5'>
									<h4 className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>
										Opções de coleta (opcional)
									</h4>
									<label
										className='border-border/70 bg-muted/30 hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors'
										onClick={() => setDefineJanelaColeta(!defineJanelaColeta)}
									>
										<div
											className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${defineJanelaColeta ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card'}`}
										>
											{defineJanelaColeta && <Check size={12} strokeWidth={4} />}
										</div>
										<span className='text-muted-foreground text-xs font-bold uppercase'>Definir janela de coleta</span>
									</label>
									{defineJanelaColeta && (
										<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
											<div className='space-y-1.5'>
												<label className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>Início</label>
												<input
													type='datetime-local'
													className='border-border bg-input/30 text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:ring-ring/20 w-full cursor-pointer rounded-xl border py-2.5 pr-3 pl-3 text-sm font-medium transition-all outline-none focus:ring-2'
													value={form.collectionWindowStart}
													onChange={(e) => setForm({ ...form, collectionWindowStart: e.target.value })}
												/>
											</div>
											<div className='space-y-1.5'>
												<label className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase'>Fim</label>
												<input
													type='datetime-local'
													className='border-border bg-input/30 text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:ring-ring/20 w-full cursor-pointer rounded-xl border py-2.5 pr-3 pl-3 text-sm font-medium transition-all outline-none focus:ring-2'
													value={form.collectionWindowEnd}
													onChange={(e) => setForm({ ...form, collectionWindowEnd: e.target.value })}
												/>
											</div>
										</div>
									)}
								</div>

								{/* Prioridade — depois das datas, compacta */}
								<div className='border-border/70 space-y-2 border-t pt-5'>
									<label className='text-muted-foreground text-[10px] font-black tracking-widest uppercase'>Prioridade</label>
									<div className='flex flex-wrap gap-2'>
										{PRIORITY_OPTIONS.map((p) => (
											<button
												key={p.value}
												type='button'
												onClick={() => setForm({ ...form, priority: p.value })}
												className={`flex items-center justify-center gap-1 rounded-xl border-2 px-3 py-2 text-xs font-bold uppercase transition-all ${
													form.priority === p.value
														? `${p.color} ring-2 ring-gray-300 ring-offset-2`
														: 'border-border text-muted-foreground hover:bg-muted/50'
												} `}
											>
												{p.icon && <p.icon size={12} />}
												{p.label}
											</button>
										))}
									</div>
								</div>
							</div>
						)}

						{/* TAB: Requisitos */}
						{/* {activeTab === 'requirements' && (
						<div className='space-y-5'>
							<div className='rounded-xl border border-border/70 bg-muted/40 p-4 text-xs text-muted-foreground'>
								Selecione os requisitos especiais para esta carga. Isso ajuda na alocação correta de veículos e recursos.
							</div>

							<div className='grid grid-cols-2 gap-3'>
								{REQUIREMENTS_OPTIONS.map((req) => {
									const isSelected = form.requirements.includes(req);
									return (
										<div
											key={req}
											onClick={() => handleToggleRequirement(req)}
											className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs font-medium transition-all ${isSelected ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-300 shadow-sm' : 'border-border text-muted-foreground hover:bg-muted/50'} `}
										>
											<div
												className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-green-500 bg-green-500 text-white' : 'border-input bg-card'}`}
											>
												{isSelected && <Check size={12} strokeWidth={4} />}
											</div>
											{req}
										</div>
									);
								})}
							</div>
						</div>
					)} */}
					</form>
				)}

				{step === 'revisao' && (
					<div className='border-border/70 bg-muted/40 flex items-center justify-between border-t p-6'>
						{/* Navegação entre abas */}
						<div className='flex items-center gap-2'>
							{activeTab !== 'config' && (
								<Button
									type='button'
									variant='secondary'
									onClick={() => setActiveTab(tabs[tabs.findIndex((t) => t.id === activeTab) - 1].id)}
									className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-4 py-2 text-[10px] font-black tracking-widest uppercase shadow-sm'
								>
									← Anterior
								</Button>
							)}
							{activeTab !== 'physical' && (
								<Button
									type='button'
									variant='secondary'
									onClick={() => setActiveTab(tabs[tabs.findIndex((t) => t.id === activeTab) + 1].id)}
									className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-4 py-2 text-[10px] font-black tracking-widest uppercase shadow-sm'
								>
									Próximo →
								</Button>
							)}
						</div>

						<div className='flex gap-3'>
							<Button
								type='button'
								variant='secondary'
								onClick={onClose}
								disabled={isSubmitting}
								className='border-border bg-muted/60 text-foreground hover:bg-muted rounded-xl border px-5 py-2.5 text-xs font-black tracking-widest uppercase shadow-sm'
							>
								Cancelar
							</Button>
							<Button
								variant='secondary'
								onClick={handleSubmit}
								disabled={isSubmitting}
								className='border-border bg-muted/60 text-foreground hover:bg-muted flex items-center gap-2 rounded-xl border px-6 py-2.5 text-xs font-black tracking-widest uppercase shadow-sm disabled:opacity-50'
							>
								{editingLoad ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
								{isSubmitting ? 'Salvando...' : editingLoad ? 'Salvar Alterações' : 'Salvar Carga'}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
