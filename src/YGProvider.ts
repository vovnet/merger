import { SDK, Player } from "ysdk";
import { EventBus } from "./game/core/EventBus";
import { GameEvents } from "./game/types/GameEvents";
import { SaveData } from "./game/types/SaveData";
import { LeaderboardEntry, PlayerLeaderboardEntry } from "./game/types/Leaderboard";

const LEADERBOARD_NAME = "score";

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

  public async loadData(): Promise<SaveData | null> {
    if (!this.player) {
      throw new Error("Yandex Player is not initialized");
    }

    const data = await this.player.getData(["gameSave"]);

    return (data.gameSave as SaveData | undefined) ?? null;
  }

  public async clearData(): Promise<void> {
    if (!this.player) {
      throw new Error("Yandex Player is not initialized");
    }

    await this.player.setData({
      gameSave: null,
    });
  }

  // ===========================================================================
  // LEADERBOARD
  // ===========================================================================

  /**
   * Проверяет, доступен ли API лидербордов.
   */
  private async isLeaderboardAvailable(
    method: "leaderboards.setScore" | "leaderboards.getEntries" | "leaderboards.getPlayerEntry",
  ): Promise<boolean> {
    if (!this.sdk) {
      return false;
    }

    return this.sdk.isAvailableMethod(method);
  }

  /**
   * Отправляет результат игрока в лидерборд.
   */
  public async submitScore(score: number): Promise<boolean> {
    if (!this.sdk) {
      throw new Error("Yandex SDK is not initialized");
    }

    const available = await this.isLeaderboardAvailable("leaderboards.setScore");

    if (!available) {
      return false;
    }

    try {
      await this.sdk.leaderboards.setScore(LEADERBOARD_NAME, score);

      return true;
    } catch (error) {
      console.error("[YGProvider] Failed to submit leaderboard score:", error);

      return false;
    }
  }

  /**
   * Получает TOP игроков.
   */
  public async getLeaderboard(quantityTop = 10): Promise<LeaderboardEntry[]> {
    if (!this.sdk) {
      throw new Error("Yandex SDK is not initialized");
    }

    const available = await this.isLeaderboardAvailable("leaderboards.getEntries");

    if (!available) {
      return [];
    }

    try {
      const result = await this.sdk.leaderboards.getEntries(LEADERBOARD_NAME, {
        quantityTop,
      });

      return result.entries.map((entry) => ({
        rank: entry.rank,
        score: entry.score,
        name: entry.player.publicName,
        avatarUrl: entry.player.getAvatarSrc("medium"),
      }));
    } catch (error) {
      console.error("[YGProvider] Failed to get leaderboard:", error);

      return [];
    }
  }

  /**
   * Получает позицию текущего игрока.
   */
  public async getPlayerLeaderboardEntry(): Promise<PlayerLeaderboardEntry | null> {
    if (!this.sdk) {
      throw new Error("Yandex SDK is not initialized");
    }

    const available = await this.isLeaderboardAvailable("leaderboards.getPlayerEntry");

    if (!available) {
      return null;
    }

    try {
      const entry = await this.sdk.leaderboards.getPlayerEntry(LEADERBOARD_NAME);

      return {
        rank: entry.rank,
        score: entry.score,
        name: entry.player.publicName,
        avatarUrl: entry.player.getAvatarSrc("medium"),
      };
    } catch (error) {
      console.error("[YGProvider] Failed to get player leaderboard entry:", error);

      return null;
    }
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
