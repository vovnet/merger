export const GameEvents = {
  // UI действия
  SHOW_TOAST: "showToast",
  SHOW_LEVEL_UP: "showLevelUp",
  SHOW_CLEANUP: "showCleanup",
  COMBO_ACHIEVED: "comboAchieved",

  // Состояние игры
  COINS_CHANGED: "coinsChanged",
  LEVEL_CHANGED: "levelChanged",
  EMPTY_CELLS_CHANGED: "emptyCellsChanged",
  HISTORY_CHANGED: "historyChanged",
} as const;

// События, которые UIScene эмитит, а GameScene слушает
export const UIEvents = {
  SPAWN_REQUESTED: "spawnRequested",
  FILL_REQUESTED: "fillRequested",
  UNDO_REQUESTED: "undoRequested",
  DEBUG_ADD_COINS: "debugAddCoins",
} as const;

// Типы данных для событий
export interface ToastData {
  text: string;
  color: number;
  duration?: number;
}

export interface CleanupData {
  count: number;
  compensation: number;
}

export interface ComboData {
  multiplier: number;
}
