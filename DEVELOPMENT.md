# Guía de Desarrollo - SAD LAS Mobile

## 🚀 Configuración Inicial

### 1. Configurar el Entorno

```bash
# Instalar dependencias globales
npm install -g @expo/cli eas-cli

# Clonar e instalar
git clone <repository-url>
cd sad-las-mobile
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env` con las configuraciones correctas:
- `EXPO_PUBLIC_API_URL`: URL de la API backend
- `GOOGLE_MAPS_API_KEY`: Para funcionalidades de mapas (opcional)

### 3. Configurar EAS

```bash
# Login en Expo
npx expo login

# Configurar EAS
eas build:configure
```

## 🏗️ Flujo de Desarrollo

### Estructura de Ramas

- `main` - Producción
- `develop` - Desarrollo
- `feature/*` - Nuevas características
- `bugfix/*` - Corrección de bugs
- `hotfix/*` - Correcciones urgentes

### Comandos Útiles

```bash
# Desarrollo
npm start                    # Iniciar servidor
npm run android             # Ejecutar en Android
npm run ios                 # Ejecutar en iOS

# Calidad de código
npm run lint                # Verificar código
npm run lint:fix            # Corregir automáticamente
npm run type-check          # Verificar TypeScript
npm test                    # Ejecutar tests

# Build
npm run build:preview       # Build de preview
npm run build:production    # Build de producción
```

## 📱 Testing en Dispositivos

### Android
1. Instalar Android Studio
2. Configurar emulador o conectar dispositivo físico
3. Ejecutar `npm run android`

### iOS (solo macOS)
1. Instalar Xcode
2. Configurar simulador
3. Ejecutar `npm run ios`

### Expo Go (Desarrollo rápido)
1. Instalar Expo Go en tu dispositivo
2. Ejecutar `npm start`
3. Escanear QR code

## 🔧 Configuración de IDE

### VS Code (Recomendado)
Las extensiones recomendadas se instalarán automáticamente desde `.vscode/extensions.json`:

- Expo Tools
- TypeScript
- ESLint
- Prettier
- Tailwind CSS (si se usa)

### Configuración automática
- Formateo automático al guardar
- Corrección de ESLint al guardar
- Configuración de TypeScript optimizada

## 🏗️ Arquitectura del Proyecto

### Patrones Utilizados

1. **Context + useReducer** para estado global
2. **Custom Hooks** para lógica reutilizable
3. **Singleton API Client** para comunicación con backend
4. **TypeScript estricto** para type safety

### Estructura de Carpetas

```
src/
├── components/          # Componentes reutilizables
│   ├── common/         # Componentes básicos (Button, Input, etc.)
│   └── specific/       # Componentes específicos de dominio
├── contexts/           # Context providers
├── hooks/              # Custom hooks
├── lib/                # Utilidades y configuraciones
├── navigation/         # Configuración de navegación
├── screens/           # Pantallas de la aplicación
├── services/          # Servicios externos
└── types/             # Definiciones TypeScript
```

## 📝 Convenciones de Código

### Naming Conventions
- **Componentes**: PascalCase (`LoginScreen.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useAuth.ts`)
- **Utilidades**: camelCase (`apiClient.ts`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`)

### Imports
```typescript
// 1. React y librerías externas
import React from 'react';
import { View, Text } from 'react-native';

// 2. Imports internos (ordenados por profundidad)
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { Worker } from '../types';
```

### Componentes
```typescript
// Usar interfaces para props
interface Props {
  title: string;
  onPress: () => void;
}

// Componente funcional con TypeScript
export const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  return (
    <View>
      <Text>{title}</Text>
      <Button onPress={onPress} />
    </View>
  );
};
```

## 🧪 Testing

### Estructura de Tests
```
src/
├── components/
│   └── __tests__/
├── contexts/
│   └── __tests__/
└── lib/
    └── __tests__/
```

### Escribir Tests
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(
      <MyComponent title="Test" onPress={jest.fn()} />
    );
    
    expect(getByText('Test')).toBeTruthy();
  });
});
```

## 🚀 Deployment

### Preview Builds
```bash
# Para testing interno
npm run build:preview
```

### Production Builds
```bash
# Build completo
npm run build:production

# Submit a stores
npm run submit:all
```

### Releases Automáticos
```bash
# Crear release
git tag v1.0.1
git push origin v1.0.1
```

## 🐛 Debugging

### Herramientas
- **Flipper** - Debugging avanzado
- **React DevTools** - Inspección de componentes
- **Network Inspector** - Monitoreo de requests

### Logs
```typescript
// Usar console.log solo en desarrollo
if (__DEV__) {
  console.log('Debug info:', data);
}

// Para producción, usar logging service
```

## 📚 Recursos Útiles

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## ❓ FAQ

### ¿Cómo agregar una nueva pantalla?
1. Crear componente en `src/screens/`
2. Agregar tipo en `RootStackParamList`
3. Configurar en `AppNavigator.tsx`

### ¿Cómo agregar una nueva dependencia?
```bash
# Dependencia de producción
npm install package-name

# Dependencia de desarrollo
npm install -D package-name

# Para Expo, verificar compatibilidad
npx expo install package-name
```

### ¿Problemas con el cache?
```bash
npm run clean
npm start -- --reset-cache
```
