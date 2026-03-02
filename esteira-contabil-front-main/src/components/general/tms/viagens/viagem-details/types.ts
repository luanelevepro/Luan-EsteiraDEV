// Shared types for Trip Details flow
import { Carga, Viagem, AvailableDocument } from '@/types/tms';

export type Document = {
	id: string;
	number: string;
	type: 'NF' | 'CTe';
	value: number;
	recipientName: string;
	destinationCity: string;
	destinationAddress: string;
	isSubcontracted: boolean;
	emissionDate: string;
	dfeKey?: string;
	linkedCteNumber?: string;
	relatedDfeKeys?: string[];
	relatedDocIds?: string[];
	entregaId?: string;
};

export interface FisDocumentoRelacionado {
	id_documento_referenciado?: string;
	fis_documento_origem?: { id?: string } | null;
	id_documento_origem?: string;
	fis_documento_referenciado?: { id?: string } | null;
}

/**
 * Tipo reduzido para contas do plano (analíticas) usadas nas despesas.
 * Campos baseados no JSON de exemplo fornecido pelo usuário.
 */
export interface PlanoContaAnalitica {
	id: string;
	dt_created?: string;
	dt_updated?: string;
	id_con_empresas?: string;
	ds_classificacao_cta?: string;
	ds_nome_cta?: string;
	ds_tipo_cta?: string;
	ds_nivel_cta?: number | string;
	ds_classificacao_pai?: string;
	id_externo?: string;
	id_conta_pai?: string | null;
	is_ativo?: boolean;
	id_empresa_externo?: string;
	ds_tipo_tms_despesa?: 'ABASTECIMENTO' | 'ADIANTAMENTO' | 'PEDAGIO' | 'DESPESA' | string | null;
	id_grupo_contas?: string | null;
	[key: string]: unknown;
}

export type DeliveryLike = {
	id: string;
	entregaId?: string;
	destinationCity: string;
	recipientName: string;
	status?: string;
	documents: Document[];
	isLegacy?: boolean;
};

// Despesa payload item (utilizado para criar despesas/adiantamentos)
export interface DespesaRecord {
	tipo: 'DESPESA' | 'ADIANTAMENTO';
	valor: string;
	data: string;
	nfeItemId?: string | number;
	nfseId?: string | number | null;
	observacao?: string | null;
	id_conta_despesa?: string | null;
	odometro?: number;
}

export type Leg = {
	id: string;
	type: 'LOAD' | 'EMPTY';
	sequence: number;
	direction?: string;
	originCity: string;
	originAddress?: string;
	destinationCity?: string;
	destinationAddress?: string;
	segment?: string;
	controlNumber?: string;
	cd_carga?: string;
	loadId?: string;
	deliveries: DeliveryLike[];
	cargaData?: Carga;
	fl_deslocamento_vazio: boolean;
};

export type NewLegPayload = {
	originCity: string;
	originAddress: string;
	hubName?: string;
	destinationCity?: string;
	type: 'LOAD' | 'EMPTY';
	vehicleTypeReq?: string;
};

export type NewLoadPayload = {
	originCity: string;
	originAddress: string;
	vehicleTypeReq: string;
	controlGroups: { controlNumber: string; docs: AvailableDocument[] }[];
};

export interface TripDetailsProps {
	trip: Viagem;
	loads?: Carga[]; // cargas agendadas (sem docs/controle) disponíveis para anexar à viagem
	availableDocs: AvailableDocument[];
	isInline?: boolean; // New prop for table expansion mode
	onBack: () => void;
	// TODO: Implementar sistema de legs/pernas na API (tms_viagens_legs)
	onAddLeg: (tripId: string, leg: NewLegPayload) => void;
	// TODO: Implementar sistema de entregas/deliveries na API (tms_entregas)
	onAddDelivery: (tripId: string, legId: string, selectedDocs: AvailableDocument[]) => void;
	// TODO: Implementar vinculação de documentos fiscais (CT-e/NF-e) na API
	onAddDocument: (tripId: string, legId: string, deliveryId: string, doc: Omit<Document, 'id'>) => void;
	onUpdateStatus: (tripId: string, status: Viagem['ds_status'], pod?: string) => void;
	// TODO: Implementar status de entrega individual na API
	onUpdateDeliveryStatus: (tripId: string, legId: string, deliveryId: string, status: Carga['status'], pod?: string) => void;
	// TODO: Implementar criação de carga com entregas vinculadas
	onAddLoadWithDeliveries?: (tripId: string, payload: NewLoadPayload) => void;
	// Anexar cargas agendadas à viagem (já implementado via js_viagens_cargas)
	onAttachLoadsToTrip?: (tripId: string, payload: { loads: Array<{ loadId: string; cargaId: string }>; vehicleTypeReq: string }) => void;
	// Reordenação de entregas (loadId = id da carga)
	onReorderDeliveries?: (tripId: string, loadId: string, newOrder: DeliveryLike[]) => void;
	onEmitFiscal?: (loadId: string) => void;
	onViewLoadDetails?: (load: Carga) => void;
	/** Aba inicial ao abrir o detalhe (Cargas, Despesas ou Adiantamentos). */
	initialViewMode?: 'CARGAS' | 'DESPESAS' | 'ADIANTAMENTOS';
}
