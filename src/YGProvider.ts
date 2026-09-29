import { SDK } from "ysdk";
import { EventBus } from "./game/core/EventBus";
import { GameEvents } from "./game/types/GameEvents";

class YGProvider {
  private sdk: SDK | null;

  constructor() {}

  async init() {
    if (this.sdk) return;

    this.sdk = await YaGames.init();
    const lang = this.sdk.environment.i18n.lang;

    this.initListeners();
  }

  private initListeners() {
    EventBus.on(GameEvents.GAME_READY, () => {
      this.sdk?.features.LoadingAPI.ready();
    });

    this.sdk?.on("game_api_pause", () => {
      this.pause();
    });

    this.sdk?.on("game_api_resume", () => {
      this.resume();
    });
  }

  private pause() {
    EventBus.emit(GameEvents.GAME_PAUSE_REQUEST);
  }

  private resume() {
    EventBus.emit(GameEvents.GAME_RESUME_REQUEST);
  }

  public async showRewardedVideo(events: { onRewarded: () => void }) {
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
}

export const ygProvider = new YGProvider();
