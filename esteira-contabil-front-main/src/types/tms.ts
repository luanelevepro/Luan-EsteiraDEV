// CT-e (Documento Fiscal) - Entidade separada vinculada à Carga
// Permite cancelamento sem perder a carga (cria novo CT-e apontando para mesma carga)
export interface CTe {
	id: string;
	loadId: string; // FK_CARGA: Este CT-e pertence à Carga X
	number: string;
	accessKey: string; // CHAVE_ACESSO (chave de acesso do CT-e na SEFAZ)
	freightValue: number; // VALOR_FRETE
	status: 'Authorized' | 'Cancelled' | 'Pending';
	emissionDate: string;
	authorizationDate?: string;
	cancellationDate?: string;
	cancellationReason?: string;
	isSubcontracted?: boolean; // 1 quando CT-e é subcontratado
	createdAt: string;
}

// Manifesto Eletrônico (Documento de Viagem)
export interface MDFe {
	id: string;
	tripId: string;
	number: string;
	accessKey: string;
	status: 'Authorized' | 'Cancelled' | 'Pending';
	emissionDate: string;
	authorizationDate?: string;
	createdAt: string;
}

// N:N relationship entre Viagem e Carga
export interface ViagemCarga {
	id_viagem: string;
	id_carga: string;
	nr_sequencia: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface Viagem {
	id: string;
	// Campos Prisma (novos)
	cd_viagem: string;
	ds_motorista: string;
	ds_placa_cavalo: string;
	ds_placa_carreta_1?: string | null;
	ds_placa_carreta_2?: string | null;
	ds_placa_carreta_3?: string | null;
	ds_status: 'PLANEJADA' | 'EM_COLETA' | 'EM_VIAGEM' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA';
	dt_agendada?: string;
	dt_previsao_retorno?: string;
	dt_conclusao?: string;
	ds_comprovante_entrega?: string;
	ds_comprovante_key?: string;
	dt_created: string;
	dt_updated: string;
	ds_custo_total: number;
	/** Relação motorista+veículo (tms_motoristas_veiculos); necessário para fechamento. */
	id_motorista_veiculo?: string | null;

	// Campos legados (para compatibilidade com componentes antigos)
	// Mapeados automaticamente para campos Prisma
	driverName?: string; // Mapeado de ds_motorista
	truckPlate?: string; // Mapeado de ds_placa_cavalo
	trailer1Plate?: string; // Mapeado de ds_placa_carreta_1
	trailer2Plate?: string; // Mapeado de ds_placa_carreta_2
	trailer3Plate?: string; // Mapeado de ds_placa_carreta_3
	status?: 'Planned' | 'Picking Up' | 'In Transit' | 'Completed' | 'Delayed'; // Mapeado de ds_status
	scheduledDate?: string; // Mapeado de dt_agendada
	estimatedReturnDate?: string; // Mapeado de dt_previsao_retorno
	createdAt?: string; // Mapeado de dt_created

	// Campos de contexto
	originCity?: string;
	mainDestination?: string;

	// Relações opcionais
	cargas?: Carga[];
	viagemCargas?: ViagemCarga[];
	js_viagens_cargas?: Array<{
		id: string;
		id_carga: string;
		nr_sequencia: number;
		dt_vinculacao: string;
		tms_cargas?: Carga;
	}>;
	mdfes?: MDFe[];
}

// ============= Esteira sequencial (GET /viagens/:id/fluxo) =============

export interface FluxoEntregaDTO {
	id: string;
	nr_sequencia: number;
	ds_status: string;
	canStart: boolean;
	canFinish: boolean;
	blockedReason: string | null;
}

export interface FluxoCargaDTO {
	id_carga: string;
	cd_carga: string | null;
	tipo: 'DESLOCAMENTO_VAZIO' | 'CARGA';
	status_item: string;
	ds_status_coleta: string | null;
	entregas: FluxoEntregaDTO[];
	canStartItem: boolean;
	canFinishItem: boolean;
	blockedReasonItem: string | null;
	canStartColeta: boolean;
	canFinishColeta: boolean;
	blockedReasonColeta: string | null;
}

export interface FluxoItemDTO {
	id: string;
	nr_sequencia: number;
	id_carga: string;
	tipo: 'DESLOCAMENTO_VAZIO' | 'CARGA';
	status_item: string;
	dt_iniciado_em: string | null;
	dt_finalizado_em: string | null;
	canStart: boolean;
	canFinish: boolean;
	blockedReason: string | null;
	carga?: FluxoCargaDTO;
}

export interface ViagemFluxoDTO {
	id_viagem: string;
	cd_viagem: string;
	ds_status: string;
	itens: FluxoItemDTO[];
}

/** Bucket de classificação para UI (CT-e próprio vs DF-e relacionado) */
export type DocBucket = 'CTE_PROPRIO' | 'DFE_RELACIONADO' | 'PENDENTE';

/** Status de vínculo documental para exibição */
export type VinculoStatus = 'Completo' | 'Pendente' | 'Inconsistente';

export interface AvailableDocument {
	id: string;
	ds_numero: string;
	ds_tipo: 'CTE' | 'NFE';
	ds_controle?: string; // New field for grouping (Nº Controle/Carga)
	linkedCteNumber?: string;
	ds_chave?: string;
	relatedDfeKeys?: string[];
	is_subcontratada?: boolean; // CT-e subcontratado (não usar prefixo no número)
	valor: number;
	vl_peso_bruto: number;
	ds_destinatario: string;
	ds_cidade_destino: string;
	ds_endereco_destino: string;
	ds_complemento_destino?: string;
	dt_emissao: string;
	/** Classificação para duas colunas (CT-e próprio / DF-e relacionado / pendente) */
	docBucket?: DocBucket;
	/** Badge curta para exibição: "CT-e Próprio", "CT-e Subcontratado", "DF-e Base", "Sem vínculo" */
	docBadge?: string;
	/** Estado do vínculo documental */
	vinculoStatus?: VinculoStatus;
}

export interface Veiculo {
	id: string;
	ds_placa: string;
	ds_nome: string;
	is_ativo: boolean;
	is_in_use: boolean;
	ds_tipo_unidade?: 'TRACIONADOR' | 'CARROCERIA' | 'RIGIDO' | null;
	ds_classificacao_tracionador?: string | null;
	ds_classificacao_carroceria?: string | null;
	ds_classificacao_rigido?: string | null;
	ds_tipo_carroceria_carga?: string | null;
	ds_marca?: string | null;
	ds_modelo?: string | null;
	vl_ano_modelo?: string | null;
	vl_ano_fabricacao?: string | null;
	vl_aquisicao?: string | number | null;
	vl_eixos?: string | null;
	tms_motoristas_veiculos?: Array<{
		id: string;
		is_principal: boolean;
		is_ativo: boolean;
		tms_motoristas?: {
			id: string;
			ds_cnh_numero?: string;
			ds_cnh_categoria?: string;
			is_ativo: boolean;
			rh_funcionarios?: {
				id: string;
				ds_nome: string;
				ds_documento: string;
			};
		};
	}>;
	// type: 'Truck' | 'Carreta' | 'Bitrem' | 'Vuc';
	// model: string;
	// driverName?: string;
	// driverPhone?: string; // Telefone do motorista
	// ds_status: 'Available' | 'In Use' | 'Maintenance';
	// bodyType?: string; // Tipo de carroceria (Baú, Sider, Graneleira, etc.)
	// segment?: string; // Segmento operacional do veículo (Ração, Palete, etc.)
	// // Capacidades
	// capacity?: number; // Capacidade em kg
	// volumeCapacity?: number; // Capacidade em m³
	// // Manutenção
	// lastMaintenance?: string; // Data última manutenção
	// nextMaintenance?: string; // Data próxima manutenção
}

// Entrega - Ponto de entrega dentro de uma carga
// Uma carga pode ter múltiplas entregas (múltiplos destinos)
export interface Entrega {
	// Identificação
	id: string;
	cd_entrega?: string;
	ds_status: 'PENDENTE' | 'EM_TRANSITO' | 'ENTREGUE' | 'DEVOLVIDA' | 'CANCELADA';

	// Relacionamento com carga
	id_carga: string;
	nr_sequencia: number;

	// Localização
	id_cidade_destino: number;
	sis_cidade_destino?: {
		id: number;
		ds_city: string;
		js_uf?: {
			id: number;
			ds_uf: string;
			ds_state: string;
		};
	};
	ds_endereco?: string;
	ds_complemento?: string;

	// Recebedor/destinatário (parser XML)
	ds_nome_destinatario?: string;
	ds_nome_recebedor?: string;
	ds_documento_destinatario?: string;
	ds_documento_recebedor?: string;

	// Datas e comprovantes
	dt_limite_entrega?: string;
	dt_entrega?: string;
	ds_comprovante_entrega?: string;
	ds_comprovante_key?: string;

	// Observações
	ds_observacoes?: string;

	// Dimensões (herdadas ou específicas)
	vl_peso_bruto?: number;
	vl_cubagem?: number;
	vl_qtd_volumes?: number;
	vl_total_mercadoria?: number; // Valor total das mercadorias da entrega (R$)

	// Datas de controle
	dt_created: string;
	dt_updated: string;

	// Documentos desta entrega
	js_entregas_ctes?: Array<{
		id: string;
		id_cte: string;
		ordem: number;
		js_cte?: CTeData;
	}>;

	js_entregas_nfes?: Array<{
		id: string;
		id_nfe: string;
		ordem: number;
		js_nfe?: NFe;
	}>;
}

// Carga (Tabela Mestre) - Entidade que alimenta o Kanban
// Representa a demanda logística. Existe antes do CT-e e pode sobreviver após cancelamento
export interface Carga {
	// Identificação
	id: string;
	cd_carga: string;
	ds_nome: string;
	ds_status: 'PENDENTE' | 'AGENDADA' | 'EM_COLETA' | 'EM_TRANSITO' | 'ENTREGUE';
	ds_status_viagem?: 'PLANEJADA' | 'EM_COLETA' | 'EM_VIAGEM' | 'CONCLUIDA' | null;

	// Datas
	dt_created: string;
	dt_updated: string;
	dt_coleta?: string; // data de coleta (única) - obrigatória quando informada
	dt_coleta_inicio?: string; // janela de coleta início - só existe se informada
	dt_coleta_fim?: string; // janela de coleta fim - só existe se informada
	dt_limite_entrega?: string; // deadline previsto para entrega (quando disponível)
	/** Data em que a carga foi concluída (última entrega); usada no filtro por período e exibição */
	dt_entregue_em?: string;

	// Características da Carga
	ds_observacoes?: string;
	ds_tipo_carroceria?: 'GRANELEIRO' | 'BAU' | 'SIDER' | 'FRIGORIFICO' | 'TANQUE' | 'PORTA_CONTAINER';
	ds_prioridade: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';

	// Dimensões e Pesos
	vl_peso_bruto?: number; // Peso bruto em kg
	vl_cubagem?: number; // Cubagem em m³
	vl_qtd_volumes?: number; // Quantidade de volumes
	vl_limite_empilhamento?: number; // Limite de empilhamento

	// Risco e Seguro
	fl_requer_seguro: boolean;

	// Deslocamento vazio: carroceria desacoplada
	fl_carroceria_desacoplada?: boolean;
	/** true = item é deslocamento vazio (cd_carga é apenas identificador) */
	fl_deslocamento_vazio?: boolean | null;

	// Localização (Origem) — opcional na importação; preencher antes de iniciar trajeto
	id_cidade_origem?: number | null;
	sis_cidade_origem?: {
		id: number;
		ds_city: string;
		js_uf?: { id: number; ds_uf: string; ds_state: string };
	};

	// Localização (Destino) - usado em deslocamentos vazios
	id_cidade_destino?: number;
	sis_cidade_destino?: {
		id: number;
		ds_city: string;
		js_uf?: { id: number; ds_uf: string; ds_state: string };
	};

	// Relacionamentos
	id_tms_empresa: string;
	id_motorista_veiculo?: string;
	id_carroceria_planejada?: string | null;
	id_fis_cliente?: string | null;
	id_segmento?: string;

	// Carroceria planejada (veículo/carreta escolhida para a carga)
	tms_carroceria_planejada?: {
		id: string;
		ds_placa: string;
		ds_nome: string;
	} | null;

	// Dados do Cliente (sempre fis_clientes; tms_clientes removido do backend)
	fis_clientes?: {
		id: string;
		ds_nome: string;
		ds_documento?: string | null;
		id_cidade?: number | null;
		sis_cidades?: {
			id: number;
			ds_city: string;
			js_uf?: { id: number; ds_uf: string; ds_state: string };
		};
	} | null;
	/** @deprecated Use fis_clientes. API retorna apenas fis_clientes. */
	tms_clientes?: {
		id: string;
		ds_nome: string;
		id_cidade: number;
		sis_cidades?: {
			id: number;
			ds_city: string;
			js_uf?: { id: number; ds_uf: string; ds_state: string };
		};
	};

	// Dados do Segmento
	tms_segmentos?: {
		id: string;
		ds_nome: string;
		cd_identificador: string;
		is_ativo: boolean;
	};

	// Dados do Motorista e Veículo
	tms_motoristas_veiculos?: {
		id: string;
		is_principal: boolean;
		is_ativo: boolean;
		tms_motoristas?: {
			id: string;
			ds_cnh_numero?: string;
			ds_cnh_categoria?: string;
			is_ativo: boolean;
			rh_funcionarios?: {
				id: string;
				ds_nome: string;
				ds_cpf: string;
				ds_situacao: string;
				rh_cargos?: {
					id: string;
					ds_nome: string;
				};
			};
		};
		tms_veiculos?: {
			id: string;
			ds_placa: string;
			ds_nome: string;
			is_ativo: boolean;
			ds_tipo_unidade?: 'TRACIONADOR' | 'CARROCERIA' | 'RIGIDO' | null;
			ds_classificacao_tracionador?: string | null;
			ds_classificacao_carroceria?: string | null;
			ds_classificacao_rigido?: string | null;
			ds_tipo_carroceria_carga?: string | null;
			ds_marca?: string | null;
			ds_modelo?: string | null;
			vl_ano_modelo?: string | null;
			vl_ano_fabricacao?: string | null;
			vl_aquisicao?: string | number | null;
			vl_eixos?: string | null;
		};
	};

	// Entregas (múltiplos destinos)
	js_entregas?: Entrega[];

	// Viagem vinculada (cavalo + carreta)
	tms_viagens_cargas?: Array<{
		id: string;
		id_viagem: string;
		id_carga: string;
		tms_viagens?: {
			id: string;
			ds_motorista?: string | null;
			ds_placa_cavalo: string;
			ds_placa_carreta_1?: string | null;
			ds_placa_carreta_2?: string | null;
			ds_placa_carreta_3?: string | null;
		};
	}>;

	// Expedidor (carga)
	id_embarcador?: string | null;
	tms_embarcadores?: {
		id: string;
		ds_nome: string;
	} | null;

	// DEPRECATED: Documentos agora estão nas entregas
	// Mantido para compatibilidade com código legado
	js_cargas_nfes?: Array<{
		id: string;
		id_nfe: string;
		ordem: number;
		js_nfe?: NFe;
	}>;

	js_cargas_ctes?: Array<{
		id: string;
		id_cte: string;
		ordem: number;
		js_cte?: CTeData;
	}>;

	// Container (quando ds_tipo_carroceria = PORTA_CONTAINER)
	tms_cargas_container?: {
		id: string;
		id_carga: string;
		id_armador?: string | null;
		nr_container?: string | null;
		nr_lacre_container?: string | null;
		ds_destino_pais?: string | null;
		ds_setor_container?: string | null;
		sis_armadores?: { id: string; ds_nome: string } | null;
	};

	// Informações da Viagem Vinculada
	viagem_info?: {
		id: string;
		cd_viagem: string;
		ds_status: 'PLANEJADA' | 'EM_COLETA' | 'EM_VIAGEM' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA';
		dt_agendada?: string;
		dt_conclusao?: string | null;
	};

	// Campos legados para compatibilidade
	clientName?: string; // Alias para fis_clientes?.ds_nome (ou tms_clientes legado)
	originCity?: string; // Alias para sis_cidade_origem?.ds_city
	destinationCity?: string; // Alias para sis_cidade_destino?.ds_city
	collectionDate?: string; // Alias para dt_coleta_inicio
	status?: 'Pendente' | 'Agendada' | 'Emitida' | 'Entregue'; // Mapeado de ds_status

	// Relações opcionais
	cte?: CTeData; // CT-e atual (pode ser null se ainda não emitido, ou se foi cancelado)
	mdfe?: MDFe; // MDF-e vinculado a esta carga na viagem
	documents?: AvailableDocument[]; // Documentos disponíveis para vinculação
}

export type ViewState = 'LIST' | 'LIST_V2' | 'CREATE_TRIP' | 'TRIP_DETAILS' | 'TIMELINE' | 'SETTLEMENT';

export enum TipoCarroceria {
	GRANELEIRO = 'GRANELEIRO',
	BAU = 'BAU',
	SIDER = 'SIDER',
	FRIGORIFICO = 'FRIGORIFICO',
	TANQUE = 'TANQUE',
	PORTA_CONTAINER = 'PORTA_CONTAINER',
}

export interface ScheduleItem {
	id: string;
	veiculo_id: string;
	veiculo_placa: string;
	data_inicio: string;
	data_fim: string;
	tipo_evento: string;
	referencia_id: string;
	status: string;
	cor: string;
	origem_dado: string;
	meta_dados?: string;
}

export interface NFe {
	id: string;
	ds_numero: string;
	dt_emissao: string;
	ds_serie: string;
	ds_chave: string;
	vl_nf: string;
	ds_razao_social_emitente: string;
	ds_razao_social_destinatario: string;
	js_nfes_referenciadas: string[] | null;
	/** Empresa como transportadora (fis_empresas.id) - para classificação CT-e próprio x DFe */
	id_fis_empresa_transportadora?: string | null;
	fis_documento_dfe?: Array<{
		id: string;
		ds_tipo: string;
		fis_documento_relacionado: Array<{
			id_documento_origem?: string;
			id_documento_referenciado?: string;
		}>;
		fis_documento_origem: Array<{
			id_documento_origem?: string;
			id_documento_referenciado?: string;
		}>;
	}>;
	fis_nfe_itens?: Array<NFeItem>;
}

export interface NFeItem {
	id: string;
	cd_produto: string;
	ds_produto: string;
	vl_qtd: number;
	vl_unitario: string;
	vl_total: number;
}

export interface CTeData {
	id: string;
	ds_numero: string;
	ds_chave: string;
	ds_serie: number;
	dt_emissao: string;
	vl_total: string;
	ds_razao_social_emitente: string;
	ds_razao_social_destinatario: string;
	ds_nome_mun_ini: string;
	ds_nome_mun_fim: string;
	ds_endereco_destino?: string;
	ds_complemento_destino?: string;
	js_documentos_anteriores: string[] | null;
	js_chaves_nfe: string[];
	/** Empresa emitente do CT-e (fis_empresas.id) - para classificação CT-e próprio x DFe */
	id_fis_empresa_emitente?: string | null;
	id_fis_empresa_subcontratada: string | null;
	loadId: string; // FK_CARGA: Este CT-e pertence à Carga X
	number: string;
	accessKey: string; // CHAVE_ACESSO (chave de acesso do CT-e na SEFAZ)
	freightValue: number; // VALOR_FRETE
	status: 'Authorized' | 'Cancelled' | 'Pending';
	emissionDate: string;
	authorizationDate?: string;
	cancellationDate?: string;
	cancellationReason?: string;
	isSubcontracted?: boolean; // 1 quando CT-e é subcontratado
	createdAt: string;
	fis_documento_dfe?: Array<{
		id: string;
		ds_tipo: string;
		fis_documento_relacionado: Array<{
			id_documento_origem?: string;
			id_documento_referenciado?: string;
		}>;
		fis_documento_origem: Array<{
			id_documento_origem?: string;
			id_documento_referenciado?: string;
		}>;
	}>;
}

export interface Doc {
	id: string;
	ds_tipo: 'NFE' | 'CTE';
	dt_emissao: string;
	ds_controle: string;
	js_cte: CTeData | null;
	js_nfe: NFe | null;
	js_nfse: Nfse | null;
	fis_documento_relacionado: unknown[];
	fis_documento_origem: unknown[];
}

/** Resposta do endpoint GET /api/tms/documentos/disponiveis-separados */
export interface DisponiveisSeparadosFiltros {
	competencia?: string;
	dataInicio?: string;
	dataFim?: string;
	search?: string;
	incluirRelacionamentos?: boolean;
}

export interface DisponiveisSeparadosResumo {
	ctesProprios: number;
	dfesRelacionados: number;
	total: number;
}

export interface CteProprioItem {
	idDocumentoDfe: string;
	idCte: string;
	numero: string | null;
	serie: string | null;
	chave: string | null;
	emissao: string;
	valorTotal: number | null;
	origem: string | null;
	destino: string | null;
	relacionamentos?: {
		documentosAnteriores?: string[];
		chavesNfe?: string[];
	};
}

export interface DfeRelacionadoItem {
	idDocumentoDfe: string;
	tipo: 'CTE_SUBCONTRATADO' | 'NFE_TRANSPORTADORA';
	idCte?: string;
	idNfe?: string;
	numero: string | null;
	chave: string | null;
	empresaEhSubcontratada?: boolean;
	empresaEhTransportadora?: boolean;
}

export interface DisponiveisSeparadosLink {
	sourceId: string;
	targetId: string;
	tipoRelacao: string;
	fonte: string;
}

export interface DisponiveisSeparadosResponse {
	filtros: DisponiveisSeparadosFiltros;
	resumo: DisponiveisSeparadosResumo;
	left: { ctesProprios: CteProprioItem[] };
	right: { dfesRelacionados: DfeRelacionadoItem[] };
	links: DisponiveisSeparadosLink[];
}

export interface NfseServiceItem {
	id: string;
	id_servico?: string;
	ds_aliquota?: string;
	ds_valor_ir?: string;
	ds_valor_iss?: string;
	ds_valor_pis?: string;
	ds_quantidade?: string;
	ds_valor_csll?: string;
	ds_valor_inss?: string;
	is_iss_retido?: boolean;
	ds_valor_total?: string;
	id_item_padrao?: string;
	ds_base_calculo?: string;
	ds_valor_cofins?: string;
	id_tipo_servico?: string;
	use_item_padrao?: boolean;
	ds_discriminacao?: string;
	ds_valor_deducoes?: string;
	ds_valor_unitario?: string;
	ds_valor_descontos?: string;
	ds_outras_retencoes?: string;
	ds_exigibilidade_iss?: string;
	ds_item_lista_servico?: string;
	ds_municipio_incidencia?: string;
}

export interface NfseProvider {
	ds_nome?: string;
	ds_documento?: string;
}

export interface Nfse {
	id: string;
	ds_numero?: string;
	ds_codigo_verificacao?: string;
	ds_valor_servicos?: string;
	dt_emissao?: string;
	ds_item_lista_servico?: string;
	ds_discriminacao?: string;
	js_servicos?: NfseServiceItem[];
	fis_fornecedor?: NfseProvider;
}

export interface ContaDespesa {
	id: string;
	dt_created: string;
	dt_updated: string;
	id_con_empresas: string;
	ds_classificacao_cta: string;
	ds_nome_cta: string;
	ds_tipo_cta: string;
	ds_nivel_cta: number;
	ds_classificacao_pai?: string | null;
	id_externo?: string | null;
	id_conta_pai?: string | null;
	is_ativo: boolean;
	id_empresa_externo?: string | null;
	ds_tipo_tms_despesa?: string | null;
	id_grupo_contas?: string | null;
}

export interface FisNFe {
	id: string;
	dt_created: string;
	dt_updated: string;
	id_fis_empresa_emitente?: string | null;
	id_fis_empresa_destinatario?: string | null;
	id_fis_empresa_transportadora?: string | null;
	ds_id_nfe?: string | null;
	ds_chave?: string | null;
	js_nfes_referenciadas?: string[] | null;
	ds_uf?: string | null;
	cd_nf?: string | null;
	ds_natureza_operacao?: string | null;
	ds_modelo?: string | null;
	ds_serie?: string | null;
	ds_numero?: string | null;
	dt_emissao?: string | null;
	dt_saida_entrega?: string | null;
	cd_tipo_operacao?: string | null;
	cd_municipio?: string | null;
	ds_fin_nfe?: string | null;
	vl_base_calculo?: string | null;
	vl_produto?: string | null;
	vl_nf?: string | null;
	vl_frete?: string | null;
	vl_seg?: string | null;
	vl_desc?: string | null;
	vl_ii?: string | null;
	vl_ipi?: string | null;
	vl_pis?: string | null;
	vl_cofins?: string | null;
	vl_outros?: string | null;
	vl_bc?: string | null;
	vl_icms?: string | null;
	vl_icms_desoner?: string | null;
	ds_documento_emitente?: string | null;
	ds_razao_social_emitente?: string | null;
	cd_crt_emitente?: string | null;
	ds_uf_emitente?: string | null;
	ds_municipio_emitente?: string | null;
	ds_documento_destinatario?: string | null;
	ds_razao_social_destinatario?: string | null;
	id_fis_fornecedor?: string | null;
}

export interface FisNFeItem {
	id: string;
	dt_created: string;
	dt_updated: string;
	ds_ordem?: number;
	id_fis_nfe?: string | null;
	ds_produto?: string | null;
	cd_produto_anp?: string | null;
	ds_produto_anp_descricao?: string | null;
	ds_codigo?: string | null;
	ds_unidade?: string | null;
	vl_base_calculo_icms?: string | null;
	vl_quantidade?: string | null;
	vl_unitario?: string | null;
	vl_total?: string | null;
	vl_icms?: string | null;
	ds_icms_tag?: string | null;
	ds_cst?: string | null;
	ds_origem?: string | null;
	vl_pis?: string | null;
	vl_porcentagem_pis?: string | null;
	vl_base_calculo_pis?: string | null;
	cd_cst_pis?: string | null;
	vl_cofins?: string | null;
	vl_porcentagem_cofins?: string | null;
	vl_base_calculo_cofins?: string | null;
	cd_cst_cofins?: string | null;
	ds_unidade_tributavel?: string | null;
	vl_quantidade_tributavel?: string | null;
	vl_total_tributavel?: string | null;
	vl_unitario_tributavel?: string | null;
	cd_ncm?: string | null;
	cd_cest?: string | null;
	cd_cfop?: string | null;
	cd_barras?: string | null;
	vl_desconto?: string | null;
	fis_nfe?: FisNFe | null;
}

export interface FisNfse {
	id: string;
	dt_created?: string;
	dt_updated?: string;
	id_fis_empresas?: string | null;
	id_fis_empresa_emitente?: string | null;
	ds_documento_emitente?: string | null;
	ds_razao_social_emitente?: string | null;
	id_fis_fornecedor?: string | null;
	ds_numero?: string | null;
	ds_codigo_verificacao?: string | null;
	dt_emissao?: string | null;
	ds_base_calculo?: string | null;
	ds_valor_liquido_nfse?: string | null;
	ds_valor_servicos?: string | null;
	ds_valor_deducoes?: string | null;
	is_iss_retido?: boolean;
	ds_item_lista_servico?: string | null;
	ds_discriminacao?: string | null;
	ds_codigo_municipio?: string | null;
	ds_municipio_incidencia?: string | null;
	is_optante_simples_nacional?: boolean;
	js_servicos?: NfseServiceItem[];
}

export interface ConContaDespesaRef {
	ds_tipo_tms_despesa?: string | null;
}

export interface Despesa {
	id: string;
	id_viagem: string;
	ds_tipo: string;
	vl_despesa: string;
	id_nfe_item?: string | null;
	ds_odometro?: string | null;
	id_nfse?: string | null;
	dt_despesa: string;
	ds_observacao?: string | null;
	id_conta_despesa?: string | null;
	dt_created: string;
	dt_updated: string;
	fis_nfe_item?: FisNFeItem | null;
	fis_nfse?: FisNfse | null;
	con_conta_despesa?: ConContaDespesaRef | null;
	conta: string;
	data: string;
	valor: string;
	obs: string;
}
