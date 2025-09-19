#!/bin/bash

# 🔧 Script de Configuración de Variables de Entorno - SAD LAS Mobile
# Este script te ayuda a configurar el archivo .env paso a paso

echo "🚀 Configurador de Variables de Entorno - SAD LAS Mobile"
echo "======================================================="
echo ""

# Verificar si .env ya existe
if [ -f ".env" ]; then
    echo "⚠️  El archivo .env ya existe."
    read -p "¿Quieres sobrescribirlo? (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo "❌ Configuración cancelada."
        exit 1
    fi
fi

echo "📝 Vamos a configurar tu archivo .env paso a paso..."
echo ""

# Configuración de API
echo "🌍 CONFIGURACIÓN DE API"
echo "----------------------"
echo "La URL de tu API backend (donde están los endpoints /assignments, /balances, etc.)"
echo "Ejemplos:"
echo "  - Desarrollo local: http://localhost:3000/api/v1"
echo "  - Servidor remoto: https://api.sadlas.com/v1"
echo "  - Heroku: https://tu-app.herokuapp.com/api/v1"
echo ""
read -p "URL de tu API: " api_url

if [ -z "$api_url" ]; then
    api_url="http://localhost:3000/api/v1"
    echo "✅ Usando URL por defecto: $api_url"
fi

# Configuración de Google Maps
echo ""
echo "🗺️  CONFIGURACIÓN DE MAPAS (OPCIONAL)"
echo "------------------------------------"
echo "¿Tu aplicación necesita mostrar mapas?"
read -p "¿Usar Google Maps? (y/N): " use_maps

if [[ $use_maps =~ ^[Yy]$ ]]; then
    echo "Para obtener una API Key de Google Maps:"
    echo "1. Ve a: https://console.cloud.google.com/"
    echo "2. Crea un proyecto o selecciona uno existente"
    echo "3. Habilita 'Maps SDK for Android' y 'Maps SDK for iOS'"
    echo "4. Crea credenciales > API Key"
    echo ""
    read -p "Tu Google Maps API Key: " maps_key
    if [ -z "$maps_key" ]; then
        maps_key="your-google-maps-api-key-here"
    fi
else
    maps_key="your-google-maps-api-key-here"
fi

# Configuración de ambiente
echo ""
echo "⚙️  CONFIGURACIÓN DE AMBIENTE"
echo "----------------------------"
echo "¿Qué ambiente estás configurando?"
echo "1) development (recomendado para desarrollo local)"
echo "2) staging (para pruebas)"
echo "3) production (para producción)"
read -p "Selecciona (1-3) [1]: " env_choice

case $env_choice in
    2)
        env_name="staging"
        debug_mode="false"
        log_level="info"
        ;;
    3)
        env_name="production"
        debug_mode="false"
        log_level="error"
        ;;
    *)
        env_name="development"
        debug_mode="true"
        log_level="debug"
        ;;
esac

# Crear archivo .env
echo ""
echo "📄 Creando archivo .env..."

cat > .env << EOF
# Configuración de la API - SAD LAS Mobile
# Generado automáticamente el $(date)
EXPO_PUBLIC_ENV=$env_name
EXPO_PUBLIC_API_URL=$api_url
EXPO_PUBLIC_DEBUG_MODE=$debug_mode
EXPO_PUBLIC_MOCK_API=false

# Configuración de logging
LOG_LEVEL=$log_level

# Configuración de autenticación
JWT_SECRET_KEY=your-jwt-secret-key-here

# Configuración de mapas
GOOGLE_MAPS_API_KEY=$maps_key

# Configuración de notificaciones push (opcional)
EXPO_PUSH_TOKEN=

# Base de datos (normalmente no necesario en apps móviles)
DATABASE_URL=postgresql://localhost:5432/sadlas_dev
EOF

echo "✅ Archivo .env creado exitosamente!"
echo ""
echo "📋 RESUMEN DE CONFIGURACIÓN:"
echo "============================"
echo "🌍 API URL: $api_url"
echo "⚙️  Ambiente: $env_name"
echo "🐛 Debug: $debug_mode"
echo "📊 Log Level: $log_level"
echo "🗺️  Google Maps: $maps_key"
echo ""
echo "🔧 PRÓXIMOS PASOS:"
echo "=================="
echo "1. Revisa el archivo .env creado"
echo "2. Si usas mapas, configura tu Google Maps API Key real"
echo "3. Si tienes JWT secret, reemplaza 'your-jwt-secret-key-here'"
echo "4. Ejecuta: npm start"
echo ""
echo "⚠️  IMPORTANTE: Nunca subas el archivo .env a Git!"
echo ""
echo "🎉 ¡Configuración completada!"
EOF
