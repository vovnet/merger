import * as Phaser from "phaser";
import { Grid, GridSnapshot } from "./Grid";
import { GridItemSpawnedData, GridPosition, ItemData } from "../types/Item";
import { ItemRegistry } from "./ItemRegistry";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";
import { ContractUpdateData } from "../types/Contract";
import { IDLE_ANIMATIONS } from "../config/ItemAnimations";
import { GridDragController } from "./GridDragController";
import { GridVFXManager } from "./GridVFXManager";
import { TapDestroyController } from "./TapDestroyController";
import { GameState } from "./GameState";

export class GridRenderer {
  private sprites: Map<string, Phaser.GameObjects.Container> = new Map();

  private readonly cellSize = 100;
  private readonly padding = 10;
  public readonly offsetX: number;
  public readonly offsetY: number;

  private dragController: GridDragController;
  private vfxManager: GridVFXManager;

  private gameState: GameState;

  private tapDestroy: TapDestroyController;

  constructor(
    private scene: Phaser.Scene,
    private grid: Grid,
  ) {
    this.gameState = scene.registry.get("gameState") as GameState;

    const totalWidth = grid.cols * this.cellSize;
    const totalHeight = grid.rows * this.cellSize;
    this.offsetX = (scene.scale.width - totalWidth) / 2;
    this.offsetY = (scene.scale.height - totalHeight) / 2;

    // 🎯 Инициализируем вынесенные модули
    this.dragController = new GridDragController(
      scene,
      grid,
      this.snapBack.bind(this),
      this.pixelToGrid.bind(this),
    );
    this.vfxManager = new GridVFXManager(scene);
    this.tapDestroy = new TapDestroyController(scene);

    this.drawGridBackground();
    this.bindGridEvents();
  }

  private drawGridBackground(): void {
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        const { px, py } = this.gridToPixel({ x, y });
        const size = this.cellSize - this.padding;
        const graphics = this.scene.add.graphics().setDepth(0);

        graphics.fillStyle(0x2a2a3e, 0.3);
        graphics.fillRoundedRect(px - size / 2, py - size / 2, size, size, 12);
        graphics.lineStyle(1.5, 0x4a4a6e, 0.5);
        graphics.strokeRoundedRect(px - size / 2, py - size / 2, size, size, 12);
      }
    }
  }

  private bindGridEvents(): void {
    EventBus.on(
      GameEvents.GRID_ITEM_ADDED,
      ({ position, item }: { position: GridPosition; item: ItemData }) => {
        this.createItemSprite(position, item);
      },
    );
    EventBus.on(GameEvents.GRID_FILLED, (data: { items: GridItemSpawnedData[] }) => {
      data.items.forEach((item) => {
        const { px, py } = this.gridToPixel({ ...item.position });
        this.vfxManager.spawnSquishWithPackEffect(px, py);
      });
      console.log("spawn: ", data.items);
    });
    EventBus.on(GameEvents.GRID_ITEM_REMOVED, ({ position }: { position: GridPosition }) =>
      this.removeItemSprite(position),
    );
    EventBus.on(GameEvents.GRID_CLEARED, () => this.clearAllSprites());

    EventBus.on(GameEvents.GRID_ITEM_MERGED, (data: any) => {
      const { px, py } = this.gridToPixel(data.item.pos);
      this.vfxManager.spawnMergeParticles(px, py, data.newLevel);

      this.showMergeReward(data.item.pos, 1);
    });

    EventBus.on(GameEvents.CONTRACT_UPDATED, (data: ContractUpdateData) => {
      console.log("contract updated: ", data);
      this.vfxManager.setContractLevel(data.activeTargetLevel);
      this.vfxManager.updateHighlights(this.sprites);
    });

    EventBus.on(GameEvents.CONTRACT_CREATED, (data: ContractUpdateData) => {
      console.log("contract created: ", data);
      this.vfxManager.setContractLevel(data.activeTargetLevel);
      this.vfxManager.updateHighlights(this.sprites);
    });

    EventBus.on(GameEvents.GRID_RESTORED, (snapshot: GridSnapshot) => this.handleRestore(snapshot));
  }

  public showMergeReward(pos: GridPosition, amount: number): void {
    const { px, py } = this.gridToPixel(pos);
    const bonusRand = Math.random();
    if (bonusRand < 0.005) {
      const amount = 1;
      this.gameState.addSpins(amount);
      this.vfxManager.spawnResourcePopup(px, py, amount, "ticket");
    } else if (bonusRand < 0.05) {
      const amount = Phaser.Math.Between(1, 5);
      this.vfxManager.spawnResourcePopup(px, py, amount, "coin");
      this.gameState.addCoins(amount);
    } else {
      this.vfxManager.spawnRewardPopup(px, py, amount);
    }
  }

  // 🎯 Математика координат
  public gridToPixel(pos: GridPosition): { px: number; py: number } {
    return {
      px: this.offsetX + pos.x * this.cellSize + this.cellSize / 2,
      py: this.offsetY + pos.y * this.cellSize + this.cellSize / 2,
    };
  }

  public pixelToGrid(px: number, py: number): GridPosition | null {
    const x = Math.floor((px - this.offsetX) / this.cellSize);
    const y = Math.floor((py - this.offsetY) / this.cellSize);
    const pos = { x, y };
    return this.grid.isValidPosition(pos) ? pos : null;
  }

  // 🎯 Создание и управление спрайтами
  private createItemSprite(pos: GridPosition, item: ItemData): void {
    const { px, py } = this.gridToPixel(pos);
    const container = this.scene.add.container(px, py);

    container.setData("gridPos", { ...pos });
    container.setData("itemId", item.id);
    container.setData("level", item.level);

    const squish = this.scene.add.image(0, 0, "squishes", ItemRegistry.getFrameName(item.level));
    squish.setOrigin(0.5);

    const targetSize = this.cellSize - this.padding - 10;
    const targetScale = targetSize / Math.max(squish.width, squish.height);
    squish.setScale(0);

    container.add(squish);
    container.setData("mainSprite", squish);

    this.dragController.makeDraggable(container);
    this.tapDestroy.attach(container, item.id);
    this.sprites.set(item.id, container);

    // Анимация появления
    this.scene.tweens.add({
      targets: squish,
      scale: { from: 0, to: targetScale * 1.15 },
      duration: 200,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: squish,
          scale: targetScale,
          duration: 100,
          ease: "Power2.out",
        });
      },
    });

    // Idle анимация
    const animIndex = (item.level - 1) % IDLE_ANIMATIONS.length;
    this.scene.tweens.add({
      targets: squish,
      ...IDLE_ANIMATIONS[animIndex](targetScale),
      delay: 400 + Phaser.Math.Between(0, 800),
    });
  }

  private removeItemSprite(pos: GridPosition): void {
    for (const [id, sprite] of this.sprites.entries()) {
      const spritePos = sprite.getData("gridPos");
      const itemId = sprite.getData("itemId");
      if (spritePos?.x === pos.x && spritePos?.y === pos.y) {
        sprite.destroy();
        this.sprites.delete(itemId);
        this.tapDestroy.detach(itemId);
        break;
      }
    }
  }

  public snapBack(container: Phaser.GameObjects.Container, pos: GridPosition): void {
    const { px, py } = this.gridToPixel(pos);
    container.x = px;
    container.y = py;
  }

  private clearAllSprites(): void {
    this.sprites.forEach((sprite) => sprite.destroy());
    this.sprites.clear();
  }

  // 🎯 Логика отмены хода (вынесена в отдельный метод для читаемости)
  private handleRestore(snapshot: GridSnapshot): void {
    const targetItemIds = new Set<string>();

    // 1. Синхронизируем существующие и создаем недостающие
    for (let y = 0; y < snapshot.cells.length; y++) {
      for (let x = 0; x < snapshot.cells[y].length; x++) {
        const item = snapshot.cells[y][x];
        if (!item) continue;

        targetItemIds.add(item.id);
        const container = this.sprites.get(item.id);
        const targetPos = { x, y };

        if (container) {
          const currentPos = container.getData("gridPos");
          if (currentPos.x !== x || currentPos.y !== y) {
            container.setData("gridPos", targetPos);
            const { px, py } = this.gridToPixel(targetPos);
            this.scene.tweens.add({
              targets: container,
              x: px,
              y: py,
              duration: 150,
              ease: "Power2.out",
            });
          }
        } else {
          this.createItemSprite(targetPos, item);
        }
      }
    }

    // 2. Удаляем лишние
    for (const [id, container] of this.sprites.entries()) {
      if (!targetItemIds.has(id)) {
        container.destroy();
        this.sprites.delete(id);
      }
    }
  }

  public destroy(): void {
    this.clearAllSprites();
    // Убедись, что EventBus очищается, если GridRenderer уничтожается
    // (в идеале EventBus должен иметь метод offAll для конкретного контекста)
  }
}
