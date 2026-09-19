import * as Phaser from "phaser";
import { Grid } from "../core/Grid";
import { GridRenderer } from "../core/GridRenderer";
import { Economy } from "../core/Economy";
import { HistoryService } from "../core/HistoryService";
import { EventBus } from "../core/EventBus";
import { ComboData, GameEvents, UIEvents } from "../types/GameEvents";
import { UIScene } from "./UIScene";
import { ComboService } from "../core/ComboService";
import { ContractService } from "../core/ContractService";
import { ContractUpdateData } from "../types/Contract";

export class Game extends Phaser.Scene {
  private grid: Grid;
  private gridRenderer: GridRenderer;
  private economy: Economy;

  private currentLevel: number = 1;

  private historyService: HistoryService;
  private comboService: ComboService;
  private contractService: ContractService;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    this.load.atlas("squishes", "assets/spritesheet.png", "assets/spritesheet.json");
  }

  create(): void {
    this.grid = new Grid({ cols: 7, rows: 5 });

    this.historyService = new HistoryService();
    this.historyService.bind(this.grid);

    this.gridRenderer = new GridRenderer(this, this.grid);
    this.comboService = new ComboService();
    this.contractService = new ContractService(this.grid);
    this.contractService.init(this.currentLevel);

    this.economy = new Economy(this.registry);
    this.registry.set("economy", this.economy);

    this.scene.launch("UIScene", { economy: this.economy });
    this.scene.get("UIScene") as UIScene;

    this.setupEventListeners();
  }

  private fillAllEmptyCells(): void {
    const levelToSpawn = this.getSpawnLevel();
    const emptyCount = this.grid.getEmptyCells().length;

    // 1. Проверка: есть ли пустые клетки
    if (emptyCount === 0) {
      return;
    }

    // 5. Заполняем сетку
    this.grid.fillEmptyCells(levelToSpawn);
  }

  private setupEventListeners(): void {
    EventBus.on(GameEvents.GRID_ITEM_MERGED, (data: { newLevel: number; from: any; to: any }) => {
      const reward = this.economy.getMergeReward(data.newLevel);
      this.economy.addCoins(reward);
      console.log(`💰 Слияние в ур.${data.newLevel} → +${reward} монет`);
      if (data.newLevel > this.currentLevel) {
        this.currentLevel = data.newLevel;
        this.handleLevelUp();
      }
    });

    EventBus.on(UIEvents.SPAWN_REQUESTED, () => {
      this.spawnRandomItem();
    });

    EventBus.on(UIEvents.FILL_REQUESTED, () => {
      this.fillAllEmptyCells();
    });

    EventBus.on(UIEvents.UNDO_REQUESTED, () => {
      this.historyService.undo();
    });

    EventBus.on(UIEvents.DEBUG_ADD_COINS, () => {
      console.log("add money: ", this.economy.getSpawnRefund(this.currentLevel));
      this.economy.addSpawnRefund(this.currentLevel);
    });

    // 🎯 Слушаем встроенные события registry
    this.registry.events.on(
      "changedata-coins",
      (parent: any, value: number, previousValue: number) => {
        EventBus.emit(GameEvents.COINS_CHANGED, { value, previousValue });
      },
    );

    EventBus.on(GameEvents.COMBO_UPDATED, (data: ComboData) => {
      console.log(`🔥 КОМБО x${data.multiplier}!`);

      // Здесь можно запустить анимацию текста "x2!", "x3!" на экране
      // Или начислить бонусные монеты прямо сейчас:
      if (data.multiplier > 1) {
        const bonus = data.multiplier * 10; // Пример формулы
        this.economy.addCoins(bonus);
      }
    });

    EventBus.on(GameEvents.COMBO_RESET, () => {
      console.log("💔 Цепочка комбо разорвана");
      // Здесь можно убрать текст комбо с экрана
    });

    EventBus.on(GameEvents.CONTRACT_CREATED, (data: ContractUpdateData) => {
      console.log("contract: ", data.contract);
    });

    EventBus.on(GameEvents.CONTRACT_COMPLETED, (data: ContractUpdateData) => {
      // Здесь можно запустить красивую анимацию монет в UI
      console.log(`💰 Начислена награда за контракт!`);
    });
  }

  // Вычисление уровня для кнопки спауна
  private getSpawnLevel(): number {
    // Если currentLevel <= 4, вернёт 1. Если 5, вернёт 2. Если 6, вернёт 3 и т.д.
    return Math.max(1, this.currentLevel - 6);
  }

  private handleLevelUp(): void {
    // 🎯 НОВОЕ: Очищаем поле от мёртвых предметов
    const spawnLevel = this.getSpawnLevel();
    const removedItems = this.grid.removeItemsBelowLevel(spawnLevel);

    // 💰 Компенсация: даём монеты за каждый удалённый предмет
    if (removedItems.length > 0) {
      const compensation = removedItems.reduce((sum, item) => sum + item.level * 5, 0);
      this.economy.addCoins(compensation);
    }

    EventBus.emit(GameEvents.LEVEL_CHANGED, this.currentLevel);

    this.historyService.clear();
  }

  // 🎯 ГЛАВНЫЙ МЕТОД: Спаун случайного предмета с учётом задержки
  private spawnRandomItem(): void {
    const levelToSpawn = this.getSpawnLevel();
    const cost = this.economy.getSpawnCost(this.currentLevel);

    if (!this.grid.hasEmptyCell()) {
      return;
    }

    if (!this.economy.canAfford(cost)) {
      return;
    }

    this.economy.spendCoins(cost);
    this.grid.spawnRandomItem(levelToSpawn);
  }
}
