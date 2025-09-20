# Configuración de GitHub para SAD LAS Mobile

## 🔐 Configuración de Secrets

Para que los workflows de CI/CD funcionen correctamente, necesitas configurar los siguientes secrets en tu repositorio de GitHub.

### Acceder a GitHub Secrets

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

### Secrets Requeridos

#### 1. EXPO_TOKEN
**Descripción**: Token de acceso para Expo CLI
**Cómo obtenerlo**:
```bash
# Login en Expo CLI
npx expo login

# Generar token
npx expo whoami --json
```
Copia el token que aparece en la respuesta.

#### 2. APPLE_ID (Para iOS)
**Descripción**: Tu Apple ID para publicar en App Store
**Valor**: tu-email@example.com

#### 3. APPLE_TEAM_ID (Para iOS)
**Descripción**: ID del equipo de Apple Developer
**Cómo obtenerlo**:
1. Ve a [Apple Developer Portal](https://developer.apple.com/account/)
2. En **Membership**, encontrarás tu Team ID

#### 4. GOOGLE_SERVICE_ACCOUNT_KEY (Para Android)
**Descripción**: Clave del service account para Google Play
**Cómo obtenerlo**:
1. Ve a [Google Play Console](https://play.google.com/console/)
2. **Setup** → **API access**
3. **Create new service account**
4. Descarga el archivo JSON
5. Copia todo el contenido del archivo JSON como valor del secret

## 📱 Configuración de EAS

### 1. Crear Proyecto EAS

```bash
# Login en Expo
npx expo login

# Crear proyecto EAS
eas build:configure
```

### 2. Actualizar app.json

Después de ejecutar `eas build:configure`, actualiza el `projectId` en `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "tu-project-id-real-aqui"
      }
    }
  }
}
```

### 3. Configurar Perfiles de Build

El archivo `eas.json` ya está configurado con tres perfiles:

- **development**: Para desarrollo local
- **preview**: Para testing interno
- **production**: Para releases a stores

## 🏪 Configuración de App Stores

### iOS App Store

1. **Apple Developer Account**
   - Inscríbete en [Apple Developer Program](https://developer.apple.com/programs/)
   - Costo: $99 USD/año

2. **App Store Connect**
   - Crea una nueva app en [App Store Connect](https://appstoreconnect.apple.com/)
   - Configura metadata, screenshots, etc.

3. **Actualizar eas.json**
   ```json
   {
     "submit": {
       "production": {
         "ios": {
           "appleId": "tu-apple-id@example.com",
           "ascAppId": "1234567890",
           "appleTeamId": "ABCDEFGHIJ"
         }
       }
     }
   }
   ```

### Google Play Store

1. **Google Play Developer Account**
   - Inscríbete en [Google Play Console](https://play.google.com/console/)
   - Costo: $25 USD (pago único)

2. **Crear App**
   - Crea una nueva aplicación
   - Configura store listing

3. **Service Account**
   - Sigue las instrucciones arriba para crear service account
   - Otorga permisos necesarios

## 🚀 Proceso de Release

### Releases Automáticos

1. **Crear Tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions se ejecutará automáticamente**:
   - Build de producción
   - Submit a app stores
   - Crear GitHub release

### Releases Manuales

```bash
# Build manual
npm run build:production

# Submit manual
npm run submit:all
```

## 🔄 Workflows Disponibles

### CI Pipeline (`.github/workflows/ci.yml`)
- **Trigger**: Push a `main`/`develop`, Pull Requests
- **Acciones**:
  - Tests y linting
  - Build preview (solo PRs)
  - Build production (solo main)

### Release Pipeline (`.github/workflows/release.yml`)
- **Trigger**: Tags `v*`
- **Acciones**:
  - Build production
  - Submit a stores
  - Crear GitHub release

## 📋 Checklist de Configuración

### Antes del Primer Release

- [ ] Configurar todos los secrets de GitHub
- [ ] Actualizar `projectId` en `app.json`
- [ ] Configurar Apple Developer Account (iOS)
- [ ] Configurar Google Play Developer Account (Android)
- [ ] Actualizar `eas.json` con IDs correctos
- [ ] Probar build local: `npm run build:preview`
- [ ] Verificar que CI/CD pasa en GitHub

### Para Cada Release

- [ ] Actualizar versión en `package.json`
- [ ] Actualizar `CHANGELOG.md`
- [ ] Crear y pushear tag
- [ ] Verificar que el workflow se ejecuta correctamente
- [ ] Verificar builds en EAS
- [ ] Verificar submissions a stores

## 🆘 Troubleshooting

### Error: "EXPO_TOKEN is invalid"
- Regenera el token con `npx expo whoami --json`
- Actualiza el secret en GitHub

### Error: "Apple credentials invalid"
- Verifica Apple ID y Team ID
- Asegúrate de tener permisos en Apple Developer

### Error: "Google Play submission failed"
- Verifica service account key
- Asegúrate de que la app existe en Google Play Console
- Verifica permisos del service account

### Build falla
- Revisa logs en EAS: `eas build:list`
- Verifica configuración en `eas.json`
- Asegúrate de que todas las dependencias son compatibles

## 📞 Soporte

Para problemas específicos:
- **Expo/EAS**: [Expo Discord](https://discord.gg/expo)
- **GitHub Actions**: [GitHub Community](https://github.community/)
- **Apple**: [Apple Developer Forums](https://developer.apple.com/forums/)
- **Google Play**: [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
