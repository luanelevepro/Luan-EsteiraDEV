import * as XLSX from 'xlsx';
import * as path from 'path';
import importableTables from '@/configs/importable-tables';
import * as fs from 'fs';

const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

export async function generateXlsxModel(tableName: string): Promise<string> {
  console.log('Generating XLSX model for table:', tableName);
  const table = importableTables.find((t) => t.tableName === tableName);
  console.log('Table found:', table);
  if (!table) {
    throw new Error(`Table "${tableName}" not found in importableTables.`);
  }

  const headers = table.columns
    .filter((column) => column.display !== false)
    .map((column) =>
      typeof column.display === 'string' ? column.display : column.name
    );

  if (headers.length === 0) {
    throw new Error(
      `No columns with display names found for table "${tableName}".`
    );
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, tableName);

  const filePath = path.join(UPLOADS_DIR, `${tableName}_modelo.xlsx`);

  XLSX.writeFile(workbook, filePath);

  return filePath;
}

export function deleteFileAfterDownload(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
