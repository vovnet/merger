import { EventBus } from "../game/core/EventBus";
import { GameEvents } from "../game/types/GameEvents";
import { SaveData } from "../game/types/SaveData";
import { SaveProvider } from "../game/types/SaveProvider";
import { GameSession } from "./GameSession";

export class SaveManager {
  private readonly AUTOSAVE_DELAY = 1500;

  private dirty = false;
  private saving = false;

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly session: GameSession,
    private readonly localProvider: SaveProvider,
    private readonly cloudProvider?: SaveProvider,
  ) {
    this.setupEventListeners();
  }

  /**
   * Подписывается на события, которые означают изменение
   * persistent-состояния игры.
   */
  private setupEventListeners(): void {
    EventBus.on(GameEvents.GRID_ITEM_CHANGED, this.handleStateChanged, this);

    EventBus.on(GameEvents.COINS_CHANGED, this.handleStateChanged, this);

    EventBus.on(GameEvents.LEVEL_CHANGED, this.handleStateChanged, this);

    EventBus.on(GameEvents.SPINS_CHANGED, this.handleStateChanged, this);

    EventBus.on(GameEvents.RARE_SQUISH_RANK_CHANGED, this.handleStateChanged, this);

    EventBus.on(GameEvents.PRESTIGE_OCCURRED, this.handleCriticalStateChanged, this);

    EventBus.on(GameEvents.AUDIO_SETTINGS_CHANGED, this.handleStateChanged, this);
  }

  /**
   * Обработчик обычного изменения состояния.
   *
   * Использует debounce, чтобы несколько изменений,
   * произошедших подряд, приводили только к одному сохранению.
   */
  private handleStateChanged = (): void => {
    this.markDirty();
  };

  /**
   * Обработчик критического изменения.
   *
   * Например, prestige имеет смысл сохранить немедленно.
   */
  private handleCriticalStateChanged = (): void => {
    this.markDirty();

    void this.saveNow();
  };

  /**
   * Помечает состояние игры как изменённое.
   *
   * Через AUTOSAVE_DELAY миллисекунд будет выполнен autosave.
   */
  public markDirty(): void {
    this.dirty = true;

    this.scheduleSave();
  }

  /**
   * Планирует debounced autosave.
   */
  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;

      void this.save();
    }, this.AUTOSAVE_DELAY);
  }

  /**
   * Выполняет обычное сохранение.
   *
   * Если состояние не изменилось, операция пропускается.
   */
  public async save(): Promise<void> {
    if (!this.dirty) {
      return;
    }

    // Если уже идёт сохранение — не запускаем второе.
    if (this.saving) {
      return;
    }

    this.saving = true;

    try {
      const data = this.session.createSaveData();

      await this.saveLocal(data);

      // Cloud не должен ломать игру,
      // если он недоступен.
      await this.saveCloud(data);

      this.dirty = false;

      EventBus.emit(GameEvents.GAME_SAVED);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      this.saving = false;
    }
  }

  /**
   * Немедленно сохраняет текущее состояние.
   *
   * Используется для критических операций и перед уходом
   * пользователя со страницы.
   */
  public async saveNow(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.dirty = true;

    await this.save();
  }

  /**
   * Сохраняет данные локально.
   *
   * LocalStorage является обязательным fallback-хранилищем.
   */
  private async saveLocal(data: SaveData): Promise<void> {
    try {
      await this.localProvider.save(data);
    } catch (error) {
      console.error("Local save failed:", error);

      throw error;
    }
  }

  /**
   * Пытается синхронизировать сохранение с облаком.
   *
   * Ошибка cloud save не считается ошибкой всего сохранения,
   * поскольку локальная копия уже была сохранена.
   */
  private async saveCloud(data: SaveData): Promise<void> {
    if (!this.cloudProvider) {
      return;
    }

    try {
      await this.cloudProvider.save(data);
    } catch (error) {
      console.warn("Cloud save failed. Local save is available.", error);
    }
  }

  /**
   * Загружает сохранение.
   *
   * Приоритет:
   *
   * 1. Cloud
   * 2. Local
   * 3. Новый профиль
   */
  public async load(): Promise<SaveData | null> {
    // Сначала пытаемся получить актуальное состояние из cloud.
    if (this.cloudProvider) {
      try {
        const cloudData = await this.cloudProvider.load();

        if (cloudData) {
          // Обновляем локальный cache.
          await this.localProvider.save(cloudData);

          return cloudData;
        }
      } catch (error) {
        console.warn("Cloud load failed. Falling back to local save.", error);
      }
    }

    // Cloud недоступен или сохранения там нет.
    try {
      return await this.localProvider.load();
    } catch (error) {
      console.error("Local load failed:", error);

      return null;
    }
  }

  /**
   * Загружает сохранение и сразу восстанавливает состояние игры.
   *
   * @returns true, если сохранение найдено и загружено.
   */
  public async loadIntoSession(): Promise<boolean> {
    const data = await this.load();

    if (!data) {
      return false;
    }

    try {
      this.session.restoreSaveData(data);

      this.dirty = false;

      EventBus.emit(GameEvents.GAME_SAVE_LOADED, data);

      return true;
    } catch (error) {
      console.error("Failed to restore save data:", error);

      return false;
    }
  }

  /**
   * Проверяет, есть ли несохранённые изменения.
   */
  public hasUnsavedChanges(): boolean {
    return this.dirty;
  }

  /**
   * Очищает сохранение.
   *
   * В production-игре я бы вызывал это только после
   * подтверждения пользователя.
   */
  public async clear(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    await this.localProvider.clear();

    if (this.cloudProvider) {
      try {
        await this.cloudProvider.clear();
      } catch (error) {
        console.warn("Cloud save clear failed:", error);
      }
    }

    this.dirty = false;
  }

  /**
   * Освобождает таймеры и EventBus listeners.
   *
   * Вызывать при уничтожении игры.
   */
  public destroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    EventBus.off(GameEvents.GRID_ITEM_CHANGED, this.handleStateChanged, this);

    EventBus.off(GameEvents.COINS_CHANGED, this.handleStateChanged, this);

    EventBus.off(GameEvents.LEVEL_CHANGED, this.handleStateChanged, this);

    EventBus.off(GameEvents.SPINS_CHANGED, this.handleStateChanged, this);

    EventBus.off(GameEvents.RARE_SQUISH_RANK_CHANGED, this.handleStateChanged, this);

    EventBus.off(GameEvents.PRESTIGE_OCCURRED, this.handleCriticalStateChanged, this);

    EventBus.off(GameEvents.AUDIO_SETTINGS_CHANGED, this.handleStateChanged, this);
  }
}
