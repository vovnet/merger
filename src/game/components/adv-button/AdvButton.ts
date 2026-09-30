import * as Phaser from "phaser";
import { AlertButton, AlertButtonConfig } from "../../ui/AlertButton";

export interface AdvButtonConfig extends Omit<AlertButtonConfig, "onClick"> {
  onClick: () => void;
  cooldownMinutes?: number;
}

export class AdvButton {
  private button: AlertButton;
  private timerText!: Phaser.GameObjects.BitmapText;
  private timerEvent?: Phaser.Time.TimerEvent;

  private baseCooldownMs: number;
  private timeRemainingMs: number = 0;
  private userOnClick: () => void;
  private userContentContainer?: Phaser.GameObjects.Container;

  constructor(
    private scene: Phaser.Scene,
    config: AdvButtonConfig,
  ) {
    this.baseCooldownMs = (config.cooldownMinutes ?? 3) * 60 * 1000;
    this.timeRemainingMs = this.baseCooldownMs;
    this.userOnClick = config.onClick;
    this.userContentContainer = config.contentContainer;

    // 1. Создаем текст таймера
    this.timerText = this.scene.add
      .bitmapText(30, 0, "russo", "", 42)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setVisible(false);

    // 2. Объединяем пользовательский контент с таймером
    const combinedContainer = this.createCombinedContent();

    // 3. Создаем AlertButton с объединенным контентом
    this.button = new AlertButton(scene, {
      ...config,
      contentContainer: combinedContainer,
      onClick: () => this.handleClick(),
    });
  }

  // 🎯 Создаем контейнер, который содержит и пользовательский контент, и таймер
  private createCombinedContent(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // Добавляем пользовательский контент (если есть)
    if (this.userContentContainer) {
      container.add(this.userContentContainer);
    }

    // Добавляем таймер поверх
    container.add(this.timerText);

    return container;
  }

  // 🎯 Перехватываем клик: выполняем действие пользователя и запускаем таймер
  private handleClick(): void {
    this.userOnClick();
    this.startCooldown();
  }

  // 🎯 Запуск состояния кулдауна
  private startCooldown(): void {
    this.timeRemainingMs = this.baseCooldownMs;
    this.button.setDisabled(true);

    // Скрываем пользовательский контент, показываем таймер
    if (this.userContentContainer) {
      this.userContentContainer.setVisible(false);
    }
    this.timerText.setVisible(true);

    this.updateTimerText();

    this.timerEvent = this.scene.time.addEvent({
      delay: 1000,
      callback: this.onTimerTick,
      callbackScope: this,
      loop: true,
    });
  }

  // 🎯 Срабатывает каждую секунду
  private onTimerTick(): void {
    this.timeRemainingMs -= 1000;

    if (this.timeRemainingMs <= 0) {
      this.endCooldown();
    } else {
      this.updateTimerText();
    }
  }

  // 🎯 Форматирование времени в MM:SS
  private updateTimerText(): void {
    const totalSeconds = Math.ceil(this.timeRemainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, "0")}`);
  }

  // 🎯 Завершение кулдауна и возврат в исходное состояние
  private endCooldown(): void {
    this.timerEvent?.remove();

    // Показываем пользовательский контент, скрываем таймер
    if (this.userContentContainer) {
      this.userContentContainer.setVisible(true);
    }
    this.timerText.setVisible(false);

    this.button.setDisabled(false);
  }

  // 🎯 Очистка памяти при уничтожении сцены
  public destroy(): void {
    this.timerEvent?.remove();
    this.button.destroy();
  }
}
