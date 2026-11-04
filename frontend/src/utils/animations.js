/**
 * Animaciones utilitarias — NORUS.
 * Staggered entrance, fade/slide, y micro-interacciones reutilizables.
 * Compatible con web (sin useNativeDriver).
 */
import { Animated, Easing, Platform } from 'react-native';

// useNativeDriver no está soportado en web
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Hook para animación escalonada de listas.
 * @param {number} count - Número de items
 * @param {number} delay - Delay entre items (ms)
 * @param {number} duration - Duración de cada animación (ms)
 * @returns {Array<Animated.Value>} Array de valores animados
 */
export function useStaggeredAnimation(count, delay = 80, duration = 350) {
  const anims = Array.from({ length: count }, (_, i) => {
    const a = new Animated.Value(0);
    Animated.timing(a, {
      toValue: 1,
      duration,
      delay: i * delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
    return a;
  });

  return anims;
}

/**
 * Genera estilos animados para entrada escalonada (fade + slide up).
 * @param {Animated.Value} anim - Valor animado (0-1)
 * @param {number} translateY - Desplazamiento inicial en Y
 * @returns {Object} Estilo para Animated.View
 */
export function staggeredEntranceStyle(anim, translateY = 20) {
  return {
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [translateY, 0] }) },
    ],
  };
}

/**
 * Hook combinado: crea animaciones y devuelve estilos listos para usar.
 * @param {number} count - Número de items
 * @param {Object} options - { delay, duration, translateY }
 * @returns {Array<Object>} Array de estilos animados
 */
export function useStaggeredEntrance(count, options = {}) {
  const { delay = 80, duration = 350, translateY = 20 } = options;
  const anims = useStaggeredAnimation(count, delay, duration);
  return anims.map(a => staggeredEntranceStyle(a, translateY));
}

/**
 * Animación de pulso suave (para badges, indicadores de estado).
 * @param {Animated.Value} anim - Valor animado
 * @param {number} minScale - Escala mínima
 * @param {number} maxScale - Escala máxima
 * @param {number} duration - Duración del ciclo
 */
export function pulseAnimation(anim, minScale = 0.95, maxScale = 1.05, duration = 1500) {
  Animated.loop(
    Animated.sequence([
      Animated.timing(anim, {
        toValue: maxScale,
        duration: duration / 2,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(anim, {
        toValue: minScale,
        duration: duration / 2,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ])
  ).start();
}

/**
 * Animación de shake (para errores en inputs).
 * @param {Animated.Value} anim - Valor animado (translateX)
 * @param {number} intensity - Intensidad del shake
 */
export function shakeAnimation(anim, intensity = 10) {
  Animated.sequence([
    Animated.timing(anim, { toValue: -intensity, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
    Animated.timing(anim, { toValue: intensity, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
    Animated.timing(anim, { toValue: -intensity, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
    Animated.timing(anim, { toValue: intensity, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
    Animated.timing(anim, { toValue: 0, duration: 50, useNativeDriver: USE_NATIVE_DRIVER }),
  ]).start();
}

/**
 * Fade in/out simple.
 * @param {Animated.Value} anim - Valor animado
 * @param {boolean} visible - Visibilidad objetivo
 * @param {number} duration - Duración
 */
export function fadeAnimation(anim, visible, duration = 200) {
  Animated.timing(anim, {
    toValue: visible ? 1 : 0,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: USE_NATIVE_DRIVER,
  }).start();
}

/**
 * Scale in/out (para modales, bottom sheets).
 * @param {Animated.Value} anim - Valor animado
 * @param {boolean} visible - Visibilidad objetivo
 * @param {number} duration - Duración
 */
export function scaleAnimation(anim, visible, duration = 250) {
  Animated.timing(anim, {
    toValue: visible ? 1 : 0.9,
    duration,
    easing: Easing.out(Easing.back(1.5)),
    useNativeDriver: USE_NATIVE_DRIVER,
  }).start();
}