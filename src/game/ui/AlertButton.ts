import * as Phaser from "phaser";

export interface AlertButtonConfig {
  x?: number;
  y?: number;
  scale?: number;
  alert?: boolean;
  disabled?: boolean; // 🎯 Новый параметр для начального состояния
  onClick?: () => void;
  textureKey: string;
  frameKey: string;
  parent?: Phaser.Scene | Phaser.GameObjects.Container;
}

export class AlertButton {
  private scene: Phaser.Scene;
  private parent: Phaser.Scene | Phaser.GameObjects.Container;
  private container: Phaser.GameObjects.Container;
  private btnSprite: Phaser.GameObjects.Image;
  private alertIndicator: Phaser.GameObjects.Container | null;
  private alertPulseTween?: Phaser.Tweens.Tween;
  private isAnimating: boolean = false;
  private isDisabled: boolean = false; // 🎯 Флаг состояния disabled

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
    const isDisabled = config.disabled ?? false; // 🎯 Читаем начальное состояние

    this.container = new Phaser.GameObjects.Container(this.getScene(), x, y);
    this.addToParent(this.container);

    this.btnSprite = this.scene.add.image(0, 0, config.textureKey, config.frameKey);
    this.btnSprite.setOrigin(0.5);
    this.btnSprite.setScale(scale);

    // 🎯 Применяем начальное состояние disabled, если оно передано
    if (isDisabled) {
      this.setDisabled(true);
    } else {
      this.btnSprite.setInteractive({ useHandCursor: true });
    }

    this.container.add(this.btnSprite);

    this.btnSprite.on("pointerdown", () => {
      // 🎯 Двойная защита: не реагируем, если анимируется ИЛИ если disabled
      if (this.isAnimating || this.isDisabled) return;

      this.isAnimating = true;

      this.scene.tweens.add({
        targets: this.btnSprite,
        scale: scale * 0.9,
        duration: 100,
        ease: "Quad.easeOut",
        yoyo: true,
        onComplete: () => {
          this.btnSprite.setScale(scale);
          this.isAnimating = false;
          config.onClick?.();
        },
      });
    });

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

  // 🎯 НОВЫЙ ПУБЛИЧНЫЙ МЕТОД: Переключение состояния disabled
  public setDisabled(disabled: boolean): void {
    if (this.isDisabled === disabled) return; // Если состояние не меняется, ничего не делаем

    this.isDisabled = disabled;

    if (disabled) {
      // Делаем кнопку полупрозрачной
      this.btnSprite.setAlpha(0.6);
      // Отключаем возможность кликать и наводить мышь
      this.btnSprite.disableInteractive();
    } else {
      // Возвращаем полную непрозрачность
      this.btnSprite.setAlpha(1);
      // Возвращаем интерактивность
      this.btnSprite.setInteractive({ useHandCursor: true });
    }
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
    this.scene.tweens.killTweensOf(this.btnSprite);
    this.container.destroy();
  }
}
