import { Platform } from 'react-native';

/**
 * Helper para generar estilos de sombra compatibles entre web y móvil
 * En web usa boxShadow, en móvil usa las propiedades shadow* nativas
 */
export const getShadowStyle = (elevation = 3) => {
  if (Platform.OS === 'web') {
    const opacity = Math.min(elevation * 0.05, 0.2);
    const blur = elevation * 2;
    return {
      boxShadow: `0 ${elevation}px ${blur}px rgba(0, 0, 0, ${opacity})`,
    };
  }
  
  return {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: elevation,
    },
    shadowOpacity: Math.min(elevation * 0.05, 0.2),
    shadowRadius: elevation * 2,
    elevation,
  };
};

/**
 * Estilos de sombra predefinidos
 */
export const shadowStyles = {
  small: getShadowStyle(2),
  medium: getShadowStyle(4),
  large: getShadowStyle(8),
  card: getShadowStyle(3),
};