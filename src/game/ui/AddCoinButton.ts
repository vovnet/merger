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
  private btnBg!: Phaser.GameObjects.Image;
  private progressOverlay!: Phaser.GameObjects.Image;
  private plusOneText!: Phaser.GameObjects.Text;

  private currentState: ButtonState = ButtonState.IDLE;
  private readonly COOLDOWN_MS = 5000;

  // Храним реальные размеры текстуры, чтобы не вычислять их каждый кадр
  private realWidth: number = 0;
  private realHeight: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, gameState: GameState) {
    this.scene = scene;
    this.gameState = gameState;
    this.create(x, y);
    this.setState(ButtonState.IDLE);
  }

  private create(x: number, y: number): void {
    this.container = this.scene.add.container(x, y).setDepth(100);

    // 1. Основная кнопка
    this.btnBg = this.scene.add.image(0, 0, "ui", "create_squish_btn").setOrigin(0.5);
    this.container.add(this.btnBg);

    // 2. Прогресс-бар (копия кнопки с тинтом)
    this.progressOverlay = this.scene.add
      .image(0, 0, "ui", "create_squish_btn")
      .setOrigin(0.5)
      .setTint(0xfacd04) // Мятный цвет заполнения
      .setVisible(false);

    // Добавляем ПОВЕРХ основной кнопки
    this.container.add(this.progressOverlay);

    // 🎯 Получаем реальные размеры текстуры ОДИН РАЗ при создании
    const frame = this.progressOverlay.frame;
    this.realWidth = frame.cutWidth;
    this.realHeight = frame.cutHeight;

    // 3. Текст "+1"
    const btnHeight = this.btnBg.displayHeight;
    this.plusOneText = this.scene.add
      .text(0, -btnHeight / 2 - 20, "+1", {
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
    this.btnBg.on("pointerover", () => {
      if (this.currentState === ButtonState.IDLE) {
        this.scene.tweens.add({
          targets: this.btnBg,
          scale: 1.1,
          ease: "Back.easeOut",
          duration: 200,
        });
      }
    });
    this.btnBg.on("pointerout", () => {
      if (this.currentState === ButtonState.IDLE) {
        this.scene.tweens.add({
          targets: this.btnBg,
          scale: 1,
          ease: "Back.easeOut",
          duration: 200,
        });
      }
    });
  }

  private handleClick(): void {
    if (this.currentState !== ButtonState.IDLE) return;

    this.btnBg.setScale(1);
    this.setState(ButtonState.COOLDOWN);
    this.startCooldown();
  }

  private setState(newState: ButtonState): void {
    this.currentState = newState;
    console.log("set state: ", newState);
    switch (newState) {
      case ButtonState.IDLE:
        this.btnBg.clearTint();
        this.btnBg.setInteractive({ useHandCursor: true });
        break;

      case ButtonState.COOLDOWN:
        this.btnBg.setTint(0x5e5bff); // Затемняем основу
        this.btnBg.disableInteractive();
        break;

      case ButtonState.CLAIMING:
        this.btnBg.disableInteractive();
        break;
    }
  }

  private startCooldown(): void {
    this.progressOverlay.setVisible(true);

    // 🎯 Изначально обрезаем всё (высота = 0, начинаем с самого низа текстуры)
    this.progressOverlay.setCrop(0, this.realHeight, this.realWidth, 0);

    // Объект для анимации высоты обрезки
    const cropState = { currentHeight: 0 };

    this.scene.tweens.add({
      targets: cropState,
      currentHeight: this.realHeight, // Анимируем от 0 до полной высоты текстуры
      duration: this.COOLDOWN_MS,
      ease: "Linear",
      onUpdate: () => {
        // 🎯 МАГИЯ ЗАПОЛНЕНИЯ СНИЗУ ВВЕРХ:
        // Сдвигаем начальную точку выреза (Y) вверх по мере роста высоты
        const cropY = this.realHeight - cropState.currentHeight;

        // setCrop(x, y, width, height)
        this.progressOverlay.setCrop(
          0, // X: всегда от левого края
          cropY, // Y: сдвигается вверх от низа
          this.realWidth, // Width: полная ширина
          cropState.currentHeight, // Height: растёт от 0 до максимума
        );
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
    // 🎯 КРАСИВЫЙ ТВИН: Отскок кнопки в момент награды
    this.scene.tweens.add({
      targets: this.btnBg,
      scale: { from: 1, to: 1.2 }, // Сначала увеличиваем
      duration: 600,
      ease: "Back.easeOut",
      yoyo: true, // Возвращаем обратно
      hold: 50, // Пауза в пиковой точке
      onComplete: () => {
        // Возвращаем исходный масштаб
        this.btnBg.setScale(1);
      },
    });

    // Вспышка (короткое осветление)
    this.scene.tweens.add({
      targets: this.btnBg,
      alpha: { from: 1, to: 1.5 }, // "Пересвет" (alpha > 1 работает как яркость)
      duration: 100,
      yoyo: true,
    });

    // Скрываем прогресс-бар
    this.progressOverlay.setVisible(false);

    // Сбрасываем кроп
    this.progressOverlay.setCrop(0, 0, this.realWidth, this.realHeight);

    // Переходим в CLAIMING (анимация "+1")
    this.setState(ButtonState.CLAIMING);
  }

  private showPlusOneAnimation(): void {
    const btnHeight = this.btnBg.displayHeight;

    this.plusOneText
      .setAlpha(0)
      .setScale(0.5)
      .setPosition(0, -btnHeight / 2 - 20)
      .setVisible(true);

    this.scene.tweens.add({
      targets: this.plusOneText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1.3 },
      y: "-=40",
      duration: 600,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.time.delayedCall(400, () => {
          this.scene.tweens.add({
            targets: this.plusOneText,
            alpha: 0,
            scale: 1.5,
            y: "-=20",
            duration: 400,
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
    this.btnBg.clearTint();
    this.btnBg.setInteractive({ useHandCursor: true });
    this.progressOverlay.setVisible(false);
    this.progressOverlay.setCrop(0, 0, this.realWidth, this.realHeight); // Safe reset
    this.plusOneText.setVisible(false);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
