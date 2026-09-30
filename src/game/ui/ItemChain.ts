import * as Phaser from "phaser";
import { ItemRegistry } from "../core/ItemRegistry";
import { GameState } from "../core/GameState";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";

export class ItemChain {
  private scene: Phaser.Scene;
  private gameState: GameState;

  private container: Phaser.GameObjects.Container;
  private sprites: Phaser.GameObjects.Image[] = [];
  private currentLevel: number = 1;

  private readonly itemDisplaySize = 45;
  private readonly gap = 8;

  private readonly CHAIN_LENGTH = 8; // количество слотов в цепочке

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.gameState = this.scene.registry.get("gameState") as GameState;
    this.currentLevel = this.gameState.level;

    this.container = this.scene.add.container(x, y).setDepth(100);

    this.redraw(); // 🎯 Полная перерисовка из исходного состояния
    this.setupListeners();
  }

  private setupListeners(): void {
    // 🎯 Теперь событие приходит как { value, previousValue }
    EventBus.on(GameEvents.LEVEL_CHANGED, this.onLevelChanged);
    EventBus.on(GameEvents.PRESTIGE_OCCURRED, this.onPrestige);
  }

  // 🎯 ОБНОВЛЕНО: принимаем объект события
  private onLevelChanged = (data: { value: number; previousValue: number }) => {
    this.update(data.value, data.previousValue);
  };

  // 🎯 НОВОЕ: отдельный обработчик престижа
  private onPrestige = () => {
    this.animatePrestige();
  };

  private redraw(): void {
    this.sprites.forEach((s) => s.destroy());
    this.sprites = [];

    // 🎯 Слот "следующей цели" присутствует ВСЕГДА, даже при maxLevel
    const endLevel = this.currentLevel + 1;
    const startLevel = Math.max(1, endLevel - (this.CHAIN_LENGTH - 1));

    const totalItems = endLevel - startLevel + 1;
    const totalWidth = totalItems * (this.itemDisplaySize + this.gap) - this.gap;
    let currentX = -totalWidth / 2 + this.itemDisplaySize / 2;

    for (let lvl = startLevel; lvl <= endLevel; lvl++) {
      const sprite = this.createSlotSprite(lvl);
      sprite.setX(Math.round(currentX));
      this.container.add(sprite);
      this.sprites.push(sprite);
      currentX += this.itemDisplaySize + this.gap;
    }
  }

  private createSlotSprite(lvl: number): Phaser.GameObjects.Image {
    const maxLevel = ItemRegistry.getMaxLevel();

    // Если уровень выше максимума — берём кадр максимума как заглушку
    const frameName = ItemRegistry.getFrameName(Math.min(lvl, maxLevel));
    const sprite = this.scene.add.image(0, 0, "squishes", frameName);

    const maxDim = Math.max(sprite.width, sprite.height);
    sprite.setScale((this.itemDisplaySize / maxDim) * 0.9);

    if (lvl > maxLevel) {
      // 🎯 Слот престижа: полупрозрачный тёмный силуэт максимального уровня
      sprite.setTint(0x000000);
      sprite.setAlpha(0.35);
    } else if (lvl > this.currentLevel) {
      // Следующая цель: тёмный
      sprite.setTint(0x000000);
      sprite.setAlpha(1);
    } else {
      // Достигнутые уровни: обычные
      sprite.setTint(0xffffff);
      sprite.setAlpha(1);
    }

    sprite.setData("level", lvl);
    return sprite;
  }

  private update(newLevel: number, oldLevel: number): void {
    if (newLevel === oldLevel) return;

    this.currentLevel = newLevel;

    // 🎯 ОПРЕДЕЛЯЕМ ТИП ИЗМЕНЕНИЯ:
    // Если уровень упал — это престиж, нужна полная перерисовка
    if (newLevel < oldLevel) {
      this.redraw();
      return;
    }

    // Обычный level up — используем оптимизированную анимацию
    const newEndLevel = newLevel + 1;
    const newStartLevel = Math.max(1, newEndLevel - 7);
    const oldEndLevel = oldLevel + 1;
    const oldStartLevel = Math.max(1, oldEndLevel - 7);

    this.handleLevelUp(newStartLevel, newEndLevel, oldStartLevel, oldEndLevel);
  }

  private handleLevelUp(
    newStartLevel: number,
    newEndLevel: number,
    oldStartLevel: number,
    oldEndLevel: number,
  ): void {
    // 1. Открываем последний затемнённый айтем
    if (this.sprites.length > 0) {
      const lastSprite = this.sprites[this.sprites.length - 1];
      lastSprite.setTint(0xffffff);

      this.scene.tweens.add({
        targets: lastSprite,
        scale: { from: lastSprite.scale, to: lastSprite.scale * 1.2 },
        duration: 150,
        yoyo: true,
        ease: "Power2",
      });
    }

    // 2. Создаём новый слот-цель справа (теперь через createSlotSprite)
    const newSprite = this.createSlotSprite(newEndLevel);
    const newSpriteX =
      this.sprites.length > 0
        ? this.sprites[this.sprites.length - 1].x + this.itemDisplaySize + this.gap
        : 0;
    newSprite.setX(Math.round(newSpriteX));

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

  // 🎯 НОВЫЙ МЕТОД: анимация престижа (все айтемы "улетают" в центр)
  private animatePrestige(): void {
    // 1. Все айтемы улетают вниз с эффектом затухания
    this.sprites.forEach((sprite, index) => {
      this.scene.tweens.add({
        targets: sprite,
        y: 100,
        alpha: 0,
        scale: 0,
        duration: 400,
        delay: index * 30, // Каскадное исчезновение
        ease: "Cubic.easeIn",
        onComplete: () => sprite.destroy(),
      });
    });

    // 2. После анимации исчезновения — полная перерисовка
    this.scene.time.delayedCall(400 + this.sprites.length * 30, () => {
      this.sprites = [];
      this.redraw();

      // 3. Эффект "появления" новых айтемов
      this.sprites.forEach((sprite, index) => {
        sprite.setAlpha(0);
        sprite.setScale(0);
        this.scene.tweens.add({
          targets: sprite,
          alpha: 1,
          scale: sprite.scale,
          duration: 300,
          delay: index * 50,
          ease: "Back.easeOut",
        });
      });
    });
  }

  // 🎯 Вынес логику сдвига в отдельный метод
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
    EventBus.off(GameEvents.LEVEL_CHANGED, this.onLevelChanged);
    EventBus.off(GameEvents.PRESTIGE_OCCURRED, this.onPrestige);

    this.sprites.forEach((sprite) => sprite.destroy());
    this.container.destroy();
  }
}
