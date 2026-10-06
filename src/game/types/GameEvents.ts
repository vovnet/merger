export const GameEvents = {
  // События игры
  GAME_READY: "gameReady",
  GAME_PAUSE_REQUEST: "gamePauseRequest",
  GAME_RESUME_REQUEST: "gameResumeRequest",
  SHOW_AD_NOTIFICATION: "showAdNotivication",
  SHOW_FULLSCREEN_ADV: "showFullscreenAdv",
  AUDIO_SETTINGS_CHANGED: "audioSettingsChanged",

  // UI действия
  SHOW_TOAST: "showToast",
  SHOW_LEVEL_UP: "showLevelUp",
  SHOW_CLEANUP: "showCleanup",
  COMBO_ACHIEVED: "comboAchieved",
  ADDED_COIN_CLICK: "added_coin_click",
  RANK_SQUISH_CLOSED: "rank_squish_closed",

  // Состояние игры
  COINS_CHANGED: "coinsChanged",
  LEVEL_CHANGED: "levelChanged",
  EMPTY_CELLS_CHANGED: "emptyCellsChanged",
  HISTORY_CHANGED: "historyChanged",
  SCORE_CHANGED: "scoreChanged",
  ROUND_CHANGED: "round_changed",

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
  CONTRACT_REWARD_CLAIMED: "contract_reward_claimed",

  // Tutorial
  SHOW_TUTORIAL_STEP: "show_tutorial_step",
  TUTORIAL_STEP_CLICKED: "tutorial_step_clicked",
  HIDE_TUTORIAL_STEP: "hide_tutorial_step",
  TUTORIAL_SKIPPED: "tutorial_skipped",
  TUTORIAL_SCENE_READY: "tutorial_scene_ready",

  ROULETTE_OPENED: "roulette_opened",
  SPINS_CHANGED: "spins_changed",
  RARE_SQUISH_RANK_CHANGED: "rare_squish_rank_changed",
  ROULETTE_RUN: "roulette_run",

  GAME_SAVE_LOADED: "game_save_loaded",
  GAME_SAVED: "game_saved",
  PRESTIGE_OCCURRED: "prestige_occurred",

  NON_GAME_ACTION: "non_game_action",

  // achivements
  ACHIEVEMENT_UNLOCKED: "achivement_unlocked",
  ACHIEVEMENT_CLAIMED: "achivement_claimed",
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
