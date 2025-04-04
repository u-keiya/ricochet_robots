import { TargetSymbol, RobotColor } from '../types/game'; // Import both enums

// TargetSymbol に対応する表示文字のマッピング
// Use enum members as keys
export const SYMBOL_MAP: { [key in TargetSymbol]: string } = {
  [TargetSymbol.GEAR]: '⚙️',
  [TargetSymbol.MOON]: '🌙',
  [TargetSymbol.PLANET]: '🪐',
  [TargetSymbol.STAR]: '⭐',
  [TargetSymbol.VORTEX]: '🌀',
};

// TargetSymbol の配列 (vortexを含む)
// Use enum members directly
export const SYMBOLS: TargetSymbol[] = [
  TargetSymbol.GEAR,
  TargetSymbol.MOON,
  TargetSymbol.PLANET,
  TargetSymbol.STAR,
  TargetSymbol.VORTEX,
];

// ロボットの色の配列
// Use enum members directly
export const ROBOT_COLORS: RobotColor[] = [
  RobotColor.RED,
  RobotColor.BLUE,
  RobotColor.GREEN,
  RobotColor.YELLOW,
];