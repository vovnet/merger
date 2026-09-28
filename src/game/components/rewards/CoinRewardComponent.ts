// components/rewards/CoinRewardComponent.ts
import * as Phaser from "phaser";
import { IRewardComponent } from "./IRewardComponent";
import { RewardVFX } from "../../utils/RewardVFX";
import { AudioService } from "../../core/AudioService";

export class CoinRewardComponent implements IRewardComponent {
  private scene: Phaser.Scene;
  private amount: number;

  private coinIcon!: Phaser.GameObjects.Image;
  private amountText!: Phaser.GameObjects.Text;
  private container!: Phaser.GameObjects.Container;

  private audioService: AudioService;

  private x: number;
  private y: number;

  constructor(scene: Phaser.Scene, amount: number) {
    this.scene = scene;
    this.amount = amount;
    this.audioService = this.scene.registry.get("audioService") as AudioService;
  }

  public build(centerX: number, centerY: number): void {
    this.x = centerX;
    this.y = centerY;
    // 🎯 Создаем контейнер для всей награды, чтобы легко её анимировать как единое целое
    this.container = this.scene.add.container(centerX, centerY).setDepth(10);

    // 🎯 Определяем "эпичность" награды в зависимости от суммы
    const isSuper = this.amount >= 1000;
    const isBig = this.amount >= 250;

    // Размер иконки монеты
    const iconSize = isSuper ? 200 : isBig ? 150 : 120;

    // 1. Большая иконка монеты сверху
    this.coinIcon = this.scene.add
      .image(0, -60, "ui", "coin_open")
      .setOrigin(0.5)
      .setScale(0) // Начинаем с 0 для pop-эффекта
      .setDepth(10);

    // Подгоняем размер под целевой
    const iconMaxDim = Math.max(this.coinIcon.width, this.coinIcon.height);
    const iconScale = iconSize / iconMaxDim;
    this.coinIcon.setData("targetScale", iconScale);

    this.container.add(this.coinIcon);

    // 2. Текст с суммой
    const fontSize = isSuper ? 72 : isBig ? 56 : 44;
    const color = isSuper ? "#ff8c42" : isBig ? "#ffd93d" : "#a8e6cf";

    this.amountText = this.scene.add
      .text(0, 80, `+${this.amount}`, {
        fontSize: `${fontSize}px`,
        color: color,
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0) // Скрываем для анимации появления
      .setScale(0.5)
      .setDepth(10);

    this.container.add(this.amountText);
  }

  public playAppearAnimation(): number {
    this.audioService.playUnlockSquish();
    RewardVFX.spawnFirework(this.scene, this.x, this.y + 20);

    const iconScale = this.coinIcon.getData("targetScale") as number;

    // 🎯 Анимация монеты: быстрый pop с "перелетом" (Back.easeOut)
    this.scene.tweens.add({
      targets: this.coinIcon,
      scale: { from: 0, to: iconScale * 1.25 },
      duration: 450,
      ease: "Back.easeOut",
      onComplete: () => {
        // Стабилизация до нормального размера
        this.scene.tweens.add({
          targets: this.coinIcon,
          scale: iconScale,
          duration: 200,
          ease: "Power2.out",
          onComplete: () => {
            this.scene.tweens.add({
              targets: this.coinIcon,
              angle: { from: -5, to: 5 },
              duration: 1500,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
          },
        });
      },
    });

    // 🎯 Анимация текста: появляется чуть позже монеты, снизу вверх
    this.scene.tweens.add({
      targets: this.amountText,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      y: 60, // Немного сдвигается вверх
      duration: 500,
      delay: 250,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.amountText,
          scale: { from: 1, to: 1.05 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      },
    });

    return 1000;
  }

  public playIdleAnimation(): void {}

  public destroy(): void {
    // Убиваем все активные твины, привязанные к нашим объектам
    this.scene.tweens.killTweensOf(this.coinIcon);
    this.scene.tweens.killTweensOf(this.amountText);

    // Уничтожаем контейнер — он автоматически уничтожит всех детей
    this.container.destroy();
  }
}
