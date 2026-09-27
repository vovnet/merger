import * as Phaser from "phaser";
import { GameState } from "../core/GameState";
import { RouletteLogic, RouletteState, RouletteWinData } from "../core/RouleteLogic";
import { AudioService } from "../core/AudioService";
import { AlertButton } from "../ui/AlertButton";

export class RouletteScene extends Phaser.Scene {
  private gameState!: GameState;
  private rouletteLogic!: RouletteLogic;

  // 🎯 Главный контейнер для всего UI рулетки (для плавного fade in/out)
  private rouletteView: Phaser.GameObjects.Container;

  private spinBtn: Phaser.GameObjects.Rectangle;
  private spinText: Phaser.GameObjects.Text;
  private closeBtn: AlertButton;
  private audioService: AudioService;

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
    this.audioService = this.registry.get("audioService") as AudioService;

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.85).setOrigin(0);

    // 1. Создаём главный контейнер для анимации появления/исчезновения
    this.rouletteView = this.add.container(0, 0).setDepth(10);

    // 2. Инициализируем логику (она создаст reelContainer внутри себя)
    this.rouletteLogic = new RouletteLogic(this, {
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

    this.closeBtn = new AlertButton(this.rouletteView.scene, {
      x: 1220,
      y: 60,
      scale: 0.7,
      textureKey: "ui",
      frameKey: "close_btn",
      onClick: () => this.handleCloseClick(),
      parent: this.rouletteView,
    });
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
      const rare = this.gameState.upgradeRandomRareSquish();
      winData.rareIndex = rare.index;
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

    if (winData.type === "RARE_SQUISH") {
      if (winData.rareIndex !== undefined) {
        const currentRank = this.gameState.getRareSquishRank(winData.rareIndex);
        this.playRareUnboxingAnimation(
          screenWidth / 2,
          screenHeight / 2,
          (winData.rareIndex + 1).toString(),
          currentRank,
        );
      }
    } else {
      // 🎯 ДЛЯ МОНЕТ: Оставляем простую и быструю текстовую анимацию
      let prizeTextStr = `+${winData.value} 💰`;
      let prizeColor =
        winData.value >= 1000 ? "#ff8c42" : winData.value >= 250 ? "#ffd93d" : "#a8e6cf";
      let isSuperPrize = winData.value >= 1000;

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

      this.tweens.add({
        targets: prizeText,
        alpha: 1,
        scale: isSuperPrize ? 1.2 : 1.0,
        duration: 600,
        ease: "Back.easeOut",
        onComplete: () => {
          this.time.delayedCall(1500, () => {
            this.tweens.add({
              targets: prizeText,
              alpha: 0,
              scale: 1.5,
              y: screenHeight / 2 - 50,
              duration: 400,
              ease: "Power2.in",
              onComplete: () => {
                prizeText.destroy();
                this.onPrizeAnimationComplete();
              },
            });
          });
        },
      });

      this.spawnCenterFireworks(screenWidth / 2, screenHeight / 2, isSuperPrize);
    }
  }

  private playRareUnboxingAnimation(
    x: number,
    y: number,
    squishFrameName: string,
    rank: number,
  ): void {
    // 🎯 1. СОЗДАЁМ УПАКОВКУ ИЗНАЧАЛЬНО НЕВИДИМОЙ И ЧУТЬ МЕНЬШЕ (для эффекта "pop")
    const pkgLeft = this.add
      .image(x, y, "squish-pack", "left_pack")
      .setDepth(90)
      .setAlpha(0)
      .setScale(0.8);

    const pkgRight = this.add
      .image(x + 10, y, "squish-pack", "right_pack")
      .setDepth(90)
      .setAlpha(0)
      .setScale(0.8);

    // 🎯 2. ЭФФЕКТ РАЗРЕЗА (твои координаты для масштаба 1.6)
    const startX = x + 265;
    const startY = y - 275;

    const slash = this.add.graphics().setDepth(95).setAlpha(0).setScale(0);
    slash.setPosition(startX, startY);

    slash.lineStyle(8, 0xffffff, 1);
    slash.lineBetween(0, 0, -640, 640);

    slash.lineStyle(4, 0xffd700, 1);
    slash.lineBetween(0, 0, -640, 640);

    // Вспышка
    const flash = this.add.rectangle(x, y, 1500, 1500, 0xffffff).setAlpha(0).setDepth(98);

    // Сам сквиш (изначально невидим)
    const squish = this.add
      .image(x, y + 40, "rare-squishes", squishFrameName)
      .setAlpha(0)
      .setScale(0)
      .setDepth(100);

    // 🎯 Иконка ранга
    const rankIcon = this.add
      .image(x, y - 160, "ranks", `rank${Math.min(rank, 37)}`)
      .setAlpha(0)
      .setScale(0)
      .setDepth(101);

    // 🎯 Текст ранга
    const rankText = this.add
      .text(x, y - 95, `РАНГ ${rank}`, {
        fontSize: "28px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0)
      .setDepth(101);

    // --- 🎬 НОВАЯ ЦЕПОЧКА АНИМАЦИИ ---

    // ШАГ 0: Плавное появление упаковки (создаём ожидание)
    this.tweens.add({
      targets: [pkgLeft, pkgRight], // Анимируем обе половинки одновременно
      alpha: 1,
      scale: 1.6, // Возвращаем к твоему целевому размеру
      duration: 400, // 0.4 секунды на плавное появление
      ease: "Back.easeOut", // Лёгкий эффект "пружинки" при появлении
      onComplete: () => {
        // ШАГ 1: Удар/разрез (запускается ТОЛЬКО после появления упаковки)
        this.tweens.add({
          targets: slash,
          alpha: 1,
          scale: 1.2,
          duration: 150,
          ease: "Power2.out",
          onComplete: () => {
            this.audioService.playSword();
            this.audioService.playUnlockSquish();
            // ШАГ 2: Разделение коробки + Вспышка
            this.tweens.add({
              targets: pkgLeft,
              x: "-=150",
              angle: -20,
              alpha: 0,
              duration: 500,
              ease: "Back.easeIn",
            });
            this.tweens.add({
              targets: pkgRight,
              x: "+=150",
              angle: 20,
              alpha: 0,
              duration: 500,
              ease: "Back.easeIn",
            });
            this.tweens.add({ targets: slash, alpha: 0, duration: 100 });

            this.tweens.add({
              targets: flash,
              alpha: { from: 0, to: 1 },
              duration: 100,
              yoyo: true,
              hold: 100,
            });

            // ШАГ 3: Появление сквиша, иконки и текста с эффектом "pop"
            this.tweens.add({
              targets: squish,
              alpha: 1,
              scale: 2.3,
              duration: 500,
              delay: 100, // Небольшая пауза после вспышки
              ease: "Back.easeOut",
            });

            this.tweens.add({
              targets: [rankIcon, rankText],
              alpha: 1,
              scale: 0.8,
              duration: 500,
              delay: 150,
              ease: "Back.easeOut",
              onComplete: () => {
                // Финальная стабилизация размеров
                this.tweens.add({
                  targets: squish,
                  scale: 2.0,
                  duration: 300,
                  ease: "Sine.easeInOut",
                });

                this.tweens.add({
                  targets: [rankIcon, rankText],
                  scale: 0.6,
                  duration: 300,
                  ease: "Sine.easeInOut",
                  onComplete: () => {
                    // Запускаем салют вокруг сквиша
                    this.spawnCenterFireworks(x, y, true);

                    // Добавляем сквишу лёгкое покачивание (idle)
                    this.tweens.add({
                      targets: squish,
                      angle: { from: -3, to: 3 },
                      duration: 1500,
                      yoyo: true,
                      repeat: -1,
                      ease: "Sine.easeInOut",
                    });

                    // 🎯 Очистка мусора
                    pkgLeft.destroy();
                    pkgRight.destroy();
                    slash.destroy();
                    flash.destroy();

                    // ШАГ 4: Возврат к логике завершения
                    this.time.delayedCall(2000, () => {
                      this.tweens.add({
                        targets: [squish, rankIcon, rankText],
                        alpha: 0,
                        y: "-=50",
                        scale: 0.2,
                        duration: 400,
                        ease: "Power2.in",
                        onComplete: () => {
                          squish.destroy();
                          rankIcon.destroy();
                          rankText.destroy();
                          this.onPrizeAnimationComplete();
                        },
                      });
                    });
                  },
                });
              },
            });
          },
        });
      },
    });
  }

  private onPrizeAnimationComplete(): void {
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
