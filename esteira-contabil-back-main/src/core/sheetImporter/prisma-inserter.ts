import { prisma } from '@/services/prisma';
import importableTables from '@/configs/importable-tables';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

export async function validateTableData(
  tableName: string,
  rowData: any,
  sessionData: { userId: string; empresaId: string }
): Promise<{
  success: boolean;
  data?: Record<string, any>;
  error?: {
    column?: string;
    message: string;
  };
}> {
  const tableConfig = importableTables.find((t) => t.tableName === tableName);

  if (!tableConfig) {
    return {
      success: false,
      error: {
        message: `Tabela ${tableName} não encontrada nas configurações`,
      },
    };
  }

  const transformedData: Record<string, any> = {};

  for (const column of tableConfig.columns) {
    const displayKey = column.display || column.name;
    let value = rowData[displayKey];

    if (column.customResolver && sessionData) {
      try {
        value = await column.customResolver(sessionData, rowData);
      } catch (error) {
        return {
          success: false,
          error: {
            column: displayKey,
            message: `Erro ao executar validação personalizada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          },
        };
      }
    }

    if (
      !column.nullable &&
      (value === null || value === undefined || value === '')
    ) {
      return {
        success: false,
        error: {
          column: displayKey,
          message: `Campo obrigatório`,
        },
      };
    }

    if (column.name) {
      transformedData[column.name] = value;
    }
  }

  return {
    success: true,
    data: transformedData,
  };
}

export async function insertTableDataBatch(
  tableConfig: (typeof importableTables)[0],
  rowsData: any[]
): Promise<{
  success: boolean;
  count: number;
  failures: Array<{
    data: any;
    errorColumn?: string;
    reason: string;
  }>;
}> {
  if (rowsData.length === 0) {
    return { success: true, count: 0, failures: [] };
  }

  try {
    const batchData = rowsData.map((rowData) => {
      const data: Record<string, any> = {};

      for (const column of tableConfig.columns) {
        if (!column.name) continue;

        let value = rowData[column.name];

        if (value !== null && value !== undefined) {
          switch (column.type) {
            case 'number':
              value = Number(value);
              break;
            case 'boolean':
              if (typeof value === 'string') {
                value = [
                  'yes',
                  'true',
                  '1',
                  'sim',
                  's',
                  'v',
                  'x',
                  '✔️',
                ].includes(value.toLowerCase());
              } else if (typeof value === 'number') {
                value = value === 1;
              }
              break;
            case 'date':
              if (!(value instanceof Date)) {
                value = new Date(value);
              }
              break;
          }
        }

        data[column.name] = value;
      }

      return data;
    });

    const modelName = tableConfig.tableName;

    console.log(
      `Batch inserting ${batchData.length} records into ${modelName}`
    );
    const result = await prisma[modelName].createMany({
      data: batchData,
      skipDuplicates: true,
    });

    return {
      success: true,
      count: result.count,
      failures: [],
    };
  } catch (error) {
    let errorMessage = 'Erro desconhecido';

    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          errorMessage = `Existem registros duplicados`;
        case 'P2003':
          errorMessage = `Relação não encontrada no banco de dados`;
          break;
        case 'P2025':
          errorMessage = `Registro não encontrado`;
          break;
        default:
          errorMessage = `Erro do banco de dados: ${error.code}`;
      }
    } else if (error instanceof PrismaClientValidationError) {
      console.log(error);
      errorMessage = 'Erro de validação dos dados';
    } else if (error instanceof Error) {
      errorMessage = 'Erro desconhecido: ';
    }

    return {
      success: false,
      count: 0,
      failures: [
        {
          data: rowsData,
          reason: errorMessage,
        },
      ],
    };
  }
}
