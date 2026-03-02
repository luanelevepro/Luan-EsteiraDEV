import {
  createCertificateRepository,
  deleteCertificateRepository,
  getCertificatesRespository,
} from '../../../services/sistema/empresa/certificado.service';
import { Request, Response } from 'express';

export class CertificadoController {
  static async createCertificate(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const usuarioId = req['usuarioId'];
      const response = await createCertificateRepository(
        empresaId,
        usuarioId,
        req.body
      );
      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({
        error: 'Erro ao salvar, verifique a senha e tente novamente.',
      });
    }
  }

  static async getCertificate(req: Request, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.id);
      const response = await getCertificatesRespository(id);
      return res.status(200).json(response);
    } catch (error) {
      res.status(400).send(error);
    }
  }

  static async deleteCertificate(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const id = req.params.id;
      const response = await deleteCertificateRepository(id);
      return res.status(200).json(response);
    } catch (error) {
      res.status(400).send(error);
    }
  }

  static async getAllCertificates(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const response = await getCertificatesRespository(empresaId);
      return res.status(200).json(response);
    } catch (error) {
      res.status(400).send(error);
    }
  }
}
