import * as Phaser from "phaser";
import { EventBus } from "./game/core/EventBus";
import { GameEvents } from "./game/types/GameEvents";
import { RewardedVideoEvents, ygProvider } from "./YGProvider";

export class AdsService {
  // ===========================================================================
  // CONFIG
  // ===========================================================================

  private static readonly AUTO_AD_INTERVAL = 0.3 * 60 * 1000;

  // ===========================================================================

  private clock!: Phaser.Time.Clock;
  private autoAdTimer?: Phaser.Time.TimerEvent;

  private isShowingAd = false;
  private initialized = false;

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  public init(clock: Phaser.Time.Clock): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.clock = clock;

    this.startAutoAdTimer();

    EventBus.on(GameEvents.NON_GAME_ACTION, this.handleNonGameAction);
  }

  public destroy(): void {
    if (!this.initialized) {
      return;
    }

    this.autoAdTimer?.remove();
    this.autoAdTimer = undefined;

    EventBus.off(GameEvents.NON_GAME_ACTION, this.handleNonGameAction);

    this.initialized = false;
  }

  // ===========================================================================
  // TIMER
  // ===========================================================================

  private startAutoAdTimer(): void {
    this.autoAdTimer?.remove();

    this.autoAdTimer = this.clock.addEvent({
      delay: AdsService.AUTO_AD_INTERVAL,
      loop: false,

      callback: () => {
        this.handleAutoAdTimer();
      },
    });
  }

  private handleAutoAdTimer(): void {
    if (this.isShowingAd) {
      return;
    }

    EventBus.emit(GameEvents.SHOW_AD_NOTIFICATION);
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  private handleNonGameAction = (): void => {
    if (this.isShowingAd) {
      return;
    }

    void this.showAd();
  };

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  public async showAd(): Promise<void> {
    if (this.isShowingAd) {
      return;
    }

    this.isShowingAd = true;

    // Сбрасываем таймер сразу перед показом рекламы.
    this.startAutoAdTimer();

    try {
      await ygProvider.showFullscreenAdv();
    } catch (error) {
      console.error("[AdsService] Failed to show fullscreen ad:", error);
    } finally {
      this.isShowingAd = false;
    }
  }

  public showRewardedVideo(events: RewardedVideoEvents): void {
    // После rewarded тоже начинаем новый интервал.
    this.startAutoAdTimer();

    void ygProvider.showRewardedVideo(events);
  }
}

export const adsService = new AdsService();
