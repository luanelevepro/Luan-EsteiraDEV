import { fetchData } from './request-handler';

export interface ClassificacaoTributaria {
    codigo: string | null;
    descricao: string | null;
    memoriaCalculo: string | null;
    apropriacaoCreditosCBS: string | null;
    apropriacaoCreditosIBS: string | null;
    tipoAliquota: string | null;
    anexo: {
        numero: string | null;
        descricao: string | null;
        numeroItem: string | null;
        textoItem: string | null;
    };
}

export interface ProductWithClassificacao {
    id: string;
    ds_nome: string;
    cd_ncm: string | null;
    ds_unidade: string;
    classificacaoTributaria: ClassificacaoTributaria | null;
}

export async function getProductsWithClassificacao(): Promise<ProductWithClassificacao[]> {
    return fetchData<ProductWithClassificacao[]>('/api/reforma-tributaria/produtos') as Promise<ProductWithClassificacao[]>;
}

// Interfaces para Classificação de Produtos
export interface ClassificacaoProduto {
    cd_cst: string;
    cd_class_trib: string;
    ds_cst_desc: string | null;
    ds_class_trib_descr: string | null;
    ds_anexo_descricao_full: string | null;
    ds_tipo_aliquota: string | null;
    ds_anexo_numero: string | null;
    ds_anexo_descricao: string | null;
    ds_anexo_numero_item: string | null;
    fl_ncm_encontrado: boolean;
    fl_confirmado_usuario: boolean;
    vl_reducao_cbs?: number | null;
    vl_reducao_ibs_uf?: number | null;
    vl_reducao_ibs_mun?: number | null;
    ds_tipo_reducao?: string | null;
    aliquota_reducao?: {
        status: string;
        cbs: number;
        ibsUf: number;
        ibsMun: number;
        label: string;
    } | null;
}

export interface ProdutoClassificado {
    id: string;
    id_externo: string | null;
    ds_nome: string;
    cd_ncm: string | null;
    ds_unidade: string;
    ds_status: string;
    ds_tipo_item: number | null;
    classificacao: ClassificacaoProduto | null;
}

export interface ClassificacaoProdutosResponse {
    data: ProdutoClassificado[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    opcoesFiltro?: {
        cst: string[];
        classTrib: string[];
        tipoItem: number[];
    };
}

export interface ClassificacaoProdutosParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string[];
    tipo_item?: number[];
    cd_cst?: string[];
    cd_class_trib?: string[];
    fl_ncm_encontrado?: boolean[];
    fl_confirmado_usuario?: boolean[];
    orderColumn?: string;
    orderBy?: 'asc' | 'desc';
}

export interface SincronizarClassificacaoResponse {
    success: boolean;
    mensagem: string;
    sincronizados: number;
    total: number;
    encontrados: number;
    naoEncontrados: number;
}

/**
 * Lista produtos com classificação tributária (paginado)
 */
export async function getClassificacaoProdutos(
    params: ClassificacaoProdutosParams = {}
): Promise<ClassificacaoProdutosResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.search) queryParams.set('search', params.search);
    if (params.status?.length) queryParams.set('status', params.status.join(','));
    if (params.tipo_item?.length) queryParams.set('tipo_item', params.tipo_item.join(','));
    if (params.cd_cst?.length) queryParams.set('cd_cst', params.cd_cst.join(','));
    if (params.cd_class_trib?.length) queryParams.set('cd_class_trib', params.cd_class_trib.join(','));
    if (params.fl_ncm_encontrado?.length && params.fl_ncm_encontrado.length > 0) queryParams.set('fl_ncm_encontrado', params.fl_ncm_encontrado.map(b => String(b)).join(','));
    if (params.fl_confirmado_usuario?.length && params.fl_confirmado_usuario.length > 0) queryParams.set('fl_confirmado_usuario', params.fl_confirmado_usuario.map(b => String(b)).join(','));
    if (params.orderColumn) queryParams.set('orderColumn', params.orderColumn);
    if (params.orderBy) queryParams.set('orderBy', params.orderBy);

    const queryString = queryParams.toString();
    const url = `/api/reforma-tributaria/classificacao-produtos${queryString ? `?${queryString}` : ''}`;
    
    return fetchData<ClassificacaoProdutosResponse>(url) as Promise<ClassificacaoProdutosResponse>;
}

/**
 * Sincroniza classificação tributária dos produtos da empresa
 */
export async function sincronizarClassificacaoProdutos(
): Promise<SincronizarClassificacaoResponse> {
    return fetchData<SincronizarClassificacaoResponse>(
        '/api/reforma-tributaria/classificacao-produtos/sincronizar',
        undefined,
        'POST'
    ) as Promise<SincronizarClassificacaoResponse>;
}

/**
 * Interface para classificação retornada do calculadora.db
 */
export interface ClassificacaoNcm {
    NCMA_ID: number;
    NCMA_NCM_CD: string;
    CLTR_CD: string;
    CLTR_DESCRICAO: string | null;
    CLTR_TIPO_ALIQUOTA: string | null;
    ANXO_NUMERO: string | null;
    ANXO_DESCRICAO: string | null;
    ANXO_NUMERO_ITEM: string | null;
    ANXO_TEXTO_ITEM: string | null;
}

/**
 * Busca todas as classificações tributárias disponíveis para um NCM específico
 */
export async function getClassificacoesPorNcm(ncm: string): Promise<ClassificacaoNcm[]> {
    return fetchData<ClassificacaoNcm[]>(
        `/api/reforma-tributaria/classificacao-produtos/classificacoes-por-ncm?ncm=${encodeURIComponent(ncm)}`
    ) as Promise<ClassificacaoNcm[]>;
}

/**
 * Atualiza classificação tributária de um produto manualmente
 */
export async function atualizarClassificacaoProduto(
    produtoId: string,
    dados: {
        cd_class_trib: string;
        cd_cst?: string;
        ds_class_trib_descr?: string | null;
        ds_tipo_aliquota?: string | null;
        ds_anexo_numero?: string | null;
        ds_anexo_descricao?: string | null;
        ds_anexo_numero_item?: string | null;
        ds_anexo_texto_item?: string | null;
    }
): Promise<void> {
    return fetchData(
        `/api/reforma-tributaria/classificacao-produtos/${produtoId}`,
        dados,
        'PUT'
    );
}
