import { prisma } from '../prisma';
import {
  CreateGerPessoaDTO,
  GerPessoaDTO,
  UpdateGerPessoaDTO,
} from '@/interfaces/geral';

export default class PessoaService {
  async create(data: CreateGerPessoaDTO) {
    const pessoa = await prisma.ger_pessoa.create({
      data,
    });
    return pessoa;
  }

  async findOne(id: string) {
    const pessoa: GerPessoaDTO = await prisma.ger_pessoa.findUnique({
      where: {
        id,
      },
    });
    return pessoa;
  }

  async findAll(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const [pessoas, total] = await Promise.all([
      prisma.ger_pessoa.findMany({
        skip,
        take,
        orderBy: {
          dt_created_at: 'desc',
        },
      }),
      prisma.ger_pessoa.count(),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: pessoas,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async update(id: string, data: UpdateGerPessoaDTO) {
    const pessoa = await prisma.ger_pessoa.update({
      where: {
        id,
      },
      data,
    });
    return pessoa;
  }
}
