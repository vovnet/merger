import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { t } from "../../locales";
import { AudioService } from "../core/AudioService";

export class AchievementToastScene extends Phaser.Scene {
  private toastContainer!: Phaser.GameObjects.Container;
  private hideTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: "AchievementToastScene" });
  }

  create() {
    const screenWidth = this.scale.width;

    // 🎯 Создаем контейнер ЗА ПРЕДЕЛАМИ экрана сверху (y = -150)
    // Depth 3000 гарантирует, что тост будет поверх ВСЕГО, включая модалки
    this.toastContainer = this.add.container(screenWidth / 2, -150).setDepth(3000);

    this.buildToastUI();

    // 🎯 Слушаем событие разблокировки достижения
    EventBus.on(GameEvents.ACHIEVEMENT_UNLOCKED, this.showNotification, this);
  }

  // 🎯 Сборка UI тоста
  private buildToastUI(): void {
    this.toastContainer.removeAll(true);

    const width = 390;
    const height = 70;
    const radius = 16; // 🎯 Радиус скругления углов

    // 1. Фон: голубой, полупрозрачный, скругленный, БЕЗ обводки
    const bg = this.add.graphics();
    bg.fillStyle(0x3796ce, 0.9); // Голубой цвет (как в описании карточек) с прозрачностью 85%
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    this.toastContainer.add(bg);

    // 2. Иконка достижения
    const icon = this.add.sprite(-150, 0, "achievements", "ach_icon").setScale(0.8);
    this.toastContainer.add(icon);

    // 3. Текст уведомления
    const text = this.add
      .bitmapText(-100, 0, "russo", t("ACH_NEW_UNLOCKED"), 20)
      .setOrigin(0, 0.5)
      .setTint(0xffffff);
    this.toastContainer.add(text);
  }

  // 🎯 Показать уведомление
  private showNotification(): void {
    // Если уже есть активный таймер скрытия, удаляем его.
    // Это нужно, если достижения выпадают одно за другим: таймер продлится.
    if (this.hideTimer) {
      this.hideTimer.remove();
    }

    const audio = this.registry.get("audioService") as AudioService;
    audio.playNotificationSound_3();

    // Убиваем старые анимации, чтобы избежать конфликтов
    this.tweens.killTweensOf(this.toastContainer);

    // 🎯 Анимация появления (вылет сверху с легким "отскоком")
    this.tweens.add({
      targets: this.toastContainer,
      y: 70, // Отступ от верхнего края экрана
      duration: 600,
      ease: "Back.easeOut",
      onComplete: () => {
        // Запускаем таймер на скрытие через 3 секунды ПОСЛЕ завершения появления
        this.hideTimer = this.time.delayedCall(3000, () => {
          this.hideNotification();
        });
      },
    });
  }

  // 🎯 Скрыть уведомление
  private hideNotification(): void {
    this.tweens.killTweensOf(this.toastContainer);

    this.tweens.add({
      targets: this.toastContainer,
      y: -150, // Улетает обратно вверх за экран
      duration: 400,
      ease: "Power2.in",
    });
  }

  // 🎯 Очистка памяти при уничтожении сцены
  shutdown(): void {
    if (this.hideTimer) {
      this.hideTimer.remove();
    }
    this.tweens.killTweensOf(this.toastContainer);
    EventBus.off(GameEvents.ACHIEVEMENT_UNLOCKED, this.showNotification, this);
  }
}
