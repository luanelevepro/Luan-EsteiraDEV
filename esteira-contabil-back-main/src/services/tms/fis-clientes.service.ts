import { getFiscalEmpresa } from '../fiscal/fiscal-empresa.service';
import { prisma } from '../prisma';

/**
 * Lista clientes fiscais (fis_clientes) da empresa para uso em TMS (tomador/cliente).
 * Cadastro único do tomador/cliente com CNPJ etc.
 */
export const getFisClientes = async (empresaId: string) => {
  const fisEmpresa = await getFiscalEmpresa(empresaId);
  const clientes = await prisma.fis_clientes.findMany({
    where: { id_fis_empresas: fisEmpresa.id },
    orderBy: { ds_nome: 'asc' },
    select: {
      id: true,
      ds_nome: true,
      ds_documento: true,
      ds_nome_fantasia: true,
    },
  });
  return clientes;
};
