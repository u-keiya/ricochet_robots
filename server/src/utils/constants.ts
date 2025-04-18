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
// Initialize with enum members from game.ts RobotColor
export const ROBOT_COLORS: RobotColor[] = [RobotColor.RED, RobotColor.BLUE, RobotColor.YELLOW, RobotColor.GREEN];