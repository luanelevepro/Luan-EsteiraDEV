import { Request, Response } from 'express';
import * as FipeBrasil from '../../services/thirdparty/fipe-brasil.service';

export class FipeController {
  /**
   * GET /api/tms/fipe/references
   */
  static async getReferences(req: Request, res: Response): Promise<Response> {
    try {
      const refs = await FipeBrasil.getReferences();
      return res.status(200).json(refs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tms/fipe/:vehicleType/brands
   */
  static async getMarcas(req: Request, res: Response): Promise<Response> {
    try {
      const { vehicleType } = req.params;
      const reference = req.query.reference as string | undefined;
      if (!['cars', 'motorcycles', 'trucks'].includes(vehicleType)) {
        return res.status(400).json({ error: 'vehicleType inválido. Use: cars, motorcycles ou trucks' });
      }
      const marcas = await FipeBrasil.getMarcasPorTipo(
        vehicleType as 'cars' | 'motorcycles' | 'trucks',
        reference
      );
      return res.status(200).json(marcas);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tms/fipe/:vehicleType/brands/:brandId/models
   */
  static async getModelos(req: Request, res: Response): Promise<Response> {
    try {
      const { vehicleType, brandId } = req.params;
      const reference = req.query.reference as string | undefined;
      if (!['cars', 'motorcycles', 'trucks'].includes(vehicleType)) {
        return res.status(400).json({ error: 'vehicleType inválido' });
      }
      const modelos = await FipeBrasil.getModelosPorMarca(
        vehicleType as 'cars' | 'motorcycles' | 'trucks',
        brandId,
        reference
      );
      return res.status(200).json(modelos);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tms/fipe/:vehicleType/brands/:brandId/models/:modelId/years
   */
  static async getAnosPorModelo(req: Request, res: Response): Promise<Response> {
    try {
      const { vehicleType, brandId, modelId } = req.params;
      const reference = req.query.reference as string | undefined;
      if (!['cars', 'motorcycles', 'trucks'].includes(vehicleType)) {
        return res.status(400).json({ error: 'vehicleType inválido' });
      }
      const anos = await FipeBrasil.getAnosPorModelo(
        vehicleType as 'cars' | 'motorcycles' | 'trucks',
        brandId,
        modelId,
        reference
      );
      return res.status(200).json(anos);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tms/fipe/:vehicleType/:fipeCode/years
   */
  static async getAnosPorCodigoFipe(req: Request, res: Response): Promise<Response> {
    try {
      const { vehicleType, fipeCode } = req.params;
      const reference = req.query.reference as string | undefined;
      if (!['cars', 'motorcycles', 'trucks'].includes(vehicleType)) {
        return res.status(400).json({ error: 'vehicleType inválido' });
      }
      const anos = await FipeBrasil.getAnosPorCodigoFipe(
        vehicleType as 'cars' | 'motorcycles' | 'trucks',
        fipeCode,
        reference
      );
      return res.status(200).json(anos);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tms/fipe/:vehicleType/brands/:brandId/models/:modelId/years/:yearId
   * Busca info FIPE via fluxo hierárquico.
   */
  static async getInfoHierarquico(req: Request, res: Response): Promise<Response> {
    try {
      const { vehicleType, brandId, modelId, yearId } = req.params;
      const reference = req.query.reference as string | undefined;
      if (!['cars', 'motorcycles', 'trucks'].includes(vehicleType)) {
        return res.status(400).json({ error: 'vehicleType inválido' });
      }
      const info = await FipeBrasil.buscarFipeHierarquico({
        vehicleType: vehicleType as 'cars' | 'motorcycles' | 'trucks',
        brandId,
        modelId,
        yearId,
        reference,
      });
      return res.status(200).json(info);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/tms/fipe/:vehicleType/:fipeCode/years/:yearId
   * Busca info FIPE via código FIPE.
   */
  static async getInfoPorCodigo(req: Request, res: Response): Promise<Response> {
    try {
      const { vehicleType, fipeCode, yearId } = req.params;
      const reference = req.query.reference as string | undefined;
      if (!['cars', 'motorcycles', 'trucks'].includes(vehicleType)) {
        return res.status(400).json({ error: 'vehicleType inválido' });
      }
      const info = await FipeBrasil.buscarFipePorCodigo({
        vehicleType: vehicleType as 'cars' | 'motorcycles' | 'trucks',
        fipeCode,
        yearId,
        reference,
      });
      return res.status(200).json(info);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
