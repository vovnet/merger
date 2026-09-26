import * as Phaser from "phaser";
import { GameState } from "../core/GameState";

export enum ButtonState {
  IDLE = "IDLE",
  COOLDOWN = "COOLDOWN",
  CLAIMING = "CLAIMING",
}

export class AddCoinButton {
  private scene: Phaser.Scene;
  private gameState: GameState;

  private container!: Phaser.GameObjects.Container;
  private btnBg!: Phaser.GameObjects.Image; // add_coin_back
  private progressFill!: Phaser.GameObjects.Image; // add_coin_mask
  private plusOneText!: Phaser.GameObjects.Text;

  private currentState: ButtonState = ButtonState.IDLE;
  private readonly COOLDOWN_MS = 5000;

  private realWidth: number = 0;
  private realHeight: number = 0;

  // 🎯 Новые константы для ограничения зоны заполнения
  private readonly START_PERCENT = 0.16; // 20%
  private readonly END_PERCENT = 0.76; // 80%

  constructor(scene: Phaser.Scene, x: number, y: number, gameState: GameState) {
    this.scene = scene;
    this.gameState = gameState;
    this.create(x, y);
    this.setState(ButtonState.IDLE);
  }

  private create(x: number, y: number): void {
    this.container = this.scene.add.container(x, y).setDepth(100);

    // 1. Фон кнопки (add_coin_back) - всегда виден
    this.btnBg = this.scene.add.image(0, 0, "ui", "add_coin_back").setOrigin(0.5);
    this.container.add(this.btnBg);

    // Получаем размеры
    this.realWidth = this.btnBg.displayWidth;
    this.realHeight = this.btnBg.displayHeight;

    // 2. Прогресс-бар (add_coin_mask) - показывается поверх, обрезается
    this.progressFill = this.scene.add
      .image(0, 0, "ui", "add_coin_mask")
      .setOrigin(0.5)
      .setVisible(false);
    this.container.add(this.progressFill);

    // 3. Текст "+1"
    this.plusOneText = this.scene.add
      .text(0, 0, "+1", {
        fontSize: "32px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setVisible(false);
    this.container.add(this.plusOneText);

    // 4. Интерактивность
    this.btnBg.setInteractive({ useHandCursor: true });
    this.btnBg.on("pointerdown", () => this.handleClick());
  }

  private handleClick(): void {
    if (this.currentState !== ButtonState.IDLE) return;

    this.setState(ButtonState.COOLDOWN);
    this.startCooldown();
  }

  private setState(newState: ButtonState): void {
    this.currentState = newState;
    switch (newState) {
      case ButtonState.IDLE:
        this.btnBg.setInteractive({ useHandCursor: true });
        break;

      case ButtonState.COOLDOWN:
        this.btnBg.disableInteractive();
        break;

      case ButtonState.CLAIMING:
        this.btnBg.disableInteractive();
        break;
    }
  }

  private startCooldown(): void {
    this.progressFill.setVisible(true);

    // 🎯 Вычисляем границы в пикселях
    const startHeight = this.realHeight * this.START_PERCENT; // 20% высоты
    const endHeight = this.realHeight * this.END_PERCENT; // 80% высоты
    const animRange = endHeight - startHeight; // Диапазон анимации (60%)

    // Устанавливаем начальное состояние (заполнено на 20%)
    // setCrop(x, y, width, height) -> y отсчитывается сверху текстуры
    const initialCropY = this.realHeight - startHeight;
    this.progressFill.setCrop(0, initialCropY, this.realWidth, startHeight);

    // Объект для анимации только диапазона (от 0 до 60%)
    const cropState = { currentAnim: 0 };

    // 🎯 АНИМАЦИЯ ЗАПОЛНЕНИЯ С 20% ДО 80%
    this.scene.tweens.add({
      targets: cropState,
      currentAnim: animRange, // Анимируем от 0 до 60% высоты
      duration: this.COOLDOWN_MS,
      ease: "Linear",
      onUpdate: () => {
        // Текущая высота заполнения = базовые 20% + анимируемая часть
        const currentCropHeight = startHeight + cropState.currentAnim;

        // Y сдвигается вверх по мере роста высоты
        const cropY = this.realHeight - currentCropHeight;

        // Применяем кроп
        this.progressFill.setCrop(0, cropY, this.realWidth, currentCropHeight);
      },
      onComplete: () => {
        this.onCooldownComplete();
      },
    });

    this.scene.time.delayedCall(this.COOLDOWN_MS, () => {
      this.gameState.addCoins(1);
      this.showPlusOneAnimation();
    });
  }

  private onCooldownComplete(): void {
    // Твин отскока
    this.scene.tweens.add({
      targets: this.btnBg,
      scale: { from: 1, to: 1.15 },
      duration: 300,
      ease: "Back.easeOut",
      yoyo: true,
      onComplete: () => {
        this.btnBg.setScale(1);
      },
    });

    // Скрываем маску
    this.progressFill.setVisible(false);

    // 🎯 Сбрасываем кроп обратно к начальным 20% для следующего раза
    const startHeight = this.realHeight * this.START_PERCENT;
    this.progressFill.setCrop(0, this.realHeight - startHeight, this.realWidth, startHeight);

    this.setState(ButtonState.CLAIMING);
  }

  private showPlusOneAnimation(): void {
    this.plusOneText
      .setAlpha(0)
      .setScale(0.5)
      .setPosition(0, -this.realHeight / 2 - 20)
      .setVisible(true);

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
    this.currentState = ButtonState.IDLE;
    this.btnBg.setInteractive({ useHandCursor: true });
    this.progressFill.setVisible(false);

    // 🎯 Сброс к 20%
    const startHeight = this.realHeight * this.START_PERCENT;
    this.progressFill.setCrop(0, this.realHeight - startHeight, this.realWidth, startHeight);

    this.plusOneText.setVisible(false);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
