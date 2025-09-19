const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Crear directorio assets si no existe
const assetsDir = './assets';
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  // eslint-disable-next-line no-console
  console.log('Directorio assets creado');
}

// Crear un icono SVG simple
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo azul -->
  <rect width="1024" height="1024" fill="#3b82f6"/>
  
  <!-- Círculo blanco en el centro -->
  <circle cx="512" cy="512" r="300" fill="#ffffff"/>
  
  <!-- Texto SAD en el centro -->
  <text x="512" y="550" font-family="Arial, sans-serif" font-size="120" font-weight="bold" 
        text-anchor="middle" fill="#3b82f6">SAD</text>
</svg>`;

// Convertir SVG a PNG usando Sharp
const iconPath = path.join(assetsDir, 'icon.png');

async function createPngIcon() {
  try {
    await sharp(Buffer.from(svgContent)).png().toFile(iconPath);

    // eslint-disable-next-line no-console
    console.log('Icono PNG creado exitosamente en ./assets/icon.png');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creando el icono PNG:', error);
  }
}

createPngIcon();
