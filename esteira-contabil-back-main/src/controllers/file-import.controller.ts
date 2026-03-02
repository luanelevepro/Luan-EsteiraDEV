import { Request, Response } from 'express';
import { parseXlsxToCsv } from '@/core/sheetImporter/xlsx-parser';
import {
  validateTableData,
  insertTableDataBatch,
} from '@/core/sheetImporter/prisma-inserter';
import importableTables from '@/configs/importable-tables';
import { ImportableTableName } from '@/types/tables';
import { createNotification } from '@/services/sistema/notificacoes.service';
import {
  deleteFileAfterDownload,
  generateXlsxModel,
} from '@/services/sistema/xlsx.service';
import { RequestWithFile } from './fiscal/onvio/importar-xml.controller';

export const uploadXlsxFile = async (
  req: RequestWithFile,
  res: Response
): Promise<void> => {
  const empresaId = req['empresaId'];
  const userId = req['usuarioId'];

  try {
    if (!req.file) {
      console.error('Nenhum arquivo fornecido na requisição');
      res.status(400).json({ error: 'Nenhum arquivo identificado' });
      return;
    }

    const tableName = req.body.table as ImportableTableName;
    if (!tableName) {
      console.error('Nome da tabela não fornecido na requisição');
      res.status(400).json({ error: 'Nome da tabela é obrigatório' });
      return;
    }

    const tableConfig = importableTables.find((t) => t.tableName === tableName);
    if (!tableConfig) {
      console.error(`Tabela "${tableName}" não configurada para importações`);
      res.status(400).json({
        error: `Tabela "${tableName}" não está configurada para aceitar importações via arquivo.`,
      });
      return;
    }

    const csvData = await parseXlsxToCsv(req.file.path);

    await createNotification({
      id_profile: userId,
      ds_titulo: 'Processo de importação iniciado',
      ds_descricao: `O arquivo está sendo processado.\nTotal de linhas a serem processadas: ${csvData.rows.length}.`,
      cd_tipo: 'INFO',
    });

    // Recebemos o arquivo, não vamos manter o front-end esperando uma query que possívelmente dê timeout
    res.status(200).json({ message: 'Arquivo recebido e em processamento.' });

    let validRows: { data: Record<string, any>; index: number }[] = [];
    let invalidRows: {
      data: Record<string, any>;
      index: number;
      errorColumn?: string;
      reason: string;
    }[] = [];

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i];
      const validation = await validateTableData(tableName, row, {
        userId,
        empresaId,
      });

      if (validation.success) {
        validRows.push({
          data: validation.data || row,
          index: i + 2,
        });
      } else {
        invalidRows.push({
          data: row,
          index: i + 2,
          errorColumn: validation.error.column,
          reason:
            validation.error.message ||
            'Um ou mais campos obrigatórios estão nulos',
        });
      }
    }

    const validData = validRows.map((row) => row.data);

    let result = { success: true, count: 0, failures: [] };
    if (validData.length > 0) {
      result = await insertTableDataBatch(tableConfig, validData);
      if (result.failures.length > 0) {
        console.error(`Inserção em lote teve ${result.failures.length} falhas`);
      }
    }

    const failures: {
      data: Record<string, any>;
      index: number;
      errorColumn?: string;
      reason: string;
    }[] = [...invalidRows];

    if (!result.success) {
      console.error('Operação em lote falhou');
      result.failures.forEach((failure) => {
        console.error(`Motivo da falha em lote: ${failure.reason}`);
        if (Array.isArray(failure.data)) {
          validRows.forEach((row) => {
            failures.push({
              data: row.data,
              index: row.index,
              errorColumn: failure.errorColumn,
              reason: failure.reason,
            });
          });
        }
      });
    }

    const formattedFailures = failures.map((f) => {
      return `Linha ${f.index}, coluna "${f.errorColumn}": ${f.reason}`;
    });

    const failureSummary = formattedFailures.join('\n');
    // failures.length > 50
    //   ? `+50 Linhas inválidas, resposta encurtada.\nLinhas e colunas com erro:\n${failures
    //       .slice(0, 50)
    //       .map(f => `Linha ${f.index}, Coluna "${f.errorColumn}"`)
    //       .join(';\n')}`
    //   : formattedFailures.join('\n');

    await createNotification({
      id_profile: userId,
      ds_titulo: 'Processamento de arquivo concluído',
      ds_descricao: `O processamento foi concluído.\nRegistros válidos: ${result.count}.\nErros: ${failures.length}.\n\n${failureSummary}`,
      cd_tipo:
        result.count > 0
          ? 'SUCCESS'
          : result.failures.length > 0
            ? 'ERROR'
            : 'INFO',
    });
  } catch (error) {
    console.error('Erro ao processar arquivo de importação:', error);
    await createNotification({
      id_profile: userId,
      ds_titulo: 'Erro no processamento do arquivo',
      ds_descricao:
        'Ocorreu um erro ao processar o arquivo. Por favor, tente novamente mais tarde.',
      cd_tipo: 'ERROR',
    });
  }
};

export const downloadXlsxModel = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { table } = req.params;

  try {
    const filePath = await generateXlsxModel(table);

    res.setHeader('fileName', `${table}_modelo.xlsx`);
    res.download(filePath, (err) => {
      if (!err) {
        deleteFileAfterDownload(filePath);
      }
    });
  } catch (error) {
    res.status(500).send({ error: error.message || 'Erro ao gerar o modelo' });
    console.error('Erro ao gerar o modelo:', error);
  }
};
