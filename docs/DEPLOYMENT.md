# Guía de Despliegue y Distribución Automática

## Configuración Inicial

### 1. Configurar Expo y EAS

```bash
# Instalar EAS CLI globalmente
npm install -g @expo/eas-cli

# Iniciar sesión en Expo
eas login

# Configurar el proyecto
eas build:configure
```

### 2. Configurar Secrets en GitHub

Ve a tu repositorio en GitHub → Settings → Secrets and variables → Actions y agrega:

- `EXPO_TOKEN`: Token de Expo (obtener en https://expo.dev/accounts/[username]/settings/access-tokens)
- `EXPO_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase

### 3. Configurar Supabase

Asegúrate de que tu base de datos Supabase tenga:

1. **Tabla `workers`** con los campos requeridos
2. **Autenticación habilitada** 
3. **RLS (Row Level Security)** configurado apropiadamente
4. **Datos de trabajadoras** cargados en la tabla

## Flujo de Distribución

### Distribución Automática

1. **Para releases de producción:**
   ```bash
   # Crear un nuevo tag y release
   git tag v1.0.0
   git push origin v1.0.0
   
   # O crear release desde GitHub UI
   ```
   
   Esto automáticamente:
   - Construye la app con perfil `production-internal`
   - Genera APK/IPA para distribución interna
   - Publica en Expo para descarga directa

2. **Para builds de preview:**
   ```bash
   # Push a main branch
   git push origin main
   ```
   
   Esto construye automáticamente con perfil `preview`

### Distribución Manual

```bash
# Build para distribución interna (trabajadoras)
eas build --platform all --profile production-internal

# Build para stores (Google Play/App Store)
eas build --platform all --profile production
```

## Perfiles de Build

### `production-internal`
- **Propósito**: Distribución directa a trabajadoras
- **Formato**: APK (Android) / IPA (iOS)
- **Distribución**: Enlace directo de descarga
- **Variables**: Producción con datos reales

### `production`
- **Propósito**: Publicación en stores
- **Formato**: AAB (Android) / IPA (iOS)
- **Distribución**: Google Play Store / App Store
- **Variables**: Producción con datos reales

### `preview`
- **Propósito**: Testing interno
- **Formato**: APK (Android) / IPA (iOS)
- **Distribución**: Enlace directo
- **Variables**: Staging/desarrollo

## Distribución a Trabajadoras

### Opción 1: Expo Dashboard
1. Ve a [Expo Dashboard](https://expo.dev)
2. Selecciona tu proyecto
3. Ve a "Builds"
4. Comparte el enlace de descarga directa

### Opción 2: GitHub Releases
1. Crea un release en GitHub
2. El build se genera automáticamente
3. Agrega el enlace de descarga en la descripción del release

### Opción 3: QR Code
```bash
# Generar QR para descarga
eas build:list --platform android --limit 1
```

## Configuración de Datos de Producción

### Variables de Entorno de Producción

Archivo `.env.production`:
```env
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_MOCK_API=false
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-real
```

### Configuración de Supabase

1. **Autenticación**: Configurar proveedores de auth
2. **Base de datos**: Cargar datos reales de trabajadoras
3. **RLS**: Configurar políticas de seguridad
4. **API**: Deshabilitar API REST mock

## Comandos Útiles

```bash
# Ver builds recientes
eas build:list

# Ver detalles de un build
eas build:view [BUILD_ID]

# Cancelar build en progreso
eas build:cancel [BUILD_ID]

# Ver logs de build
eas build:view [BUILD_ID] --logs

# Configurar credenciales
eas credentials

# Actualizar app sin rebuild (OTA)
eas update --branch production
```

## Solución de Problemas

### Build Falla
1. Revisar logs en Expo Dashboard
2. Verificar variables de entorno
3. Comprobar configuración de eas.json

### App No Se Conecta a Supabase
1. Verificar URL y clave de Supabase
2. Comprobar configuración de RLS
3. Revisar logs de la app

### Trabajadoras No Pueden Descargar
1. Verificar que el build sea `production-internal`
2. Comprobar que el enlace sea público
3. Verificar compatibilidad del dispositivo

## Seguridad

- ✅ Variables de entorno en GitHub Secrets
- ✅ API REST deshabilitada en producción
- ✅ Solo Supabase para datos
- ✅ RLS habilitado en Supabase
- ✅ Distribución interna controlada