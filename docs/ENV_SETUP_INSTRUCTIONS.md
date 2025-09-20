# 🔧 Instrucciones para Configurar Variables de Entorno

## Crear archivo .env

Copia el siguiente contenido en un nuevo archivo `.env` en la raíz del proyecto:

```bash
# Configuración de la API - SAD LAS Mobile
# IMPORTANTE: Reemplaza con tu URL de API real
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_MOCK_API=false

# Configuración de logging
LOG_LEVEL=debug

# Configuración de autenticación
JWT_SECRET_KEY=your-jwt-secret-key-here

# Configuración de mapas (opcional)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here

# Configuración de notificaciones push (opcional)
EXPO_PUSH_TOKEN=

# Base de datos (si aplica)
DATABASE_URL=postgresql://localhost:5432/sadlas_dev
```

## Para Producción

Para el ambiente de producción, crea un archivo `.env.production`:

```bash
# Configuración de producción
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_API_URL=https://tu-api-produccion.com/api/v1
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_MOCK_API=false

# Configuración de logging
LOG_LEVEL=error

# Configuración de autenticación (usar variables seguras)
JWT_SECRET_KEY=tu-jwt-secret-super-seguro-aqui

# Configuración de mapas
GOOGLE_MAPS_API_KEY=tu-google-maps-api-key-produccion

# Configuración de notificaciones push
EXPO_PUSH_TOKEN=tu-expo-push-token-aqui

# Base de datos de producción
DATABASE_URL=postgresql://usuario:password@host:5432/sadlas_prod
```

## Comandos para crear los archivos:

```bash
# Crear .env para desarrollo
cp .env.development .env

# Editar con tus valores reales
nano .env
```

## ⚠️ Importante

- **NUNCA** subas el archivo `.env` a Git (ya está en `.gitignore`)
- Usa variables de entorno seguras en producción
- Reemplaza todos los valores de ejemplo con tus datos reales
