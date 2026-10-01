import { SDK, Player } from "ysdk";
import { EventBus } from "./game/core/EventBus";
import { GameEvents } from "./game/types/GameEvents";
import { SaveData } from "./game/types/SaveData";

class YGProvider {
  private sdk: SDK | null = null;
  private player: Player | null = null;

  async init(): Promise<void> {
    if (this.sdk) {
      return;
    }

    this.sdk = await YaGames.init();
    const lang = this.sdk.environment.i18n.lang;
    this.player = await this.sdk.getPlayer();

    this.initListeners();
  }

  private initListeners(): void {
    EventBus.on(GameEvents.GAME_READY, () => {
      this.sdk?.features.LoadingAPI.ready();
    });

    this.sdk?.on("game_api_pause", () => {
      this.pause();
    });

    this.sdk?.on("game_api_resume", () => {
      this.resume();
    });

    EventBus.on(GameEvents.GAME_PAUSE_REQUEST, () => this.sdk?.features.GameplayAPI.stop());
    EventBus.on(GameEvents.GAME_RESUME_REQUEST, () => this.sdk?.features.GameplayAPI.start());
    EventBus.on(GameEvents.SHOW_FULLSCREEN_ADV, () => this.showFullscreenAdv());
  }

  // ===========================================================================
  // PLAYER DATA
  // ===========================================================================

  /**
   * Сохраняет данные игрока в Yandex Cloud.
   *
   * flush = true означает немедленную отправку.
   */
  public async saveData(data: SaveData, flush = true): Promise<void> {
    if (!this.player) {
      throw new Error("Yandex Player is not initialized");
    }

    await this.player.setData(
      {
        gameSave: data,
      },
      flush,
    );
  }

  /**
   * Загружает данные игрока из Yandex Cloud.
   */
  public async loadData(): Promise<SaveData | null> {
    if (!this.player) {
      throw new Error("Yandex Player is not initialized");
    }

    const data = await this.player.getData(["gameSave"]);

    return (data.gameSave as SaveData | undefined) ?? null;
  }

  /**
   * Очищает cloud save.
   */
  public async clearData(): Promise<void> {
    if (!this.player) {
      throw new Error("Yandex Player is not initialized");
    }

    await this.player.setData({
      gameSave: null,
    });
  }

  // ===========================================================================
  // GAMEPLAY
  // ===========================================================================

  private pause(): void {
    EventBus.emit(GameEvents.GAME_PAUSE_REQUEST);
  }

  private resume(): void {
    EventBus.emit(GameEvents.GAME_RESUME_REQUEST);
  }

  public async showRewardedVideo(events: { onRewarded: () => void }): Promise<void> {
    this.sdk?.adv.showRewardedVideo({
      callbacks: {
        onRewarded: () => {
          this.resume();
          events.onRewarded();
        },

        onOpen: () => this.pause(),

        onClose: () => this.resume(),

        onError: () => this.resume(),
      },
    });
  }

  public async showFullscreenAdv(): Promise<void> {
    this.sdk?.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => this.pause(),

        onClose: () => this.resume(),

        onError: () => this.resume(),
      },
    });
  }
}

export const ygProvider = new YGProvider();
