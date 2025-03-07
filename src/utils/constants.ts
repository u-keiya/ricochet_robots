import { TargetSymbol } from '../types/board';
import { RobotColor } from '../types/game';

// ターゲットシンボルのマッピング
export const SYMBOL_MAP: Record<TargetSymbol, string> = {
  moon: '☽',     // 三日月
  gear: '⚙',     // 歯車
  saturn: '🪐',    // 土星
  cross: '✚',     // 十字
  vortex: '✧',    // 星型の渦
};

export const SYMBOLS: TargetSymbol[] = ['moon', 'gear', 'saturn', 'cross', 'vortex'];
export const ROBOT_COLORS: RobotColor[] = ['red', 'blue', 'yellow', 'green'];