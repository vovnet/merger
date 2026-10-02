import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { adsService } from "../../AdsService";

export class AdNotificationScene extends Phaser.Scene {
  private overlay!: Phaser.GameObjects.Rectangle;
  private messageText!: Phaser.GameObjects.BitmapText;
  private timerEvent?: Phaser.Time.TimerEvent;

  private readonly COUNTDOWN_SECONDS = 2;

  constructor() {
    super({ key: "AdNotificationScene" });
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.createUI(screenWidth, screenHeight);
    this.hideNotification();

    EventBus.on(GameEvents.SHOW_AD_NOTIFICATION, this.showNotification, this);
    this.scene.bringToTop();
  }

  private createUI(screenWidth: number, screenHeight: number): void {
    this.overlay = this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7)
      .setOrigin(0)
      .setDepth(10000);

    this.messageText = this.add
      .bitmapText(screenWidth / 2, screenHeight / 2, "russo", "", 48)
      .setOrigin(0.5)
      .setCenterAlign()
      .setTint(0xffffff)
      .setDepth(10001);
  }

  private showNotification(): void {
    // Если уведомление уже показывается,
    // не создаём второй таймер.
    if (this.timerEvent) {
      return;
    }

    this.overlay.setVisible(true);
    this.messageText.setVisible(true);

    let secondsLeft = this.COUNTDOWN_SECONDS;

    this.updateMessageText(secondsLeft);

    this.timerEvent = this.time.addEvent({
      delay: 1000,

      loop: true,

      callback: () => {
        secondsLeft--;

        if (secondsLeft <= 0) {
          this.onCountdownComplete();
        } else {
          this.updateMessageText(secondsLeft);
        }
      },
    });
  }

  private updateMessageText(seconds: number): void {
    this.messageText.setText(`Рекламная пауза \n${seconds} сек...`);
  }

  private onCountdownComplete(): void {
    this.timerEvent?.remove();
    this.timerEvent = undefined;

    this.hideNotification();

    adsService.showAd();
  }

  private hideNotification(): void {
    this.overlay.setVisible(false);
    this.messageText.setVisible(false);
  }

  shutdown(): void {
    this.timerEvent?.remove();
    this.timerEvent = undefined;

    EventBus.off(GameEvents.SHOW_AD_NOTIFICATION, this.showNotification, this);
  }
}
