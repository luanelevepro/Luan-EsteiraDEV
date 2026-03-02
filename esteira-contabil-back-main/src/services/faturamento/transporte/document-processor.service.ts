// src/services/faturamento/transporte/document-processor.service.ts

import { PrismaClient, Prisma } from '@prisma/client';
import { parseStringPromise } from 'xml2js';

interface ParsedNFeXML {
  nfeProc: {
    NFe: Array<{
      infNFe: Array<{
        $: { Id: string };
        ide: Array<{
          cUF: string[];
          cNF: string[];
          natOp: string[];
          mod: string[];
          serie: string[];
          nNF: string[];
          dhEmi: string[];
          dhSaiEnt?: string[];
          idDest?: string[];
          cMunFG: string[];
          finNFe?: string[];
        }>;
        emit: Array<{
          CNPJ?: string[];
          CPF?: string[];
          xNome: string[];
          CRT?: string[];
        }>;
        dest: Array<{
          CNPJ?: string[];
          CPF?: string[];
          xNome: string[];
        }>;
        det: Array<{
          $: { nItem: string };
          prod: Array<{
            cProd: string[];
            cEAN?: string[];
            xProd: string[];
            NCM?: string[];
            CEST?: string[];
            CFOP?: string[];
            uCom: string[];
            qCom: string[];
            vUnCom: string[];
            vProd: string[];
            cEANTrib?: string[];
            uTrib: string[];
            qTrib: string[];
            vUnTrib: string[];
            vTotTrib?: string[];
            cProdANP?: string[];
            descANP?: string[];
          }>;
          imposto: Array<{
            vTotTrib?: string[];
            ICMS: Array<{
              [key: string]: Array<{
                orig?: string[];
                CST?: string[];
                CSOSN?: string[];
                vBC?: string[];
                pICMS?: string[];
                vICMS?: string[];
                vBCMono?: string[];
                pMono?: string[];
                vICMSMono?: string[];
              }>;
            }>;
            IPI?: Array<{
              cEnq?: string[];
              IPITrib?: Array<{ CST?: string[] }>;
              IPINT?: Array<{ CST?: string[] }>;
            }>;
            PIS: Array<{
              [key: string]: Array<{
                CST?: string[];
                vBC?: string[];
                pPIS?: string[];
                vPIS?: string[];
              }>;
            }>;
            COFINS: Array<{
              [key: string]: Array<{
                CST?: string[];
                vBC?: string[];
                pCOFINS?: string[];
                vCOFINS?: string[];
              }>;
            }>;
          }>;
        }>;
        total: Array<{
          ICMSTot: Array<{
            vBC: string[];
            vICMS: string[];
            vICMSDeson?: string[];
            vFCP?: string[];
            vBCST?: string[];
            vST?: string[];
            vFCPST?: string[];
            vFCPSTRet?: string[];
            vProd: string[];
            vFrete: string[];
            vSeg: string[];
            vDesc: string[];
            vII?: string[];
            vIPI?: string[];
            vIPIDevol?: string[];
            vPIS: string[];
            vCOFINS: string[];
            vOutro: string[];
            vNF: string[];
            vTotTrib?: string[];
          }>;
        }>;
      }>;
    }>;
    protNFe?: Array<{
      infProt: Array<{
        chNFe: string[];
      }>;
    }>;
  };
}

interface ParsedCTeXML {
  cteProc: {
    CTe: Array<{
      infCte: Array<{
        $: { Id: string };
        ide: Array<{
          cUF: string[];
          cCT: string[];
          CFOP: string[];
          natOp: string[];
          mod: string[];
          serie: string[];
          nCT: string[];
          dhEmi: string[];
          tpImp?: string[];
          tpEmis?: string[];
          cDV?: string[];
          tpAmb?: string[];
          tpCTe?: string[];
          procEmi?: string[];
          verProc?: string[];
          cMunEnv: string[];
          xMunEnv: string[];
          UFEnv: string[];
          modal: string[];
          tpServ: string[];
          cMunIni: string[];
          xMunIni: string[];
          UFIni: string[];
          cMunFim: string[];
          xMunFim: string[];
          UFFim: string[];
          retira?: string[];
          xDetRetira?: string[];
          indIEToma?: string[];
          toma3?: Array<{ toma: string[] }>;
          cMun?: string[];
        }>;
        compl?: Array<{
          xObs?: string[];
        }>;
        emit: Array<{
          CNPJ?: string[];
          CPF?: string[];
          IE?: string[];
          xNome: string[];
          xFant?: string[];
          enderEmit: Array<{
            xLgr: string[];
            nro: string[];
            xCpl?: string[];
            xBairro: string[];
            cMun: string[];
            xMun: string[];
            CEP?: string[];
            UF: string[];
            fone?: string[];
          }>;
        }>;
        rem?: Array<{
          CNPJ?: string[];
          CPF?: string[];
          IE?: string[];
          xNome: string[];
          xFant?: string[];
          fone?: string[];
          enderReme: Array<{
            xLgr: string[];
            nro: string[];
            xCpl?: string[];
            xBairro: string[];
            cMun: string[];
            xMun: string[];
            CEP?: string[];
            UF: string[];
            cPais?: string[];
            xPais?: string[];
          }>;
          email?: string[];
        }>;
        dest?: Array<{
          CNPJ?: string[];
          CPF?: string[];
          IE?: string[];
          xNome: string[];
          fone?: string[];
          ISUF?: string[];
          enderDest: Array<{
            xLgr: string[];
            nro: string[];
            xCpl?: string[];
            xBairro: string[];
            cMun: string[];
            xMun: string[];
            CEP?: string[];
            UF: string[];
            cPais?: string[];
            xPais?: string[];
          }>;
          email?: string[];
        }>;
        vPrest: Array<{
          vTPrest: string[];
          vRec: string[];
          Comp?: Array<{
            xNome: string[];
            vComp: string[];
          }>;
        }>;
        imp: Array<{
          ICMS: Array<{
            [key: string]: Array<{
              CST?: string[];
              vBC?: string[];
              pICMS?: string[];
              vICMS?: string[];
              vBCSTRet?: string[];
              vICMSSTRet?: string[];
              pICMSSTRet?: string[];
              vCred?: string[];
            }>;
          }>;
          vTotTrib: string[];
          infAdFisco?: string[];
        }>;
        infCTeNorm?: Array<{
          infCarga: Array<{
            vCarga: string[];
            proPred: string[];
            xOutCat?: string[];
            infQ: Array<{
              cUnid: string[];
              tpMed: string[];
              qCarga: string[];
            }>;
          }>;
          infDoc?: Array<{
            infNFe?: Array<{
              chave: string[];
            }>;
          }>;
        }>;
      }>;
    }>;
    protCTe?: Array<{
      infProt: Array<{
        chCTe: string[];
      }>;
    }>;
  };
}

type DocumentInsertObject =
  | { type: 'NFe'; data: Prisma.fis_nfeCreateInput }
  | { type: 'CTe'; data: Prisma.fis_cteCreateInput }
  | null;

class DocumentProcessorService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Creates a Prisma create object for fis_nfe from parsed XML
   */
  private createNFeInsertObject(
    parsedXML: ParsedNFeXML,
    idFisEmpresaDestinatario: string,
    idFisFornecedor?: string
  ): Prisma.fis_nfeCreateInput {
    const nfe = parsedXML.nfeProc.NFe[0].infNFe[0];
    const ide = nfe.ide[0];
    const emit = nfe.emit[0];
    const dest = nfe.dest[0];
    const total = nfe.total[0].ICMSTot[0];
    const chave = parsedXML.nfeProc.protNFe?.[0]?.infProt[0]?.chNFe[0] || '';

    // Process items
    const itens = nfe.det.map((det) => {
      const prod = det.prod[0];
      const imposto = det.imposto[0];

      // Get ICMS data
      const icmsKey = Object.keys(imposto.ICMS[0]).find((k) =>
        k.startsWith('ICMS')
      );
      const icmsData = icmsKey ? imposto.ICMS[0][icmsKey][0] : {};

      // Get PIS data
      const pisKey = Object.keys(imposto.PIS[0]).find((k) =>
        k.startsWith('PIS')
      );
      const pisData = pisKey ? imposto.PIS[0][pisKey][0] : {};

      // Get COFINS data
      const cofinsKey = Object.keys(imposto.COFINS[0]).find((k) =>
        k.startsWith('COFINS')
      );
      const cofinsData = cofinsKey ? imposto.COFINS[0][cofinsKey][0] : {};

      // Get IPI data
      const ipiData = imposto.IPI?.[0];
      const ipiCst =
        ipiData?.IPITrib?.[0]?.CST?.[0] || ipiData?.IPINT?.[0]?.CST?.[0];

      return {
        ds_ordem: parseInt(det.$.nItem),
        ds_produto: prod.xProd[0],
        cd_produto_anp: prod.cProdANP?.[0],
        ds_produto_anp_descricao: prod.descANP?.[0],
        ds_codigo: prod.cProd[0],
        ds_unidade: prod.uCom[0],
        vl_base_calculo_icms: icmsData.vBC?.[0],
        vl_quantidade: prod.qCom[0],
        vl_unitario: prod.vUnCom[0],
        vl_total: prod.vProd[0],
        vl_icms: icmsData.vICMS?.[0],
        ds_icms_tag: icmsKey,
        ds_cst: icmsData.CST?.[0] || icmsData.CSOSN?.[0],
        ds_origem: icmsData.orig?.[0],
        vl_pis: pisData.vPIS?.[0],
        vl_porcentagem_pis: pisData.pPIS?.[0],
        vl_base_calculo_pis: pisData.vBC?.[0],
        cd_cst_pis: pisData.CST?.[0],
        vl_cofins: cofinsData.vCOFINS?.[0],
        vl_porcentagem_cofins: cofinsData.pCOFINS?.[0],
        vl_base_calculo_cofins: cofinsData.vBC?.[0],
        cd_cst_cofins: cofinsData.CST?.[0],
        ds_unidade_tributavel: prod.uTrib[0],
        vl_quantidade_tributavel: prod.qTrib[0],
        vl_total_tributavel: prod.vTotTrib?.[0],
        vl_unitario_tributavel: prod.vUnTrib[0],
        ds_porcentagem_icms: icmsData.pICMS?.[0],
        ds_enquadramento_ipi: ipiData?.cEnq?.[0],
        ds_ipi_nao_tributavel_cst: ipiCst,
        ds_pis_nao_tributavel_cst: pisData.CST?.[0],
        ds_cofins_nao_tributavel_cst: cofinsData.CST?.[0],
        ds_base_calculo_mono: icmsData.vBCMono?.[0],
        ds_porcentagem_mono: icmsData.pMono?.[0],
        vl_icms_mono: icmsData.vICMSMono?.[0],
        cd_ncm: prod.NCM?.[0],
        cd_cest: prod.CEST?.[0],
        cd_cfop: prod.CFOP?.[0],
        cd_barras: prod.cEAN?.[0],
      };
    });

    const nfeObject: Prisma.fis_nfeCreateInput = {
      ds_id_nfe: nfe.$.Id,
      ds_chave: chave,
      ds_uf: ide.cUF[0],
      cd_nf: ide.cNF[0],
      ds_natureza_operacao: ide.natOp[0],
      ds_modelo: ide.mod[0],
      ds_serie: ide.serie[0],
      ds_numero: ide.nNF[0],
      dt_emissao: new Date(ide.dhEmi[0]),
      dt_saida_entrega: ide.dhSaiEnt ? new Date(ide.dhSaiEnt[0]) : null,
      cd_tipo_operacao: ide.idDest?.[0],
      cd_municipio: ide.cMunFG[0],
      ds_fin_nfe: ide.finNFe?.[0],
      vl_base_calculo: total.vBC[0],
      vl_produto: total.vProd[0],
      vl_nf: total.vNF[0],
      vl_frete: total.vFrete[0],
      vl_seg: total.vSeg[0],
      vl_desc: total.vDesc[0],
      vl_ii: total.vII?.[0],
      vl_ipi: total.vIPI?.[0],
      vl_ipidevol: total.vIPIDevol?.[0],
      vl_pis: total.vPIS[0],
      vl_cofins: total.vCOFINS[0],
      vl_outros: total.vOutro[0],
      vl_bc: total.vBC[0],
      vl_icms: total.vICMS[0],
      vl_icms_desoner: total.vICMSDeson?.[0],
      ds_base_calculo_mono_total: total.vBC?.[0],
      ds_porcentagem_mono_total: undefined,
      js_itens: nfe.det,
      ds_documento_emitente: emit.CNPJ?.[0] || emit.CPF?.[0],
      ds_razao_social_emitente: emit.xNome[0],
      cd_crt_emitente: emit.CRT?.[0],
      ds_documento_destinatario: dest.CNPJ?.[0] || dest.CPF?.[0],
      ds_razao_social_destinatario: dest.xNome[0],
      fis_empresa_destinatario: {
        connect: { id: idFisEmpresaDestinatario },
      },
      fis_fornecedor: idFisFornecedor
        ? {
            connect: { id: idFisFornecedor },
          }
        : undefined,
      fis_nfe_itens: {
        create: itens,
      },
    };

    return nfeObject;
  }

  /**
   * Creates a Prisma create object for fis_cte from parsed XML
   */
  private createCTeInsertObject(
    parsedXML: ParsedCTeXML,
    idFisEmpresaDestinatario?: string,
    idFisEmpresaRemetente?: string,
    idFisEmpresaTomador?: string,
    idFisFornecedor?: string
  ): Prisma.fis_cteCreateInput {
    const cte = parsedXML.cteProc.CTe[0].infCte[0];
    const ide = cte.ide[0];
    const emit = cte.emit[0];
    const rem = cte.rem?.[0];
    const dest = cte.dest?.[0];
    const vPrest = cte.vPrest[0];
    const imp = cte.imp[0];
    const chave = parsedXML.cteProc.protCTe?.[0]?.infProt[0]?.chCTe[0] || '';

    // Get ICMS data
    const icmsKey = Object.keys(imp.ICMS[0]).find((k) => k.startsWith('ICMS'));
    const icmsData = icmsKey ? imp.ICMS[0][icmsKey][0] : {};

    // Process carga items
    const infCarga = cte.infCTeNorm?.[0]?.infCarga[0];
    const cargaItems =
      infCarga?.infQ?.map((item) => ({
        ds_und: item.cUnid[0],
        ds_tipo_medida: item.tpMed[0],
        vl_qtd_carregada: item.qCarga[0],
      })) || [];

    // Process componentes de valor
    const compItems =
      vPrest.Comp?.map((comp) => ({
        ds_nome: comp.xNome[0],
        vl_comp: comp.vComp[0],
      })) || [];

    // Get all NFe keys from infNFe array
    const nfeKeys = Array.from(
      new Set(
        (cte.infCTeNorm?.[0]?.infDoc?.[0]?.infNFe || [])
          .map((nfe) => nfe.chave?.[0])
          .filter(Boolean)
      )
    );

    // Endereço do remetente : rem.enderReme
    const enderReme = rem?.enderReme?.[0];
    const ds_endereco_remetente = enderReme
      ? [
          enderReme.xLgr?.[0],
          enderReme.nro?.[0] ? `, ${enderReme.nro[0]}` : '',
          enderReme.xBairro?.[0] ? ` - ${enderReme.xBairro[0]}` : '',
          enderReme.xMun?.[0] && enderReme.UF?.[0]
            ? ` - ${enderReme.xMun[0]}/${enderReme.UF[0]}`
            : '',
          enderReme.CEP?.[0] ? ` - CEP ${enderReme.CEP[0]}` : '',
        ]
          .filter(Boolean)
          .join('')
          .trim() || undefined
      : undefined;
    const ds_complemento_remetente = enderReme?.xCpl?.[0]?.trim() || undefined;

    const cteObject: Prisma.fis_cteCreateInput = {
      ds_id_cte: cte.$.Id,
      ds_chave: chave,
      js_chaves_nfe: nfeKeys.length ? (nfeKeys as any) : undefined,
      ds_uf: ide.cUF[0],
      cd_ibge: ide.cMun?.[0],
      cd_cte: ide.cCT[0],
      ds_cfop: ide.CFOP[0],
      ds_icms_tag: icmsKey,
      ds_natureza_operacao: ide.natOp[0],
      ds_modelo: parseInt(ide.mod[0]),
      ds_serie: parseInt(ide.serie[0]),
      ds_numero: ide.nCT[0],
      dt_emissao: new Date(ide.dhEmi[0]),
      ds_tp_cte: ide.tpCTe ? parseInt(ide.tpCTe[0]) : null,
      ds_modal: ide.modal[0],
      ds_tp_serv: ide.tpServ ? parseInt(ide.tpServ[0]) : null,
      cd_mun_env: ide.cMunEnv[0],
      ds_nome_mun_env: ide.xMunEnv[0],
      ds_uf_env: ide.UFEnv[0],
      cd_mun_ini: ide.cMunIni[0],
      ds_nome_mun_ini: ide.xMunIni[0],
      ds_uf_ini: ide.UFIni[0],
      cd_mun_fim: ide.cMunFim[0],
      ds_nome_mun_fim: ide.xMunFim[0],
      ds_uf_fim: ide.UFFim[0],
      ds_retira: ide.retira ? parseInt(ide.retira[0]) : null,
      ds_ind_ie_toma: ide.indIEToma ? parseInt(ide.indIEToma[0]) : null,
      ds_documento_emitente: emit.CNPJ?.[0] || emit.CPF?.[0],
      ds_razao_social_emitente: emit.xNome[0],
      ds_documento_remetente: rem?.CNPJ?.[0] || rem?.CPF?.[0],
      ds_razao_social_remetente: rem?.xNome[0],
      ds_endereco_remetente: ds_endereco_remetente || undefined,
      ds_complemento_remetente: ds_complemento_remetente || undefined,
      ds_documento_destinatario: dest?.CNPJ?.[0] || dest?.CPF?.[0],
      ds_razao_social_destinatario: dest?.xNome[0],
      ds_documento_tomador: undefined,
      ds_razao_social_tomador: undefined,
      vl_total: vPrest.vTPrest[0],
      vl_rec: vPrest.vRec[0],
      vl_total_trib: imp.vTotTrib[0],
      ds_cst_tributacao: icmsData.CST?.[0],
      vl_base_calculo_icms: icmsData.vBC?.[0],
      vl_icms: icmsData.vICMS?.[0],
      cd_icms: icmsData.CST?.[0],
      vl_porcentagem_icms: icmsData.pICMS?.[0],
      fis_empresa_destinatario: idFisEmpresaDestinatario
        ? {
            connect: { id: idFisEmpresaDestinatario },
          }
        : undefined,
      fis_empresa_remetente: idFisEmpresaRemetente
        ? {
            connect: { id: idFisEmpresaRemetente },
          }
        : undefined,
      fis_empresa_tomador: idFisEmpresaTomador
        ? {
            connect: { id: idFisEmpresaTomador },
          }
        : undefined,
      fis_fornecedor: idFisFornecedor
        ? {
            connect: { id: idFisFornecedor },
          }
        : undefined,
      fis_cte_carga: {
        create: cargaItems,
      },
      fis_cte_comp_carga: {
        create: compItems,
      },
    };

    return cteObject;
  }

  /**
   * Auto-detects XML type and creates appropriate insert object
   */
  async createDocumentInsertObject(
    xmlContent: string,
    idFisEmpresaDestinatario: string,
    idFisFornecedor?: string,
    idFisEmpresaRemetente?: string,
    idFisEmpresaTomador?: string
  ): Promise<DocumentInsertObject> {
    try {
      const parsedXML = await parseStringPromise(xmlContent, {
        explicitArray: true,
        mergeAttrs: false,
        trim: true,
      });

      // Check if it's an NFe
      if (parsedXML.nfeProc) {
        console.log('   📄 Detected NFe document');
        const nfeData = this.createNFeInsertObject(
          parsedXML as ParsedNFeXML,
          idFisEmpresaDestinatario,
          idFisFornecedor
        );
        return { type: 'NFe', data: nfeData };
      }

      // Check if it's a CTe
      if (parsedXML.cteProc) {
        console.log('   🚚 Detected CTe document');
        const cteData = this.createCTeInsertObject(
          parsedXML as ParsedCTeXML,
          idFisEmpresaDestinatario,
          idFisEmpresaRemetente,
          idFisEmpresaTomador,
          idFisFornecedor
        );
        return { type: 'CTe', data: cteData };
      }

      console.log('   ⚠️  Unknown document type');
      return null;
    } catch (error: any) {
      console.error('   ❌ Error parsing XML:', error.message);
      throw new Error(`Failed to parse XML: ${error.message}`);
    }
  }

  /**
   * Save document to database (auto-detects type)
   */
  async saveDocumentToDatabase(
    xmlContent: string,
    idFisEmpresaDestinatario: string,
    idFisFornecedor?: string,
    idFisEmpresaRemetente?: string,
    idFisEmpresaTomador?: string
  ): Promise<{ type: 'NFe' | 'CTe'; id: string } | null> {
    const documentObject = await this.createDocumentInsertObject(
      xmlContent,
      idFisEmpresaDestinatario,
      idFisFornecedor,
      idFisEmpresaRemetente,
      idFisEmpresaTomador
    );

    if (!documentObject) {
      console.log('   ❌ Unable to create document object');
      return null;
    }

    try {
      if (documentObject.type === 'NFe') {
        const nfe = await this.prisma.fis_nfe.create({
          data: documentObject.data,
        });
        console.log(`   ✅ NFe created with ID: ${nfe.id}`);
        return { type: 'NFe', id: nfe.id };
      } else if (documentObject.type === 'CTe') {
        const cte = await this.prisma.fis_cte.create({
          data: documentObject.data,
        });
        console.log(`   ✅ CTe created with ID: ${cte.id}`);
        return { type: 'CTe', id: cte.id };
      }

      return null;
    } catch (error: any) {
      console.error(
        `   ❌ Error saving ${documentObject.type} to database:`,
        error.message
      );
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default new DocumentProcessorService();
