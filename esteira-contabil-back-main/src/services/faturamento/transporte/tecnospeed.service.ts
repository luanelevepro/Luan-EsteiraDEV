import axios from 'axios';
import { OrigemExtracao, PrismaClient } from '@prisma/client';
import { parseStringPromise } from 'xml2js';
import { Builder } from 'xml2js';

const prisma = new PrismaClient();

interface GenerateCTeParams {
  id_empresa: string;
  nfe_ids: string[];
  dados_adicionais?: {
    serie?: string;
    modal?: string;
    tpServ?: string;
    RNTRC?: string;
    dPrev?: string;
    observacoes?: string;
    cfop?: string;
  };
}

interface CTeResponse {
  success: boolean;
  message: string;
  cte_numero?: string;
  protocolo?: string;
  xml_retorno?: string;
  error?: string;
}
interface ICMSData {
  cst: string;
  vBC?: string;
  pICMS?: string;
  vICMS?: string;
  vICMSDeson?: string;
  motDesICMS?: string;
}

interface GenerateMDFeParams {
  id_empresa: string;
  cte_ids?: string[];
  nfe_ids?: string[];
  dados_adicionais: {
    serie?: string;
    modal?: string;
    ufIni: string;
    ufFim: string;
    municipioDescarga: {
      cMun: string;
      xMun: string;
    };
    municipioCarrega: {
      cMun: string;
      xMun: string;
    };
    percurso?: Array<{
      id: string;
      uf: string;
      cidade?: string;
    }>;
    seg?: {
      infresp: string; // 1 - Emitente do MDF-e, 2 - Responsável pela contratação do serviço de transporte
      cnpj?: string; // Obrigatório apenas se responsável pelo seguro for (2) - pessoa jurídica
      cpf?: string; // Obrigatório apenas se responsável pelo seguro for (2) - pessoa física
    };
    seguradora?: {
      nome: string;
      cnpj: string;
      apolice: string;
      averbacao?: string;
    };
    veiculo: {
      id_motorista?: string;
      id_veiculo?: string;
      placa: string;
      tara: string;
      capKG: string;
      capM3?: string;
      tpRod: string; // 01 – Truck, 02 – Toco, 03 – Cavalo Mecânico, 04 – VAN, 05 – Utilitário, 06 – Outros
      tpCar: string; // 00 – Não aplicável, 01 – Aberta, 02 – Fechada/Baú, 03 – Granelera, 04 – Porta Container, 05 – Sider
      uf: string;
      RNTRC?: string;
    };
    condutor: {
      nome: string;
      cpf: string;
    };
    contratantes?: string[];
    observacoes?: string;
    infAdFisco?: string;
  };
}

interface MDFeResponse {
  success: boolean;
  message: string;
  mdfe_numero?: string;
  protocolo?: string;
  chave?: string;
  xml_retorno?: string;
  error?: string;
}

interface CTeParsedData {
  chave: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  valorCarga: string;
  pesoCarga?: string;
  ufIni?: string;
  ufFim?: string;
  cMunIni?: string;
  xMunIni?: string;
  cMunFim?: string;
  xMunFim?: string;
  modal?: string;
  rntrc?: string;
}

interface NFeParsedData {
  chave: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  emitente?: {
    CNPJ: string;
    IE: string;
    xNome: string;
    xFant?: string;
    endereco: {
      xLgr: string;
      nro: string;
      xCpl?: string;
      xBairro: string;
      cMun: string;
      xMun: string;
      CEP: string;
      UF: string;
      fone?: string;
    };
  };
  destinatario?: {
    CNPJ?: string;
    CPF?: string;
    IE?: string;
    xNome: string;
    endereco: {
      xLgr: string;
      nro: string;
      xCpl?: string;
      xBairro: string;
      cMun: string;
      xMun: string;
      CEP: string;
      UF: string;
      fone?: string;
    };
    email?: string;
  };
  valores: {
    vNF: string;
    vProd?: string;
    vFrete?: string;
    pesoTotal?: string;
  };
  produtos?: Array<{
    xProd: string;
    qCom: string;
    uCom: string;
    vProd: string;
  }>;
  icmsData: ICMSData;
  transporte?: {
    placa?: string;
    uf?: string;
    rntc?: string;
  };
}

interface CTeRetorno {
  numero: string;
  chave: string;
  codigo: string;
  mensagem: string;
}

class TecnospeedService {
  private readonly tecnospeedUrl = process.env.TECNOSPEED_URL;
  private readonly tecnospeedUser = process.env.TECNOSPEED_USER;
  private readonly tecnospeedPassword = process.env.TECNOSPEED_PASSWORD;
  private readonly tecnospeedGroup = process.env.TECNOSPEED_GROUP;
  private readonly tecnospeedAmb = process.env.TECNOSPEED_AMB;

  private getAuthHeader(): string {
    if (!this.tecnospeedUser || !this.tecnospeedPassword) {
      throw new Error(
        'TECNOSPEED_USER e TECNOSPEED_PASSWORD devem estar configurados nas variáveis de ambiente'
      );
    }

    const user = this.tecnospeedUser.trim();
    const password = this.tecnospeedPassword.trim();
    const credentials = `${user}:${password}`;

    const base64Credentials = Buffer.from(credentials, 'utf-8').toString(
      'base64'
    );
    console.log('🔐 Base64:', base64Credentials);

    const authHeader = `Basic ${base64Credentials}`;
    console.log('🔐 Full Authorization header:', authHeader);

    return authHeader;
  }

  async testAuthenticationDetailed(): Promise<any> {
    try {
      console.log('🔍 Testando autenticação detalhada...');
      console.log('URL:', this.tecnospeedUrl);
      console.log('User:', this.tecnospeedUser);
      console.log('Password length:', this.tecnospeedPassword?.length);
      console.log('Group:', this.tecnospeedGroup);

      const statusResponse = await axios.get(
        `${this.tecnospeedUrl}/ManagerAPIWeb/cte/status`,
        {
          headers: {
            Authorization: this.getAuthHeader(),
          },
        }
      );

      console.log('✅ Status response:', statusResponse.data);

      const listResponse = await axios.post(
        `${this.tecnospeedUrl}/ManagerAPIWeb/cte/lista`,
        new URLSearchParams({
          Grupo: this.tecnospeedGroup || 'Eleve',
          CNPJ: '04896658000184',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: this.getAuthHeader(),
          },
        }
      );

      console.log('✅ List response:', listResponse.data);

      return { status: statusResponse.data, list: listResponse.data };
    } catch (error: any) {
      console.error('❌ Detalhes do erro:');
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
      console.error('Data:', error.response?.data);
      throw error;
    }
  }

  private async parseCTeXML(xmlContent: string): Promise<CTeParsedData> {
    try {
      let parsed: any;
      const trimmedContent = xmlContent.trim();

      if (trimmedContent.startsWith('{')) {
        parsed = JSON.parse(xmlContent);
      } else if (trimmedContent.startsWith('<')) {
        parsed = await parseStringPromise(xmlContent);
      } else {
        throw new Error('Formato de conteúdo inválido - não é JSON nem XML');
      }

      let infCte: any;

      if (parsed.cteProc?.CTe?.[0]?.infCte?.[0]) {
        infCte = parsed.cteProc.CTe[0].infCte[0];
      } else if (parsed.CTe?.[0]?.infCte?.[0]) {
        infCte = parsed.CTe[0].infCte[0];
      } else if (parsed.infCte?.[0]) {
        infCte = parsed.infCte[0];
      } else if (parsed.infCte && !Array.isArray(parsed.infCte)) {
        infCte = parsed.infCte;
      } else {
        throw new Error('XML não é um CT-e válido - estrutura não reconhecida');
      }

      const getValue = (obj: any, isArray: boolean = true): any => {
        if (!obj) return undefined;
        return isArray && Array.isArray(obj) ? obj[0] : obj;
      };

      const ide = getValue(infCte.ide);
      const vPrest = getValue(infCte.vPrest);

      if (!ide || !vPrest) {
        throw new Error(
          'CT-e inválido - faltam dados essenciais (ide ou vPrest)'
        );
      }

      let chave: string;
      if (infCte.$?.Id) {
        chave = infCte.$.Id.replace('CTe', '');
      } else if (infCte.Id) {
        chave = infCte.Id.replace('CTe', '');
      } else {
        throw new Error('Chave do CT-e não encontrada');
      }

      let pesoCarga = '0';
      try {
        const infCarga = getValue(getValue(infCte.infCTeNorm)?.infCarga);
        const infQ = getValue(infCarga?.infQ);
        if (infQ?.qCarga) {
          pesoCarga = getValue(infQ.qCarga);
        }
      } catch (e) {
        console.log('Peso não encontrado no CT-e');
      }

      // Extract route data for MDFe auto-fill
      let ufIni, ufFim, cMunIni, xMunIni, cMunFim, xMunFim, modal, rntrc;
      try {
        ufIni = getValue(ide.UFIni);
        ufFim = getValue(ide.UFFim);
        cMunIni = getValue(ide.cMunIni);
        xMunIni = getValue(ide.xMunIni);
        cMunFim = getValue(ide.cMunFim);
        xMunFim = getValue(ide.xMunFim);
        modal = getValue(ide.modal);

        const infModal = getValue(getValue(infCte.infCTeNorm)?.infModal);
        const rodo = getValue(infModal?.rodo);
        rntrc = getValue(rodo?.RNTRC);
      } catch (e) {
        console.log('Alguns campos de rota não encontrados no CT-e');
      }

      return {
        chave,
        numero: getValue(ide.nCT),
        serie: getValue(ide.serie),
        dataEmissao: getValue(ide.dhEmi),
        valorCarga: getValue(vPrest.vTPrest),
        pesoCarga,
        ufIni,
        ufFim,
        cMunIni,
        xMunIni,
        cMunFim,
        xMunFim,
        modal,
        rntrc,
      };
    } catch (error: any) {
      console.error('Erro ao parsear XML do CT-e:', error.message);
      throw new Error(`Falha ao processar XML do CT-e: ${error.message}`);
    }
  }

  private async parseNFeXML(xmlContent: string): Promise<NFeParsedData> {
    try {
      let parsed: any;

      if (xmlContent.trim().startsWith('{')) {
        parsed = JSON.parse(xmlContent);
      } else {
        parsed = await parseStringPromise(xmlContent);
      }

      if (!parsed.nfeProc?.NFe?.[0]?.infNFe?.[0]) {
        throw new Error('XML não é uma NF-e válida');
      }

      const infNFe = parsed.nfeProc.NFe[0].infNFe[0];
      const ide = infNFe.ide[0];
      const emit = infNFe.emit?.[0];
      const dest = infNFe.dest?.[0];
      const total = infNFe.total[0].ICMSTot[0];
      const produtos =
        infNFe.det?.map((det: any) => ({
          xProd: det.prod[0].xProd[0],
          qCom: det.prod[0].qCom[0],
          uCom: det.prod[0].uCom[0],
          vProd: det.prod[0].vProd[0],
        })) || [];

      let pesoTotal = '0';
      try {
        const transp = infNFe.transp?.[0];
        if (transp?.vol?.[0]?.pesoB?.[0]) {
          pesoTotal = transp.vol[0].pesoB[0];
        } else if (transp?.vol?.[0]?.pesoL?.[0]) {
          pesoTotal = transp.vol[0].pesoL[0];
        }
      } catch (e) {
        console.log('Peso não encontrado na NF-e');
      }

      let icmsData: ICMSData | undefined;
      try {
        const primeiroItem = infNFe.det?.[0];
        if (primeiroItem?.imposto?.[0]?.ICMS?.[0]) {
          const icms = primeiroItem.imposto[0].ICMS[0];

          const extrairValor = (valor: any): string | undefined => {
            if (!valor) return undefined;
            const num = parseFloat(String(valor).replace(',', '.'));
            if (isNaN(num)) return undefined;
            return num.toFixed(2);
          };

          if (icms.ICMS00?.[0]) {
            const icms00 = icms.ICMS00[0];
            icmsData = {
              cst: icms00.CST[0],
              vBC: extrairValor(icms00.vBC?.[0]),
              pICMS: extrairValor(icms00.pICMS?.[0]),
              vICMS: extrairValor(icms00.vICMS?.[0]),
            };
          } else if (icms.ICMS10?.[0]) {
            const icms10 = icms.ICMS10[0];
            icmsData = {
              cst: icms10.CST[0],
              vBC: extrairValor(icms10.vBC?.[0]),
              pICMS: extrairValor(icms10.pICMS?.[0]),
              vICMS: extrairValor(icms10.vICMS?.[0]),
            };
          } else if (icms.ICMS20?.[0]) {
            const icms20 = icms.ICMS20[0];
            icmsData = {
              cst: icms20.CST[0],
              vBC: extrairValor(icms20.vBC?.[0]),
              pICMS: extrairValor(icms20.pICMS?.[0]),
              vICMS: extrairValor(icms20.vICMS?.[0]),
            };
          } else if (icms.ICMS40?.[0]) {
            const icms40 = icms.ICMS40[0];
            icmsData = {
              cst: icms40.CST[0],
              vICMSDeson: extrairValor(icms40.vICMSDeson?.[0]),
              motDesICMS: icms40.motDesICMS?.[0],
            };
          } else if (icms.ICMS41?.[0]) {
            const icms41 = icms.ICMS41[0];
            icmsData = {
              cst: icms41.CST[0],
              vICMSDeson: extrairValor(icms41.vICMSDeson?.[0]),
              motDesICMS: icms41.motDesICMS?.[0],
            };
          } else if (icms.ICMS50?.[0]) {
            const icms50 = icms.ICMS50[0];
            icmsData = {
              cst: icms50.CST[0],
              vICMSDeson: extrairValor(icms50.vICMSDeson?.[0]),
              motDesICMS: icms50.motDesICMS?.[0],
            };
          } else if (icms.ICMS51?.[0]) {
            const icms51 = icms.ICMS51[0];
            icmsData = {
              cst: icms51.CST[0],
              vBC: extrairValor(icms51.vBC?.[0]),
              pICMS: extrairValor(icms51.pICMS?.[0]),
              vICMS: extrairValor(icms51.vICMS?.[0]),
            };
          } else if (icms.ICMS60?.[0]) {
            const icms60 = icms.ICMS60[0];
            icmsData = {
              cst: icms60.CST[0],
            };
          } else if (icms.ICMS70?.[0]) {
            const icms70 = icms.ICMS70[0];
            icmsData = {
              cst: icms70.CST[0],
              vBC: extrairValor(icms70.vBC?.[0]),
              pICMS: extrairValor(icms70.pICMS?.[0]),
              vICMS: extrairValor(icms70.vICMS?.[0]),
            };
          } else if (icms.ICMS90?.[0]) {
            const icms90 = icms.ICMS90[0];
            icmsData = {
              cst: icms90.CST[0],
              vBC: extrairValor(icms90.vBC?.[0]),
              pICMS: extrairValor(icms90.pICMS?.[0]),
              vICMS: extrairValor(icms90.vICMS?.[0]),
            };
          } else if (icms.ICMSSN101?.[0]) {
            icmsData = {
              cst: '101',
            };
          } else if (icms.ICMSSN102?.[0]) {
            icmsData = {
              cst: '102',
            };
          } else if (icms.ICMSSN103?.[0]) {
            icmsData = {
              cst: '103',
            };
          } else if (icms.ICMSSN201?.[0]) {
            icmsData = {
              cst: '201',
            };
          } else if (icms.ICMSSN202?.[0]) {
            icmsData = {
              cst: '202',
            };
          } else if (icms.ICMSSN203?.[0]) {
            icmsData = {
              cst: '203',
            };
          } else if (icms.ICMSSN300?.[0]) {
            icmsData = {
              cst: '300',
            };
          } else if (icms.ICMSSN400?.[0]) {
            icmsData = {
              cst: '400',
            };
          } else if (icms.ICMSSN500?.[0]) {
            icmsData = {
              cst: '500',
            };
          } else if (icms.ICMSSN900?.[0]) {
            const icmssn900 = icms.ICMSSN900[0];
            icmsData = {
              cst: '900',
              vBC: extrairValor(icmssn900.vBC?.[0]),
              pICMS: extrairValor(icmssn900.pICMS?.[0]),
              vICMS: extrairValor(icmssn900.vICMS?.[0]),
            };
          }
        }
      } catch (e) {
        console.log('ICMS não encontrado na NF-e');
      }

      if (!icmsData) {
        icmsData = {
          cst: '90',
        };
      }

      const result: NFeParsedData = {
        chave: infNFe.$.Id.replace('NFe', ''),
        numero: ide.nNF[0],
        serie: ide.serie[0],
        dataEmissao: ide.dhEmi[0],
        valores: {
          vNF: total.vNF[0],
          vProd: total.vProd?.[0],
          vFrete: total.vFrete?.[0] || '0.00',
          pesoTotal,
        },
        produtos,
        icmsData,
      };

      if (emit) {
        result.emitente = {
          CNPJ: emit.CNPJ?.[0] || emit.CPF?.[0],
          IE: emit.IE?.[0] || '',
          xNome: emit.xNome[0],
          xFant: emit.xFant?.[0],
          endereco: {
            xLgr: emit.enderEmit[0].xLgr[0],
            nro: emit.enderEmit[0].nro[0],
            xCpl: emit.enderEmit[0].xCpl?.[0],
            xBairro: emit.enderEmit[0].xBairro[0],
            cMun: emit.enderEmit[0].cMun[0],
            xMun: emit.enderEmit[0].xMun[0],
            CEP: emit.enderEmit[0].CEP[0],
            UF: emit.enderEmit[0].UF[0],
            fone: emit.enderEmit[0].fone?.[0],
          },
        };
      }

      if (dest) {
        result.destinatario = {
          CNPJ: dest.CNPJ?.[0],
          CPF: dest.CPF?.[0],
          IE: dest.IE?.[0],
          xNome: dest.xNome[0],
          endereco: {
            xLgr: dest.enderDest[0].xLgr[0],
            nro: dest.enderDest[0].nro[0],
            xCpl: dest.enderDest[0].xCpl?.[0],
            xBairro: dest.enderDest[0].xBairro[0],
            cMun: dest.enderDest[0].cMun[0],
            xMun: dest.enderDest[0].xMun[0],
            CEP: dest.enderDest[0].CEP[0],
            UF: dest.enderDest[0].UF[0],
            fone: dest.enderDest[0].fone?.[0],
          },
          email: dest.email?.[0],
        };
      }

      // Extract transport data for MDFe auto-fill
      try {
        const transp = infNFe.transp?.[0];
        if (transp?.veicTransp?.[0]) {
          result.transporte = {
            placa: transp.veicTransp[0].placa?.[0],
            uf: transp.veicTransp[0].UF?.[0],
            rntc: transp.veicTransp[0].RNTC?.[0],
          };
        }
      } catch (e) {
        console.log('Dados de transporte não encontrados na NF-e');
      }

      return result;
    } catch (error: any) {
      console.error('Erro ao parsear XML da NF-e:', error.message);
      throw new Error(`Falha ao processar XML da NF-e: ${error.message}`);
    }
  }

  private async generateCTeTX2Content(
    empresa: any,
    nfes: NFeParsedData[],
    dadosAdicionais: any,
    regimeTributario: number
  ): Promise<string> {
    const primeiraNFe = nfes[0];
    const ultimaNFe = nfes[nfes.length - 1];
    const dadosEmitente = primeiraNFe.emitente!;
    console.log(ultimaNFe);
    const cnpjEmpresa = empresa.ds_documento.replace(/\D/g, '');
    const uf_empresa = await prisma.sis_ibge_uf.findFirst({
      where: {
        ds_uf: empresa?.ds_uf,
      },
    });

    const uf_emitente = await prisma.sis_ibge_uf.findFirst({
      where: {
        ds_uf: dadosEmitente?.endereco?.UF,
      },
    });

    const uf_ultimaNFe = await prisma.sis_ibge_uf.findFirst({
      where: {
        ds_uf: ultimaNFe?.destinatario?.endereco?.UF,
      },
    });

    const valorTotal = nfes
      .reduce((sum, nfe) => sum + parseFloat(nfe.valores.vNF), 0)
      .toFixed(2);

    const pesoTotal = nfes
      .reduce((sum, nfe) => sum + parseFloat(nfe.valores.pesoTotal || '0'), 0)
      .toFixed(4);

    const descricaoProdutos =
      nfes.length > 1
        ? 'DIVERSOS'
        : primeiraNFe
            .produtos!.map((p) => p.xProd)
            .join(', ')
            .substring(0, 60);

    const dataPrevista =
      dadosAdicionais?.dPrev ||
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const timestamp = Date.now().toString();
    const numeroCTe = parseInt(timestamp.slice(-8), 10);
    const codigoCTe = timestamp.slice(-8);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dhEmiFormatted = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;

    const icmsNFe = primeiraNFe.icmsData;
    let icmsLines: string[] = [];

    if (regimeTributario === 1) {
      icmsLines = ['CST_609=90', 'indSN_635=1'];
    } else {
      if (icmsNFe?.vBC && icmsNFe?.pICMS && icmsNFe?.vICMS) {
        icmsLines = [
          'CST_609=00',
          `vBC_610=${icmsNFe.vBC}`,
          `pICMS_611=${icmsNFe.pICMS}`,
          `vICMS_612=${icmsNFe.vICMS}`,
        ];
      } else {
        icmsLines = [
          'CST_609=00',
          `vBC_610=${valorTotal}`,
          'pICMS_611=0.00',
          'vICMS_612=0.00',
        ];
      }
    }

    const tx2Lines: string[] = [
      'Formato=TX2',
      'incluirCTe',
      'versao_2=4.00',
      `cUF_5=${uf_empresa?.id}`,
      `cCT_6=${codigoCTe}`,
      `CFOP_7=${dadosAdicionais?.cfop || ''}`,
      'natOp_8=PRESTACAO DE SERVICO DE TRANSPORTE',
      'mod_10=57',
      `serie_11=${dadosAdicionais?.serie || '1'}`,
      `nCT_12=${numeroCTe}`,
      `dhEmi_13=${dhEmiFormatted}`,
      'tpImp_14=1',
      'tpEmis_15=1',
      `tpAmb_17=${this.tecnospeedAmb || '2'}`,
      'tpCTe_18=0',
      'procEmi_19=0',
      'verProc_20=4.00',
      `cMunEnv_672=${dadosEmitente.endereco.cMun}`,
      `xMunEnv_673=${dadosEmitente.endereco.xMun}`,
      `UFEnv_674=${dadosEmitente?.endereco?.UF}`,
      `modal_25=${dadosAdicionais?.modal || '1'}`,
      `tpServ_26=${dadosAdicionais?.tpServ || '0'}`,
      `cMunIni_27=${dadosEmitente.endereco.cMun}`,
      `xMunIni_28=${dadosEmitente.endereco.xMun}`,
      `UFIni_29=${dadosEmitente.endereco.UF}`,
      `cMunFim_30=${ultimaNFe.destinatario!.endereco.cMun}`,
      `xMunFim_31=${ultimaNFe.destinatario!.endereco.xMun}`,
      `UFFim_32=${ultimaNFe.destinatario!.endereco.UF}`,
      'retira_33=1',
      'toma_36=0',
      'indIEToma_1406=1',
      '',

      `CNPJ_95=${cnpjEmpresa}`,
      `IE_96=254356400`,
      // `IE_96=${String(empresa.ds_inscricao_estadual)}`,
      `xNome_97=CTE EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL`,
      // `xNome_97=${empresa.ds_razao_social || dadosEmitente.xNome}`,
      `xFant_98=${empresa.ds_nome_fantasia || empresa.ds_razao_social}`,
      `xLgr_100=${empresa.ds_logradouro}`,
      `nro_101=${empresa.ds_numero}`,
      `xCpl_102=${empresa.ds_complemento || ''}`,
      `xBairro_103=${empresa.ds_bairro}`,
      `cMun_104=${empresa.cd_municipio || 4211009}`,
      `xMun_105=${empresa.ds_municipio}`,
      `CEP_106=${empresa.ds_cep?.replace(/\D/g, '') || 91150010}`,
      `UF_107=${empresa.ds_uf}`,
      `fone_110=${empresa.ds_telefone?.replace(/\D/g, '') || ''}`,
      `CRT_1573=${regimeTributario}`,
      '',

      `CNPJ_112=${dadosEmitente.CNPJ}`,
      `IE_114=${dadosEmitente.IE || ''}`,
      `xNome_115=${this.tecnospeedAmb === '2' ? 'CTE EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : dadosEmitente.xNome}`,
      `xFant_116=${dadosEmitente.xFant || dadosEmitente.xNome}`,
      `fone_117=${dadosEmitente.endereco.fone || ''}`,
      `xLgr_119=${dadosEmitente.endereco.xLgr}`,
      `nro_120=${dadosEmitente.endereco.nro}`,
      `xBairro_122=${dadosEmitente.endereco.xBairro}`,
      `cMun_123=${dadosEmitente.endereco.cMun}`,
      `xMun_124=${dadosEmitente.endereco.xMun}`,
      `CEP_125=${dadosEmitente.endereco.CEP}`,
      `UF_126=${dadosEmitente.endereco.UF}`,
      'cPais_127=1058',
      'xPais_128=BRASIL',
      'email_604=',
      '',

      `CNPJ_199=${ultimaNFe?.destinatario!.CNPJ}`,
      // `CNPJ_199=${ultimaNFe.destinatario!.CNPJ || ultimaNFe.destinatario!.CPF || ''}`,
      `IE_201=${String(ultimaNFe.destinatario!.IE || '')}`,
      `xNome_202=CTE EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL`,
      // `xNome_202=${this.tecnospeedAmb === '2' ? 'CTE EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : ultimaNFe.destinatario!.xNome}`,
      `fone_203=${ultimaNFe.destinatario!.endereco.fone || ''}`,
      `xLgr_206=${ultimaNFe.destinatario!.endereco.xLgr}`,
      `nro_207=${ultimaNFe.destinatario!.endereco.nro}`,
      `xBairro_209=${ultimaNFe.destinatario!.endereco.xBairro}`,
      `cMun_210=${ultimaNFe.destinatario!.endereco.cMun}`,
      `xMun_211=${ultimaNFe.destinatario!.endereco.xMun}`,
      `CEP_212=${ultimaNFe.destinatario!.endereco.CEP}`,
      `UF_213=${ultimaNFe.destinatario!.endereco.UF}`,
      'cPais_214=1058',
      'xPais_215=BRASIL',
      `email_608=${ultimaNFe.destinatario!.email || ''}`,
      '',

      `vTPrest_228=${valorTotal}`,
      `vRec_229=${valorTotal}`,
      'INCLUIRCOMP',
      'xNome_231=Frete Valor',
      `vComp_232=${valorTotal}`,
      'SALVARCOMP',
      '',

      ...icmsLines,
      '',

      'versaoModal_636=4.00',
      `vCarga_671=${valorTotal}`,
      `proPred_271=${descricaoProdutos}`,
      '',

      'salvarCTe',
      '',

      'incluirinfQ',
      'cUnid_274=01',
      'tpMed_275=PESO DECLARADO',
      `qCarga_276=${pesoTotal}`,
      'salvarinfQ',
    ];

    for (const nfe of nfes) {
      tx2Lines.push(
        '',
        'INCLUIRINFOUTROS',
        'tpDoc_159=00',
        `descOutros_160=${nfe.numero}`,
        `dEmi_162=${nfe.dataEmissao.split('T')[0]}`,
        `dPrev_801=${dataPrevista}`,
        `vDocFisc_163=${nfe.valores.vNF}`,
        'SALVARINFOUTROS'
      );
    }

    tx2Lines.push(
      '',
      'IncluirRodo',
      `RNTRC_305=${dadosAdicionais?.RNTRC || ''}`,
      'SalvarRodo'
    );

    // if (ultimaNFe.destinatario!.CNPJ || ultimaNFe.destinatario!.CPF) {
    //   tx2Lines.push(
    //     '',
    //     'INCLUIRAUTXML',
    //     `CNPJ_814=${ultimaNFe.destinatario!.CNPJ || ultimaNFe.destinatario!.CPF}`,
    //     'SALVARAUTXML'
    //   );
    // }

    return tx2Lines.join('\n');
  }

  async findCTeByNumber(xmlRetorno: string, cnpjEmpresa: string) {
    try {
      const numero = xmlRetorno.split(',')[1].trim();

      if (!numero) {
        throw new Error('Número do CT-e não encontrado');
      }

      console.log(`📄 Consultando CT-e número: ${numero}`);

      const url = `${this.tecnospeedUrl}/ManagerAPIWeb/cte/xml`;

      const queryParams = new URLSearchParams();
      queryParams.append('Grupo', this.tecnospeedGroup || 'Eleve');
      queryParams.append('CNPJ', cnpjEmpresa.replace(/\D/g, ''));
      queryParams.append('chaveNota', numero);

      const fullUrl = `${url}?${queryParams.toString()}`;

      console.log('🌐 URL completa:', fullUrl);
      console.log('🔐 Authorization:', this.getAuthHeader());

      const response = await axios.get(fullUrl, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
        timeout: 10000,
      });

      console.log('✅ Resposta:', response.data);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Erro:', error.response?.data || error.message);
        throw new Error(`Falha ao consultar CT-e: ${error.message}`);
      }
      throw error;
    }
  }
  parseCTeRetorno(xmlRetorno: string): CTeRetorno {
    const partes = xmlRetorno.trim().split(',');

    return {
      numero: partes[0] || '',
      chave: partes[1] || '',
      codigo: partes[2] || '',
      mensagem: partes.slice(3).join(',').replace(/\r\n/g, '').trim(),
    };
  }

  private async generateCTeTX2ContentWithDocs(
    empresa: any,
    nfes: NFeParsedData[],
    ctes: CTeParsedData[],
    dadosAdicionais: any,
    regimeTributario: number,
    primeiroEmitente: any,
    ultimoDestinatario: any
  ): Promise<string> {
    console.log(
      `🔧 Gerando TX2 com ${nfes.length} NFe(s) e ${ctes.length} CTe(s)`
    );

    const cnpjEmpresa = empresa.ds_documento.replace(/\D/g, '');

    // Calculate total values from both NFes and CTes
    const valorTotalNFes = nfes.reduce(
      (sum, nfe) => sum + parseFloat(nfe.valores.vNF),
      0
    );

    const valorTotalCTes = ctes.reduce(
      (sum, cte) => sum + parseFloat(cte.valorCarga),
      0
    );

    const valorTotal = (valorTotalNFes + valorTotalCTes).toFixed(2);

    // Calculate total weight from both NFes and CTes
    const pesoTotalNFes = nfes.reduce(
      (sum, nfe) => sum + parseFloat(nfe.valores.pesoTotal || '0'),
      0
    );

    const pesoTotalCTes = ctes.reduce(
      (sum, cte) => sum + parseFloat(cte.pesoCarga || '0'),
      0
    );

    const pesoTotal = (pesoTotalNFes + pesoTotalCTes).toFixed(4);

    // Determine description
    let descricaoProdutos: string;
    if (nfes.length > 1 || ctes.length > 0) {
      descricaoProdutos = 'DIVERSOS';
    } else if (nfes.length === 1) {
      descricaoProdutos = nfes[0]
        .produtos!.map((p) => p.xProd)
        .join(', ')
        .substring(0, 60);
    } else {
      descricaoProdutos = 'CARGA CONSOLIDADA';
    }

    // Get UF data
    const uf_empresa = await prisma.sis_ibge_uf.findFirst({
      where: { ds_uf: empresa?.ds_uf },
    });

    const uf_emitente = await prisma.sis_ibge_uf.findFirst({
      where: { ds_uf: primeiroEmitente?.endereco?.UF },
    });

    const uf_ultimoDestino = await prisma.sis_ibge_uf.findFirst({
      where: { ds_uf: ultimoDestinatario?.endereco?.UF },
    });

    const dataPrevista =
      dadosAdicionais?.dPrev ||
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const timestamp = Date.now().toString();
    const numeroCTe = parseInt(timestamp.slice(-8), 10);
    const codigoCTe = timestamp.slice(-8);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dhEmiFormatted = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;

    // Get ICMS from first NFe if available
    const icmsNFe = nfes.length > 0 ? nfes[0].icmsData : null;
    let icmsLines: string[] = [];

    if (regimeTributario === 1) {
      icmsLines = ['CST_609=90', 'indSN_635=1'];
    } else {
      if (icmsNFe?.vBC && icmsNFe?.pICMS && icmsNFe?.vICMS) {
        icmsLines = [
          'CST_609=00',
          `vBC_610=${icmsNFe.vBC}`,
          `pICMS_611=${icmsNFe.pICMS}`,
          `vICMS_612=${icmsNFe.vICMS}`,
        ];
      } else {
        icmsLines = [
          'CST_609=00',
          `vBC_610=${valorTotal}`,
          'pICMS_611=0.00',
          'vICMS_612=0.00',
        ];
      }
    }

    const tx2Lines: string[] = [
      'Formato=TX2',
      'incluirCTe',
      'versao_2=4.00',
      `cUF_5=${uf_empresa?.id}`,
      `cCT_6=${codigoCTe}`,
      `CFOP_7=${dadosAdicionais?.cfop || ''}`,
      'natOp_8=PRESTACAO DE SERVICO DE TRANSPORTE',
      'mod_10=57',
      `serie_11=${dadosAdicionais?.serie || '1'}`,
      `nCT_12=${numeroCTe}`,
      `dhEmi_13=${dhEmiFormatted}`,
      'tpImp_14=1',
      'tpEmis_15=1',
      `tpAmb_17=${this.tecnospeedAmb || '2'}`,
      'tpCTe_18=0',
      'procEmi_19=0',
      'verProc_20=4.00',
      `cMunEnv_672=${primeiroEmitente.endereco.cMun}`,
      `xMunEnv_673=${primeiroEmitente.endereco.xMun}`,
      `UFEnv_674=${primeiroEmitente.endereco.UF}`,
      `modal_25=${dadosAdicionais?.modal || '1'}`,
      `tpServ_26=${dadosAdicionais?.tpServ || '0'}`,
      `cMunIni_27=${primeiroEmitente.endereco.cMun}`,
      `xMunIni_28=${primeiroEmitente.endereco.xMun}`,
      `UFIni_29=${primeiroEmitente.endereco.UF}`,
      `cMunFim_30=${ultimoDestinatario.endereco.cMun}`,
      `xMunFim_31=${ultimoDestinatario.endereco.xMun}`,
      `UFFim_32=${ultimoDestinatario.endereco.UF}`,
      'retira_33=1',
      'toma_36=0',
      'indIEToma_1406=1',
      '',

      `CNPJ_95=${cnpjEmpresa}`,
      `IE_96=254356400`,
      `xNome_97=CTE EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL`,
      `xFant_98=${empresa.ds_nome_fantasia || empresa.ds_razao_social}`,
      `xLgr_100=${empresa.ds_logradouro}`,
      `nro_101=${empresa.ds_numero}`,
      `xCpl_102=${empresa.ds_complemento || ''}`,
      `xBairro_103=${empresa.ds_bairro}`,
      `cMun_104=${empresa.cd_municipio || 4211009}`,
      `xMun_105=${empresa.ds_municipio}`,
      `CEP_106=${empresa.ds_cep?.replace(/\D/g, '') || 91150010}`,
      `UF_107=${empresa.ds_uf}`,
      `fone_110=${empresa.ds_telefone?.replace(/\D/g, '') || ''}`,
      `CRT_1573=${regimeTributario}`,
      '',

      `CNPJ_112=${primeiroEmitente.CNPJ}`,
      `IE_114=${primeiroEmitente.IE || ''}`,
      `xNome_115=${this.tecnospeedAmb === '2' ? 'CTE EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : primeiroEmitente.xNome}`,
      `xFant_116=${primeiroEmitente.xFant || primeiroEmitente.xNome}`,
      `fone_117=${primeiroEmitente.endereco.fone || ''}`,
      `xLgr_119=${primeiroEmitente.endereco.xLgr}`,
      `nro_120=${primeiroEmitente.endereco.nro}`,
      `xBairro_122=${primeiroEmitente.endereco.xBairro}`,
      `cMun_123=${primeiroEmitente.endereco.cMun}`,
      `xMun_124=${primeiroEmitente.endereco.xMun}`,
      `CEP_125=${primeiroEmitente.endereco.CEP}`,
      `UF_126=${primeiroEmitente.endereco.UF}`,
      'cPais_127=1058',
      'xPais_128=BRASIL',
      'email_604=',
      '',

      `CNPJ_199=${ultimoDestinatario.CNPJ || ultimoDestinatario.CPF}`,
      `IE_201=${String(ultimoDestinatario.IE || '')}`,
      `xNome_202=CTE EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL`,
      `fone_203=${ultimoDestinatario.endereco.fone || ''}`,
      `xLgr_206=${ultimoDestinatario.endereco.xLgr}`,
      `nro_207=${ultimoDestinatario.endereco.nro}`,
      `xBairro_209=${ultimoDestinatario.endereco.xBairro}`,
      `cMun_210=${ultimoDestinatario.endereco.cMun}`,
      `xMun_211=${ultimoDestinatario.endereco.xMun}`,
      `CEP_212=${ultimoDestinatario.endereco.CEP}`,
      `UF_213=${ultimoDestinatario.endereco.UF}`,
      'cPais_214=1058',
      'xPais_215=BRASIL',
      `email_608=${ultimoDestinatario.email || ''}`,
      '',

      `vTPrest_228=${valorTotal}`,
      `vRec_229=${valorTotal}`,
      'INCLUIRCOMP',
      'xNome_231=Frete Valor',
      `vComp_232=${valorTotal}`,
      'SALVARCOMP',
      '',

      ...icmsLines,
      '',

      'versaoModal_636=4.00',
      `vCarga_671=${valorTotal}`,
      `proPred_271=${descricaoProdutos}`,
      '',

      'salvarCTe',
      '',

      'incluirinfQ',
      'cUnid_274=01',
      'tpMed_275=PESO DECLARADO',
      `qCarga_276=${pesoTotal}`,
      'salvarinfQ',
    ];

    // Add NFe documents
    for (const nfe of nfes) {
      tx2Lines.push(
        '',
        'INCLUIRINFOUTROS',
        'tpDoc_159=00',
        `descOutros_160=${nfe.numero}`,
        `dEmi_162=${nfe.dataEmissao.split('T')[0]}`,
        `dPrev_801=${dataPrevista}`,
        `vDocFisc_163=${nfe.valores.vNF}`,
        'SALVARINFOUTROS'
      );
    }

    // Add CTe documents
    for (const cte of ctes) {
      tx2Lines.push(
        '',
        'INCLUIRINFOUTROS',
        'tpDoc_159=07', // 07 = CT-e
        `descOutros_160=${cte.numero}`,
        `nDoc_161=${cte.chave}`, // Include the CT-e key
        `dEmi_162=${cte.dataEmissao.split('T')[0]}`,
        `dPrev_801=${dataPrevista}`,
        `vDocFisc_163=${cte.valorCarga}`,
        'SALVARINFOUTROS'
      );
    }

    tx2Lines.push(
      '',
      'IncluirRodo',
      `RNTRC_305=${dadosAdicionais?.RNTRC || ''}`,
      'SalvarRodo'
    );

    return tx2Lines.join('\n');
  }

  private jsonToXML(jsonObj: any): string {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ', newline: '\n' },
    });

    return builder.buildObject(jsonObj);
  }

  private ensureXMLFormat(content: string): string {
    try {
      // Tenta fazer parse como JSON
      if (content.trim().startsWith('{')) {
        const jsonObj = JSON.parse(content);
        return this.jsonToXML(jsonObj);
      }

      // Já é XML, retorna como está
      return content;
    } catch (error) {
      // Se falhar, assume que já é XML
      return content;
    }
  }

  async generateAndSendCTe(params: GenerateCTeParams): Promise<any> {
    const { id_empresa, nfe_ids, dados_adicionais } = params;

    if (!nfe_ids || nfe_ids.length === 0) {
      throw new Error('Pelo menos um documento deve ser informado');
    }

    try {
      const empresa = await prisma.sis_empresas.findUnique({
        where: { id: id_empresa },
      });

      if (!empresa) {
        throw new Error('Empresa não encontrada');
      }

      const cnpjLimpo = empresa.ds_documento.replace(/\D/g, '');

      // Fetch all documents - could be NFe, CTe, or both
      const documentosDB = await prisma.fis_documento_dfe.findMany({
        where: { id: { in: nfe_ids } },
      });

      if (documentosDB.length === 0) {
        throw new Error('Nenhum documento encontrado com os IDs informados');
      }

      // Separate documents by type
      const nfesDB = documentosDB.filter((doc) => doc.ds_tipo === 'NFE');
      const ctesDB = documentosDB.filter((doc) => doc.ds_tipo === 'CTE');

      console.log(
        `📦 Processando ${nfesDB.length} NF-e(s) e ${ctesDB.length} CT-e(s) para gerar CT-e`
      );

      // Parse NF-es
      const nfesParsed: NFeParsedData[] = [];
      for (const nfeDB of nfesDB) {
        const parsed = await this.parseNFeXML(nfeDB.ds_raw as string);
        nfesParsed.push(parsed);
      }

      // Parse CT-es
      const ctesParsed: CTeParsedData[] = [];
      for (const cteDB of ctesDB) {
        const parsed = await this.parseCTeXML(cteDB.ds_raw as string);
        ctesParsed.push(parsed);
      }

      // Determine emitente (sender) from the first available document
      let primeiroEmitente;
      let ultimoDestinatario;

      if (nfesParsed.length > 0) {
        primeiroEmitente = nfesParsed[0].emitente!;
        ultimoDestinatario = nfesParsed[nfesParsed.length - 1].destinatario!;

        // Validate all NFes have the same emitente
        const emitentesIguais = nfesParsed.every(
          (nfe) => nfe.emitente!.CNPJ === primeiroEmitente.CNPJ
        );

        if (!emitentesIguais) {
          throw new Error(
            'Todas as NF-es devem ter o mesmo emitente para gerar um CT-e'
          );
        }
      } else {
        // Use CT-e data - get remetente from first CT-e
        const firstCte = ctesParsed[0];

        // ========== CRITICAL FIX: Parse raw data properly ==========
        let parsed: any;
        const rawContent = (ctesDB[0].ds_raw as string).trim();

        if (rawContent.startsWith('{')) {
          // It's JSON
          parsed = JSON.parse(rawContent);
        } else if (rawContent.startsWith('<')) {
          // It's XML
          parsed = await parseStringPromise(rawContent);
        } else {
          throw new Error('Formato de CT-e inválido - não é JSON nem XML');
        }

        // Helper function for safe value extraction
        const getValue = (obj: any): any => {
          if (!obj) return undefined;
          return Array.isArray(obj) ? obj[0] : obj;
        };

        // Extract infCte from different possible structures
        let infCte: any;
        if (parsed.cteProc?.CTe?.[0]?.infCte?.[0]) {
          infCte = parsed.cteProc.CTe[0].infCte[0];
        } else if (parsed.CTe?.[0]?.infCte?.[0]) {
          infCte = parsed.CTe[0].infCte[0];
        } else if (parsed.infCte?.[0]) {
          infCte = parsed.infCte[0];
        } else if (parsed.infCte && !Array.isArray(parsed.infCte)) {
          infCte = parsed.infCte;
        } else {
          throw new Error('Estrutura do CT-e não reconhecida');
        }

        const rem = getValue(infCte?.rem);
        const dest = getValue(infCte?.dest);

        if (!rem || !dest) {
          throw new Error(
            'Dados de remetente/destinatário não encontrados no CT-e'
          );
        }

        const enderReme = getValue(rem.enderReme);
        const enderDest = getValue(dest.enderDest);

        primeiroEmitente = {
          CNPJ: getValue(rem.CNPJ) || getValue(rem.CPF) || '',
          IE: getValue(rem.IE) || '',
          xNome: getValue(rem.xNome) || '',
          xFant: getValue(rem.xFant) || getValue(rem.xNome) || '',
          endereco: {
            xLgr: getValue(enderReme?.xLgr) || '',
            nro: getValue(enderReme?.nro) || '',
            xCpl: getValue(enderReme?.xCpl),
            xBairro: getValue(enderReme?.xBairro) || '',
            cMun: getValue(enderReme?.cMun) || '',
            xMun: getValue(enderReme?.xMun) || '',
            CEP: getValue(enderReme?.CEP) || '',
            UF: getValue(enderReme?.UF) || '',
            fone: getValue(enderReme?.fone),
          },
        };

        ultimoDestinatario = {
          CNPJ: getValue(dest.CNPJ),
          CPF: getValue(dest.CPF),
          IE: getValue(dest.IE),
          xNome: getValue(dest.xNome) || '',
          endereco: {
            xLgr: getValue(enderDest?.xLgr) || '',
            nro: getValue(enderDest?.nro) || '',
            xCpl: getValue(enderDest?.xCpl),
            xBairro: getValue(enderDest?.xBairro) || '',
            cMun: getValue(enderDest?.cMun) || '',
            xMun: getValue(enderDest?.xMun) || '',
            CEP: getValue(enderDest?.CEP) || '',
            UF: getValue(enderDest?.UF) || '',
            fone: getValue(enderDest?.fone),
          },
          email: getValue(dest.email),
        };
        // ========== END OF CRITICAL FIX ==========
      }

      const regimeTributario = await prisma.sis_regimes_tributarios.findFirst({
        where: { id: empresa.id_regime_tributario },
      });

      if (!regimeTributario) {
        throw new Error('Cadastre um regime tributário para a empresa.');
      }

      let tx2Crt: number;
      switch (regimeTributario.ds_crt) {
        case 'MEI':
          tx2Crt = 4;
          break;
        case 'NORMAL':
          tx2Crt = 3;
          break;
        case 'SIMPLES':
          tx2Crt = 1;
          break;
        default:
          throw new Error('Regime tributário inválido');
      }

      // Generate TX2 content with both NFes and CTes
      const tx2Content = await this.generateCTeTX2ContentWithDocs(
        empresa,
        nfesParsed,
        ctesParsed,
        dados_adicionais,
        tx2Crt,
        primeiroEmitente,
        ultimoDestinatario
      );

      const formData = new URLSearchParams();
      formData.append('Grupo', this.tecnospeedGroup || 'Eleve');
      formData.append('CNPJ', cnpjLimpo);
      formData.append('Arquivo', tx2Content);

      const url = `${this.tecnospeedUrl}/ManagerAPIWeb/cte/envia`;

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: this.getAuthHeader(),
      };

      const response = await axios.post(url, formData.toString(), { headers });
      const responseText = String(response.data);

      if (responseText.startsWith('EXCEPTION')) {
        const parts = responseText.split(',');
        const exceptionMessage =
          parts[2]?.trim().replace(/^"|"$/g, '') || 'Erro desconhecido';
        throw new Error(`Tecnospeed API Error: ${exceptionMessage}`);
      }

      const retorno = this.parseCTeRetorno(responseText);

      console.log('📄 CT-e gerado com sucesso!');
      console.log('Número:', retorno.numero);
      console.log('Chave:', retorno.chave);
      console.log('Status:', retorno.codigo, '-', retorno.mensagem);

      // Fetch CT-e XML from Tecnospeed
      let cteDados = null;
      let cteParsedData: CTeParsedData | null = null;

      try {
        const cteConsulta = await this.findCTeByNumber(responseText, cnpjLimpo);
        cteDados = cteConsulta;
        console.log('✅ Dados do CT-e recuperados:', cteDados);

        // Parse the CT-e XML to extract structured data
        cteParsedData = await this.parseCTeXML(cteDados);
        console.log('✅ CT-e parseado:', cteParsedData);
      } catch (consultaError) {
        console.warn(
          '⚠️ Não foi possível consultar/parsear o CT-e:',
          consultaError
        );
      }

      // Extract NFe and CTe keys for relationships
      const chaveNfes = nfesParsed.map((nfe) => nfe.chave);
      const chaveCtes = ctesParsed.map((cte) => cte.chave);
      const todasChaves = [...chaveNfes, ...chaveCtes];

      let documentoDfe;
      let cteId: string | undefined;

      // Save the parsed CT-e data to fis_cte FIRST (if we have the data)
      if (cteParsedData && cteDados) {
        try {
          // ========== CRITICAL FIX: Parse cteDados properly ==========
          let parsed: any;
          const cteDadosContent = (
            typeof cteDados === 'string' ? cteDados : JSON.stringify(cteDados)
          ).trim();

          if (cteDadosContent.startsWith('{')) {
            parsed = JSON.parse(cteDadosContent);
          } else if (cteDadosContent.startsWith('<')) {
            parsed = await parseStringPromise(cteDadosContent);
          } else {
            throw new Error('Formato de CT-e retornado inválido');
          }
          // ========== END OF CRITICAL FIX ==========

          // Helper function
          const getValue = (obj: any): any => {
            if (!obj) return undefined;
            return Array.isArray(obj) ? obj[0] : obj;
          };

          // Extract infCte
          let infCte: any;
          if (parsed.cteProc?.CTe?.[0]?.infCte?.[0]) {
            infCte = parsed.cteProc.CTe[0].infCte[0];
          } else if (parsed.CTe?.[0]?.infCte?.[0]) {
            infCte = parsed.CTe[0].infCte[0];
          } else if (parsed.infCte?.[0]) {
            infCte = parsed.infCte[0];
          } else if (parsed.infCte && !Array.isArray(parsed.infCte)) {
            infCte = parsed.infCte;
          }

          const icms = getValue(getValue(getValue(infCte?.imp)?.ICMS));

          let icmsData = {
            cst: '',
            vBC: '',
            pICMS: '',
            vICMS: '',
            icmsTag: '',
          };

          // Determine ICMS type and extract values
          if (icms?.ICMS00?.[0]) {
            const icms00 = getValue(icms.ICMS00);
            icmsData = {
              cst: getValue(icms00.CST) || '',
              vBC: getValue(icms00.vBC) || '',
              pICMS: getValue(icms00.pICMS) || '',
              vICMS: getValue(icms00.vICMS) || '',
              icmsTag: 'ICMS00',
            };
          } else if (icms?.ICMS20) {
            const icms20 = getValue(icms.ICMS20);
            icmsData = {
              cst: getValue(icms20.CST) || '',
              vBC: getValue(icms20.vBC) || '',
              pICMS: getValue(icms20.pICMS) || '',
              vICMS: getValue(icms20.vICMS) || '',
              icmsTag: 'ICMS20',
            };
          } else if (icms?.ICMS45) {
            const icms45 = getValue(icms.ICMS45);
            icmsData = {
              cst: getValue(icms45.CST) || '',
              vBC: '',
              pICMS: '',
              vICMS: '',
              icmsTag: 'ICMS45',
            };
          } else if (icms?.ICMS60) {
            const icms60 = getValue(icms.ICMS60);
            icmsData = {
              cst: getValue(icms60.CST) || '',
              vBC: getValue(icms60.vBCSTRet) || '',
              pICMS: getValue(icms60.pICMSSTRet) || '',
              vICMS: getValue(icms60.vICMSSTRet) || '',
              icmsTag: 'ICMS60',
            };
          } else if (icms?.ICMS90) {
            const icms90 = getValue(icms.ICMS90);
            icmsData = {
              cst: getValue(icms90.CST) || '',
              vBC: getValue(icms90.vBC) || '',
              pICMS: getValue(icms90.pICMS) || '',
              vICMS: getValue(icms90.vICMS) || '',
              icmsTag: 'ICMS90',
            };
          } else if (icms?.ICMSOutraUF) {
            const icmsOutra = getValue(icms.ICMSOutraUF);
            icmsData = {
              cst: getValue(icmsOutra.CST) || '',
              vBC: getValue(icmsOutra.vBC) || '',
              pICMS: getValue(icmsOutra.pICMS) || '',
              vICMS: getValue(icmsOutra.vICMS) || '',
              icmsTag: 'ICMSOutraUF',
            };
          } else if (icms?.ICMSSN) {
            const icmssn = getValue(icms.ICMSSN);
            icmsData = {
              cst: getValue(icmssn.CST) || '',
              vBC: '',
              pICMS: '',
              vICMS: '',
              icmsTag: 'ICMSSN',
            };
          }

          // Extract route and other data from infCte
          const ide = getValue(infCte?.ide);
          const emit = getValue(infCte?.emit);
          const rem = getValue(infCte?.rem);
          const dest = getValue(infCte?.dest);
          const vPrest = getValue(infCte?.vPrest);

          const cte = await prisma.fis_cte.create({
            data: {
              ds_id_cte: cteParsedData.chave,
              ds_chave: cteParsedData.chave,
              js_chaves_nfe: todasChaves,
              ds_uf: getValue(ide?.cUF) || cteParsedData.ufIni,
              cd_cte: getValue(ide?.cCT),
              ds_cfop: getValue(ide?.CFOP) || dados_adicionais?.cfop,
              ds_icms_tag: icmsData.icmsTag,
              ds_natureza_operacao: getValue(ide?.natOp),
              ds_modelo: getValue(ide?.mod) ? parseInt(getValue(ide.mod)) : 57,
              ds_serie: parseInt(cteParsedData.serie),
              ds_numero: cteParsedData.numero,
              dt_emissao: new Date(cteParsedData.dataEmissao),
              ds_tp_cte: getValue(ide?.tpCTe)
                ? parseInt(getValue(ide.tpCTe))
                : 0,
              ds_modal: cteParsedData.modal || getValue(ide?.modal) || '1',
              ds_tp_serv: getValue(ide?.tpServ)
                ? parseInt(getValue(ide.tpServ))
                : 0,
              cd_mun_env: getValue(ide?.cMunEnv) || cteParsedData.cMunIni,
              ds_nome_mun_env: getValue(ide?.xMunEnv) || cteParsedData.xMunIni,
              ds_uf_env: getValue(ide?.UFEnv) || cteParsedData.ufIni,
              cd_mun_ini: cteParsedData.cMunIni || getValue(ide?.cMunIni),
              ds_nome_mun_ini: cteParsedData.xMunIni || getValue(ide?.xMunIni),
              ds_uf_ini: cteParsedData.ufIni || getValue(ide?.UFIni),
              cd_mun_fim: cteParsedData.cMunFim || getValue(ide?.cMunFim),
              ds_nome_mun_fim: cteParsedData.xMunFim || getValue(ide?.xMunFim),
              ds_uf_fim: cteParsedData.ufFim || getValue(ide?.UFFim),
              ds_retira: getValue(ide?.retira)
                ? parseInt(getValue(ide.retira))
                : 1,
              ds_ind_ie_toma: getValue(ide?.indIEToma)
                ? parseInt(getValue(ide.indIEToma))
                : 1,
              ds_documento_emitente:
                getValue(emit?.CNPJ) || getValue(emit?.CPF),
              ds_razao_social_emitente: getValue(emit?.xNome),
              ds_documento_remetente: getValue(rem?.CNPJ) || getValue(rem?.CPF),
              ds_razao_social_remetente: getValue(rem?.xNome),
              ds_endereco_remetente: (() => {
                const er = getValue(rem?.enderReme);
                if (!er) return undefined;
                const parts = [
                  getValue(er?.xLgr),
                  getValue(er?.nro) ? `, ${getValue(er.nro)}` : '',
                  getValue(er?.xBairro) ? ` - ${getValue(er.xBairro)}` : '',
                  getValue(er?.xMun) && getValue(er?.UF)
                    ? ` - ${getValue(er.xMun)}/${getValue(er.UF)}`
                    : '',
                  getValue(er?.CEP) ? ` - CEP ${getValue(er.CEP)}` : '',
                ].filter(Boolean);
                return parts.join('').trim() || undefined;
              })(),
              ds_complemento_remetente: (() => {
                const er = getValue(rem?.enderReme);
                return er ? getValue(er?.xCpl)?.trim() || undefined : undefined;
              })(),
              ds_documento_destinatario:
                getValue(dest?.CNPJ) || getValue(dest?.CPF),
              ds_razao_social_destinatario: getValue(dest?.xNome),
              ds_documento_tomador: cnpjLimpo,
              ds_razao_social_tomador: empresa.ds_razao_social,
              vl_total: getValue(vPrest?.vTPrest) || cteParsedData.valorCarga,
              vl_rec: getValue(vPrest?.vRec) || cteParsedData.valorCarga,
              ds_cst_tributacao: icmsData.cst,
              vl_base_calculo_icms: icmsData.vBC,
              vl_icms: icmsData.vICMS,
              cd_icms: icmsData.cst,
              vl_porcentagem_icms: icmsData.pICMS,
            },
          });

          cteId = cte.id;
          console.log('✅ CT-e salvo na tabela fis_cte:', cte.id);
        } catch (dbError) {
          console.error('❌ Erro ao salvar CT-e na tabela fis_cte:', dbError);
          // Don't throw - continue to create DFE without the relationship
        }
      }

      // Now create fis_documento_dfe with the CT-e ID already set
      try {
        documentoDfe = await prisma.fis_documento_dfe.create({
          data: {
            ds_tipo: 'CTE',
            ds_raw: cteDados || responseText,
            ds_situacao_integracao: 'IMPORTADO',
            ds_origem: OrigemExtracao.API_IMPORTACAO_XML,
            dt_emissao: cteParsedData?.dataEmissao
              ? new Date(cteParsedData.dataEmissao)
              : new Date(),
            ds_documento_emitente: cnpjLimpo,
            ds_documento_destinatario:
              ultimoDestinatario?.CNPJ || ultimoDestinatario?.CPF,
            ds_status: 'PENDENTE',
            ds_documento_transportador: cnpjLimpo,
            id_cte: cteId,
          },
        });
        console.log('💾 CT-e DFE salvo no banco de dados:', documentoDfe.id);
      } catch (dbError) {
        console.error('❌ Erro ao salvar CT-e DFE no banco:', dbError);
        throw dbError;
      }

      return {
        success: true,
        message: 'CT-e gerado e enviado com sucesso',
        data: {
          numero: retorno.numero,
          chave: retorno.chave,
          codigo: retorno.codigo,
          mensagem: retorno.mensagem,
          xml_retorno: responseText,
          id_documento_dfe: documentoDfe?.id,
          id_cte: cteId,
        },
      };
    } catch (error: any) {
      console.error('❌ Erro ao gerar CT-e:', error);
      return {
        success: false,
        message: 'Erro ao gerar CT-e',
        error: error.response?.data || error.message,
      };
    }
  }

  async consultarCTe(cnpj: string, numero: string): Promise<any> {
    try {
      const formData = new URLSearchParams();
      formData.append('Grupo', this.tecnospeedGroup || 'Eleve');
      formData.append('CNPJ', cnpj.replace(/\D/g, ''));
      formData.append('Numero', numero);

      const response = await axios.post(
        `${this.tecnospeedUrl}/ManagerAPIWeb/cte/consulta`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: this.getAuthHeader(),
          },
        }
      );

      const responseText = String(response.data);
      if (responseText.startsWith('EXCEPTION')) {
        const parts = responseText.split(',');
        const exceptionMessage =
          parts[2]?.trim().replace(/^"|"$/g, '') || 'Erro desconhecido';
        throw new Error(`Tecnospeed API Error: ${exceptionMessage}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('Erro ao consultar CT-e:', error.message);
      throw error;
    }
  }

  async cancelarCTe(
    cnpj: string,
    chave: string,
    protocolo: string,
    justificativa: string
  ): Promise<any> {
    try {
      const formData = new URLSearchParams();
      formData.append('Grupo', this.tecnospeedGroup || 'Eleve');
      formData.append('CNPJ', cnpj.replace(/\D/g, ''));
      formData.append('Chave', chave);
      formData.append('Protocolo', protocolo);
      formData.append('Justificativa', justificativa);

      const response = await axios.post(
        `${this.tecnospeedUrl}/ManagerAPIWeb/cte/cancela`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: this.getAuthHeader(),
          },
        }
      );

      const responseText = String(response.data);
      if (responseText.startsWith('EXCEPTION')) {
        const parts = responseText.split(',');
        const exceptionMessage =
          parts[2]?.trim().replace(/^"|"$/g, '') || 'Erro desconhecido';
        throw new Error(`Tecnospeed API Error: ${exceptionMessage}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('Erro ao cancelar CT-e:', error.message);
      throw error;
    }
  }
  private generateMDFeTX2Content(
    empresa: any,
    ctes: CTeParsedData[],
    nfes: NFeParsedData[],
    dadosAdicionais: any
  ): string {
    console.log(
      '🔍 Debug - dadosAdicionais:',
      JSON.stringify(dadosAdicionais, null, 2)
    );

    const valorTotalCarga = [
      ...ctes.map((cte) => parseFloat(cte.valorCarga)),
      ...nfes.map((nfe) => parseFloat(nfe.valores.vNF)),
    ].reduce((sum, val) => sum + val, 0);

    const pesoTotalCarga = [
      ...ctes.map((cte) => parseFloat(cte.pesoCarga || '0')),
      ...nfes.map((nfe) => parseFloat(nfe.valores.pesoTotal || '0')),
    ].reduce((sum, val) => sum + val, 0);

    const cnpjEmitente = empresa.ds_documento.replace(/\D/g, '');

    const tx2Lines: string[] = [
      'Formato=tx2',
      'incluirenviMDFe',
      `idLote=${Date.now().toString().slice(-8)}`,
      'Versao_2=3.00',
      'cUF_5=35',
      'tpAmb_6=2',
      'tpEmit_7=1',
      'mod_8=58',
      `serie_9=${dadosAdicionais?.serie || '1'}`,
      `nMDF_10=${Date.now().toString().slice(-6)}`,
      `cMDF_11=${Date.now().toString().slice(-8)}`,
      'cDV_12=',
      `modal_13=${dadosAdicionais?.modal || '1'}`,
      `dhEmi_14=${new Date().toISOString().split('.')[0] + '-03:00'}`,
      'tpEmis_15=1',
      'procEmi_16=0',
      'verProc_17=3.01.0.0771',
      `UFIni_18=${dadosAdicionais.ufIni}`,
      `UFFim_19=${dadosAdicionais.ufFim}`,
      '',
      `CNPJ_26=${cnpjEmitente}`,
      `IE_27=254356400`,
      // `IE_27=${String(empresa.ds_inscricao_estadual)}`,
      `xNome_28=${empresa.ds_razao_social}`,
      `xFant_29=${empresa.ds_nome_fantasia || empresa.ds_razao_social}`,
      `xLgr_31=${empresa.ds_logradouro || ''}`,
      `nro_32=${empresa.ds_numero || 'SN'}`,
      `xCpl_33=${empresa.ds_complemento || ''}`,
      `xBairro_34=${empresa.ds_bairro || ''}`,
      `cMun_35=${empresa.cd_municipio || ''}`,
      `xMun_36=${empresa.ds_municipio || ''}`,
      `CEP_37=${empresa.ds_cep?.replace(/\D/g, '') || ''}`,
      `UF_38=${empresa.ds_uf}`,
      `fone_39=${empresa.ds_telefone?.replace(/\D/g, '') || ''}`,
      `email_40=${empresa.ds_email || ''}`,
      '',
      `versaoModal_42=3.00`,
      `qCTe_69=${ctes.length}`,
      `qNFe_71=${nfes.length}`,
      `vCarga_73=${valorTotalCarga.toFixed(2)}`,
      'cUnid_74=01',
      `qCarga_75=${pesoTotalCarga.toFixed(4)}`,
      `infAdFisco_79=${dadosAdicionais?.infAdFisco || ''}`,
      `infCpl_80=${dadosAdicionais?.observacoes || ''}`,
      'salvarenviMDFe',
      '',
    ];

    // Município de Carregamento
    console.log(
      '🔍 Debug - municipioCarrega:',
      dadosAdicionais.municipioCarrega
    );
    tx2Lines.push(
      'incluirinfMunCarrega',
      `cMunCarrega_21=${dadosAdicionais.municipioCarrega.cMun}`,
      `xMunCarrega_22=${dadosAdicionais.municipioCarrega.xMun}`,
      'salvarinfMunCarrega',
      ''
    );

    // Percurso (se informado)
    if (dadosAdicionais.percurso && dadosAdicionais.percurso.length > 0) {
      for (const perc of dadosAdicionais.percurso) {
        if (perc.uf) {
          tx2Lines.push(
            'incluirinfPercurso',
            `UFPer_24=${perc.uf}`,
            'salvarinfPercurso',
            ''
          );
        }
      }
    }

    // Município de Descarga
    console.log(
      '🔍 Debug - municipioDescarga:',
      dadosAdicionais.municipioDescarga
    );
    tx2Lines.push(
      'incluirinfMunDescarga',
      `cMunDescarga_46=${dadosAdicionais.municipioDescarga.cMun}`,
      `xMunDescarga_47=${dadosAdicionais.municipioDescarga.xMun}`
    );

    // CT-es no município de descarga
    for (const cte of ctes) {
      tx2Lines.push(
        '',
        'incluirinfCTe',
        `chCTe_49=${cte.chave}`,
        'salvarinfCTe'
      );
    }

    // NF-es no município de descarga
    for (const nfe of nfes) {
      tx2Lines.push(
        '',
        'incluirinfNFe',
        `chNFe_54=${nfe.chave}`,
        'salvarinfNFe'
      );
    }

    tx2Lines.push('salvarinfMunDescarga', '');

    // Seguro da Carga
    if (dadosAdicionais.seg || dadosAdicionais.seguradora) {
      const seg = dadosAdicionais.seg || {};
      const seguradora = dadosAdicionais.seguradora || {};

      console.log('🔍 Debug - seg:', seg);
      console.log('🔍 Debug - seguradora:', seguradora);

      tx2Lines.push(
        'incluirseg',
        `respSeg_153=${seg.infresp || '1'}` // 1=Emitente, 2=Responsável pela contratação
      );

      // Informações do responsável pelo seguro
      if (seg.infresp === '2') {
        if (seg.cnpj) {
          tx2Lines.push(`CNPJ_154=${seg.cnpj.replace(/\D/g, '')}`);
          tx2Lines.push('CPF_155=');
        } else if (seg.cpf) {
          tx2Lines.push('CNPJ_154=');
          tx2Lines.push(`CPF_155=${seg.cpf.replace(/\D/g, '')}`);
        } else {
          tx2Lines.push('CNPJ_154=');
          tx2Lines.push('CPF_155=');
        }
      } else {
        tx2Lines.push('CNPJ_154=');
        tx2Lines.push('CPF_155=');
      }

      // Informações da Seguradora
      tx2Lines.push(
        `xSeg_156=${seguradora.nome || ''}`,
        `CNPJ_157=${seguradora.cnpj ? seguradora.cnpj.replace(/\D/g, '') : ''}`,
        `nApol_158=${seguradora.apolice || ''}`,
        'salvarseg',
        ''
      );

      // Averbação
      if (seguradora.averbacao) {
        tx2Lines.push(
          'incluirnaver',
          `nAver_159=${seguradora.averbacao}`,
          'salvarnaver',
          ''
        );
      }
    }

    // Modal Rodoviário
    const veic = dadosAdicionais.veiculo;
    console.log('🔍 Debug - veiculo:', veic);

    if (!veic) {
      throw new Error('Dados do veículo não informados');
    }

    if (!veic.placa) {
      throw new Error('Placa do veículo não informada');
    }

    tx2Lines.push(
      'incluirrodo',
      `RNTRC_rodo_2=${veic.RNTRC || ''}`,
      'cInt_rodo_5=',
      `placa_rodo_6=${veic.placa.replace(/[^A-Z0-9]/g, '')}`,
      `tara_rodo_7=${veic.tara || '0'}`,
      `capKG_rodo_8=${veic.capKG || '0'}`,
      `capM3_rodo_9=${veic.capM3 || '0'}`,
      `tpRod_rodo_34=${veic.tpRod || '01'}`,
      `tpCar_rodo_35=${veic.tpCar || '00'}`,
      `UF_rodo_36=${veic.uf || ''}`,
      'salvarrodo',
      ''
    );

    const cond = dadosAdicionais.condutor;
    console.log('🔍 Debug - condutor:', cond);

    if (!cond) {
      throw new Error('Dados do condutor não informados');
    }

    if (!cond.nome) {
      throw new Error('Nome do condutor não informado');
    }

    if (!cond.cpf) {
      throw new Error('CPF do condutor não informado');
    }

    tx2Lines.push(
      'incluircondutor',
      `xNome_rodo_13=${cond.nome}`,
      `CPF_rodo_14=${cond.cpf.replace(/\D/g, '')}`,
      'salvarcondutor',
      ''
    );

    // Contratantes (CNPJ)
    if (
      dadosAdicionais.contratantes &&
      dadosAdicionais.contratantes.length > 0
    ) {
      for (const cnpjContratante of dadosAdicionais.contratantes) {
        if (cnpjContratante) {
          tx2Lines.push(
            'incluirinfContratante',
            `CNPJ_rodo_173=${cnpjContratante.replace(/\D/g, '')}`,
            'salvarinfContratante',
            ''
          );
        }
      }
    }

    return tx2Lines.join('\n');
  }

  async generateAndSendMDFe(params: GenerateMDFeParams): Promise<MDFeResponse> {
    const { id_empresa, cte_ids = [], nfe_ids = [], dados_adicionais } = params;

    console.log(
      '🔍 Debug - Params recebidos:',
      JSON.stringify(params, null, 2)
    );

    if (cte_ids.length === 0 && nfe_ids.length === 0) {
      throw new Error('Pelo menos um CT-e ou NF-e deve ser informado');
    }

    try {
      const empresa = await prisma.sis_empresas.findUnique({
        where: { id: id_empresa },
      });

      if (!empresa) {
        throw new Error('Empresa não encontrada');
      }

      const cnpjLimpo = empresa.ds_documento.replace(/\D/g, '');

      console.log('🏢 Empresa CNPJ:', cnpjLimpo);
      console.log('🔐 Grupo configurado:', this.tecnospeedGroup);

      const ctesDB = await prisma.fis_documento_dfe.findMany({
        where: {
          id: { in: cte_ids },
          ds_tipo: 'CTE',
        },
      });

      const nfesDB = await prisma.fis_documento_dfe.findMany({
        where: {
          id: { in: nfe_ids },
          ds_tipo: 'NFE',
        },
      });

      if (ctesDB.length === 0 && nfesDB.length === 0) {
        throw new Error('Nenhum documento encontrado com os IDs informados');
      }

      console.log(
        `📦 Processando ${ctesDB.length} CT-e(s) e ${nfesDB.length} NF-e(s) para gerar MDF-e`
      );

      const ctesParsed: CTeParsedData[] = [];
      for (const cteDB of ctesDB) {
        try {
          const parsed = await this.parseCTeXML(cteDB.ds_raw as string);
          ctesParsed.push(parsed);
          console.log(`✅ CT-e ${parsed.numero} processado`);
        } catch (error: any) {
          console.error(
            `❌ Erro ao processar CT-e ${cteDB.id}:`,
            error.message
          );
          throw error;
        }
      }

      const nfesParsed: NFeParsedData[] = [];
      for (const nfeDB of nfesDB) {
        try {
          const parsed = await this.parseNFeXML(nfeDB.ds_raw as string);
          nfesParsed.push(parsed);
          console.log(`✅ NF-e ${parsed.numero} processada`);
        } catch (error: any) {
          console.error(
            `❌ Erro ao processar NF-e ${nfeDB.id}:`,
            error.message
          );
          throw error;
        }
      }

      // Buscar dados do motorista e veículo apenas se IDs foram fornecidos
      let motoristaVeiculo = null;
      if (
        dados_adicionais.veiculo?.id_motorista &&
        dados_adicionais.veiculo?.id_veiculo
      ) {
        console.log('🔍 Buscando motorista e veículo...');
        motoristaVeiculo = await prisma.tms_motoristas_veiculos.findFirst({
          where: {
            id_tms_motoristas: dados_adicionais.veiculo.id_motorista,
            id_tms_veiculos: dados_adicionais.veiculo.id_veiculo,
          },
          include: {
            tms_veiculos: true,
            tms_motoristas: {
              include: {
                ger_pessoa: true,
              },
            },
          },
        });
        console.log(
          '🔍 Motorista/Veículo encontrado:',
          motoristaVeiculo ? 'Sim' : 'Não'
        );
      }

      const firstCte = ctesParsed[0];
      const lastCte = ctesParsed[ctesParsed.length - 1];
      const firstNfe = nfesParsed[0];
      const lastNfe = nfesParsed[nfesParsed.length - 1];

      // Merge dados adicionais com defaults dos documentos
      const mergedDadosAdicionais = {
        ...dados_adicionais,
        ufIni:
          dados_adicionais.ufIni ||
          firstCte?.ufIni ||
          firstNfe?.emitente?.endereco?.UF,
        ufFim:
          dados_adicionais.ufFim ||
          lastCte?.ufFim ||
          lastNfe?.destinatario?.endereco?.UF,
        municipioCarrega: {
          cMun:
            dados_adicionais.municipioCarrega?.cMun ||
            firstCte?.cMunIni ||
            firstNfe?.emitente?.endereco?.cMun,
          xMun:
            dados_adicionais.municipioCarrega?.xMun ||
            firstCte?.xMunIni ||
            firstNfe?.emitente?.endereco?.xMun,
        },
        municipioDescarga: {
          cMun:
            dados_adicionais.municipioDescarga?.cMun ||
            lastCte?.cMunFim ||
            lastNfe?.destinatario?.endereco?.cMun,
          xMun:
            dados_adicionais.municipioDescarga?.xMun ||
            lastCte?.xMunFim ||
            lastNfe?.destinatario?.endereco?.xMun,
        },
        modal: dados_adicionais.modal || firstCte?.modal || '1',
        veiculo: {
          id_motorista: dados_adicionais.veiculo?.id_motorista,
          id_veiculo: dados_adicionais.veiculo?.id_veiculo,
          placa:
            dados_adicionais.veiculo?.placa ||
            motoristaVeiculo?.tms_veiculos?.ds_placa ||
            '',
          uf:
            dados_adicionais.veiculo?.uf ||
            motoristaVeiculo?.tms_veiculos?.uf ||
            '',
          tara: dados_adicionais.veiculo?.tara || '0',
          capKG: dados_adicionais.veiculo?.capKG || '0',
          capM3: dados_adicionais.veiculo?.capM3 || '0',
          tpRod: dados_adicionais.veiculo?.tpRod || '01',
          tpCar: dados_adicionais.veiculo?.tpCar || '00',
          RNTRC:
            dados_adicionais.veiculo?.RNTRC ||
            firstCte?.rntrc ||
            firstNfe?.transporte?.rntc ||
            '',
        },
        condutor: {
          nome:
            dados_adicionais.condutor?.nome ||
            motoristaVeiculo?.tms_motoristas?.ger_pessoa?.ds_nome ||
            '',
          cpf:
            dados_adicionais.condutor?.cpf ||
            motoristaVeiculo?.tms_motoristas?.ger_pessoa?.ds_documento ||
            '',
        },
      };

      console.log(
        '🔍 Debug - mergedDadosAdicionais:',
        JSON.stringify(mergedDadosAdicionais, null, 2)
      );

      const tx2Content = this.generateMDFeTX2Content(
        empresa,
        ctesParsed,
        nfesParsed,
        mergedDadosAdicionais
      );

      console.log('\n📄 TX2 gerado:\n', tx2Content.substring(0, 500) + '...\n');

      const formData = new URLSearchParams();
      formData.append('Grupo', this.tecnospeedGroup || 'Eleve');
      formData.append('CNPJ', cnpjLimpo);
      formData.append('Arquivo', tx2Content);

      console.log('📤 Enviando MDF-e para Tecnospeed...');
      console.log('📋 URL:', `${this.tecnospeedUrl}/ManagerAPIWeb/mdfe/envia`);
      console.log('📋 Grupo:', this.tecnospeedGroup);
      console.log('📋 CNPJ:', cnpjLimpo);

      const response = await axios.post(
        `${this.tecnospeedUrl}/ManagerAPIWeb/mdfe/envia`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: this.getAuthHeader(),
          },
        }
      );

      console.log('✅ MDF-e enviado com sucesso para Tecnospeed');
      console.log('📋 Resposta:', response.data);

      const responseText = String(response.data);
      if (responseText.startsWith('EXCEPTION')) {
        const parts = responseText.split(',');
        const exceptionMessage =
          parts[2]?.trim().replace(/^"|"$/g, '') || 'Erro desconhecido';
        throw new Error(`Tecnospeed API Error: ${exceptionMessage}`);
      }

      try {
        await prisma.fis_documento_dfe.create({
          data: {
            ds_raw: response.data,
            ds_situacao_integracao: 'IMPORTADO',
            ds_origem: OrigemExtracao.API_IMPORTACAO_XML,
            dt_emissao: new Date(),
            ds_documento_emitente: cnpjLimpo,
          },
        });
        console.log('💾 MDF-e salvo no banco de dados');
      } catch (dbError: any) {
        console.error('⚠️ Erro ao salvar MDF-e no banco:', dbError.message);
      }

      return {
        success: true,
        message: 'MDF-e gerado e enviado com sucesso',
        xml_retorno: response.data,
      };
    } catch (error: any) {
      console.error('❌ Erro ao gerar MDF-e:', error.message);
      console.error('Stack trace:', error.stack);

      return {
        success: false,
        message: 'Erro ao gerar MDF-e',
        error: error.response?.data || error.message,
      };
    }
  }

  async consultarMDFe(cnpj: string, numero: string): Promise<any> {
    try {
      const formData = new URLSearchParams();
      formData.append('Grupo', this.tecnospeedGroup || 'Eleve');
      formData.append('CNPJ', cnpj.replace(/\D/g, ''));
      formData.append('Numero', numero);

      console.log('📤 Consulta MDF-e Request:', {
        Grupo: this.tecnospeedGroup,
        CNPJ: cnpj.replace(/\D/g, ''),
        Numero: numero,
      });

      const response = await axios.post(
        `${this.tecnospeedUrl}/ManagerAPIWeb/mdfe/consulta`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: this.getAuthHeader(),
          },
        }
      );

      const responseText = String(response.data);
      if (responseText.startsWith('EXCEPTION')) {
        const parts = responseText.split(',');
        const exceptionMessage =
          parts[2]?.trim().replace(/^"|"$/g, '') || 'Erro desconhecido';
        throw new Error(`Tecnospeed API Error: ${exceptionMessage}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('Erro ao consultar MDF-e:', error.message);
      throw error;
    }
  }

  async encerrarMDFe(
    cnpj: string,
    chave: string,
    protocolo: string,
    cUF: string,
    cMun: string
  ): Promise<any> {
    try {
      const formData = new URLSearchParams();
      formData.append('Grupo', this.tecnospeedGroup || 'Eleve');
      formData.append('CNPJ', cnpj.replace(/\D/g, ''));
      formData.append('Chave', chave);
      formData.append('Protocolo', protocolo);
      formData.append('cUF', cUF);
      formData.append('cMun', cMun);
      formData.append('dhEnc', new Date().toISOString().replace('Z', '-03:00'));

      console.log('📤 Encerrar MDF-e Request:', {
        Grupo: this.tecnospeedGroup,
        CNPJ: cnpj.replace(/\D/g, ''),
        Chave: chave,
        Protocolo: protocolo,
        cUF,
        cMun,
      });

      const response = await axios.post(
        `${this.tecnospeedUrl}/ManagerAPIWeb/mdfe/encerra`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: this.getAuthHeader(),
          },
        }
      );

      const responseText = String(response.data);
      if (responseText.startsWith('EXCEPTION')) {
        const parts = responseText.split(',');
        const exceptionMessage =
          parts[2]?.trim().replace(/^"|"$/g, '') || 'Erro desconhecido';
        throw new Error(`Tecnospeed API Error: ${exceptionMessage}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('Erro ao encerrar MDF-e:', error.message);
      throw error;
    }
  }

  async cancelarMDFe(
    cnpj: string,
    chave: string,
    protocolo: string,
    justificativa: string
  ): Promise<any> {
    try {
      const formData = new URLSearchParams();
      formData.append('Grupo', this.tecnospeedGroup || 'Eleve');
      formData.append('CNPJ', cnpj.replace(/\D/g, ''));
      formData.append('Chave', chave);
      formData.append('Protocolo', protocolo);
      formData.append('Justificativa', justificativa);

      console.log('📤 Cancelar MDF-e Request:', {
        Grupo: this.tecnospeedGroup,
        CNPJ: cnpj.replace(/\D/g, ''),
        Chave: chave,
        Protocolo: protocolo,
        Justificativa: justificativa,
      });

      const response = await axios.post(
        `${this.tecnospeedUrl}/ManagerAPIWeb/mdfe/cancela`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: this.getAuthHeader(),
          },
        }
      );

      const responseText = String(response.data);
      if (responseText.startsWith('EXCEPTION')) {
        const parts = responseText.split(',');
        const exceptionMessage =
          parts[2]?.trim().replace(/^"|"$/g, '') || 'Erro desconhecido';
        throw new Error(`Tecnospeed API Error: ${exceptionMessage}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('Erro ao cancelar MDF-e:', error.message);
      throw error;
    }
  }
}

export default new TecnospeedService();
