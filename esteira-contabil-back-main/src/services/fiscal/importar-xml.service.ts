import * as fs from 'fs';
import path from 'path';
import { parseString, parseStringPromise } from 'xml2js';
import { ImportarXmlNfeService as ImportarNfeService } from '../fiscal/onvio/nfe-parser.service';
import { ImportarXmlCteService as ImportarCteService } from '../fiscal/onvio/cte-parser.service';
import { prisma } from '../prisma';
import {
  inclusaoCteSieg,
  inclusaoNfceSieg,
  inclusaoNfeSieg,
} from './sieg/sieg.service';
import pLimit from 'p-limit';
import {
  setCtesContra,
  setNfesProcessados,
  setNfesRelacionadasProcessados,
} from './documento.service';

type TipoXmlFiscal = 'NFE' | 'NFCE' | 'CTE' | 'DESCONHECIDO';

export const identificarTipoXmlFiscal = async (
  xmlContent: string
): Promise<TipoXmlFiscal> => {
  try {
    const parsed = await parseStringPromise(xmlContent, {
      explicitArray: false,
    });

    if (parsed.nfeProc || parsed.NFe || parsed.nfe) {
      const infNFe =
        parsed.nfeProc?.NFe?.infNFe || parsed.NFe?.infNFe || parsed.nfe?.infNFe;
      if (infNFe?.ide?.mod === '65') return 'NFCE';
      return 'NFE';
    }

    if (parsed.cteProc || parsed.CTe || parsed.cte) {
      return 'CTE';
    }

    return 'DESCONHECIDO';
  } catch (error) {
    return 'DESCONHECIDO';
  }
};

export const verifyFiscalModule = async (empresaIdList: string[]) => {
  const uniqueIds = Array.from(new Set(empresaIdList));
  const idSisEmpresas = await prisma.fis_empresas.findMany({
    where: { id_sis_empresas: { in: uniqueIds } },
    select: { id_sis_empresas: true },
  });
  const idFiscalModule = await prisma.sis_modules.findFirst({
    where: { ds_module: 'FISCAL' },
    select: { id: true },
  });
  const empresasWithFiscalModule = await prisma.sis_empresas_modules.findMany({
    where: {
      id_empresa: { in: idSisEmpresas.map((e) => e.id_sis_empresas) },
      id_module: idFiscalModule?.id,
    },
    select: {
      id_empresa: true,
    },
  });
  const empresasWithFiscalModuleIds = empresasWithFiscalModule.map(
    (e) => e.id_empresa
  );
  // garante que não haja ids duplicados no retorno
  return Array.from(new Set(empresasWithFiscalModuleIds));
};

export const importarNfeXml = async (filesArray: any[]) => {
  try {
    const docDfeBuffer: any[] = [];
    const idsEmpresas: string[] = [];
    const success: Array<{ filename: string; path?: string }> = [];
    const failed: Array<{ filename: string; path?: string; error: string }> =
      [];
    const importer = new ImportarNfeService();
    let saved: Awaited<ReturnType<(typeof importer)['processXmlData']>> | null =
      null;
    // normalize para [{ path, filename }]
    const files = (filesArray || [])
      .map((f: any) => {
        if (!f) return null;
        if (typeof f === 'string')
          return { path: f, filename: path.basename(f) };
        if (f.path)
          return {
            path: f.path,
            filename: f.originalname || f.filename || path.basename(f.path),
          };
        if (f.destination && f.filename)
          return {
            path: path.join(f.destination, f.filename),
            filename: f.filename,
          };
        return null;
      })
      .filter(Boolean) as Array<{ path: string; filename: string }>;
    const limit = pLimit(25);
    const tasks = files.map(({ path: filePath, filename }) =>
      limit(async () => {
        let xmlContent = '';
        try {
          xmlContent = fs.readFileSync(filePath, 'utf-8');
        } catch (error: any) {
          failed.push({
            filename: filename || filePath,
            error: error.message || String(error),
          });
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (error) {}
          return;
        }

        try {
          const parsed = await parseStringPromise(xmlContent, {
            explicitArray: true,
          });
          const savedLocal = await importer['processXmlData'](
            parsed,
            'importacao_xml'
          );
          if (
            savedLocal.resposta
              ?.toString()
              .includes('Formato XML de NFe não suportado')
          ) {
            docDfeBuffer.push({
              ds_error: savedLocal.resposta?.toString(),
              ds_raw: JSON.stringify(parsed),
              ds_origem: 'DFE_SIEG',
              ds_tipo: 'NFE',
            });
            failed.push({
              filename: filePath,
              path: filePath,
              error: savedLocal.resposta?.toString() || 'Erro desconhecido',
            });
          } else if (
            savedLocal.resposta?.toString().includes(`NFe já importada`) ||
            savedLocal.resposta
              ?.toString()
              .includes(`NFe existente teve vínculo atualizado`)
          ) {
            const existsDocDfe = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_nfe: savedLocal.nfe.id,
              },
            });
            if (!existsDocDfe) {
              docDfeBuffer.push({
                id_nfe: savedLocal.nfe.id,
                ds_raw: JSON.stringify(parsed),
                ds_error: savedLocal.resposta?.toString() || null,
                dt_emissao: savedLocal.nfe.dt_emissao,
                ds_origem: 'API_IMPORTACAO_XML',
                ds_documento_emitente: savedLocal.nfe.ds_documento_emitente,
                ds_documento_destinatario:
                  savedLocal.nfe.ds_documento_destinatario,
                ds_documento_transportador:
                  savedLocal.nfe.ds_documento_transportador,
                ds_situacao_integracao: 'IMPORTADO',
                ds_tipo: 'NFE',
              });
            }
          } else if (savedLocal.resposta === null) {
            const exists = await prisma.fis_nfe.findFirst({
              where: {
                ds_chave: savedLocal.nfe.ds_chave,
                ds_numero: savedLocal.nfe.ds_numero,
              },
            });
            let nota: any = null;
            if (!exists) {
              nota = await prisma.fis_nfe.create({
                data: { ...savedLocal.nfe },
              });
            } else {
              nota = savedLocal.nfe;
            }
            if (
              nota.id_fis_empresa_destinatario !== undefined &&
              nota.id_fis_empresa_destinatario !== null
            )
              idsEmpresas.push(nota.id_fis_empresa_destinatario);
            if (
              nota.id_fis_empresa_emitente !== undefined &&
              nota.id_fis_empresa_emitente !== null
            )
              idsEmpresas.push(nota.id_fis_empresa_emitente);

            const existsDocDfe = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_nfe: nota.id,
              },
            });
            if (!existsDocDfe) {
              docDfeBuffer.push({
                id_nfe: nota.id,
                ds_raw: JSON.stringify(parsed),
                ds_error: savedLocal.resposta?.toString() || null,
                dt_emissao: savedLocal.nfe.dt_emissao,
                ds_origem: 'API_IMPORTACAO_XML',
                ds_documento_emitente: nota.ds_documento_emitente,
                ds_documento_destinatario:
                  savedLocal.nfe.ds_documento_destinatario,
                ds_documento_transportador: nota.ds_documento_transportador,
                ds_situacao_integracao: 'IMPORTADO',
                ds_tipo: 'NFE',
              });
            } else {
              // Se origem diferente, salvar em histórico
              if (existsDocDfe.ds_origem !== 'API_IMPORTACAO_XML') {
                await prisma.fis_documento_dfe_historico.create({
                  data: {
                    id_fis_documento_dfe: existsDocDfe.id,
                    ds_raw: JSON.stringify(parsed),
                    ds_origem: 'API_IMPORTACAO_XML',
                    ds_error: null,
                  },
                });
                console.log(
                  `[IMPT] NFe ${nota.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → API_IMPORTACAO_XML)`
                );
                success.push({ filename, path: filePath });
              }
              return;
            }
            nota = null;
          }
          success.push({ filename, path: filePath });
        } catch (error) {
          console.log(`Erro ao processar o XML em ${filePath}:`, error);
        }
      })
    );
    await Promise.all(tasks);
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[IMPT XML] erro ao gravar lote:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    let empresasWithFiscalModuleIds: string[] = [];
    if (idsEmpresas.length > 0) {
      empresasWithFiscalModuleIds = await verifyFiscalModule(idsEmpresas);
      if (empresasWithFiscalModuleIds.length > 0) {
        empresasWithFiscalModuleIds.map(async (empresaId) => {
          await inclusaoNfeSieg(empresaId);
        });
      }
    }
    return { success, failed };
  } catch (error) {
    console.log(`Erro: `, error);
  }
};

export const importarNfceXml = async (filesArray: any[]) => {
  try {
    const docDfeBuffer: any[] = [];
    const idsEmpresas: string[] = [];
    const success: Array<{ filename: string; path?: string }> = [];
    const failed: Array<{ filename: string; path?: string; error: string }> =
      [];
    const importer = new ImportarNfeService();
    let saved: Awaited<ReturnType<(typeof importer)['processXmlData']>> | null =
      null;
    // normalize para [{ path, filename }]
    const files = (filesArray || [])
      .map((f: any) => {
        if (!f) return null;
        if (typeof f === 'string')
          return { path: f, filename: path.basename(f) };
        if (f.path)
          return {
            path: f.path,
            filename: f.originalname || f.filename || path.basename(f.path),
          };
        if (f.destination && f.filename)
          return {
            path: path.join(f.destination, f.filename),
            filename: f.filename,
          };
        return null;
      })
      .filter(Boolean) as Array<{ path: string; filename: string }>;
    const limit = pLimit(25);
    const tasks = files.map(({ path: filePath, filename }) =>
      limit(async () => {
        let xmlContent = '';
        try {
          xmlContent = fs.readFileSync(filePath, 'utf-8');
        } catch (error: any) {
          failed.push({
            filename: filename || filePath,
            error: error.message || String(error),
          });
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (error) {}
          return;
        }

        try {
          const parsed = await parseStringPromise(xmlContent, {
            explicitArray: true,
          });
          const savedLocal = await importer['processXmlData'](
            parsed,
            'importacao_xml'
          );
          if (
            savedLocal.resposta
              ?.toString()
              .includes('Formato XML de NFe não suportado')
          ) {
            docDfeBuffer.push({
              ds_error: savedLocal.resposta?.toString(),
              ds_raw: JSON.stringify(parsed),
              ds_origem: 'API_IMPORTACAO_XML',
              ds_tipo: 'NFCE',
            });
            failed.push({
              filename: filePath,
              path: filePath,
              error: savedLocal.resposta?.toString() || 'Erro desconhecido',
            });
          } else if (
            savedLocal.resposta?.toString().includes(`NFe já importada`) ||
            savedLocal.resposta
              ?.toString()
              .includes(`NFe existente teve vínculo atualizado`)
          ) {
            const existsDocDfe = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_nfe: savedLocal.nfe.id,
              },
            });
            if (!existsDocDfe) {
              docDfeBuffer.push({
                id_nfe: savedLocal.nfe.id,
                ds_raw: JSON.stringify(parsed),
                ds_error: savedLocal.resposta?.toString() || null,
                dt_emissao: savedLocal.nfe.dt_emissao,
                ds_origem: 'API_IMPORTACAO_XML',
                ds_documento_emitente: savedLocal.nfe.ds_documento_emitente,
                ds_documento_destinatario:
                  savedLocal.nfe.ds_documento_destinatario,
                ds_documento_transportador:
                  savedLocal.nfe.ds_documento_transportador,
                ds_situacao_integracao: 'IMPORTADO',
                ds_tipo: 'NFCE',
              });
            }
          } else if (savedLocal.resposta === null) {
            const exists = await prisma.fis_nfe.findFirst({
              where: {
                ds_chave: savedLocal.nfe.ds_chave,
                ds_numero: savedLocal.nfe.ds_numero,
              },
            });
            let nota: any = null;
            if (!exists) {
              nota = await prisma.fis_nfe.create({
                data: { ...savedLocal.nfe },
              });
            } else {
              nota = savedLocal.nfe;
            }
            if (
              nota.id_fis_empresa_destinatario !== undefined &&
              nota.id_fis_empresa_destinatario !== null
            )
              idsEmpresas.push(nota.id_fis_empresa_destinatario);
            if (
              nota.id_fis_empresa_emitente !== undefined &&
              nota.id_fis_empresa_emitente !== null
            )
              idsEmpresas.push(nota.id_fis_empresa_emitente);

            const existsDocDfe = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_nfe: nota.id,
              },
            });
            if (!existsDocDfe) {
              docDfeBuffer.push({
                id_nfe: nota.id,
                ds_raw: JSON.stringify(parsed),
                ds_error: savedLocal.resposta?.toString() || null,
                dt_emissao: savedLocal.nfe.dt_emissao,
                ds_origem: 'API_IMPORTACAO_XML',
                ds_documento_emitente: nota.ds_documento_emitente,
                ds_documento_destinatario:
                  savedLocal.nfe.ds_documento_destinatario,
                ds_documento_transportador: nota.ds_documento_transportador,
                ds_situacao_integracao: 'IMPORTADO',
                ds_tipo: 'NFCE',
              });
            } else {
              // Se origem diferente, salvar em histórico
              if (existsDocDfe.ds_origem !== 'API_IMPORTACAO_XML') {
                await prisma.fis_documento_dfe_historico.create({
                  data: {
                    id_fis_documento_dfe: existsDocDfe.id,
                    ds_raw: JSON.stringify(parsed),
                    ds_origem: 'API_IMPORTACAO_XML',
                    ds_error: null,
                  },
                });
                console.log(
                  `[IMPT] NFCe ${nota.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → API_IMPORTACAO_XML)`
                );
                success.push({ filename, path: filePath });
              }
              return;
            }
            nota = null;
          }
          success.push({ filename, path: filePath });
        } catch (error) {
          console.log(`Erro ao processar o XML em ${filePath}:`, error);
        }
      })
    );
    await Promise.all(tasks);
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[IMPT XML] erro ao gravar lote:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    let empresasWithFiscalModuleIds: string[] = [];
    if (idsEmpresas.length > 0) {
      empresasWithFiscalModuleIds = await verifyFiscalModule(idsEmpresas);
      if (empresasWithFiscalModuleIds.length > 0) {
        empresasWithFiscalModuleIds.map(async (empresaId) => {
          await inclusaoNfceSieg(empresaId);
        });
      }
    }
    return { success, failed };
  } catch (error) {
    console.log(`Erro: `, error);
  }
};

export const importarCteXml = async (filesArray: any[]) => {
  try {
    const docDfeBuffer: any[] = [];
    const idsEmpresas: string[] = [];
    const success: Array<{ filename: string; path?: string }> = [];
    const failed: Array<{ filename: string; path?: string; error: string }> =
      [];
    const importer = new ImportarCteService();
    let saved: Awaited<ReturnType<(typeof importer)['processXmlData']>> | null =
      null;
    // normalize para [{ path, filename }]
    const files = (filesArray || [])
      .map((f: any) => {
        if (!f) return null;
        if (typeof f === 'string')
          return { path: f, filename: path.basename(f) };
        if (f.path)
          return {
            path: f.path,
            filename: f.originalname || f.filename || path.basename(f.path),
          };
        if (f.destination && f.filename)
          return {
            path: path.join(f.destination, f.filename),
            filename: f.filename,
          };
        return null;
      })
      .filter(Boolean) as Array<{ path: string; filename: string }>;
    const limit = pLimit(25);
    const tasks = files.map(({ path: filePath, filename }) =>
      limit(async () => {
        let xmlContent = '';
        try {
          xmlContent = fs.readFileSync(filePath, 'utf-8');
        } catch (error: any) {
          failed.push({
            filename: filename || filePath,
            error: error.message || String(error),
          });
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (error) {}
          return;
        }
        try {
          const parsed = await parseStringPromise(xmlContent, {
            explicitArray: true,
          });
          const savedLocal = await importer['processXmlData'](
            parsed,
            'importacao_xml'
          );
          if (
            savedLocal.resposta
              ?.toString()
              .includes('Formato XML de CTe não suportado')
          ) {
            docDfeBuffer.push({
              ds_error: savedLocal.resposta?.toString(),
              ds_raw: JSON.stringify(parsed),
              ds_origem: 'API_IMPORTACAO_XML',
              ds_tipo: 'CTE',
            });
            failed.push({
              filename: filePath,
              path: filePath,
              error: savedLocal.resposta?.toString() || 'Erro desconhecido',
            });
          } else if (savedLocal === null || savedLocal.cte === null) {
            return;
          } else if (
            savedLocal.resposta
              ?.toString()
              .includes(`CTe ${savedLocal.cte.ds_numero} já importado.`)
          ) {
            const existsDocDfe = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_cte: savedLocal.cte.id,
              },
            });
            if (!existsDocDfe) {
              docDfeBuffer.push({
                id_cte: savedLocal.cte.id,
                ds_raw: JSON.stringify(parsed),
                ds_error: savedLocal.resposta?.toString() || null,
                dt_emissao: savedLocal.cte.dt_emissao,
                ds_origem: 'API_IMPORTACAO_XML',
                ds_documento_emitente: savedLocal.cte.ds_documento_emitente,
                ds_documento_destinatario:
                  savedLocal.cte.ds_documento_destinatario,
                ds_documento_remetente: savedLocal.cte.ds_documento_remetente,
                ds_documento_tomador: savedLocal.cte.ds_documento_tomador,
                ds_situacao_integracao: 'IMPORTADO',
                ds_tipo: 'CTE',
              });
            }
          } else if (savedLocal.resposta === null) {
            const exists = await prisma.fis_cte.findFirst({
              where: {
                ds_chave: savedLocal.cte.ds_chave,
                ds_numero: savedLocal.cte.ds_numero,
              },
            });
            let nota: any = null;
            if (!exists) {
              nota = await prisma.fis_cte.create({
                data: { ...savedLocal.cte },
              });
            } else {
              nota = exists;
            }
            if (
              nota.id_fis_empresa_destinatario !== undefined &&
              nota.id_fis_empresa_destinatario !== null
            )
              idsEmpresas.push(nota.id_fis_empresa_destinatario);
            if (
              nota.id_fis_empresa_emitente !== undefined &&
              nota.id_fis_empresa_emitente !== null
            )
              idsEmpresas.push(nota.id_fis_empresa_emitente);

            const existsDocDfe = await prisma.fis_documento_dfe.findFirst({
              where: {
                id_cte: nota.id,
              },
            });
            if (!existsDocDfe) {
              docDfeBuffer.push({
                id_cte: nota.id,
                ds_raw: JSON.stringify(parsed),
                ds_error: savedLocal.resposta?.toString() || null,
                dt_emissao: savedLocal.cte.dt_emissao,
                ds_origem: 'API_IMPORTACAO_XML',
                ds_documento_emitente: nota.ds_documento_emitente,
                ds_documento_destinatario:
                  savedLocal.cte.ds_documento_destinatario,
                ds_documento_remetente: nota.ds_documento_remetente,
                ds_documento_tomador: nota.ds_documento_tomador,
                ds_documento_subcontratada: nota.ds_documento_subcontratada,
                ds_situacao_integracao: 'IMPORTADO',
                ds_tipo: 'CTE',
              });
            } else {
              // Se origem diferente, salvar em histórico
              if (existsDocDfe.ds_origem !== 'API_IMPORTACAO_XML') {
                await prisma.fis_documento_dfe_historico.create({
                  data: {
                    id_fis_documento_dfe: existsDocDfe.id,
                    ds_raw: JSON.stringify(parsed),
                    ds_origem: 'API_IMPORTACAO_XML',
                    ds_error: null,
                  },
                });
                console.log(
                  `[IMPT] CTe ${nota.ds_chave}: salvo em histórico (origem=${existsDocDfe.ds_origem} → API_IMPORTACAO_XML)`
                );
                success.push({ filename, path: filePath });
              }
              return;
            }
            nota = null;
          }
          success.push({ filename, path: filePath });
        } catch (error) {
          console.log(`Erro ao processar o XML em ${filePath}:`, error);
        }
      })
    );
    await Promise.all(tasks);
    if (docDfeBuffer.length) {
      try {
        await prisma.fis_documento_dfe.createMany({
          data: docDfeBuffer,
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('[IMPT XML] erro ao gravar lote:', e);
      } finally {
        docDfeBuffer.length = 0;
      }
    }
    let empresasWithFiscalModuleIds: string[] = [];
    if (idsEmpresas.length > 0) {
      console.log(idsEmpresas);
      console.log('Verificando módulos fiscais...');
      empresasWithFiscalModuleIds = await verifyFiscalModule(idsEmpresas);
      if (empresasWithFiscalModuleIds.length > 0) {
        empresasWithFiscalModuleIds.map(async (empresaId) => {
          await inclusaoCteSieg(empresaId);
        });
      }
    }
    return { success, failed };
  } catch (error) {
    console.log(`Erro: `, error);
  }
};

// Importação multitipo (NFe, NFCe, CTe) com limite de 5 documentos simultâneos
export const importarXmls = async (
  filesArray: any[],
  competencia?: string,
  empresaId?: string
) => {
  console.log(competencia, empresaId);
  const limit = pLimit(5);
  let haveCte = false;
  let haveNfe = false;
  const normalizeFiles = (filesArray || [])
    .map((f: any) => {
      if (!f) return null;
      if (typeof f === 'string') return { path: f, filename: path.basename(f) };
      if (f.path)
        return {
          path: f.path,
          filename: f.originalname || f.filename || path.basename(f.path),
        };
      if (f.destination && f.filename)
        return {
          path: path.join(f.destination, f.filename),
          filename: f.filename,
        };
      return null;
    })
    .filter(Boolean) as Array<{ path: string; filename: string }>;

  const aggregate = {
    nfe: {
      success: [] as Array<{ filename: string; path?: string }>,
      failed: [] as Array<{ filename: string; path?: string; error: string }>,
    },
    nfce: {
      success: [] as Array<{ filename: string; path?: string }>,
      failed: [] as Array<{ filename: string; path?: string; error: string }>,
    },
    cte: {
      success: [] as Array<{ filename: string; path?: string }>,
      failed: [] as Array<{ filename: string; path?: string; error: string }>,
    },
    desconhecido: [] as Array<{
      filename: string;
      path?: string;
      error: string;
    }>,
  };

  await Promise.all(
    normalizeFiles.map((file) =>
      limit(async () => {
        let xmlContent = '';
        try {
          xmlContent = fs.readFileSync(file.path, 'utf-8');
        } catch (error: any) {
          aggregate.desconhecido.push({
            filename: file.filename,
            path: file.path,
            error: error.message || 'Erro ao ler arquivo',
          });
          return;
        }

        const tipo = await identificarTipoXmlFiscal(xmlContent);

        if (tipo === 'NFE') {
          const res = await importarNfeXml([file]);
          aggregate.nfe.success.push(...res.success);
          aggregate.nfe.failed.push(...res.failed);
          haveNfe = true;
          return;
        }

        if (tipo === 'NFCE') {
          const res = await importarNfceXml([file]);
          aggregate.nfce.success.push(...res.success);
          aggregate.nfce.failed.push(...res.failed);
          haveNfe = true;
          return;
        }

        if (tipo === 'CTE') {
          const res = await importarCteXml([file]);
          aggregate.cte.success.push(...res.success);
          aggregate.cte.failed.push(...res.failed);
          haveCte = true;
          return;
        }

        aggregate.desconhecido.push({
          filename: file.filename,
          path: file.path,
          error: 'Tipo não identificado',
        });
      })
    )
  );
  if (empresaId && competencia) {
    if (haveCte) {
      setCtesContra({ empresaId, competencia });
      inclusaoCteSieg(empresaId);
    }
    if (haveNfe) {
      setNfesProcessados({ empresaId, competencia });
      setNfesRelacionadasProcessados({
        empresaId: empresaId,
        competencia: competencia,
      });
      inclusaoNfeSieg(empresaId);
      inclusaoNfceSieg(empresaId);
    }
  }
  return aggregate;
};
