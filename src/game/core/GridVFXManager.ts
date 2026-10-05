import * as Phaser from "phaser";
import { AudioService } from "./AudioService";

export class GridVFXManager {
  private activeContractLevel: number | null = null;
  // Храним ссылки на все созданные эммитеры для безопасной очистки
  private activeEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private audioService: AudioService;

  constructor(private scene: Phaser.Scene) {
    this.audioService = this.scene.registry.get("audioService") as AudioService;
  }

  public setContractLevel(level: number | null): void {
    this.activeContractLevel = level;
  }

  public updateHighlights(spritesMap: Map<string, Phaser.GameObjects.Container>): void {
    console.log("update hight: ", { spritesMap, contract: this.activeContractLevel });
    spritesMap.forEach((container) => {
      const level = container.getData("level") as number;
      const mainSprite = container.getData("mainSprite") as Phaser.GameObjects.Image;
      if (!mainSprite) return;

      const isTarget = this.activeContractLevel !== null && level === this.activeContractLevel;

      if (isTarget) {
        // Создаем или получаем glow-эффект
        let glow = container.getData("glowEffect") as Phaser.Filters.Glow;

        if (!glow) {
          mainSprite.enableFilters();
          const newGlow = mainSprite.filters?.external.addGlow(0x118cff, 0, 6, 6, false, 12, 1);
          container.setData("glowEffect", newGlow);
        }
      } else {
        const glow = container.getData("glowEffect") as Phaser.Filters.Glow;
        if (glow) {
          glow.destroy();
          container.setData("glowEffect", null);
        }
      }
    });
  }

  public spawnMergeParticles(px: number, py: number, level: number): void {
    const colors = [0xff6b9d, 0x4ecdc4, 0xffd93d, 0xff8c42, 0x9b59b6, 0xe74c3c, 0xffd700];
    const color = colors[Math.min(level - 1, colors.length - 1)];

    const particles = this.scene.add.particles(px, py, "particle_blob", {
      speed: { min: 180, max: 960 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.6, end: 0 },
      lifespan: 300,
      gravityY: 250,
      tint: color,
      alpha: { start: 1, end: 0.5 },
      emitting: false,
      blendMode: "ADD",
    });

    particles.explode(20);
    this.scene.time.delayedCall(600, () => particles.destroy());
  }

  public spawnRewardPopup(px: number, py: number, amount: number): void {
    const randomXOffset = Phaser.Math.Between(-30, 30);
    const randomAngle = Phaser.Math.FloatBetween(-15, 15);
    const startX = px + randomXOffset;

    const popup = this.scene.add
      .bitmapText(startX, py - 30, "russo", `+${amount}`, Phaser.Math.Between(22, 32))
      .setTint(0xecc900)
      .setOrigin(0.5, 1)
      .setDepth(1000)
      .setAlpha(0)
      .setAngle(randomAngle);

    popup.setScale(0.5);
    this.scene.tweens.add({
      targets: popup,
      scale: 1.05,
      alpha: 1,
      duration: 120,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: popup,
          scale: 1,
          duration: 80,
          ease: "Power2.out",
        });
      },
    });

    this.scene.tweens.add({
      targets: popup,
      y: py - 120,
      duration: 600,
      delay: 80,
      ease: "Cubic.out",
    });

    this.scene.tweens.add({
      targets: popup,
      alpha: 0,
      duration: 200,
      delay: 400,
      ease: "Power2.in",
      onComplete: () => popup.destroy(),
    });
  }

  /**
   * Отображает всплывающую награду с иконкой и числом (например, монеты или билеты).
   * Анимация немного дольше и заметнее, чем у обычного текста.
   */
  public spawnResourcePopup(px: number, py: number, amount: number, iconKey: string): void {
    this.audioService.playShineSound();

    const randomXOffset = Phaser.Math.Between(-30, 30);
    const randomAngle = Phaser.Math.FloatBetween(-15, 15);
    const startX = px + randomXOffset;

    // 🎯 Создаем контейнер, чтобы анимировать иконку и текст как единое целое
    const popupContainer = this.scene.add.container(startX, py - 30).setDepth(1000);

    // 1. Иконка награды
    const icon = this.scene.add
      .sprite(-45, -15, "ui", iconKey) // Сдвинут влево и чуть вверх для визуального баланса с текстом
      .setOrigin(0.5, 0.5)
      .setScale(0.8); // Чуть меньше текста, чтобы выглядеть гармонично

    // 2. Текст награды
    const text = this.scene.add
      .bitmapText(0, 0, "russo", `+${amount}`, 32) // Фиксированный крупный размер для лучшей читаемости
      .setTint(0xecc900)
      .setOrigin(0.5, 1); // Выравнивание по нижней границе

    // Добавляем оба объекта в контейнер
    popupContainer.add([icon, text]);
    popupContainer.setAngle(randomAngle);

    // Начальное состояние для анимации появления
    popupContainer.setScale(0.5);
    popupContainer.setAlpha(0);

    // 🎯 ЭТАП 1: Появление (Pop) - чуть дольше и плавнее
    this.scene.tweens.add({
      targets: popupContainer,
      scale: 1.15, // Чуть больший "перелет" для сочности
      alpha: 1,
      duration: 150, // Было 120
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: popupContainer,
          scale: 1.0,
          duration: 100, // Было 80
          ease: "Power2.out",
        });
      },
    });

    // 🎯 ЭТАП 2: Движение вверх - медленнее и чуть выше
    this.scene.tweens.add({
      targets: popupContainer,
      y: py - 140, // Было -120 (теперь выше, чтобы дольше было видно)
      duration: 800, // Было 600
      delay: 100, // Было 80
      ease: "Cubic.out",
    });

    // 🎯 ЭТАП 3: Исчезновение - начинается ПОСЛЕ того, как объект поднялся
    // Задержка = delay (100) + duration (800) = 900мс
    this.scene.tweens.add({
      targets: popupContainer,
      alpha: 0,
      duration: 300, // Было 200 (более плавное растворение)
      delay: 900,
      ease: "Power2.in",
      onComplete: () => {
        // Уничтожение контейнера автоматически уничтожит и иконку, и текст внутри него
        popupContainer.destroy();
      },
    });
  }

  public spawnSquishWithPackEffect(x: number, y: number): void {
    const packLeft = this.scene.add.sprite(0, 0, "ui", "coin_left_side").setOrigin(1, 0.5);

    const packRight = this.scene.add.sprite(0, 0, "ui", "coin_right_side").setOrigin(0, 0.5);

    const pack = this.scene.add.container(x, y, [packLeft, packRight]).setDepth(100);

    // 🎲 Случайный характер разрыва
    const spread = Phaser.Math.Between(60, 100);

    // Иногда разрыв сильнее вверх, иногда почти горизонтальный
    const leftY = Phaser.Math.Between(-55, 5);
    const rightY = Phaser.Math.Between(-55, 5);

    // Иногда одна часть улетает дальше другой
    const leftDistance = Phaser.Math.Between(Math.max(40, spread - 20), spread + 20);

    const rightDistance = Phaser.Math.Between(Math.max(40, spread - 20), spread + 20);

    // 🎲 Случайное вращение
    const leftAngle = Phaser.Math.Between(-120, -25);
    const rightAngle = Phaser.Math.Between(25, 120);

    // 🎲 Иногда одна половинка вращается сильнее другой
    const leftDuration = Phaser.Math.Between(300, 500);
    const rightDuration = Phaser.Math.Between(300, 500);

    // 🎲 Разный стартовый угол
    packLeft.angle = Phaser.Math.Between(-15, 15);
    packRight.angle = Phaser.Math.Between(-15, 15);

    // 🎲 Разный масштаб
    const leftScale = Phaser.Math.FloatBetween(0.85, 1.05);
    const rightScale = Phaser.Math.FloatBetween(0.85, 1.05);

    packLeft.setScale(leftScale);
    packRight.setScale(rightScale);

    // 🎲 Небольшая разница старта
    const leftDelay = Phaser.Math.Between(0, 50);
    const rightDelay = Phaser.Math.Between(0, 50);

    // Левая половина
    this.scene.tweens.add({
      targets: packLeft,
      x: -leftDistance,
      y: leftY,
      angle: leftAngle,
      scale: leftScale * Phaser.Math.FloatBetween(0.7, 0.9),
      alpha: 0,
      duration: leftDuration,
      delay: leftDelay,
      ease: "Quad.easeOut",
    });

    // Правая половина
    this.scene.tweens.add({
      targets: packRight,
      x: rightDistance,
      y: rightY,
      angle: rightAngle,
      scale: rightScale * Phaser.Math.FloatBetween(0.7, 0.9),
      alpha: 0,
      duration: rightDuration,
      delay: rightDelay,
      ease: "Quad.easeOut",

      onComplete: () => {
        pack.destroy();
      },
    });
  }

  // 🎯 НОВЫЙ МЕТОД: Для безопасной очистки всех частиц при уничтожении менеджера/сцены
  public destroy(): void {
    this.activeEmitters.forEach((emitter) => {
      emitter.destroy();
    });
    this.activeEmitters = [];
  }
}
