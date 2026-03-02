/**
 * Sincronização de dados FIPE com o banco de dados.
 * Atualiza sis_tabela_fipe e sis_fipe_historico a partir da API Parallelum v2.
 */

import { prisma } from '../prisma';
import type { VehicleTypeApi } from './fipe-brasil.service';
import {
  getAnosPorCodigoFipe,
  buscarFipePorCodigo,
  buscarHistoricoFipe,
  getReferences,
  normalizarCodigoFipe,
} from './fipe-brasil.service';
import pLimit from 'p-limit';

const VEHICLE_TYPE_MAP: Record<string, VehicleTypeApi> = {
  C: 'cars',
  M: 'motorcycles',
  A: 'trucks',
  CARRO: 'cars',
  MOTO: 'motorcycles',
  MOTOCICLETA: 'motorcycles',
  CAMINHAO: 'trucks',
  TRUCK: 'trucks',
};

function resolveVehicleType(cdVeiculo: string | null): VehicleTypeApi[] {
  if (!cdVeiculo) return ['cars', 'motorcycles', 'trucks'];
  const upper = cdVeiculo.toUpperCase();
  const mapped = VEHICLE_TYPE_MAP[upper];
  if (mapped) return [mapped];
  return ['cars', 'motorcycles', 'trucks'];
}

/**
 * Obtém todos os cd_fipe distintos que precisam ser sincronizados:
 * - da sis_tabela_fipe (atualizar existentes)
 * - da emb_frota (incluir novos usados na frota)
 */
async function getCodigosFipeParaSync(): Promise<
  Array<{ cd_fipe: string; id_emb_tipos_veiculo: string | null }>
> {
  const daTabela = await prisma.sis_tabela_fipe.findMany({
    select: {
      cd_fipe: true,
      id_emb_tipos_veiculo: true,
    },
  });

  const daFrota = await prisma.emb_frota.findMany({
    where: {
      OR: [
        // Campo não é nulo no schema; filtramos apenas vazios
        { cd_fipe_tracionador: { not: '' } },
        { cd_fipe_carroceria_semi: { not: null } },
        { cd_fipe_carroceria_semi_2: { not: null } },
      ],
    },
    select: {
      cd_fipe_tracionador: true,
      cd_fipe_carroceria_semi: true,
      cd_fipe_carroceria_semi_2: true,
      id_emb_tipos_veiculo_tracionador: true,
    },
  });

  const map = new Map<
    string,
    { cd_fipe: string; id_emb_tipos_veiculo: string | null }
  >();

  for (const row of daTabela) {
    map.set(row.cd_fipe, {
      cd_fipe: row.cd_fipe,
      id_emb_tipos_veiculo: row.id_emb_tipos_veiculo,
    });
  }

  for (const f of daFrota) {
    const tipoId = f.id_emb_tipos_veiculo_tracionador;
    const codigos = [
      f.cd_fipe_tracionador,
      f.cd_fipe_carroceria_semi,
      f.cd_fipe_carroceria_semi_2,
    ].filter((c): c is string => !!c && c.trim() !== '');

    for (const c of codigos) {
      const normalized = normalizarCodigoFipe(c);
      if (!map.has(normalized)) {
        map.set(normalized, {
          cd_fipe: normalized,
          id_emb_tipos_veiculo: tipoId,
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Obtém cd_veiculo a partir de id_emb_tipos_veiculo.
 */
async function getCdVeiculoByTipoId(
  idEmbTiposVeiculo: string | null
): Promise<string | null> {
  if (!idEmbTiposVeiculo) return null;
  const tipo = await prisma.emb_tipos_veiculo.findUnique({
    where: { id: idEmbTiposVeiculo },
    select: { cd_veiculo: true },
  });
  return tipo?.cd_veiculo ?? null;
}

/**
 * Sincroniza um veículo específico na API e persiste no banco.
 */
async function syncVeiculo(params: {
  cd_fipe: string;
  id_emb_tipos_veiculo: string | null;
  reference?: string;
}) {
  const cdVeiculo = await getCdVeiculoByTipoId(params.id_emb_tipos_veiculo);
  const vehicleTypes = resolveVehicleType(cdVeiculo);

  let anos: Array<{ code: string }> = [];
  let vehicleTypeUsed: VehicleTypeApi | null = null;

  for (const vt of vehicleTypes) {
    try {
      anos = await getAnosPorCodigoFipe(vt, params.cd_fipe, params.reference);
      if (anos.length > 0) {
        vehicleTypeUsed = vt;
        break;
      }
    } catch {
      continue;
    }
  }

  if (anos.length === 0 || !vehicleTypeUsed) {
    console.warn(
      `[FipeSync] Nenhum ano encontrado para cd_fipe=${params.cd_fipe}`
    );
    return;
  }

  const yearId = anos[0].code;

  const tabelaInput = await buscarFipePorCodigo({
    vehicleType: vehicleTypeUsed,
    fipeCode: params.cd_fipe,
    yearId,
    reference: params.reference,
    idEmbTiposVeiculo: params.id_emb_tipos_veiculo,
  });

  const fipeRow = await prisma.sis_tabela_fipe.upsert({
    where: {
      cd_fipe_vl_ano_modelo: {
        cd_fipe: params.cd_fipe,
        vl_ano_modelo: tabelaInput.vl_ano_modelo,
      },
    },
    create: {
      ds_marca: tabelaInput.ds_marca,
      ds_modelo: tabelaInput.ds_modelo,
      cd_fipe: tabelaInput.cd_fipe,
      vl_ano_modelo: tabelaInput.vl_ano_modelo,
      vl_valor: tabelaInput.vl_valor,
      id_emb_tipos_veiculo: tabelaInput.id_emb_tipos_veiculo,
    },
    update: {
      ds_marca: tabelaInput.ds_marca,
      ds_modelo: tabelaInput.ds_modelo,
      vl_ano_modelo: tabelaInput.vl_ano_modelo,
      vl_valor: tabelaInput.vl_valor,
      id_emb_tipos_veiculo: tabelaInput.id_emb_tipos_veiculo,
    },
    select: {
      id: true,
      ds_marca: true,
      ds_modelo: true,
      id_emb_tipos_veiculo: true,
    },
  });

  const historicoItems = await buscarHistoricoFipe({
    vehicleType: vehicleTypeUsed,
    fipeCode: params.cd_fipe,
    yearId,
    reference: params.reference,
  });

  if (historicoItems.length === 0) return;

  for (const h of historicoItems) {
    const existe = await prisma.sis_fipe_historico.findFirst({
      where: {
        id_emb_fipe: fipeRow.id,
        vl_mes: h.vl_mes,
        vl_ano: h.vl_ano,
      },
    });
    if (existe) continue;

    await prisma.sis_fipe_historico.create({
      data: {
        id_emb_fipe: fipeRow.id,
        ds_marca: fipeRow.ds_marca,
        ds_modelo: fipeRow.ds_modelo,
        cd_fipe: params.cd_fipe,
        id_emb_tipos_veiculo: fipeRow.id_emb_tipos_veiculo,
        vl_mes: h.vl_mes,
        vl_ano: h.vl_ano,
        vl_ano_modelo: h.vl_ano_modelo,
        vl_valor: h.vl_valor,
      },
    });
  }
}

/**
 * Executa a sincronização mensal de todos os veículos FIPE.
 */
export async function sincronizarFipe() {
  console.log(
    `[FipeSync] Iniciando sincronização FIPE — ${new Date().toISOString()}`
  );

  let reference: string | undefined;
  try {
    const refs = await getReferences();
    if (refs.length > 0) {
      reference = refs[0].code;
      console.log(
        '[FipeSync] Referência utilizada:',
        reference,
        refs[0].month ?? refs[0].label
      );
    }
  } catch (err) {
    console.error('[FipeSync] Erro ao obter referências:', err);
    throw err;
  }

  const codigos = await getCodigosFipeParaSync();
  if (codigos.length === 0) {
    console.log('[FipeSync] Nenhum veículo para sincronizar.');
    return;
  }

  console.log(`[FipeSync] ${codigos.length} veículo(s) para sincronizar.`);

  const limit = pLimit(2);
  let ok = 0;
  let fail = 0;

  await Promise.all(
    codigos.map((c) =>
      limit(async () => {
        try {
          await syncVeiculo({
            cd_fipe: c.cd_fipe,
            id_emb_tipos_veiculo: c.id_emb_tipos_veiculo,
            reference,
          });
          ok++;
        } catch (err) {
          fail++;
          console.error(`[FipeSync] Erro ao sincronizar ${c.cd_fipe}:`, err);
        }
      })
    )
  );

  console.log(`[FipeSync] Concluído: ${ok} sucesso, ${fail} falha(s).`);
}
