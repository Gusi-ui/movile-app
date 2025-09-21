# 📱 Android Deployment Guide

## 🎯 Estrategia actual: Solo Android

Este proyecto está configurado para desarrollar y distribuir **solo en Android** por ahora, con preparación para añadir iOS en el futuro cuando sea viable económicamente.

## 🚀 Workflows disponibles

### 1. **Build automático (main branch)**

- **Trigger:** Push a `main`
- **Perfil:** `preview`
- **Output:** APK para testing interno
- **Tiempo:** ~5-10 minutos

### 2. **Build de release (tags)**

- **Trigger:** Crear release en GitHub
- **Perfil:** `production-internal`
- **Output:** APK para distribución interna
- **Tiempo:** ~5-10 minutos

### 3. **Deploy a Google Play Store (manual)**

- **Trigger:** Manual (workflow_dispatch)
- **Perfil:** `production`
- **Output:** AAB para Google Play Store
- **Opciones:** internal/alpha/beta/production tracks

## 📦 Perfiles de build

| Perfil                | Tipo | Uso               | Distribución |
| --------------------- | ---- | ----------------- | ------------ |
| `development`         | APK  | Desarrollo local  | Expo Go      |
| `preview`             | APK  | Testing cambios   | Interna      |
| `production-internal` | APK  | Release testing   | Interna      |
| `production`          | AAB  | Google Play Store | Pública      |

## 🔧 Configuración Google Play Store

### Prerrequisitos

1. **Cuenta Google Play Console** ($25 una sola vez)
2. **Service Account Key** para automatización
3. **App creada** en Google Play Console

### Setup inicial

```bash
# 1. Crear service account en Google Cloud Console
# 2. Descargar JSON key
# 3. Configurar en EAS
eas credentials:configure --platform android
```

### Variables de entorno requeridas

```bash
EXPO_TOKEN=your_expo_token
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## 🚀 Proceso de deployment

### Testing interno

```bash
# Automático en push a main
git push origin main
```

### Release interna

```bash
# Crear tag y release
git tag v1.0.0
git push origin v1.0.0
# Crear release en GitHub UI
```

### Google Play Store

```bash
# Manual desde GitHub Actions
# Actions → Android Store Deploy → Run workflow
# Seleccionar track: internal/alpha/beta/production
```

## 📱 Testing de builds

### APK interno

1. Descargar desde Expo Dashboard
2. Instalar en dispositivo Android
3. Testing manual

### Google Play Store

1. **Internal testing:** Hasta 100 testers
2. **Alpha:** Testers específicos
3. **Beta:** Testing abierto
4. **Production:** Público general

## 🔮 Preparación para iOS futuro

### Cuando tengas $99 para Apple Developer:

1. **Configurar credenciales iOS:**

```bash
eas credentials:configure --platform ios
```

2. **Restaurar builds multiplataforma:**

```yaml
# En build-and-deploy.yml
eas build --platform all --profile production-internal
```

3. **Configurar TestFlight:**

```json
// En eas.json submit
"ios": {
  "appleId": "tu-apple-id@example.com",
  "ascAppId": "tu-app-id",
  "appleTeamId": "TU-TEAM-ID"
}
```

### Código ya preparado para iOS:

- ✅ Configuración multiplataforma en `eas.json`
- ✅ Assets compatibles (icon, splash)
- ✅ Código React Native universal
- ✅ Workflows preparados para `--platform all`

## 🎯 Próximos pasos recomendados

1. **Configurar Google Play Console**
2. **Hacer primer deploy interno**
3. **Testing con usuarios reales**
4. **Optimizar app basado en feedback**
5. **Cuando tengas presupuesto → añadir iOS**

## 🔗 Enlaces útiles

- [Google Play Console](https://play.google.com/console)
- [Expo Dashboard](https://expo.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Google Play Deployment](https://docs.expo.dev/submit/android/)
