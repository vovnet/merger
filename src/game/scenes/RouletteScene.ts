import * as Phaser from "phaser";
import { GameState } from "../core/GameState";
import { RouletteLogic, RouletteState, RouletteWinData } from "../core/RouleteLogic";

export class RouletteScene extends Phaser.Scene {
  private gameState!: GameState;
  private rouletteLogic!: RouletteLogic;

  // 🎯 Главный контейнер для всего UI рулетки (для плавного fade in/out)
  private rouletteView!: Phaser.GameObjects.Container;

  private spinBtn!: Phaser.GameObjects.Rectangle;
  private spinText!: Phaser.GameObjects.Text;
  private closeBtn!: Phaser.GameObjects.Rectangle;
  private closeText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "RouletteScene" });
  }

  init(): void {
    if (this.rouletteLogic) {
      this.rouletteLogic.reset();
    }
  }

  create(): void {
    this.gameState = this.registry.get("gameState") as GameState;
    this.events.once("shutdown", () => this.rouletteLogic.destroy());

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.85).setOrigin(0);

    // 1. Создаём главный контейнер для анимации появления/исчезновения
    this.rouletteView = this.add.container(0, 0).setDepth(10);

    // 2. Инициализируем логику (она создаст reelContainer внутри себя)
    this.rouletteLogic = new RouletteLogic(this, this.gameState, {
      totalItems: 60,
      cardW: 120,
      cardH: 150,
      cardGap: 10,
    });

    this.rouletteView.add(
      this.add
        .text(screenWidth / 2, 80, "🎰 РУЛЕТКА", {
          fontSize: "48px",
          color: "#ffd700",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        })
        .setOrigin(0.5),
    );

    this.rouletteView.add(
      this.add.triangle(
        screenWidth / 2,
        screenHeight / 2 - 90,
        0,
        0,
        -20,
        -30,
        20,
        -30,
        0xffd700,
        1,
      ),
    );

    // Генерируем ленту и добавляем её контейнер в наш общий вид
    this.rouletteLogic.initReel(screenWidth, screenHeight);
    this.rouletteView.add(this.rouletteLogic.reelContainer);

    this.setupUI(screenWidth, screenHeight);
    this.updateUIState();
  }

  private setupUI(screenWidth: number, screenHeight: number): void {
    this.spinBtn = this.add
      .rectangle(screenWidth / 2, screenHeight - 100, 200, 60, 0x4ecdc4)
      .setInteractive({ useHandCursor: true });
    this.spinBtn.setStrokeStyle(3, 0xffffff, 0.8);
    this.rouletteView.add(this.spinBtn);

    this.spinText = this.add
      .text(screenWidth / 2, screenHeight - 100, "КРУТИТЬ", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.rouletteView.add(this.spinText);

    this.spinBtn.on("pointerdown", () => this.handleSpinClick());

    this.closeBtn = this.add
      .rectangle(screenWidth - 80, 80, 50, 50, 0xff4444)
      .setInteractive({ useHandCursor: true });

    this.closeBtn.setStrokeStyle(2, 0xffffff, 0.8);
    this.rouletteView.add(this.closeBtn);

    this.closeText = this.add
      .text(screenWidth - 80, 80, "✕", {
        fontSize: "32px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.rouletteView.add(this.closeText);

    this.closeBtn.on("pointerdown", () => this.handleCloseClick());
  }

  private handleSpinClick(): void {
    if (this.rouletteLogic.currentState !== RouletteState.IDLE) return;
    if (this.gameState.spins <= 0) return;

    this.gameState.spendSpin();
    this.rouletteLogic.startSpin((winData) => this.onSpinComplete(winData));
    this.updateUIState();
  }

  private onSpinComplete(winData: RouletteWinData): void {
    if (winData.type === "RARE_SQUISH") {
      this.gameState.upgradeRandomRareSquish();
    } else {
      this.gameState.addCoins(winData.value);
    }

    //  Через небольшую паузу скрываем рулетку и показываем приз
    this.time.delayedCall(600, () => {
      this.showPrizeAnimation(winData);
    });
  }

  // 🎯 НОВАЯ ЛОГИКА: Анимация приза
  private showPrizeAnimation(winData: RouletteWinData): void {
    this.rouletteLogic.currentState = RouletteState.SHOWING_PRIZE;

    // Плавное исчезновение рулетки
    this.tweens.add({
      targets: this.rouletteView,
      alpha: 0,
      duration: 400,
      ease: "Power2.in",
      onComplete: () => {
        this.createPrizeDisplay(winData);
      },
    });
  }

  private createPrizeDisplay(winData: RouletteWinData): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // Определяем текст и цвет в зависимости от приза
    let prizeTextStr = "";
    let prizeColor = "#ffffff";
    let isSuperPrize = false;

    if (winData.type === "RARE_SQUISH") {
      prizeTextStr = "🎉 РЕДКИЙ СКВИШ! 🎉";
      prizeColor = "#ff9edb";
      isSuperPrize = true;
    } else {
      prizeTextStr = `+${winData.value} 💰`;
      prizeColor = winData.value >= 1000 ? "#ff8c42" : winData.value >= 250 ? "#ffd93d" : "#a8e6cf";
      isSuperPrize = winData.value >= 1000;
    }

    // Создаём текст приза (изначально скрыт и уменьшен)
    const prizeText = this.add
      .text(screenWidth / 2, screenHeight / 2, prizeTextStr, {
        fontSize: isSuperPrize ? "72px" : "56px",
        color: prizeColor,
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.5)
      .setDepth(100);

    // 🎬 Анимация появления приза (Pop-up с отскоком)
    this.tweens.add({
      targets: prizeText,
      alpha: 1,
      scale: isSuperPrize ? 1.2 : 1.0,
      duration: 600,
      ease: "Back.easeOut",
      onComplete: () => {
        // Держим на экране 1.5 секунды, затем убираем
        this.time.delayedCall(1500, () => {
          this.tweens.add({
            targets: prizeText,
            alpha: 0,
            scale: 1.5,
            y: screenHeight / 2 - 50, // Чуть улетает вверх при исчезновении
            duration: 400,
            ease: "Power2.in",
            onComplete: () => {
              prizeText.destroy();
              this.onPrizeAnimationComplete(winData);
            },
          });
        });
      },
    });

    // 🎆 Салют прямо по центру экрана для эффекта!
    this.spawnCenterFireworks(screenWidth / 2, screenHeight / 2, isSuperPrize);
  }

  private onPrizeAnimationComplete(winData: RouletteWinData): void {
    // 🎯 ЯВНО УПРАВЛЯЕМ СОСТОЯНИЕМ В ЗАВИСИМОСТИ ОТ ОСТАТКА СПИНОВ
    if (this.gameState.spins > 0) {
      // Есть спины: сбрасываем ленту, состояние внутри станет IDLE
      this.rouletteLogic.resetForNextSpin();
    } else {
      // Спины закончились: принудительно ставим состояние RESULT,
      // чтобы UI показал кнопку закрытия и надпись "НЕТ СПИНОВ"
      this.rouletteLogic.currentState = RouletteState.RESULT;
    }

    // Возвращаем альфу в 0 перед анимацией появления
    this.rouletteView.setAlpha(0);

    // 🎬 Плавное появление рулетки обратно
    this.tweens.add({
      targets: this.rouletteView,
      alpha: 1,
      duration: 400,
      ease: "Power2.out",
      onComplete: () => {
        this.updateUIState(); // Теперь здесь корректно отработает ветка RESULT
      },
    });
  }

  private spawnCenterFireworks(x: number, y: number, isSuper: boolean): void {
    const count = isSuper ? 60 : 30;
    const particles = this.add.particles(x, y, "fireworks", {
      frame: ["star_1", "star_2", "confetti_1", "confetti_2"],
      speed: { min: 150, max: 400 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1200,
      tint: isSuper ? [0xff9edb, 0xffd700, 0x4ecdc4] : 0xffd700,
      blendMode: "ADD",
      emitting: false,
    });
    particles.explode(count);
    this.time.delayedCall(1200, () => particles.destroy());
  }

  private handleCloseClick(): void {
    if (
      this.rouletteLogic.currentState === RouletteState.SPINNING ||
      this.rouletteLogic.currentState === RouletteState.SHOWING_PRIZE
    )
      return;

    this.scene.resume("GameScene");
    this.scene.resume("UIScene");
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
    });
  }

  private updateUIState(): void {
    const state = this.rouletteLogic.currentState;
    const spins = this.gameState.spins;
    console.log("update ui", { state, spins });

    if (state === RouletteState.IDLE) {
      this.spinBtn.setInteractive({ useHandCursor: true });
      this.spinBtn.setFillStyle(0x4ecdc4);
      this.spinText.setText(`КРУТИТЬ (${spins} 🎟️)`);
    } else if (state === RouletteState.SPINNING || state === RouletteState.SHOWING_PRIZE) {
      this.spinBtn.disableInteractive();
      this.spinBtn.setFillStyle(0x7f8c8d);
      this.spinText.setText(state === RouletteState.SPINNING ? "КРУТИМ..." : "...");
    } else if (state === RouletteState.RESULT) {
      if (spins <= 0) {
        this.spinBtn.disableInteractive();
        this.spinBtn.setFillStyle(0x7f8c8d);
        this.spinText.setText("НЕТ СПИНОВ");
      }
    }
  }
}
