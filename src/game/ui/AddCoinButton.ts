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
  private plusOneCoin!: Phaser.GameObjects.Image;

  // 🎯 Эмиттер для мыльных пузырей
  private bubbleEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  private currentState: ButtonState = ButtonState.IDLE;
  private readonly COOLDOWN_MS = 3000;

  private realWidth: number = 0;
  private realHeight: number = 0;

  private audioService: AudioService;
  private cooldownPulseTween?: Phaser.Tweens.Tween;

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
      .bitmapText(0, 0, "russo", "+1", 48)
      .setOrigin(0.5)
      .setAlpha(0)
      .setTint(0x00cf0a)
      .setVisible(false);
    this.container.add(this.plusOneText);

    this.plusOneCoin = this.scene.add
      .image(-25, 0, "ui", "coin")
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.5)
      .setVisible(false);
    this.container.add(this.plusOneCoin);

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

    this.cooldownPulseTween = this.scene.tweens.add({
      targets: this.container,
      scaleY: 0.9,
      duration: 700,
      ease: "Quad.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    // 🎯 ЗАПУСКАЕМ МЫЛЬНЫЕ ПУЗЫРИ
    this.startBubbles();

    this.scene.time.delayedCall(this.COOLDOWN_MS, () => {
      this.gameState.addCoins(1);
      this.showPlusOneAnimation();
      this.audioService.playUiPopSound();
    });
  }

  private onCooldownComplete(): void {
    this.cooldownPulseTween?.stop();
    this.container.setScale(1);

    // 🎯 ОСТАНАВЛИВАЕМ ПУЗЫРИ (они красиво растворятся сами благодаря lifespan)
    this.stopBubbles();

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
    this.plusOneText.setAlpha(0).setScale(0.2).setPosition(40, -20).setVisible(true);
    this.plusOneCoin.setAlpha(0).setScale(0.2).setPosition(-20, -20).setVisible(true);

    const rewardTargets = [this.plusOneText, this.plusOneCoin];

    this.scene.tweens.add({
      targets: rewardTargets,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.2, to: 1 },
      y: "-=30",
      duration: 500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.time.delayedCall(500, () => {
          this.scene.tweens.add({
            targets: rewardTargets,
            alpha: 0,
            y: "-=40",
            duration: 300,
            ease: "Power2.in",
            onComplete: () => {
              this.plusOneText.setVisible(false);
              this.plusOneCoin.setVisible(false);
              this.setState(ButtonState.IDLE);
            },
          });
        });
      },
    });
  }

  // 🎯 МЕТОДЫ УПРАВЛЕНИЯ ЭМИТТЕРОМ
  private startBubbles(): void {
    if (!this.bubbleEmitter) {
      this.bubbleEmitter = this.scene.add.particles(0, 22, "fireworks", {
        frame: "confetti_2",

        // 🎯 1. Широкая зона спавна (от -70 до +70 пикселей по горизонтали)
        // Используем фиксированные числа для надежности, они отлично работают внутри контейнера
        x: { min: -70, max: 70 },
        y: { min: -40, max: 40 },

        // 🎯 2. Широкий разброс при движении (КЛЮЧЕВОЕ ИЗМЕНЕНИЕ)
        // -90° это строго вверх. -140° это влево-вверх, -40° это вправо-вверх.
        // Теперь пузыри будут реально разлетаться веером!
        angle: { min: -150, max: -20 },
        speed: { min: 40, max: 90 }, // Чуть увеличили скорость, чтобы разлет был заметнее

        // 🎯 3. Дополнительные улучшения для эффекта "мыльного пузыря"
        scale: { start: 0.3, end: 0.7 }, // Пузырь заметно растет, пока летит
        alpha: { start: 0.8, end: 0 }, // Плавное растворение
        lifespan: { min: 1500, max: 2500 }, // Живут дольше, чтобы успеть разлететься
        frequency: 100, // Чуть чаще (каждые 100 мс)
        quantity: 1,
        tint: 0xff4dff,
        blendMode: "ADD",
        emitting: false,

        // 🎯 4. Вращение! Это критически важно для спрайтов типа "confetti" или "star",
        // чтобы они переливались и выглядели как объемные пузыри, а не плоские наклейки.
        rotate: { min: 0, max: 360, ease: "Linear" },
      });

      this.bubbleEmitter.startFollow(this.container);
      this.bubbleEmitter.setDepth(this.container.depth + 1);
    }

    this.bubbleEmitter.start();
  }

  private stopBubbles(): void {
    if (this.bubbleEmitter) {
      this.bubbleEmitter.stop();
      // Мы используем stop(), а не destroy(), чтобы уже вылетевшие пузыри
      // красиво завершили свой жизненный цикл (растворились), а не исчезли мгновенно.
    }
  }

  public reset(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.plusOneText);
    this.scene.tweens.killTweensOf(this.plusOneCoin);
    this.cooldownPulseTween?.stop();

    // 🎯 Полное уничтожение эмиттера при сбросе для предотвращения утечек
    this.bubbleEmitter?.destroy();
    this.bubbleEmitter = undefined;

    this.currentState = ButtonState.IDLE;
    this.btnBg.setInteractive({ useHandCursor: true });
    this.container.setScale(1);

    this.progressFill.setVisible(false);
    const startHeight = this.realHeight * this.START_PERCENT;
    this.progressFill.setCrop(0, this.realHeight - startHeight, this.realWidth, startHeight);

    this.plusOneText.setVisible(false);
    this.plusOneCoin.setVisible(false);
  }

  public destroy(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.killTweensOf(this.plusOneText);
    this.scene.tweens.killTweensOf(this.plusOneCoin);
    this.cooldownPulseTween?.stop();

    // 🎯 Гарантированная очистка эмиттера
    this.bubbleEmitter?.destroy();
    this.bubbleEmitter = undefined;

    this.container.destroy();
  }
}
