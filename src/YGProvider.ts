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
  }

  public async showRewardedVideo(events: { onRewarded: () => void }) {
    this.sdk?.adv.showRewardedVideo({ callbacks: { onRewarded: events.onRewarded } });
  }
}

export const ygProvider = new YGProvider();
