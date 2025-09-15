# 📱 SAD Gusi - Aplicación Móvil

Aplicación móvil React Native para trabajadoras de servicios asistenciales domiciliarios (SAD).

## 🚀 Características

- ✅ **Autenticación** con Supabase
- ✅ **Sincronización offline** completa
- ✅ **Notificaciones push** en tiempo real
- ✅ **Gestión de rutas** y horarios
- ✅ **Cálculo de balances** automático
- ✅ **Modo offline** completo
- ✅ **Navegación optimizada** con Google Maps
- ✅ **TypeScript** estricto

## 📁 Estructura del Proyecto

```
📦 sad-gusi-mobile/
├── 📁 src/                       # Código fuente
│   ├── 📁 screens/              # Pantallas de la app
│   ├── 📁 components/           # Componentes React Native
│   ├── 📁 lib/                  # Utilidades y configuraciones
│   ├── 📁 hooks/                # Custom hooks
│   ├── 📁 types/                # Tipos TypeScript
│   ├── 📁 services/             # Servicios (API, offline, etc.)
│   ├── 📁 contexts/             # Contextos React
│   └── 📁 navigation/           # Configuración de navegación
├── 📁 docs/                     # 📚 Documentación
├── 📁 scripts/                  # 🔧 Scripts de utilidad
├── 📁 config/                   # ⚙️ Configuraciones
├── 📁 assets/                   # 🎨 Recursos gráficos
├── 📁 android/                  # 🤖 Build Android
└── 📁 .github/                  # 🤖 GitHub Actions
```

## 🛠️ Instalación

### Prerrequisitos

- Node.js 20+
- npm o yarn
- Expo CLI
- Android Studio (para desarrollo local)
- Cuenta de Expo

### Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Gusi-ui/movile-app.git
   cd sad-gusi-mobile
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Instalar Expo CLI:**
   ```bash
   npm install -g @expo/cli
   ```

4. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales
   ```

5. **Ejecutar en desarrollo:**
   ```bash
   npm start
   ```

## 🚀 Comandos Disponibles

```bash
# Desarrollo
npm start              # Servidor de desarrollo Expo
npm run android        # Ejecutar en Android
npm run ios            # Ejecutar en iOS
npm run web            # Ejecutar en web

# Calidad de código
npm run lint           # Verificar linting
npm run type-check     # Verificar tipos TypeScript

# Build
npm run build:android  # Build de desarrollo
npm run build:android-apk  # Build local APK
npm run build:android-bundle  # Build de producción

# EAS Build (Recomendado)
eas build --platform android --profile preview
eas build --platform android --profile production
```

## 📚 Documentación

- [📖 Documentación completa](./docs/README.md)
- [🔨 Build Guide](./docs/BUILD.md)
- [🔌 API Reference](./docs/API.md)
- [🤝 Contributing](./docs/CONTRIBUTING.md)

## 🔗 Integración con Panel Web

Esta aplicación se conecta con el panel administrativo web:

- **Repositorio web**: [sad-gusi-web](https://github.com/gusideveloper/sad-gusi-web)
- **API Base URL**: `https://sad-gusi.vercel.app/api` (producción)
- **API Base URL**: `http://localhost:3001/api` (desarrollo)

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Aplicación    │    │   Panel Web     │    │   Base de       │
│   Móvil         │◄──►│   (Next.js)     │◄──►│   Datos         │
│   (Expo)        │    │                 │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📱 Build para APK

### Build Local (Desarrollo)

```bash
# Build de desarrollo
npm run build:android

# Build de producción
eas build --platform android --profile production
```

### Build en la Nube (Recomendado)

```bash
# Configurar EAS
eas login

# Build de preview
eas build --platform android --profile preview

# Build de producción
eas build --platform android --profile production
```

## 🚀 Deploy

El proyecto se construye automáticamente cuando se hace push a la rama `main`.

- **APK de desarrollo**: Disponible en GitHub Releases
- **APK de producción**: Disponible en GitHub Releases

## 📝 Licencia

Este proyecto es privado y confidencial.

---

**Desarrollado con ❤️ por Gusi**
