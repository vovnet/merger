export const GameEvents = {
  // События игры
  GAME_READY: "gameReady",
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
  SCORE_CHANGED: "scoreChanged",

  GRID_ITEM_ADDED: "itemAdded",
  GRID_ITEM_REMOVED: "itemRemoved",
  GRID_ITEM_MERGED: "itemMerged",
  GRID_ITEM_CHANGED: "itemChanged",
  GRID_FULL: "gridFull",
  GRID_FILLED: "gridFilled",
  GRID_ITEMS_CLEANED: "itemsCleaned",
  GRID_CLEARED: "gridCleared",
  GRID_RESTORED: "gridRestored",
  HISTORY_CHECKPOINT: "historyCheckpoint",
  GRID_PRESTIGE_MERGED: "grid_prestige_merged",

  ITEM_TAP_DESTROYED: "item_tap_setroyed",

  // События ComboService
  COMBO_UPDATED: "combo_updated",
  COMBO_RESET: "combo_reset",

  // Контракты
  CONTRACT_CREATED: "contract_created",
  CONTRACT_UPDATED: "contract_updated",
  CONTRACT_COMPLETED: "contract_completed",

  SPINS_CHANGED: "spins_changed",
  RARE_SQUISH_RANK_CHANGED: "rare_squish_rank_changed",

  GAME_STATE_LOADED: "game_state_loaded",
  PRESTIGE_OCCURRED: "prestige_occurred",
} as const;

// События, которые UIScene эмитит, а GameScene слушает
export const UIEvents = {
  SPAWN_REQUESTED: "spawnRequested",
  FILL_REQUESTED: "fillRequested",
  UNDO_REQUESTED: "undoRequested",
  DEBUG_ADD_COINS: "debugAddCoins",
  ROULETTE_OPEN_REQUESTED: "roulette_open_requested",
  MODAL_OPEN_REQUESTED: "modal_open_requested",
  MODAL_CLOSED: "modal_closed",
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

export interface ComboData {
  multiplier: number; // 1, 2, 3, 4, 5...
  itemId: string; // ID предмета, который продолжает цепочку
}

export interface ModalData {
  [key: string]: any;
}
