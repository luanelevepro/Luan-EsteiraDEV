import { PrismaClient } from '@prisma/client';
import { getFiscalEmpresa } from './fiscal-empresa.service';
import { prisma } from '../prisma';

export const getFornecedores = async (empresaId: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  const sis_empresa = await getSisEmpresa(fis_empresa.id);

  if (!sis_empresa.js_escritorio) {
    throw new Error('Empresa não possui escritório vinculado.');
  }

  const url = construirUrlFornecedores(sis_empresa);
  return await buscarFornecedores(url);
};

const getSisEmpresa = async (fisEmpresaId: string) => {
  const empresa = await prisma.sis_empresas.findFirst({
    where: { fis_empresas: { id: fisEmpresaId } },
    include: { js_escritorio: true },
  });

  if (!empresa) {
    throw new Error('Empresa não encontrada.');
  }

  return empresa;
};

const construirUrlFornecedores = (sis_empresa: any) => {
  const patch = '/dados/fornecedores/empresa/';
  return `${sis_empresa.js_escritorio.ds_url}${patch}${sis_empresa.id_externo}`;
};

const buscarFornecedores = async (url: string) => {
  try {
    const resposta = await fetch(url, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!resposta.ok) {
      if (resposta.status === 530) {
        throw new Error('Túnel não está disponível.');
      }
      throw new Error(`Erro ao buscar fornecedores: HTTP ${resposta.status}`);
    }

    const data: any[] = await resposta.json();

    return data
      .filter((fornecedor) => fornecedor.ds_documento) // Remove fornecedores sem 'cgce_for'
      .map((fornecedor) => ({
        ds_nome: fornecedor.ds_nome || null,
        ds_endereco: fornecedor.ds_endereco || null,
        ds_cep: fornecedor.ds_cep || null,
        ds_inscricao: fornecedor.ds_inscricao || null,
        ds_telefone: fornecedor.ds_telefone || null,
        ds_inscricao_municipal: fornecedor.ds_inscricao_municipal || null,
        ds_bairro: fornecedor.ds_bairro || null,
        ds_email: fornecedor.ds_email || null,
        ds_codigo_municipio: fornecedor.ds_codigo_municipio || null,
        ds_complemento: fornecedor.ds_complemento || null,
        dt_cadastro: fornecedor.dt_cadastro || null,
        ds_ibge: fornecedor.ds_ibge || null,
        ds_documento: fornecedor.ds_documento,
      }));
  } catch (error) {
    throw new Error(`Erro ao buscar fornecedores: ${error.message}`);
  }
};
