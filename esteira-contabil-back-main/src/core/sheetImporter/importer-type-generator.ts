import path from 'path';
import fs from 'fs';
import importableTables, {
  ColumnTypeMapping,
} from '@/configs/importable-tables';

// Use the same type mapping as defined in importableTables.ts
const typeMap: Record<keyof ColumnTypeMapping, string> = {
  string: 'string',
  date: 'Date',
  number: 'number',
  boolean: 'boolean',
};

function mapToTS(type: keyof ColumnTypeMapping): string {
  return typeMap[type] ?? 'any';
}

function generateTableTypes(): void {
  const outputDir = path.join(__dirname, '../../types');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let fileContent = `// Auto-generated from importableTables.ts\n\n`;
  fileContent += `import { SessionData } from '@/configs/importableTables'\n\n`;
  fileContent += `export type ImportableTableName = ${importableTables.map((table) => `'${table.tableName}'`).join(' | ')}\n\n`;
  fileContent += `// Defines which fields have display values for each table\n`;
  fileContent += `export interface ImportableTableDisplayFields {\n`;

  importableTables.forEach((table) => {
    fileContent += `  ${table.tableName}: {\n`;
    table.columns
      .filter((column) => column.display !== false && column.display !== '')
      .forEach((column) => {
        fileContent += `    ${column.name}: '${column.display}'\n`;
      });
    fileContent += `  }\n`;
  });
  fileContent += `}\n\n`;

  // Generate payload interfaces
  importableTables.forEach((table) => {
    const interfaceName = `${table.tableName.charAt(0).toUpperCase() + table.tableName.slice(1)}_payload`;

    fileContent += `export interface ${interfaceName} {\n`;

    table.columns.forEach((column) => {
      // Skip primary keys (id) as in the original
      if (column.name !== 'id') {
        const tsType = mapToTS(column.type);
        const hasCustomResolver = column.customResolver !== undefined;

        // Add comment for fields with custom resolvers
        if (hasCustomResolver) {
          fileContent += `  /** Field with custom resolver */\n`;
        }

        fileContent += `  ${column.name}${column.nullable ? '?' : ''}: ${tsType}\n`;
      }
    });

    fileContent += `}\n\n`;
  });

  fileContent += `export interface ImportableDatabaseSchema {\n`;
  importableTables.forEach((table) => {
    const interfaceName = `${table.tableName.charAt(0).toUpperCase() + table.tableName.slice(1)}`;
    fileContent += `  ${table.tableName}: ${interfaceName}_payload\n`;
  });
  fileContent += `}\n\n`;

  fileContent += `// Custom resolver field mapping\n`;
  fileContent += `export interface CustomResolverFields {\n`;
  importableTables.forEach((table) => {
    const customResolverFields = table.columns.filter(
      (column) => column.customResolver
    );
    if (customResolverFields.length > 0) {
      fileContent += `  ${table.tableName}: {\n`;
      customResolverFields.forEach((column) => {
        const tsType = mapToTS(column.type);
        fileContent += `    ${column.name}: (sessionData: SessionData, data: any) => ${tsType}\n`;
      });
      fileContent += `  }\n`;
    }
  });
  fileContent += `}\n`;

  fs.writeFileSync(path.join(outputDir, 'tables.d.ts'), fileContent);
  console.log(`Aquivos de tipagem gerados a partir do xlsxParser`);
}

generateTableTypes();
