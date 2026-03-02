import { loadPkcs12 } from '../../fiscal/functions';
import { prisma } from '../../prisma';
import { decryptPassword, encryptPassword } from '../core/certificate-security';

export const createCertificateRepository = async (
  empresaId,
  usuarioId,
  dados
) => {
  try {
    const base64File = dados.ds_arquivo;
    const pfxPassword = dados.ds_senha;

    const cert = loadPkcs12(base64File, pfxPassword);

    async function createCertificateExpiration(
      certificado,
      notAfter,
      nomeEmpresa,
      cnpj
    ) {
      const dtExpiracaoISO = new Date(notAfter).toISOString();

      const empresa = await prisma.sis_empresas.findUnique({
        where: { id: empresaId },
        select: {
          id: true,
          ds_documento: true,
          is_escritorio: true,
          js_empresas: true,
        },
      });

      let empresaCertificadoId = empresaId;

      if (cnpj == empresa.ds_documento) {
        empresaCertificadoId = empresa.id;
      } else if (empresa.js_empresas.length > 0) {
        const empresaEncontrada = empresa.js_empresas.find(
          (emp) => emp.ds_documento === cnpj
        );
        const empresaDetalhes = await prisma.sis_empresas.findUnique({
          where: { ds_documento: empresaEncontrada.ds_documento },
          select: {
            id: true,
            ds_documento: true,
            is_escritorio: true,
            js_empresas: true,
          },
        });

        empresaCertificadoId = empresaDetalhes.id;
      } else if (empresa.ds_documento == '00000000000000') {
        const empresaDetalhes = await prisma.sis_empresas.findUnique({
          where: { ds_documento: cnpj },
          select: {
            id: true,
            ds_documento: true,
            is_escritorio: true,
            js_empresas: true,
          },
        });

        empresaCertificadoId = empresaDetalhes.id;
      } else {
        throw new Error(
          'Certificado não corresponde com a empresa ou com empresas do escritório.'
        );
      }

      const senhaCriptografada = encryptPassword(certificado.ds_senha);

      await prisma.sis_certificados.create({
        data: {
          id_usuario: usuarioId,
          id_empresa: empresaCertificadoId,
          ds_arquivo: certificado.ds_arquivo,
          ds_nome_arquivo: certificado.ds_nome_arquivo,
          ds_nome: nomeEmpresa,
          ds_senha: senhaCriptografada,
          ds_pfx: base64File,
          dt_expiracao: dtExpiracaoISO,
        },
      });
    }

    if (cert.publicCert.length > 1) {
      cert.publicCert.forEach(async (cert) => {
        await createCertificateExpiration(
          dados,
          cert.notAfter,
          cert.nome,
          cert.cnpj
        );
      });
    } else {
      await createCertificateExpiration(
        dados,
        cert.publicCert[0].notAfter,
        cert.publicCert[0].nome,
        cert.publicCert[0].cnpj
      );
    }

    return { sucess: true };
  } catch (error) {
    console.log(error.message);
    throw new Error('Erro: ' + error.message);
  }
};

export const getCertificatesRespository = async (empresaId) => {
  try {
    const empresa = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        ds_documento: true,
        js_certificados: true,
        is_escritorio: true,
        js_empresas: { select: { js_certificados: true } },
      },
    });

    let certificates = [];

    if (!empresa) {
      throw new Error('Empresa não encontrada.');
    }

    if (empresa.ds_documento === '00000000000000') {
      // Se for um escritório principal, retorna todos os certificados
      certificates = await prisma.sis_certificados.findMany();
    } else {
      // Certificados da própria empresa
      if (empresa.js_certificados) {
        certificates = [...empresa.js_certificados];
      }

      // Certificados das empresas relacionadas
      if (empresa.js_empresas) {
        empresa.js_empresas.forEach((relacionada) => {
          if (relacionada.js_certificados) {
            certificates = [...certificates, ...relacionada.js_certificados];
          }
        });
      }
    }

    return certificates.map((cert) => ({
      ...cert,
      dt_expiracao: cert.dt_expiracao
        ? new Date(cert.dt_expiracao).toLocaleDateString('pt-BR')
        : null,
    }));
  } catch (error) {
    throw new Error('Erro ao buscar certificados: ' + error.message);
  }
};

export const deleteCertificateRepository = async (id) => {
  try {
    await prisma.sis_certificados.delete({
      where: { id: id },
    });
    return { sucess: 'Certificado deletado' };
  } catch (error) {
    if (error.code == 'P2003') {
      return { error: 'Certificate in use' };
    }
    console.log(error);
  }
};

export const getCertificateRepository = async (id) => {
  try {
    const certificate = await prisma.sis_certificados.findUnique({
      where: { id },
    });
    return certificate;
  } catch (error) {
    console.log(error);
  }
};
