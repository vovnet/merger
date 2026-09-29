import { SDK } from "ysdk";
import { EventBus } from "./game/core/EventBus";
import { GameEvents } from "./game/types/GameEvents";

class YGProvider {
  private sdk: SDK | null;

  constructor() {}

  async init() {
    if (this.sdk) return;

    this.sdk = await YaGames.init();

    EventBus.on(GameEvents.GAME_READY, () => {
      this.sdk?.features.LoadingAPI.ready();
    });
  }
}

export const ygProvider = new YGProvider();
