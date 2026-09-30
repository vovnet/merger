import * as Phaser from "phaser";

export interface AlertButtonConfig {
  x?: number;
  y?: number;
  scale?: number;
  alert?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  textureKey: string;
  frameKey: string;
  parent?: Phaser.Scene | Phaser.GameObjects.Container;
  contentContainer?: Phaser.GameObjects.Container; // 🎯 Опциональный контент
  depth?: number;
}

export class AlertButton {
  private scene: Phaser.Scene;
  private parent: Phaser.Scene | Phaser.GameObjects.Container;
  private container: Phaser.GameObjects.Container;
  private btnSprite: Phaser.GameObjects.Image;
  private alertIndicator: Phaser.GameObjects.Container | null;
  private alertPulseTween?: Phaser.Tweens.Tween;
  private isAnimating: boolean = false;
  private isDisabled: boolean = false;

  private readonly ALERT_SIZE = 24;
  private readonly ALERT_OFFSET = 8;

  constructor(scene: Phaser.Scene, config: AlertButtonConfig) {
    this.scene = scene;
    this.parent = config.parent ?? scene;
    this.create(config);
  }

  private create(config: AlertButtonConfig): void {
    const x = config.x ?? 0;
    const y = config.y ?? 0;
    const scale = config.scale ?? 1;
    const hasAlert = config.alert ?? false;
    const isDisabled = config.disabled ?? false;

    // 1. ГЛАВНЫЙ КОНТЕЙНЕР (Точка отсчета 0,0)
    this.container = new Phaser.GameObjects.Container(this.getScene(), x, y);
    this.addToParent(this.container);

    // Устанавливаем начальный масштаб всему контейнеру сразу
    this.container.setScale(scale);

    // 2. ФОН КНОПКИ
    this.btnSprite = this.scene.add.image(0, 0, config.textureKey, config.frameKey);
    this.btnSprite.setOrigin(0.5);
    this.container.add(this.btnSprite).setDepth(config.depth || 0);

    // 3. ПОЛЬЗОВАТЕЛЬСКИЙ КОНТЕНТ
    // 💡 ВАЖНО: Пользователь должен создавать этот контейнер так,
    // чтобы его визуальный центр находился в координатах (0, 0).
    if (config.contentContainer) {
      // Мы просто добавляем его в главный контейнер.
      // Никаких setOrigin или setScale вызывать не нужно!
      this.container.add(config.contentContainer);
    }

    // 4. ИНТЕРАКТИВНОСТЬ
    if (isDisabled) {
      this.setDisabled(true);
    } else {
      this.btnSprite.setInteractive({ useHandCursor: true });
    }

    // 5. ОБРАБОТЧИК КЛИКА
    this.btnSprite.on("pointerdown", () => {
      if (this.isAnimating || this.isDisabled) return;

      this.isAnimating = true;

      // 🎯 АНИМИРУЕМ ВЕСЬ КОНТЕЙНЕР, а не только фон!
      // Так и фон, и текст, и иконки сожмутся синхронно
      this.scene.tweens.add({
        targets: this.container,
        scale: scale * 0.9, // Сжимаем весь контейнер
        duration: 100,
        ease: "Quad.easeOut",
        yoyo: true,
        onComplete: () => {
          this.container.setScale(scale); // Гарантированный сброс
          this.isAnimating = false;
          config.onClick?.();
        },
      });
    });

    // 6. ИНДИКАТОР АЛЕРТА
    if (hasAlert) {
      this.createAlertIndicator();
    } else {
      this.alertIndicator = null;
    }
  }

  private getScene(): Phaser.Scene {
    return this.parent instanceof Phaser.Scene ? this.parent : this.parent.scene;
  }

  private addToParent(gameObject: Phaser.GameObjects.GameObject): void {
    if (this.parent instanceof Phaser.Scene) {
      this.parent.add.existing(gameObject);
    } else if (this.parent instanceof Phaser.GameObjects.Container) {
      this.parent.add(gameObject);
    }
  }

  private createAlertIndicator(): void {
    this.alertIndicator = this.scene.add.container(0, 0);

    const btnWidth = this.btnSprite.displayWidth;
    const btnHeight = this.btnSprite.displayHeight;

    const offsetX = btnWidth / 2 - this.ALERT_OFFSET;
    const offsetY = -(btnHeight / 2) + this.ALERT_OFFSET;

    this.alertIndicator.setPosition(offsetX, offsetY);

    const circle = this.scene.add.graphics();
    circle.fillStyle(0xff3333, 1);
    circle.fillCircle(0, 0, this.ALERT_SIZE / 2);
    this.alertIndicator.add(circle);

    const exclamation = this.scene.add.text(0, 0, "!", {
      fontSize: "16px",
      color: "#ffffff",
      fontFamily: "Arial",
      fontStyle: "bold",
    });
    exclamation.setOrigin(0.5);
    this.alertIndicator.add(exclamation);

    this.container.add(this.alertIndicator);

    this.alertPulseTween = this.scene.tweens.add({
      targets: this.alertIndicator,
      scale: { from: 1, to: 1.2 },
      duration: 600,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  public setDisabled(disabled: boolean): void {
    if (this.isDisabled === disabled) return;

    this.isDisabled = disabled;
    const targetAlpha = disabled ? 0.6 : 1;

    // 🎯 Меняем прозрачность ВСЕГО контейнера.
    // В Phaser 3 установка alpha контейнеру автоматически применяет её ко всем детям.
    this.container.setAlpha(targetAlpha);

    if (disabled) {
      this.btnSprite.disableInteractive();
    } else {
      this.btnSprite.setInteractive({ useHandCursor: true });
    }
  }

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
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy(); // Уничтожит всё содержимое рекурсивно
  }
}
