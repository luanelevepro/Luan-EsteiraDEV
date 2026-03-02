import {
  CreateTmsMotoristasDTO,
  TmsMotoristasDTO,
  UpdateTmsMotoristasDTO,
  CreateTmsMotoristaFullDTO,
  CreateFuncionarioDTO,
} from '@/interfaces/tms_motorista';
import { prisma } from '../prisma';
import { getRhEmpresa } from '../rh/rh-empresa.service';
import { sincronizarFuncionariosByEmpresaId } from '../rh/sincronizar/sincronizar-funcionarios.service';

export default class MotoristaService {
  async create(data: CreateTmsMotoristasDTO, empresaId: string) {
    // Backwards compatible: if payload doesn't include funcionario/veiculo, keep simple create
    const rhEmpresa = await getRhEmpresa(empresaId);
    const maybeFull = data as unknown as CreateTmsMotoristaFullDTO;

    if (!maybeFull.funcionario && !maybeFull.veiculoId) {
      const motorista = await prisma.tms_motoristas.create({
        data,
        include: {
          rh_funcionarios: {
            select: {
              id: true,
              ds_nome: true,
              ds_documento: true,
            },
          },
        },
      });
      return motorista;
    }

    // Full workflow: create funcionario (if needed), motorista and optional motorista_veiculo
    const {
      funcionario: funcionarioPayload,
      veiculoId,
      ...tmsPayload
    } = maybeFull;

    const result = await prisma.$transaction(async (tx) => {
      let funcionarioId: string | undefined =
        maybeFull.id_rh_funcionarios || undefined;

      // 1) Create or reuse funcionario
      if (funcionarioPayload) {
        // If document provided, attempt to find existing funcionario
        if (funcionarioPayload.ds_documento) {
          const existing = await tx.rh_funcionarios.findFirst({
            where: { ds_documento: funcionarioPayload.ds_documento },
          });
          if (existing) {
            funcionarioId = existing.id;
          }
        }

        if (!funcionarioId) {
          // Ensure there is a cargo 'MOTORISTA' (case-insensitive contains)
          let cargo = await tx.rh_cargos.findFirst({
            where: {
              ds_nome: { contains: 'motorista', mode: 'insensitive' },
            },
          });

          if (!cargo) {
            cargo = await tx.rh_cargos.create({
              data: {
                ds_nome: 'MOTORISTA',
                is_ativo: true,
              },
            });
          }

          const createdFuncionario = await tx.rh_funcionarios.create({
            data: {
              ds_nome: funcionarioPayload.ds_nome,
              ds_documento: funcionarioPayload.ds_documento ?? null,
              ds_salario: funcionarioPayload.ds_salario
                ? String(funcionarioPayload.ds_salario)
                : undefined,
              ds_tipo_vinculo:
                funcionarioPayload.ds_tipo_vinculo ?? 'TERCEIRIZADO',
              id_cargo: cargo.id,
              ds_situacao: 'Trabalhando',
              id_rh_empresas: rhEmpresa.id,
            },
          });

          funcionarioId = createdFuncionario.id;
        }
      }

      // 2) Create motorista linking to funcionarioId if present
      // Remove helper-only props (funcionario, veiculoId) before sending to Prisma
      const motoristaCreateData: any = {
        ...tmsPayload,
      };

      if (funcionarioId) {
        motoristaCreateData.id_rh_funcionarios = funcionarioId;
      }

      const motorista = await tx.tms_motoristas.create({
        data: motoristaCreateData,
        include: {
          rh_funcionarios: {
            select: {
              id: true,
              ds_nome: true,
              ds_documento: true,
            },
          },
        },
      });

      // 3) Optional: associate vehicle
      let motoristaVeiculo = null;
      if (veiculoId) {
        // Check existing active vinculo for this motorista
        const existingActive = await tx.tms_motoristas_veiculos.findFirst({
          where: { id_tms_motoristas: motorista.id, is_ativo: true },
        });

        if (!existingActive) {
          motoristaVeiculo = await tx.tms_motoristas_veiculos.create({
            data: {
              id_tms_motoristas: motorista.id,
              id_tms_veiculos: veiculoId,
              is_principal: true,
              is_ativo: true,
            },
          });
        } else {
          motoristaVeiculo = existingActive;
        }
      }

      return {
        motorista,
        funcionarioId,
        motoristaVeiculo,
      };
    });

    // Normalize return to be consistent with previous create (return motorista with included funcionario)
    // If transaction already included rh_funcionarios on motorista, return motorista
    if (result && result.motorista) return result.motorista;
    return result;
  }

  async findOne(id: string) {
    const motorista: TmsMotoristasDTO | null =
      await prisma.tms_motoristas.findUnique({
        where: {
          id,
        },
        include: {
          rh_funcionarios: {
            select: {
              id: true,
              ds_nome: true,
              ds_documento: true,
            },
          },
        },
      });
    return motorista;
  }

  async findAll({}: {}) {
    const [motoristas, total] = await Promise.all([
      prisma.tms_motoristas.findMany({
        include: {
          rh_funcionarios: {
            select: {
              id: true,
              ds_nome: true,
              ds_documento: true,
            },
          },
        },
        orderBy: {
          dt_created: 'desc',
        },
      }),
      prisma.tms_motoristas.count(),
    ]);

    return {
      data: motoristas,
      pagination: {
        total,
      },
    };
  }

  async update(id: string, data: UpdateTmsMotoristasDTO) {
    const motorista = await prisma.tms_motoristas.update({
      where: {
        id,
      },
      data: data,
      include: {
        rh_funcionarios: {
          select: {
            id: true,
            ds_nome: true,
            ds_documento: true,
          },
        },
      },
    });
    return motorista;
  }

  async sincronizarMotoristas({ empresaId }: { empresaId: string }) {
    const rhEmpresa = await getRhEmpresa(empresaId);
    if (!rhEmpresa) {
      throw new Error('Empresa não encontrada na base de RH');
    }
    const rhFuncionarios = await prisma.rh_funcionarios.findMany({
      where: {
        id_rh_empresas: rhEmpresa.id,
        ds_situacao: 'Trabalhando',
      },
      select: {
        id: true,
        rh_cargos: {
          select: {
            ds_nome: true,
          },
        },
      },
    });
    if (rhFuncionarios.length === 0) {
      const alreadySinc = await prisma.rh_funcionarios.count({
        where: { id_rh_empresas: rhEmpresa.id },
      });
      if (alreadySinc === 0) {
        await sincronizarFuncionariosByEmpresaId(empresaId);
      }
      throw new Error('Nenhum funcionário ativo encontrado na empresa de RH');
    }
    const motoristasToCreate = rhFuncionarios.filter((f) =>
      f.rh_cargos?.ds_nome?.toLowerCase().includes('motorista')
    );
    for (const funcionario of motoristasToCreate) {
      const existingMotorista = await prisma.tms_motoristas.findFirst({
        where: {
          id_rh_funcionarios: funcionario.id,
        },
      });

      if (existingMotorista) {
        await prisma.tms_motoristas.update({
          where: {
            id: existingMotorista.id,
          },
          data: {},
        });
      } else {
        await prisma.tms_motoristas.create({
          data: {
            id_rh_funcionarios: funcionario.id,
            is_ativo: true,
          },
        });
      }
    }
  }

  async getMotoristasPaginacao(
    empresaId: string,
    page: number = 1,
    pageSize: number = 10,
    orderBy: 'asc' | 'desc' = 'asc',
    orderColumn: string = 'dt_created',
    search: string = '',
    status?: string[]
  ) {
    // Obter rh_empresa vinculada à empresa (filtra funcionários da mesma empresa de RH)
    const rhEmpresa = await getRhEmpresa(empresaId);

    // Buscar ids de funcionarios relacionados (possível filtro por search)
    const funcionarioWhere: any = {
      id_rh_empresas: rhEmpresa.id,
    };

    if (search && String(search).trim()) {
      const term = String(search).trim();
      funcionarioWhere.OR = [
        { ds_nome: { contains: term, mode: 'insensitive' } },
        { ds_documento: { contains: term, mode: 'insensitive' } },
      ];
    }

    const funcionarios = await prisma.rh_funcionarios.findMany({
      where: funcionarioWhere,
      select: { id: true },
    });

    const funcionarioIds = funcionarios.map((f) => f.id);

    const whereClause: any = {};

    // Se houver funcionários encontrados, filtrar por eles; caso contrário, filtrar por empresa apenas (retorna vazio se sem funcionarios)
    if (funcionarioIds.length > 0) {
      whereClause.id_rh_funcionarios = { in: funcionarioIds };
    } else {
      // Não há funcionários para essa empresa/termo
      const total = 0;
      return {
        total,
        totalPages: 0,
        page,
        pageSize,
        motoristas: [],
        allIds: [],
      };
    }

    // Filtrar por status (ATIVO/INATIVO)
    if (status && status.length === 1) {
      whereClause.is_ativo = status[0] === 'ATIVO';
    }

    // Contar total
    const total = await prisma.tms_motoristas.count({ where: whereClause });
    const totalPages = Math.ceil(total / pageSize);

    // Ordenação simplificada: suportar campos básicos
    const orderByClause: any = {};
    switch (orderColumn) {
      case 'ds_nome':
        // order by funcionario name
        orderByClause.rh_funcionarios = { ds_nome: orderBy };
        break;
      case 'dt_created':
      default:
        orderByClause.dt_created = orderBy;
    }

    const motoristas = await prisma.tms_motoristas.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: orderByClause,
      include: {
        rh_funcionarios: {
          select: {
            id: true,
            ds_nome: true,
            ds_documento: true,
            ds_salario: true,
            ds_tipo_vinculo: true,
          },
        },
        tms_motoristas_veiculos: {
          where: { is_ativo: true },
          orderBy: { is_principal: 'desc' },
          take: 1,
          include: {
            tms_veiculos: {
              select: { id: true, ds_placa: true, ds_nome: true },
            },
          },
        },
      },
    });

    const allIds = await prisma.tms_motoristas.findMany({
      where: whereClause,
      select: { id: true },
    });
    return {
      total,
      totalPages,
      page,
      pageSize,
      motoristas,
      allIds: allIds.map((m) => m.id),
    };
  }

  async vincularVeiculo(data: {
    id_tms_motoristas: string;
    id_tms_veiculos: string;
    is_principal: boolean;
    is_ativo: boolean;
  }) {
    // Se for principal, desativar outros principais do mesmo veículo
    if (data.is_principal) {
      await prisma.tms_motoristas_veiculos.updateMany({
        where: {
          id_tms_veiculos: data.id_tms_veiculos,
          is_principal: true,
        },
        data: {
          is_principal: false,
        },
      });
    }

    // Verificar se já existe vínculo
    const existingLink = await prisma.tms_motoristas_veiculos.findFirst({
      where: {
        id_tms_motoristas: data.id_tms_motoristas,
        id_tms_veiculos: data.id_tms_veiculos,
      },
    });

    if (existingLink) {
      // Atualizar vínculo existente
      return await prisma.tms_motoristas_veiculos.update({
        where: {
          id: existingLink.id,
        },
        data: {
          is_principal: data.is_principal,
          is_ativo: data.is_ativo,
        },
      });
    }

    // Criar novo vínculo
    return await prisma.tms_motoristas_veiculos.create({
      data,
    });
  }
}
