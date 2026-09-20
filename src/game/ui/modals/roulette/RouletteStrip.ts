// ui/modals/roulette/RouletteStrip.ts

import * as Phaser from "phaser";
import { RouletteService } from "../../../core/RouletteService";
import { RouletteConfig } from "./config";
import { RoulettePrize } from "../../../types/Rulette";

export class RouletteStrip {
  private container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private service: RouletteService;

  // 🎯 Для отслеживания тиков
  private lastTickPosition: number = 0;
  private tickBuffer: AudioBuffer | null = null;

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    service: RouletteService,
  ) {
    this.scene = scene;
    this.container = container;
    this.service = service;

    // Создаем процедурный звук тика
    this.createTickSound();
  }

  private createTickSound(): void {
    // 🎯 Получаем AudioContext напрямую (с type assertion)
    const audioContext = (this.scene.sound as Phaser.Sound.WebAudioSoundManager).context;

    if (!audioContext) {
      console.warn("AudioContext недоступен");
      return;
    }

    const duration = 0.05; // 50 мс
    const sampleRate = audioContext.sampleRate;
    this.tickBuffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = this.tickBuffer.getChannelData(0);

    // Генерируем короткий "щелчок"
    for (let i = 0; i < this.tickBuffer.length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 50) * 0.3;
    }
  }

  private playTick(): void {
    if (!this.tickBuffer) return;

    // 🎯 Играем буфер напрямую через AudioContext
    const audioContext = (this.scene.sound as Phaser.Sound.WebAudioSoundManager).context;
    const source = audioContext.createBufferSource();
    source.buffer = this.tickBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  }

  public generate(): void {
    this.container.removeAll(true);

    const { ITEM_WIDTH, ITEM_GAP, TOTAL_ITEMS } = RouletteConfig;
    const cellWidth = ITEM_WIDTH + ITEM_GAP;

    for (let i = 0; i < TOTAL_ITEMS; i++) {
      const prize = this.service.getRandomPrize();
      this.renderItem(prize, i * cellWidth);
    }

    this.setStartPosition();
  }

  private renderItem(prize: RoulettePrize, x: number): void {
    const { ITEM_WIDTH } = RouletteConfig;

    const bgColor = this.getRarityColor(prize.rarity);
    const bg = this.scene.add.rectangle(x, 0, ITEM_WIDTH, 150, bgColor);
    bg.setStrokeStyle(2, 0xffffff, 0.5);
    this.container.add(bg);

    const sprite = this.scene.add.image(x, -10, "squishes", prize.frameName);
    const maxDim = Math.max(sprite.width, sprite.height);
    sprite.setScale((100 / maxDim) * 0.9);
    this.container.add(sprite);

    const text = this.scene.add
      .text(x, 50, `Ур.${prize.level}`, {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(text);
  }

  private setStartPosition(): void {
    const { ITEM_WIDTH, ITEM_GAP, START_INDEX, START_OFFSET } = RouletteConfig;
    const cellWidth = ITEM_WIDTH + ITEM_GAP;
    this.container.x = -(START_INDEX * cellWidth) + START_OFFSET;
  }

  public spin(onComplete: () => void): void {
    const { ITEM_WIDTH, ITEM_GAP, WINNING_INDEX, SPIN_DURATION, MICRO_BOUNCE, BOUNCE_DURATION } =
      RouletteConfig;
    const cellWidth = ITEM_WIDTH + ITEM_GAP;
    const endRandomOffset = Phaser.Math.Between(-ITEM_WIDTH / 4, ITEM_WIDTH / 4);
    const targetX = -(WINNING_INDEX * cellWidth) + endRandomOffset;

    // Сбрасываем счетчик тиков
    this.lastTickPosition = this.container.x;

    // Этап 1: плавное замедление с тиками
    this.scene.tweens.add({
      targets: this.container,
      x: targetX,
      duration: SPIN_DURATION,
      ease: "Cubic.easeOut",

      // 🎯 onUpdate вызывается каждый кадр анимации
      onUpdate: () => {
        const currentPosition = this.container.x;
        const distanceMoved = Math.abs(currentPosition - this.lastTickPosition);

        // Если лента прошла расстояние одной ячейки - издаем тик
        if (distanceMoved >= cellWidth) {
          this.playTick();
          this.lastTickPosition = currentPosition;
        }
      },

      onComplete: () => {
        // Этап 2: микро-отскок
        this.scene.tweens.add({
          targets: this.container,
          x: targetX + MICRO_BOUNCE,
          duration: BOUNCE_DURATION,
          ease: "Sine.easeOut",
          onComplete,
        });
      },
    });
  }

  private getRarityColor(rarity: RoulettePrize["rarity"]): number {
    switch (rarity) {
      case "common":
        return 0x4a4a6e;
      case "rare":
        return 0x2196f3;
      case "epic":
        return 0x9c27b0;
      case "legendary":
        return 0xffd700;
      default:
        return 0x4a4a6e;
    }
  }
}
