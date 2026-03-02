import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import XLSX from 'xlsx';
import { prisma } from '@/services/prisma';
import { SatConferenciaItemStatus } from '@prisma/client';
import {
  coletarCteSieg,
  coletarNfceSieg,
  coletarNfeSieg,
  coletarNfseSieg,
} from '../sieg/sieg.service';
import { sincronizarFornecedoresByEmpresaId } from '../fornecedor.service';
import {
  sincronizarDominioNfseByEmpresaId,
  sincronizarDominioNfeByEmpresaId,
  sincronizarDominioVerfNotas,
} from '../nota-fiscal.service';

// Corrige nomes de arquivos que sofreram "mojibake" quando bytes UTF-8 foram
// interpretados como latin1/ISO-8859-1. Ex: "DestinatÃ¡rio" -> "Destinatário".
function fixFilenameEncoding(
  name: string | null | undefined
): string | undefined {
  if (!name) return name;
  try {
    // heurística simples: se a string contém sequências típicas de mojibake
    // (como 'Ã' ou 'Â'), tenta re-interpretar os bytes como latin1 e decodificar UTF-8
    if (/Ã|Â/.test(name)) {
      const fixed = Buffer.from(name, 'latin1').toString('utf8');
      return fixed;
    }
  } catch (e) {
    // se falhar, retorna o original
    return name;
  }
  return name;
}

// Sanitiza um nome de arquivo para exibição na notificação:
// - usa apenas o basename
// - remove a extensão (tudo após o último '.')
// - remove prefixos numéricos seguidos de '-' (ex: '1764866626591-...')
function sanitizeDisplayFilename(name: string | null | undefined): string {
  if (!name) return '';
  try {
    const base = path.basename(String(name));
    // remove extensão
    const withoutExt = base.replace(/\.[^/.]+$/, '');
    // remove prefixo numérico até o primeiro '-' (um ou mais '-')
    const cleaned = withoutExt.replace(/^[0-9]+-+/, '');
    return cleaned.trim();
  } catch (e) {
    return String(name || '').trim();
  }
}

export class EnvioPlanilhaSat {
  /**
   * Processa múltiplos arquivos (assíncrono, paraleliza via Promise.allSettled)
   * Retorna um array de resultados correspondentes aos arquivos
   */
  async enviarPlanilhas(
    filepaths: string[],
    empresaId?: string,
    userId?: string,
    competencia?: string
  ) {
    console.log(competencia);
    if (!Array.isArray(filepaths) || filepaths.length === 0) {
      return [];
    }

    const normalize = (s: any) =>
      (s || '')
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}|[\u0300-\u036f]/gu, '')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();

    const isDateHeader = (h: string) => /data|emiss|dt/i.test(h);

    const excelSerialToDate = (serial: number): Date => {
      const epoch = Date.UTC(1899, 11, 30);
      const days = Math.floor(serial);
      const frac = serial - days;
      const offsetDays = serial >= 61 ? -1 : 0;
      const ms =
        (days + offsetDays) * 24 * 60 * 60 * 1000 +
        Math.round(frac * 24 * 60 * 60 * 1000);
      return new Date(epoch + ms);
    };

    const convertToDate = (v: any): Date | null => {
      if (v == null || v === '') return null;
      if (v instanceof Date) return v;
      if (typeof v === 'number') {
        try {
          const ssf = (XLSX as any).SSF;
          if (ssf && typeof ssf.parse_date_code === 'function') {
            const parsed = ssf.parse_date_code(v);
            if (parsed && parsed.y) {
              const year = parsed.y;
              const month = (parsed.m || 1) - 1;
              const day = parsed.d || 1;
              const hour = parsed.H || 0;
              const min = parsed.M || 0;
              const sec = Math.floor(parsed.S || 0);
              return new Date(year, month, day, hour, min, sec);
            }
          }
        } catch (e) {
          // fallback
        }
        return excelSerialToDate(v);
      }

      const s = String(v).trim();
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (m) {
        let day = parseInt(m[1], 10);
        let month = parseInt(m[2], 10) - 1;
        let year = parseInt(m[3], 10);
        if (year < 100) {
          year += year <= 49 ? 2000 : 1900;
        }
        return new Date(year, month, day);
      }

      const parsed = new Date(s);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatDateDMY = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const processFile = async (filepath: string) => {
      const fileBuffer = fs.readFileSync(filepath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
      });

      // pré-calc filename/hash para reutilizar em ramos de retorno
      const filenameRaw = path.basename(filepath);
      const filenameFixed = fixFilenameEncoding(filenameRaw) || filenameRaw;
      const fileHash = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      if (rows.length > 0) {
        const firstCell = rows[0][0];
        const n = normalize(firstCell);
        if (n.includes('cte') && n.includes('encontr')) {
          rows.splice(0, 2);
        }
      }
      console.log('user', userId);
      if (rows.length === 0) {
        const confEmpty = await prisma.fis_sat_conferencia.create({
          data: {
            id_fis_empresas: empresaId ?? undefined,
            ds_filename: filenameFixed,
            cd_file_hash: fileHash,
            ds_status: 'RECEBIDO',
            vl_rows_total: 0,
            ds_conteudo: [],
            id_user: userId,
          },
        });

        return { sheetName, rows: 0, sample: [], conferenciaId: confEmpty.id };
      }

      const headers: string[] = (rows[0] || []).map((h: any, i: number) => {
        if (h === null || h === undefined) return `col${i}`;
        const raw = String(h).trim();
        if (raw === '') return `col${i}`;
        // remover espaço no header
        const noSpaces = raw.replace(/\s+/g, '');
        return noSpaces;
      });
      // Remover linhas inteiras vazias antes de mapear para objetos
      const rawDataRows = rows.slice(1);
      const filteredRows = rawDataRows.filter((r: any[]) => {
        if (!r) return false;
        return r.some(
          (cell) =>
            cell !== null && cell !== undefined && String(cell).trim() !== ''
        );
      });

      if (filteredRows.length === 0) {
        // nenhum dado útil após remover linhas vazias -> registrar conferência vazia
        const confEmpty = await prisma.fis_sat_conferencia.create({
          data: {
            id_fis_empresas: empresaId ?? undefined,
            ds_filename: filenameFixed,
            cd_file_hash: fileHash,
            ds_status: 'RECEBIDO',
            vl_rows_total: 0,
            ds_conteudo: [],
            id_user: userId,
          },
        });
        return { sheetName, rows: 0, sample: [], conferenciaId: confEmpty.id };
      }

      const data = filteredRows.map((r: any[]) => {
        const obj: any = {};
        headers.forEach((h, i) => {
          const raw = r[i] !== undefined ? r[i] : null;
          if (isDateHeader(h)) {
            const d = convertToDate(raw);
            obj[h] = d ? formatDateDMY(d) : null;
          } else {
            obj[h] = raw;
          }
        });
        return obj;
      });

      const sample = data.slice(0, 20);

      const conference = await prisma.fis_sat_conferencia.create({
        data: {
          id_fis_empresas: empresaId ?? undefined,
          id_user: userId,
          ds_filename: filenameFixed,
          cd_file_hash: fileHash,
          ds_status: 'PROCESSANDO',
          vl_rows_total: data.length,
          vl_errors_count: 0,
          ds_conteudo: data,
        },
      });
      // Atualiza notificação de forma atômica: remove antigas e cria nova (se houver)
      if (userId) {
        const planilhasEmProcessamento = await prisma.fis_sat_conferencia.count(
          {
            where: { id_user: userId, ds_status: 'PROCESSANDO' },
          }
        );

        const nomePlanilhasEmProcessamento =
          await prisma.fis_sat_conferencia.findMany({
            where: { id_user: userId, ds_status: 'PROCESSANDO' },
            select: { ds_filename: true },
          });

        const maxToShow = 20;
        const sanitized = nomePlanilhasEmProcessamento.map((p) =>
          sanitizeDisplayFilename(p.ds_filename).replace(/"/g, '\\"')
        );

        const shown = sanitized
          .slice(0, maxToShow)
          .map((f) => `"${f}"`)
          .join('\n');
        const remaining = Math.max(0, sanitized.length - maxToShow);
        const tail =
          remaining > 0 ? `\n... e mais ${remaining} planilha(s)` : '';

        const descricao = `Você tem ${planilhasEmProcessamento} planilha(s) em processamento:\n\n${shown}${tail}\n\n(Última atualização: ${new Date().toLocaleString()})`;

        await prisma.$transaction(async (tx) => {
          await tx.sis_profiles_notificacoes.deleteMany({
            where: { id_profile: userId, ds_titulo: 'Processamento SAT' },
          });

          if (planilhasEmProcessamento > 0) {
            await tx.sis_profiles_notificacoes.create({
              data: {
                id_profile: userId,
                ds_titulo: 'Processamento SAT',
                ds_descricao: descricao,
                cd_tipo: 'WARN',
              },
            });
          }
        });
      }
      const items = data.map((row, idx) => ({
        id_conferencia: conference.id,
        ds_numero_row: idx,
        id_fis_documento: null,
        ds_status: SatConferenciaItemStatus.NAO_ENCONTRADO,
        ds_message: null,
      }));

      if (items.length > 0) {
        await prisma.fis_sat_conferencia_item.createMany({ data: items });
      }

      return {
        sheetName,
        rows: data.length,
        sample,
        conferenciaId: conference.id,
      };
    };

    const settled = await Promise.allSettled(
      filepaths.map((p) => processFile(p))
    );

    const results = settled.map((s, i) => {
      if (s.status === 'fulfilled') {
        return { filepath: filepaths[i], ok: true, result: s.value };
      }
      return {
        filepath: filepaths[i],
        ok: false,
        error: String((s as any).reason),
      };
    });

    // Executa coleta SIEG e salvamento em background (não bloqueia resposta)
    if (competencia && empresaId) {
      this.processarColetaSiegEBackground(
        results,
        empresaId,
        userId,
        competencia
      ).catch((err) => {
        console.error('Erro ao processar coleta SIEG em background:', err);
      });
    }

    return results;
  }

  // Retry helper: tenta executar a função assíncrona `fn` até `retries` vezes
  // com backoff exponencial (delay inicial em ms).
  private async retryAsync<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastErr: any;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const isLast = attempt === retries;
        const wait = delayMs * Math.pow(2, attempt - 1);
        console.warn(
          `Tentativa ${attempt} falhou. ${isLast ? 'Sem mais tentativas.' : `aguardando ${wait}ms antes da próxima tentativa`}`,
          err
        );
        if (isLast) break;
        await new Promise((res) => setTimeout(res, wait));
      }
    }
    throw lastErr;
  }

  /**
   * Processa coleta SIEG e salva dados no banco em background
   * (executa após retornar resposta ao front-end)
   */
  private async processarColetaSiegEBackground(
    results: any[],
    empresaId: string,
    userId?: string,
    competencia?: string
  ) {
    try {
      console.log(
        `[Background] Iniciando coleta SIEG para competência ${competencia}...`
      );
      await this.retryAsync(
        () => sincronizarFornecedoresByEmpresaId(empresaId),
        3,
        1000
      );
      await this.retryAsync(
        () => coletarNfeSieg(empresaId, competencia),
        3,
        1000
      );
      await Promise.all([
        this.retryAsync(() => coletarCteSieg(empresaId, competencia), 3, 1000),
        this.retryAsync(() => coletarNfceSieg(empresaId, competencia), 3, 1000),
        this.retryAsync(() => coletarNfseSieg(empresaId, competencia), 3, 1000),
      ]);
      await Promise.all([
        this.retryAsync(
          () => sincronizarDominioNfseByEmpresaId(empresaId, competencia),
          3,
          1000
        ),
        this.retryAsync(
          () => sincronizarDominioNfeByEmpresaId(empresaId, competencia),
          3,
          1000
        ),
        this.retryAsync(
          () => sincronizarDominioVerfNotas(empresaId, competencia),
          3,
          1000
        ),
      ]);
      console.log(`[Background] Coleta SIEG finalizada. Salvando dados...`);

      // Agora salva os dados das planilhas no banco
      for (const res of results) {
        if (!res.ok || !res.result) continue;

        const { conferenciaId } = res.result;
        if (!conferenciaId) continue;

        // Atualiza status da conferência para indicar que está processada
        await prisma.fis_sat_conferencia.update({
          where: { id: conferenciaId },
          data: {
            ds_status: 'RECEBIDO',
            dt_updated: new Date(),
          },
        });
      }

      console.log(
        `[Background] Processamento completo. ${results.length} arquivo(s) processado(s).`
      );
    } catch (error) {
      console.error('[Background] Erro ao processar coleta SIEG:', error);
      // Opcional: marcar conferências com erro
      for (const res of results) {
        if (res.ok && res.result?.conferenciaId) {
          await prisma.fis_sat_conferencia
            .update({
              where: { id: res.result.conferenciaId },
              data: {
                ds_status: 'ERRO',
                dt_updated: new Date(),
                ds_message: `Erro ao processar coleta SIEG em background: ${error}`,
              },
            })
            .catch((e) => console.error('Erro ao atualizar status:', e));
        }
      }
    }
  }
}
