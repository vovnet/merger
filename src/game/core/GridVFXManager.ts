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
    spritesMap.forEach((container) => {
      const level = container.getData("level") as number;
      const mainSprite = container.getData("mainSprite") as Phaser.GameObjects.Image;
      if (!mainSprite) return;

      const isTarget = this.activeContractLevel !== null && level === this.activeContractLevel;

      if (isTarget) {
        mainSprite.setTint(0x61faff);

        // Создаем или получаем glow-эффект
        let glow = container.getData("glowEffect") as Phaser.GameObjects.Container;

        if (!glow) {
          glow = this.scene.add.container(0, 0);

          // Мягкий внешний ореол
          const outerGlow = this.scene.add.graphics();
          outerGlow.fillStyle(0xffd700, 0.1);
          outerGlow.fillCircle(0, 0, 55);
          glow.add(outerGlow);

          // Более яркий внутренний ореол
          const innerGlow = this.scene.add.graphics();
          innerGlow.fillStyle(0xffff00, 0.3);
          innerGlow.fillCircle(0, 0, 45);
          glow.add(innerGlow);

          // Вставляем glow ПОД основной спрайт
          container.addAt(glow, 0);
          container.setData("glowEffect", glow);

          // 🎯 Анимация пульсации
          this.scene.tweens.add({
            targets: glow,
            alpha: { from: 0.6, to: 1 },
            scale: { from: 0.95, to: 1.05 },
            duration: 1200,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1,
          });
        }
      } else {
        mainSprite.clearTint();

        const glow = container.getData("glowEffect") as Phaser.GameObjects.Container;
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

  // 🎯 НОВЫЙ МЕТОД: Для безопасной очистки всех частиц при уничтожении менеджера/сцены
  public destroy(): void {
    this.activeEmitters.forEach((emitter) => {
      emitter.destroy();
    });
    this.activeEmitters = [];
  }
}
