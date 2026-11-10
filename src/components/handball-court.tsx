import { Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/i18n';

export type CourtSide = 'attack' | 'defense';

export type CourtPlayer = { fullName: string; shirtNumber: number | null };

type Props = {
  side: CourtSide;
  /** Jugador de cada puesto: índice 0 = portero, 1..6 = puestos de campo. Null = vacío. */
  slots: (CourtPlayer | null)[];
  disabled?: boolean;
  onPressSlot: (slotIndex: number) => void;
};

// Colores fijos del parqué: el campo se ve igual en modo claro y oscuro.
const FLOOR = '#2F6FB0';
const AREA = '#E9A23B';
const LINE = '#FFFFFF';

const MARKER_WIDTH = 78;
const MARKER_HEIGHT = 74;

/**
 * Colocación de cada puesto en % del dibujo (x, y). La portería rival/propia está arriba.
 * Ataque: extremos en las esquinas, primera línea por fuera de 9 m, pivote en 6 m y
 * nuestro portero abajo (en su portería, al otro lado). Defensa 6-0: los seis sobre la
 * línea de 6 m y el portero bajo palos.
 */
const LAYOUT: Record<CourtSide, { x: number; y: number }[]> = {
  attack: [
    { x: 50, y: 91 }, // portero
    { x: 11, y: 17 }, // extremo izq.
    { x: 20, y: 60 }, // lateral izq.
    { x: 50, y: 71 }, // central
    { x: 80, y: 60 }, // lateral dcho.
    { x: 89, y: 17 }, // extremo dcho.
    { x: 50, y: 43 }, // pivote
  ],
  defense: [
    { x: 50, y: 10 }, // portero
    { x: 11, y: 24 }, // exterior izq. (extremo)
    { x: 25, y: 43 }, // primera línea
    { x: 41, y: 51 }, // primera línea
    { x: 75, y: 43 }, // primera línea
    { x: 89, y: 24 }, // exterior dcho. (extremo)
    { x: 59, y: 51 }, // pivote
  ],
};

export function HandballCourt({ side, slots, disabled = false, onPressSlot }: Props) {
  return (
    <View style={styles.court} accessibilityRole="image">
      {/* Línea discontinua de 9 m */}
      <View style={styles.nineMeters} />
      {/* Área de 6 m */}
      <View style={styles.area} />
      {/* Portería */}
      <View style={styles.goal} />
      {/* Línea de medio campo */}
      <View style={styles.halfway} />

      {LAYOUT[side].map((point, slotIndex) => {
        const player = slots[slotIndex] ?? null;
        const slotName = strings.lineup.slotNames[slotIndex];
        return (
          <Pressable
            key={slotIndex}
            accessibilityRole="button"
            accessibilityLabel={player ? `${slotName}: ${player.fullName}` : slotName}
            disabled={disabled}
            onPress={() => onPressSlot(slotIndex)}
            style={({ pressed }) => [
              styles.marker,
              { left: `${point.x}%`, top: `${point.y}%` },
              pressed && styles.pressed,
            ]}>
            <View style={[styles.circle, player ? styles.circleFilled : styles.circleEmpty]}>
              <Text style={player ? styles.circleTextFilled : styles.circleTextEmpty}>
                {player ? (player.shirtNumber ?? initials(player.fullName)) : '+'}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.label}>
              {player ? shortName(player.fullName) : strings.lineup.slotShort[slotIndex]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Nombre corto para que quepa bajo el círculo: el primer nombre. */
function shortName(fullName: string) {
  return fullName.split(/\s+/)[0] ?? fullName;
}

const styles = StyleSheet.create({
  court: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    aspectRatio: 0.92,
    backgroundColor: FLOOR,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: LINE,
    overflow: 'hidden',
  },
  nineMeters: {
    position: 'absolute',
    top: '-44%',
    left: '3%',
    width: '94%',
    height: '100%',
    borderRadius: 9999,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: LINE,
  },
  area: {
    position: 'absolute',
    top: '-37%',
    left: '16%',
    width: '68%',
    height: '74%',
    borderRadius: 9999,
    borderWidth: 3,
    borderColor: LINE,
    backgroundColor: AREA,
  },
  goal: {
    position: 'absolute',
    top: 0,
    left: '41%',
    width: '18%',
    height: '3.5%',
    backgroundColor: LINE,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  halfway: {
    position: 'absolute',
    bottom: '16%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: LINE,
    opacity: 0.7,
  },
  marker: {
    position: 'absolute',
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
    marginLeft: -MARKER_WIDTH / 2,
    marginTop: -MARKER_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  pressed: {
    opacity: 0.7,
  },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFilled: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0B2A4A',
  },
  circleEmpty: {
    backgroundColor: '#00000040',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: LINE,
  },
  circleTextFilled: {
    color: '#0B2A4A',
    fontSize: 17,
    fontWeight: 700,
  },
  circleTextEmpty: {
    color: LINE,
    fontSize: 22,
    fontWeight: 600,
  },
  label: {
    maxWidth: MARKER_WIDTH,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0B2A4ACC',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 600,
  },
});
