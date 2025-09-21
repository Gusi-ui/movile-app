# SAD LAS Worker Mobile App

🚀 **Estado actual:** Optimizado para Android - Builds automáticos funcionando

Una aplicación móvil nativa desarrollada con React Native y Expo para trabajadores de SAD LAS.

## 🚀 Características

- **Autenticación segura** con JWT tokens
- **Gestión de asignaciones** de trabajo
- **Seguimiento de rutas** y ubicación
- **Gestión de balances** y pagos
- **Sistema de notas** para tareas
- **Perfil de trabajador** personalizable
- **Interfaz moderna** y responsive
- **Soporte offline** con AsyncStorage

## 📱 Plataformas Soportadas

- iOS (iPhone y iPad)
- Android
- Web (desarrollo)

## 🛠️ Tecnologías

- **React Native** 0.79.5
- **Expo SDK** 53
- **TypeScript** 5.8.3
- **React Navigation** v7
- **AsyncStorage** para persistencia
- **EAS Build** para compilación
- **GitHub Actions** para CI/CD

## 📋 Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- Expo CLI
- EAS CLI (para builds)
- Cuenta de Expo
- Android Studio (para desarrollo Android)
- Xcode (para desarrollo iOS, solo macOS)

## 🔧 Instalación

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/tu-usuario/sad-las-mobile.git
   cd sad-las-mobile
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**

   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones
   ```

4. **Iniciar el servidor de desarrollo**
   ```bash
   npm start
   ```

## 🏗️ Scripts Disponibles

### Desarrollo

- `npm start` - Inicia el servidor de desarrollo
- `npm run android` - Ejecuta en Android
- `npm run ios` - Ejecuta en iOS
- `npm run web` - Ejecuta en navegador web

### Build y Deploy

- `npm run build:android` - Build para Android
- `npm run build:ios` - Build para iOS
- `npm run build:all` - Build para todas las plataformas
- `npm run build:preview` - Build de preview
- `npm run build:production` - Build de producción

### Calidad de Código

- `npm run lint` - Ejecuta ESLint
- `npm run lint:fix` - Corrige errores de lint automáticamente
- `npm run type-check` - Verifica tipos TypeScript
- `npm run test` - Ejecuta tests
- `npm run test:watch` - Ejecuta tests en modo watch
- `npm run test:coverage` - Genera reporte de cobertura

### Utilidades

- `npm run clean` - Limpia caché de Expo
- `npm run prebuild` - Genera código nativo
- `npm run prebuild:clean` - Regenera código nativo

## 🏗️ Configuración de Build

### EAS Build

1. **Instalar EAS CLI**

   ```bash
   npm install -g eas-cli
   ```

2. **Configurar proyecto EAS**

   ```bash
   eas build:configure
   ```

3. **Actualizar project ID en app.json**
   ```json
   {
     "expo": {
       "extra": {
         "eas": {
           "projectId": "tu-project-id-aqui"
         }
       }
     }
   }
   ```

### Configuración de Stores

#### iOS App Store

1. Configurar Apple Developer Account
2. Actualizar `eas.json` con tu Apple ID y Team ID
3. Configurar certificados y provisioning profiles

#### Google Play Store

1. Crear cuenta de Google Play Developer
2. Generar service account key
3. Configurar `eas.json` con la ruta del key

## 🔄 CI/CD con GitHub Actions

### Configuración de Secrets

En tu repositorio de GitHub, configura estos secrets:

- `EXPO_TOKEN` - Token de acceso de Expo
- `APPLE_ID` - Tu Apple ID (para iOS)
- `APPLE_TEAM_ID` - ID del equipo de Apple Developer
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Key del service account de Google Play

### Workflows Disponibles

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Se ejecuta en push y PR
   - Ejecuta tests y linting
   - Builds de preview para PRs
   - Builds de producción para main

2. **Release Pipeline** (`.github/workflows/release.yml`)
   - Se ejecuta al crear tags `v*`
   - Crea builds de producción
   - Sube a app stores automáticamente
   - Crea GitHub release

### Crear un Release

```bash
# Crear y pushear tag
git tag v1.0.1
git push origin v1.0.1
```

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
├── contexts/           # Context providers (Auth, etc.)
├── hooks/              # Custom hooks
├── lib/                # Utilidades y configuraciones
│   └── api.ts         # Cliente API
├── navigation/         # Configuración de navegación
├── screens/           # Pantallas de la aplicación
├── services/          # Servicios externos
└── types/             # Definiciones TypeScript
```

## 🔐 Variables de Entorno

Copia `.env.example` a `.env` y configura:

```env
# API Configuration
API_BASE_URL=https://api.sadlas.com
EXPO_PUBLIC_API_URL=https://api.sadlas.com/v1

# Development
EXPO_PUBLIC_ENV=development
LOG_LEVEL=debug

# Optional
GOOGLE_MAPS_API_KEY=tu-api-key-aqui
```

## 🧪 Testing

### Ejecutar Tests

```bash
npm test                # Ejecuta todos los tests
npm run test:watch      # Modo watch
npm run test:coverage   # Con cobertura
```

### Estructura de Tests

- Tests unitarios en `__tests__/`
- Tests de componentes con React Native Testing Library
- Mocks configurados para AsyncStorage y navegación

## 📱 Pantallas Implementadas

- **Login** - Autenticación de trabajadores
- **Home** - Dashboard principal
- **Assignments** - Lista de asignaciones (pendiente)
- **AssignmentDetail** - Detalle de asignación (pendiente)
- **Balances** - Gestión de balances (pendiente)
- **Notes** - Sistema de notas (pendiente)
- **Route** - Seguimiento de ruta (pendiente)
- **Profile** - Perfil del trabajador (pendiente)
- **Settings** - Configuraciones (pendiente)

## 🔧 Desarrollo

### Agregar Nueva Pantalla

1. Crear componente en `src/screens/`
2. Agregar tipo en `src/types/index.ts`
3. Configurar ruta en `src/navigation/AppNavigator.tsx`

### Agregar Nueva API

1. Agregar método en `src/lib/api.ts`
2. Actualizar tipos si es necesario
3. Implementar en componentes

## 🚀 Deployment

### Manual

```bash
# Build de producción
npm run build:production

# Submit a stores
npm run submit:all
```

### Automático

- Push a `main` para deploy automático
- Crear tag `v*` para release con stores

## 🐛 Troubleshooting

### Problemas Comunes

1. **Error de Metro bundler**

   ```bash
   npm run clean
   npm start -- --reset-cache
   ```

2. **Problemas con dependencias nativas**

   ```bash
   npm run prebuild:clean
   ```

3. **Errores de TypeScript**
   ```bash
   npm run type-check
   ```

## 📄 Licencia

Este proyecto es privado y pertenece a SAD LAS.

## 👥 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📞 Soporte

Para soporte técnico, contacta al equipo de desarrollo de SAD LAS.

---

**Desarrollado con ❤️ para SAD LAS**
