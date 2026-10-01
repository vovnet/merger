import { AudioSettings } from "../core/AudioService";
import { ContractSaveData } from "../core/ContractService";
import { GameStateData } from "../core/GameState";
import { GridSnapshot } from "../core/Grid";

export interface SaveData {
  /**
   * Версия формата сохранения.
   *
   * Используется для миграции старых сохранений
   * после обновления игры.
   */
  version: number;

  /**
   * Время создания/обновления сохранения.
   */
  updatedAt: number;

  /**
   * Состояние игры.
   */
  game: GameStateData;

  /**
   * Состояние игрового поля.
   */
  grid: GridSnapshot;

  /**
   * Настройки звука.
   */
  audio: AudioSettings;

  contract: ContractSaveData | null;
}
