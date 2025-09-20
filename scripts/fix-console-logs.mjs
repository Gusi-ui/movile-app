#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Archivos a procesar
const filesToProcess = [
  'src/screens/Profile.tsx',
  'src/screens/CalendarScreen.tsx',
  'src/services/NotificationService.ts',
  'src/screens/Home.tsx',
  'src/lib/api.ts',
  'src/hooks/useNotifications.ts',
  'src/services/OfflineService.ts',
  'src/hooks/useOfflineSync.ts',
  'src/screens/Today.tsx',
  'src/screens/HomeScreen.tsx',
  'src/lib/supabase.ts',
  'src/screens/Route.tsx',
  'src/screens/Balances.tsx',
  'src/screens/Schedule.tsx',
  'src/screens/Planning.tsx',
  'src/screens/Upcoming.tsx',
];

function processFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Agregar import del logger si no existe
  if (
    !content.includes("import logger from '../utils/logger'") &&
    !content.includes("import logger from '../../utils/logger'") &&
    !content.includes("import logger from './utils/logger'")
  ) {
    // Determinar la ruta correcta del import
    const depth = filePath.split('/').length - 2; // -1 para el archivo, -1 para src
    const importPath = '../'.repeat(depth) + 'utils/logger';

    // Buscar la última línea de import
    const importRegex = /^import.*from.*['"];$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;

      content =
        content.slice(0, insertIndex) +
        `\nimport logger from '${importPath}';` +
        content.slice(insertIndex);
      modified = true;
    }
  }

  // Reemplazar console.log con logger.debug
  const originalContent = content;
  content = content.replace(/console\.log\(/g, 'logger.debug(');
  content = content.replace(/console\.info\(/g, 'logger.info(');
  content = content.replace(/console\.warn\(/g, 'logger.warn(');
  content = content.replace(/console\.error\(/g, 'logger.error(');

  if (content !== originalContent) {
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Procesado: ${filePath}`);
  } else {
    console.log(`⏭️  Sin cambios: ${filePath}`);
  }
}

console.log('🔧 Iniciando reemplazo de console.log...\n');

filesToProcess.forEach(processFile);

console.log('\n✨ Proceso completado!');
console.log('📝 Recuerda ejecutar npm run lint para verificar los cambios.');
