import * as Phaser from "phaser";
import { GameState } from "../core/GameState";
import { AudioService } from "../core/AudioService";

export enum ButtonState {
  IDLE = "IDLE",
  COOLDOWN = "COOLDOWN",
  CLAIMING = "CLAIMING",
}

export class AddCoinButton {
  private scene: Phaser.Scene;
  private gameState: GameState;

  private container!: Phaser.GameObjects.Container;
  private btnBg!: Phaser.GameObjects.Image;
  private progressFill!: Phaser.GameObjects.Image;
  private plusOneText!: Phaser.GameObjects.BitmapText;

  private currentState: ButtonState = ButtonState.IDLE;
  private readonly COOLDOWN_MS = 5000;

  private realWidth: number = 0;
  private realHeight: number = 0;

  private audioService: AudioService;
  private cooldownPulseTween?: Phaser.Tweens.Tween; // 🎯 Ссылка на твин пульсации

  private readonly START_PERCENT = 0.16;
  private readonly END_PERCENT = 0.76;

  constructor(scene: Phaser.Scene, x: number, y: number, gameState: GameState) {
    this.scene = scene;
    this.gameState = gameState;
    this.audioService = this.scene.registry.get("audioService") as AudioService;
    this.create(x, y);
    this.setState(ButtonState.IDLE);
  }

  private create(x: number, y: number): void {
    this.container = this.scene.add.container(x, y).setDepth(100);

    this.btnBg = this.scene.add.image(0, 0, "ui", "add_coin_back").setOrigin(0.5);
    this.container.add(this.btnBg);

    this.realWidth = this.btnBg.displayWidth;
    this.realHeight = this.btnBg.displayHeight;

    this.progressFill = this.scene.add
      .image(0, 0, "ui", "add_coin_mask")
      .setOrigin(0.5)
      .setVisible(false);
    this.container.add(this.progressFill);

    this.plusOneText = this.scene.add
      .bitmapText(0, 0, "russo", "+1", 32)
      .setOrigin(0.5)
      .setAlpha(0)
      .setTint(0x00cf0a)
      .setVisible(false);
    this.container.add(this.plusOneText);

    this.btnBg.setInteractive({ useHandCursor: true });
    this.btnBg.on("pointerdown", () => this.handleClick());
  }

  private handleClick(): void {
    if (this.currentState !== ButtonState.IDLE) return;

    this.setState(ButtonState.COOLDOWN);

    this.scene.tweens.add({
      targets: this.container,
      scale: 0.9,
      duration: 60,
      ease: "Quad.easeOut",
      yoyo: true,
      onComplete: () => {
        this.container.setScale(1);
      },
    });

    this.audioService.playWaterBubblingSound();
    this.startCooldown();
  }

  private setState(newState: ButtonState): void {
    this.currentState = newState;

    switch (newState) {
      case ButtonState.IDLE:
        this.btnBg.setInteractive({ useHandCursor: true });
        break;

      case ButtonState.COOLDOWN:
      case ButtonState.CLAIMING:
        this.btnBg.disableInteractive();
        break;
    }
  }

  private startCooldown(): void {
    this.progressFill.setVisible(true);

    const startHeight = this.realHeight * this.START_PERCENT;
    const endHeight = this.realHeight * this.END_PERCENT;
    const animRange = endHeight - startHeight;

    const initialCropY = this.realHeight - startHeight;
    this.progressFill.setCrop(0, initialCropY, this.realWidth, startHeight);

    const cropState = { currentAnim: 0 };

    this.scene.tweens.add({
      targets: cropState,
      currentAnim: animRange,
      duration: this.COOLDOWN_MS,
      ease: "Linear",
      onUpdate: () => {
        const currentCropHeight = startHeight + cropState.currentAnim;
        const cropY = this.realHeight - currentCropHeight;
        this.progressFill.setCrop(0, cropY, this.realWidth, currentCropHeight);
      },
      onComplete: () => {
        this.onCooldownComplete();
      },
    });

    // 🎯 АНИМАЦИЯ ПУЛЬСАЦИИ ВО ВРЕМЯ ЗАПОЛНЕНИЯ
    this.cooldownPulseTween = this.scene.tweens.add({
      targets: this.container,
      scaleY: 0.9, // Слегка сплющиваем по вертикали (на 5%)
      duration: 700, // 1 секунда на цикл
      ease: "Quad.easeInOut", // Плавная синусоида для естественного "дыхания"
      yoyo: true, // Возвращаемся к scaleY: 1
      repeat: -1, // 🎯 Бесконечный цикл пока идет кулдаун
    });

    this.scene.time.delayedCall(this.COOLDOWN_MS, () => {
      this.gameState.addCoins(1);
      this.showPlusOneAnimation();
      this.audioService.playUiPopSound();
    });
  }

  private onCooldownComplete(): void {
    // 🎯 ОСТАНАВЛИВАЕМ ПУЛЬСАЦИЮ перед анимацией награды
    this.cooldownPulseTween?.stop();
    this.container.setScale(1); // Сбрасываем масштаб

    // Твин отскока (награда)
    this.scene.tweens.add({
      targets: this.container,
      scale: 1.15,
      duration: 300,
      ease: "Back.easeOut",
      yoyo: true,
      onComplete: () => {
        this.container.setScale(1);
      },
    });

    this.progressFill.setVisible(false);

    const startHeight = this.realHeight * this.START_PERCENT;
    this.progressFill.setCrop(0, this.realHeight - startHeight, this.realWidth, startHeight);

    this.setState(ButtonState.CLAIMING);
  }

  private showPlusOneAnimation(): void {
    this.plusOneText.setAlpha(0).setScale(0.5).setPosition(0, -20).setVisible(true);

    this.scene.tweens.add({
      targets: this.plusOneText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1.2 },
      y: "-=30",
      duration: 500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.time.delayedCall(500, () => {
          this.scene.tweens.add({
            targets: this.plusOneText,
            alpha: 0,
            y: "-=20",
            duration: 300,
            ease: "Power2.in",
            onComplete: () => {
              this.plusOneText.setVisible(false);
              this.setState(ButtonState.IDLE);
            },
          });
        });
      },
    });
  }

  public reset(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.plusOneText);
    this.cooldownPulseTween?.stop(); // 🎯 Останавливаем пульсацию при сбросе

    this.currentState = ButtonState.IDLE;
    this.btnBg.setInteractive({ useHandCursor: true });
    this.container.setScale(1);

    this.progressFill.setVisible(false);
    const startHeight = this.realHeight * this.START_PERCENT;
    this.progressFill.setCrop(0, this.realHeight - startHeight, this.realWidth, startHeight);

    this.plusOneText.setVisible(false);
  }

  public destroy(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.plusOneText);
    this.cooldownPulseTween?.stop(); // 🎯 Останавливаем пульсацию при уничтожении
    this.container.destroy();
  }
}
