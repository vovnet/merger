// scenes/AdNotificationScene.ts
import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";

export class AdNotificationScene extends Phaser.Scene {
  private overlay!: Phaser.GameObjects.Rectangle;
  private messageText!: Phaser.GameObjects.BitmapText;
  private timerEvent?: Phaser.Time.TimerEvent;

  private readonly COUNTDOWN_SECONDS = 3;
  private readonly SCENE_KEY = "AdNotificationScene";

  constructor() {
    super({ key: "AdNotificationScene" });
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // 1. Создаем UI (изначально скрыт)
    this.createUI(screenWidth, screenHeight);
    this.hideNotification();

    // 2. Подписываемся на событие показа уведомления
    EventBus.on(GameEvents.SHOW_AD_NOTIFICATION, this.showNotification, this);
  }

  // 🎯 Создание визуальных элементов
  private createUI(screenWidth: number, screenHeight: number): void {
    // Полупрозрачный черный фон на весь экран
    this.overlay = this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7)
      .setOrigin(0)
      .setDepth(10000); // 🎯 Поверх всех других сцен

    // Текст сообщения
    this.messageText = this.add
      .bitmapText(screenWidth / 2, screenHeight / 2, "russo", "", 48)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(10001);
  }

  // 🎯 Показ уведомления и запуск таймера
  private showNotification(): void {
    this.overlay.setVisible(true);
    this.messageText.setVisible(true);

    let secondsLeft = this.COUNTDOWN_SECONDS;
    this.updateMessageText(secondsLeft);

    // Запускаем таймер обратного отсчета
    this.timerEvent = this.scene.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        secondsLeft--;

        if (secondsLeft <= 0) {
          this.onCountdownComplete();
        } else {
          this.updateMessageText(secondsLeft);
        }
      },
      loop: true,
    });
  }

  // 🎯 Обновление текста сообщения
  private updateMessageText(seconds: number): void {
    this.messageText.setText(`Рекламная пауза через ${seconds} сек...`);
  }

  // 🎯 Завершение отсчета
  private onCountdownComplete(): void {
    this.timerEvent?.remove();
    this.hideNotification();

    // Сообщаем всем, что пора показывать полноэкранную рекламу
    EventBus.emit(GameEvents.SHOW_FULLSCREEN_ADV);
  }

  // 🎯 Скрытие уведомления
  private hideNotification(): void {
    this.overlay.setVisible(false);
    this.messageText.setVisible(false);
  }

  // 🎯 Очистка при уничтожении сцены
  shutdown(): void {
    this.timerEvent?.remove();
    EventBus.off(GameEvents.SHOW_AD_NOTIFICATION, this.showNotification, this);
  }
}
