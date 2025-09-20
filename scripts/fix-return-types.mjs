#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Patrones comunes para agregar tipos de retorno
const patterns = [
  // Funciones que retornan JSX
  {
    regex: /^(\s*)(const|let|var)\s+(\w+)\s*=\s*\(\s*([^)]*)\s*\)\s*=>\s*\{/gm,
    replacement: '$1$2 $3 = ($4): JSX.Element => {',
    condition: (content, match) => {
      // Solo si la función contiene JSX (return <...> o return (...))
      const functionBody = content.substring(match.index);
      const nextBrace = functionBody.indexOf('}');
      const functionContent = functionBody.substring(0, nextBrace);
      return (
        functionContent.includes('return <') ||
        functionContent.includes('return (')
      );
    },
  },
  // Funciones que retornan void (no tienen return o return sin valor)
  {
    regex: /^(\s*)(const|let|var)\s+(\w+)\s*=\s*\(\s*([^)]*)\s*\)\s*=>\s*\{/gm,
    replacement: '$1$2 $3 = ($4): void => {',
    condition: (content, match) => {
      const functionBody = content.substring(match.index);
      const nextBrace = functionBody.indexOf('}');
      const functionContent = functionBody.substring(0, nextBrace);
      return (
        !functionContent.includes('return ') ||
        functionContent.includes('return;')
      );
    },
  },
  // Funciones async que retornan Promise<void>
  {
    regex:
      /^(\s*)(const|let|var)\s+(\w+)\s*=\s*async\s*\(\s*([^)]*)\s*\)\s*=>\s*\{/gm,
    replacement: '$1$2 $3 = async ($4): Promise<void> => {',
    condition: (content, match) => {
      const functionBody = content.substring(match.index);
      const nextBrace = functionBody.indexOf('}');
      const functionContent = functionBody.substring(0, nextBrace);
      return (
        !functionContent.includes('return ') ||
        functionContent.includes('return;')
      );
    },
  },
];

function processFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  const originalContent = content;

  // Aplicar patrones
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      if (pattern.condition && !pattern.condition(content, match)) {
        continue;
      }

      // Verificar si ya tiene tipo de retorno
      const beforeMatch = content.substring(0, match.index);
      const afterMatch = content.substring(match.index + match[0].length);

      if (!match[0].includes('):') && !afterMatch.startsWith('):')) {
        const replacement = match[0].replace(
          new RegExp(pattern.regex.source),
          pattern.replacement
        );
        content = beforeMatch + replacement + afterMatch;
        modified = true;
        break; // Procesar un cambio a la vez para evitar conflictos
      }
    }
  }

  if (modified && content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Procesado: ${filePath}`);
  } else {
    console.log(`⏭️  Sin cambios: ${filePath}`);
  }
}

// Obtener archivos con errores de explicit-function-return-type
function getFilesWithReturnTypeErrors() {
  try {
    const output = execSync(
      'npm run lint 2>&1 | grep "explicit-function-return-type"',
      { encoding: 'utf8' }
    );
    const lines = output.split('\n').filter(line => line.trim());
    const files = new Set();

    lines.forEach(line => {
      const match = line.match(/^([^:]+):/);
      if (match) {
        files.add(match[1]);
      }
    });

    return Array.from(files);
  } catch {
    console.log('No se pudieron obtener archivos con errores');
    return [];
  }
}

console.log('🔧 Iniciando corrección de tipos de retorno...\n');

const filesToProcess = getFilesWithReturnTypeErrors();
console.log(`📁 Archivos a procesar: ${filesToProcess.length}`);

filesToProcess.forEach(processFile);

console.log('\n✨ Proceso completado!');
console.log('📝 Recuerda ejecutar npm run lint para verificar los cambios.');
