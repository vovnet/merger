// ui/ItemChain.ts
import * as Phaser from "phaser";
import { ItemRegistry } from "../core/ItemRegistry";
import { GameState } from "../core/GameState";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";

export class ItemChain {
  private scene: Phaser.Scene;
  private gameState: GameState; // 🎯 Ссылка на единый источник истины

  private container: Phaser.GameObjects.Container;
  private sprites: Phaser.GameObjects.Image[] = [];
  private currentLevel: number = 1;

  private readonly itemDisplaySize = 45;
  private readonly gap = 8;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 🎯 Получаем GameState из Registry (никаких аргументов в конструкторе!)
    this.gameState = this.scene.registry.get("gameState") as GameState;
    this.currentLevel = this.gameState.level;

    this.container = this.scene.add.container(scene.scale.width / 2, 60).setDepth(100);

    // 🎯 Рисуем начальное состояние на основе загруженных данных
    this.drawInitial(this.currentLevel);
    this.setupListeners();
  }

  private setupListeners(): void {
    // 🎯 Слушаем изменения уровня. При загрузке сохранения это сработает автоматически!
    EventBus.on(GameEvents.LEVEL_CHANGED, this.onLevelChanged);
  }

  // 🎯 Используем стрелочную функцию для безопасного удаления слушателя в destroy()
  private onLevelChanged = (level: number) => {
    this.update(level);
  };

  private drawInitial(level: number): void {
    this.currentLevel = level;

    const endLevel = level + 1;
    const startLevel = Math.max(1, endLevel - 7);

    const totalWidth = (endLevel - startLevel + 1) * (this.itemDisplaySize + this.gap) - this.gap;
    let currentX = -totalWidth / 2 + this.itemDisplaySize / 2;

    for (let lvl = startLevel; lvl <= endLevel; lvl++) {
      const frameName = ItemRegistry.getFrameName(lvl);
      const sprite = this.scene.add.image(Math.round(currentX), 0, "squishes", frameName);

      const maxDim = Math.max(sprite.width, sprite.height);
      const scale = (this.itemDisplaySize / maxDim) * 0.9;
      sprite.setScale(scale);

      if (lvl === endLevel) {
        sprite.setTint(0x000000); // Затемненный (заблокированный)
        sprite.setAlpha(1.0);
      } else {
        sprite.setTint(0xffffff); // Обычный
        sprite.setAlpha(1);
      }

      sprite.setData("level", lvl);
      this.container.add(sprite);
      this.sprites.push(sprite);
      currentX += this.itemDisplaySize + this.gap;
    }
  }

  private update(newLevel: number): void {
    const oldLevel = this.currentLevel;

    // Если уровень не изменился, ничего не делаем (защита от лишних перерисовок)
    if (newLevel === oldLevel) return;

    this.currentLevel = newLevel;

    const newEndLevel = newLevel + 1;
    const newStartLevel = Math.max(1, newEndLevel - 7);

    const oldEndLevel = oldLevel + 1;
    const oldStartLevel = Math.max(1, oldEndLevel - 7);

    if (newLevel > oldLevel) {
      this.handleLevelUp(newStartLevel, newEndLevel, oldStartLevel, oldEndLevel);
    } else {
      this.handleLevelDown(newStartLevel, newEndLevel, oldStartLevel, oldEndLevel);
    }
  }

  private handleLevelUp(
    newStartLevel: number,
    newEndLevel: number,
    oldStartLevel: number,
    oldEndLevel: number,
  ): void {
    // 1. Открываем последний затемненный айтем
    if (this.sprites.length > 0) {
      const lastSprite = this.sprites[this.sprites.length - 1];
      lastSprite.setTint(0xffffff);
      lastSprite.setAlpha(1);

      this.scene.tweens.add({
        targets: lastSprite,
        scale: { from: lastSprite.scale, to: lastSprite.scale * 1.2 },
        duration: 150,
        yoyo: true,
        ease: "Power2",
      });
    }

    // 2. Создаем новый затемненный айтем справа
    const newSpriteX =
      this.sprites.length > 0
        ? this.sprites[this.sprites.length - 1].x + this.itemDisplaySize + this.gap
        : 0;

    const frameName = ItemRegistry.getFrameName(newEndLevel);
    const newSprite = this.scene.add.image(Math.round(newSpriteX), 0, "squishes", frameName);

    const maxDim = Math.max(newSprite.width, newSprite.height);
    const scale = (this.itemDisplaySize / maxDim) * 0.9;

    newSprite.setTint(0x000000);
    newSprite.setAlpha(1.0);
    newSprite.setScale(scale);
    newSprite.setData("level", newEndLevel);

    this.container.add(newSprite);
    this.sprites.push(newSprite);

    // 3. Удаляем айтемы слева, если они вышли за диапазон
    while (this.sprites.length > 0) {
      const firstSprite = this.sprites[0];
      const level = firstSprite.getData("level");
      if (level < newStartLevel) {
        this.sprites.shift();
        this.scene.tweens.add({
          targets: firstSprite,
          alpha: 0,
          scale: 0,
          duration: 200,
          ease: "Power2",
          onComplete: () => firstSprite.destroy(),
        });
      } else {
        break;
      }
    }

    // 4. Анимируем сдвиг всех оставшихся спрайтов влево
    this.animateSpritesShift();
  }

  private handleLevelDown(
    newStartLevel: number,
    newEndLevel: number,
    oldStartLevel: number,
    oldEndLevel: number,
  ): void {
    // Удаляем правый айтем
    if (this.sprites.length > 0) {
      const removedSprite = this.sprites.pop()!;
      this.scene.tweens.add({
        targets: removedSprite,
        alpha: 0,
        scale: 0,
        duration: 200,
        ease: "Power2",
        onComplete: () => removedSprite.destroy(),
      });
    }

    // Последний оставшийся айтем снова становится затемненным
    if (this.sprites.length > 0) {
      const lastSprite = this.sprites[this.sprites.length - 1];
      lastSprite.setTint(0x000000);
      lastSprite.setAlpha(1.0);
    }

    // Анимируем сдвиг всех спрайтов вправо
    this.animateSpritesShift();
  }

  // 🎯 Вынес логику сдвига в отдельный метод, чтобы не дублировать код
  private animateSpritesShift(): void {
    this.sprites.forEach((sprite, index) => {
      const targetX =
        -((this.sprites.length - 1) * (this.itemDisplaySize + this.gap)) / 2 +
        index * (this.itemDisplaySize + this.gap);

      this.scene.tweens.add({
        targets: sprite,
        x: Math.round(targetX),
        duration: 300,
        ease: "Power2.out",
      });
    });
  }

  destroy(): void {
    // 🎯 Обязательно отписываемся от EventBus, чтобы избежать утечек памяти
    EventBus.off(GameEvents.LEVEL_CHANGED, this.onLevelChanged);

    this.sprites.forEach((sprite) => sprite.destroy());
    this.container.destroy();
  }
}
