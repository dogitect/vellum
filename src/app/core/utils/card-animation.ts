// Copyright 2025 Leon Xia. MIT License.

export interface CardStyle {
  readonly transform: string;
  readonly opacity: string;
  readonly zIndex: string;
  readonly pointerEvents: string;
  readonly boxShadow: string;
  readonly visibility?: string;
}

const BOX_SHADOW = '0 -20px 60px rgba(0, 0, 0, 0.5)';
const NO_SHADOW = 'none';

/**
 * Computes card styles for the "stacked" variant (Work Detail).
 * Past cards remain semi-visible behind the active card.
 */
export function computeStackedCardStyles(
  count: number,
  activeIndex: number,
  scrollProgress: number
): CardStyle[] {
  return Array.from({ length: count }, (_, index) => {
    if (index < activeIndex) {
      return {
        transform: 'translateY(0) scale(1)',
        opacity: '0.7',
        zIndex: String(index),
        pointerEvents: 'none',
        boxShadow: BOX_SHADOW,
      };
    }
    if (index === activeIndex) {
      const scale = 1 - scrollProgress * 0.05;
      const opacity = 1 - scrollProgress * 0.3;
      return {
        transform: `translateY(0) scale(${scale})`,
        opacity: String(opacity),
        zIndex: String(count + index),
        pointerEvents: scrollProgress < 0.5 ? 'auto' : 'none',
        boxShadow: BOX_SHADOW,
      };
    }
    if (index === activeIndex + 1) {
      const translateY = (1 - scrollProgress) * 100;
      return {
        transform: `translateY(${translateY}%)`,
        opacity: '1',
        zIndex: String(count * 2 + 1),
        pointerEvents: scrollProgress > 0.5 ? 'auto' : 'none',
        boxShadow: scrollProgress > 0 ? BOX_SHADOW : NO_SHADOW,
      };
    }
    return {
      transform: 'translateY(100%)',
      opacity: '1',
      zIndex: String(index),
      pointerEvents: 'none',
      boxShadow: NO_SHADOW,
    };
  });
}

/**
 * Computes card styles for the "hidden" variant (Works).
 * Past cards are hidden from view entirely.
 */
export function computeHiddenCardStyles(
  count: number,
  activeIndex: number,
  scrollProgress: number
): CardStyle[] {
  return Array.from({ length: count }, (_, index) => {
    if (index < activeIndex) {
      return {
        transform: 'translateY(0) scale(0.95)',
        opacity: '0',
        visibility: 'hidden',
        zIndex: String(index),
        pointerEvents: 'none',
        boxShadow: NO_SHADOW,
      };
    }
    if (index === activeIndex) {
      const scale = 1 - scrollProgress * 0.05;
      const opacity = 1 - scrollProgress * 0.3;
      return {
        transform: `translateY(0) scale(${scale})`,
        opacity: String(opacity),
        visibility: 'visible',
        zIndex: String(count + index),
        pointerEvents: scrollProgress < 0.5 ? 'auto' : 'none',
        boxShadow: BOX_SHADOW,
      };
    }
    if (index === activeIndex + 1) {
      const translateY = (1 - scrollProgress) * 100;
      return {
        transform: `translateY(${translateY}%)`,
        opacity: '1',
        visibility: 'visible',
        zIndex: String(count * 2 + 1),
        pointerEvents: scrollProgress > 0.5 ? 'auto' : 'none',
        boxShadow: scrollProgress > 0 ? BOX_SHADOW : NO_SHADOW,
      };
    }
    return {
      transform: 'translateY(100%)',
      opacity: '1',
      visibility: 'hidden',
      zIndex: String(index),
      pointerEvents: 'none',
      boxShadow: NO_SHADOW,
    };
  });
}
