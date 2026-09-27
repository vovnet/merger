import * as Phaser from "phaser";

export interface AlertButtonConfig {
  x?: number;
  y?: number;
  scale?: number;
  alert?: boolean;
  onClick?: () => void;
  textureKey: string;
  frameKey: string;
}

export class AlertButton {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private btnSprite!: Phaser.GameObjects.Image;
  private alertIndicator!: Phaser.GameObjects.Container | null;
  private alertPulseTween?: Phaser.Tweens.Tween;
  private isAnimating: boolean = false;

  // Размеры алерта теперь абсолютные и не зависят от масштаба кнопки
  private readonly ALERT_SIZE = 24;
  private readonly ALERT_OFFSET = 8;

  constructor(scene: Phaser.Scene, config: AlertButtonConfig) {
    this.scene = scene;
    this.create(config);
  }

  private create(config: AlertButtonConfig): void {
    // 1. Безопасные значения по умолчанию
    const x = config.x ?? 0;
    const y = config.y ?? 0;
    const scale = config.scale ?? 1;
    const hasAlert = config.alert ?? false;

    // 2. Контейнер (всегда в масштабе 1, чтобы не влиять на алерт)
    this.container = this.scene.add.container(x, y);

    // 3. Основной спрайт кнопки (масштабируем ТОЛЬКО его)
    this.btnSprite = this.scene.add.image(0, 0, config.textureKey, config.frameKey);
    this.btnSprite.setOrigin(0.5);
    this.btnSprite.setScale(scale); // 🎯 Масштаб применяется здесь
    this.btnSprite.setInteractive({ useHandCursor: true });
    this.container.add(this.btnSprite);

    // 4. Обработчик клика с анимацией (анимируем только спрайт)
    this.btnSprite.on("pointerdown", () => {
      if (this.isAnimating) return;
      this.isAnimating = true;

      this.scene.tweens.add({
        targets: this.btnSprite, // 🎯 Цель анимации - спрайт, а не контейнер
        scale: scale * 0.9,
        duration: 100,
        ease: "Quad.easeOut",
        yoyo: true,
        onComplete: () => {
          this.btnSprite.setScale(scale); // 🎯 Возвращаем исходный масштаб спрайту
          this.isAnimating = false;
          config.onClick?.(); // Безопасный вызов
        },
      });
    });

    // 5. Индикатор алерта
    if (hasAlert) {
      this.createAlertIndicator();
    } else {
      this.alertIndicator = null;
    }
  }

  private createAlertIndicator(): void {
    // Контейнер для алерта (будет добавлен в главный контейнер, масштаб которого = 1)
    this.alertIndicator = this.scene.add.container(0, 0);

    // 🎯 displayWidth и displayHeight уже учитывают scale самого спрайта!
    // Поэтому мы можем использовать их для точного позиционирования в углу.
    const btnWidth = this.btnSprite.displayWidth;
    const btnHeight = this.btnSprite.displayHeight;

    const offsetX = btnWidth / 2 - this.ALERT_OFFSET;
    const offsetY = -(btnHeight / 2) + this.ALERT_OFFSET;

    this.alertIndicator.setPosition(offsetX, offsetY);

    // Красный кружок (абсолютный размер, не масштабируется)
    const circle = this.scene.add.graphics();
    circle.fillStyle(0xff3333, 1);
    circle.fillCircle(0, 0, this.ALERT_SIZE / 2);
    this.alertIndicator.add(circle);

    // Текст "!" (абсолютный размер, не масштабируется)
    const exclamation = this.scene.add.text(0, 0, "!", {
      fontSize: "16px", // Фиксированный размер
      color: "#ffffff",
      fontFamily: "Arial",
      fontStyle: "bold",
    });
    exclamation.setOrigin(0.5);
    this.alertIndicator.add(exclamation);

    this.container.add(this.alertIndicator);

    // Пульсация алерта (масштабируется только сам индикатор от 1 до 1.2)
    this.alertPulseTween = this.scene.tweens.add({
      targets: this.alertIndicator,
      scale: { from: 1, to: 1.2 },
      duration: 600,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  // Публичный метод для переключения алерта в рантайме
  public setAlert(alert: boolean): void {
    if (alert && !this.alertIndicator) {
      this.createAlertIndicator();
    } else if (!alert && this.alertIndicator) {
      this.alertPulseTween?.stop();
      this.alertIndicator.destroy();
      this.alertIndicator = null;
    }
  }

  public destroy(): void {
    this.alertPulseTween?.stop();
    this.scene.tweens.killTweensOf(this.btnSprite); // Чистим твины спрайта
    this.container.destroy();
  }
}
