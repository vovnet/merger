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
  private plusOneText!: Phaser.GameObjects.BitmapText;

  private currentState: ButtonState = ButtonState.IDLE;
  private readonly COOLDOWN_MS = 5000;

  private realWidth: number = 0;
  private realHeight: number = 0;

  // 🎯 Константы для ограничения зоны заполнения (16% - 76%)
  private readonly START_PERCENT = 0.16;
  private readonly END_PERCENT = 0.76;

  constructor(scene: Phaser.Scene, x: number, y: number, gameState: GameState) {
    this.scene = scene;
    this.gameState = gameState;
    this.create(x, y);
    this.setState(ButtonState.IDLE);
  }

  private create(x: number, y: number): void {
    // 🎯 КРИТИЧЕСКИ ВАЖНО: setOrigin(0.5), чтобы контейнер масштабировался от центра, а не от левого верхнего угла
    this.container = this.scene.add.container(x, y).setDepth(100);

    // 1. Фон кнопки
    this.btnBg = this.scene.add.image(0, 0, "ui", "add_coin_back").setOrigin(0.5);
    this.container.add(this.btnBg);

    this.realWidth = this.btnBg.displayWidth;
    this.realHeight = this.btnBg.displayHeight;

    // 2. Прогресс-бар (маска)
    this.progressFill = this.scene.add
      .image(0, 0, "ui", "add_coin_mask")
      .setOrigin(0.5)
      .setVisible(false);
    this.container.add(this.progressFill);

    // 3. Текст "+1"
    this.plusOneText = this.scene.add
      .bitmapText(0, 0, "russo", "+1", 32)
      .setOrigin(0.5)
      .setAlpha(0)
      .setTint(0x00cf0a)
      .setVisible(false);
    this.container.add(this.plusOneText);

    // 4. Интерактивность
    this.btnBg.setInteractive({ useHandCursor: true });
    this.btnBg.on("pointerdown", () => this.handleClick());
  }

  private handleClick(): void {
    if (this.currentState !== ButtonState.IDLE) return;

    // 1. Сначала блокируем состояние, чтобы предотвратить двойные клики
    this.setState(ButtonState.COOLDOWN);

    // 2. 🎬 СОЧНАЯ АНИМАЦИЯ НАЖАТИЯ (теперь она не будет убита методом setState)
    this.scene.tweens.add({
      targets: this.container, // Анимируем весь контейнер целиком
      scale: 0.9, // Уменьшаем на 15% (хорошо заметно глазу)
      duration: 60, // 150 мс (быстро, но достаточно для восприятия)
      ease: "Quad.easeOut", // Дает эффект лёгкой "пружинки" при возврате
      yoyo: true, // Автоматически возвращает масштаб к 1.0
      onComplete: () => {
        this.container.setScale(1); // Страховка для идеального сброса размера
      },
    });

    // 3. Запускаем игровую логику
    this.startCooldown();
  }

  private setState(newState: ButtonState): void {
    this.currentState = newState;

    // 🎯 МЫ УБРАЛИ ОТСЮДА killTweensOf!
    // Раньше он мгновенно уничтожал анимацию клика. Теперь он управляет только интерактивностью.
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

    // 🎯 АНИМАЦИЯ ЗАПОЛНЕНИЯ С 16% ДО 76% СНИЗУ ВВЕРХ
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

    this.scene.time.delayedCall(this.COOLDOWN_MS, () => {
      this.gameState.addCoins(1);
      this.showPlusOneAnimation();
    });
  }

  private onCooldownComplete(): void {
    // Твин отскока (награда)
    this.scene.tweens.add({
      targets: this.container, // Анимируем контейнер для консистентности
      scale: 1.15,
      duration: 300,
      ease: "Back.easeOut",
      yoyo: true,
      onComplete: () => {
        this.container.setScale(1);
      },
    });

    // Скрываем маску
    this.progressFill.setVisible(false);

    // Сбрасываем кроп обратно к начальным 16% для следующего раза
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
    // Безопасная очистка твинов при сбросе
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.plusOneText);

    this.currentState = ButtonState.IDLE;
    this.btnBg.setInteractive({ useHandCursor: true });
    this.container.setScale(1);

    this.progressFill.setVisible(false);
    const startHeight = this.realHeight * this.START_PERCENT;
    this.progressFill.setCrop(0, this.realHeight - startHeight, this.realWidth, startHeight);

    this.plusOneText.setVisible(false);
  }

  public destroy(): void {
    // Безопасная очистка твинов при уничтожении (предотвращает утечки памяти)
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.plusOneText);
    this.container.destroy();
  }
}
