import * as Phaser from "phaser";
import { Grid } from "../core/Grid";
import { GridRenderer } from "../core/GridRenderer";
import { Economy } from "../core/Economy";
import { HistoryService } from "../core/HistoryService";
import { EventBus } from "../core/EventBus";
import { ComboData, GameEvents, UIEvents } from "../types/GameEvents";
import { UIScene } from "./UIScene";
import { ContractService } from "../core/ContractService";
import { ContractUpdateData } from "../types/Contract";
import { AudioService } from "../core/AudioService";
import { GameState } from "../core/GameState";
import { ItemRegistry } from "../core/ItemRegistry";
import { GridPosition } from "../types/Item";
import { GrassWind } from "../core/GrassWind";
import { ParallaxController } from "../core/ParallaxController";

export class Game extends Phaser.Scene {
  private gameState: GameState;
  private grid: Grid;
  private gridRenderer: GridRenderer;
  private economy: Economy;

  private historyService: HistoryService;
  private contractService: ContractService;
  private audioService: AudioService;
  private grassWind: GrassWind;

  private bgParallax: ParallaxController;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {}

  create(): void {
    this.gameState = new GameState();
    this.registry.set("gameState", this.gameState);

    this.audioService = new AudioService(this);
    this.registry.set("audioService", this.audioService);
    this.grid = new Grid({ cols: 7, rows: 5 });
    this.registry.set("grid", this.grid);

    this.historyService = new HistoryService();
    this.historyService.bind(this.grid);

    this.gridRenderer = new GridRenderer(this, this.grid);

    this.contractService = new ContractService(this.grid, this.gameState);

    this.economy = new Economy(this.gameState);
    this.registry.set("economy", this.economy);

    this.scene.launch("UIScene", { economy: this.economy, contractService: this.contractService });
    this.scene.get("UIScene") as UIScene;
    this.scene.launch("AdNotificationScene");

    this.setupEventListeners();

    const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, "bg_main").setDepth(-10);
    const coverScale = Math.max(this.scale.width / bg.width, this.scale.height / bg.height);
    bg.setScale(coverScale + 0.03);

    this.bgParallax = new ParallaxController(this, bg);

    this.grassWind = new GrassWind(
      this,
      this.scale.width / 2,
      this.scale.height / 2 + 260,
      this.scale.width,
      this.scale.height,
      "grass",
      {
        speed: 1.2,
        strength: 0.018,
        frequency: 2.5,
      },
    );

    this.grassWind.setDepth(-9);

    this.game.events.on("hidden", () => {
      console.log("🔴 Вкладка скрыта - игра на паузе");
      EventBus.emit(GameEvents.GAME_PAUSE_REQUEST);
    });

    this.game.events.on("visible", () => {
      console.log("🟢 Вкладка снова видна");
      EventBus.emit(GameEvents.GAME_RESUME_REQUEST);
    });

    // this.loadGameProgress();
    EventBus.emit(GameEvents.GAME_READY);
  }

  private loadGameProgress(): void {
    const saved = localStorage.getItem("my_merge_game_save");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.gameState.deserialize(parsed); // Магия: все классы обновятся сами!
      } catch (e) {
        console.error("Ошибка загрузки сохранения", e);
      }
    }
  }

  public saveGameProgress(): void {
    const dataToSave = this.gameState.serialize();
    localStorage.setItem("my_merge_game_save", JSON.stringify(dataToSave));
  }

  private fillAllEmptyCells(): void {
    const levelToSpawn = this.getSpawnLevel();
    const emptyCount = this.grid.getEmptyCells().length;
    const itemsCount = Math.min(this.gameState.coins, emptyCount);

    // 1. Проверка: есть ли пустые клетки
    if (itemsCount === 0) {
      return;
    }

    // 5. Заполняем сетку
    this.grid.fillEmptyCells(levelToSpawn, itemsCount);
    this.economy.spendCoins(itemsCount);
  }

  private setupEventListeners(): void {
    EventBus.on(GameEvents.GAME_PAUSE_REQUEST, () => this.game.pause());
    EventBus.on(GameEvents.GAME_RESUME_REQUEST, () => this.game.resume());

    EventBus.on(GameEvents.GRID_ITEM_MERGED, (data: { newLevel: number; from: any; to: any }) => {
      const reward = this.economy.getMergeReward(data.newLevel);
      this.gameState.addCoins(reward);
      this.gameState.incrementMerges();

      console.log(`💰 Слияние в ур.${data.newLevel} → +${reward} монет`);

      if (data.newLevel > this.gameState.level) {
        this.gameState.setLevel(data.newLevel);
        this.handleLevelUp();
        this.scene.launch("RewardScene", {
          reward: { type: "RANK_SQUISH", level: data.newLevel, rank: this.gameState.round },
        });
      }
    });

    // 🎯 Престиж-слияния (два предмета максимального уровня)
    EventBus.on(
      GameEvents.GRID_PRESTIGE_MERGED,
      (data: { newLevel: number; itemFrom: any; itemTo: any }) => {
        console.log(`🌟 ПРЕСТИЖ-СЛИЯНИЕ! Два предмета максимального уровня слились`);

        // 1. Устанавливаем уровень на максимум перед престижем (для статистики/UI)
        const maxLevel = ItemRegistry.getMaxLevel();
        if (this.gameState.level < maxLevel) {
          this.gameState.setLevel(maxLevel);
        }

        // 2. Начисляем специальную награду за престиж (не за 1-й уровень)
        const prestigeReward = this.economy.getPrestigeReward(this.gameState.round);
        this.gameState.addCoins(prestigeReward);
        this.gameState.incrementMerges();

        // 3. Запускаем престиж (сброс уровня, новый раунд, бонусы)
        this.handlePrestige();
      },
    );

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
      this.economy.addSpawnRefund(this.gameState.level);
    });

    EventBus.on(GameEvents.COMBO_UPDATED, (data: ComboData) => {
      console.log(`🔥 КОМБО x${data.multiplier}!`);

      // Здесь можно запустить анимацию текста "x2!", "x3!" на экране
      // Или начислить бонусные монеты прямо сейчас:
      if (data.multiplier > 1) {
        const bonus = data.multiplier * 10; // Пример формулы
        this.gameState.addCoins(bonus);
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
      this.gameState.addSpins(5);
    });

    EventBus.on(
      GameEvents.ITEM_TAP_DESTROYED,
      (data: { itemId: string; position: GridPosition; level: number }) => {
        EventBus.emit(GameEvents.HISTORY_CHECKPOINT); // чтобы undo работал корректно

        const removed = this.grid.removeItem(data.position);
        if (!removed) return;

        // this.gridRenderer.removeSprite(data.itemId);
      },
    );
  }

  update(time: number, delta: number): void {
    if (this.grassWind) {
      this.grassWind.update(time, delta);
    }
    if (this.bgParallax) {
      this.bgParallax.update();
    }
  }

  private handlePrestige(): void {
    console.log("🌟 Достигнут максимальный уровень! Готовимся к престижу...");

    // 1. Показываем красивый экран престижа (опционально)
    // this.showPrestigeScreen();
    // 2. Очищаем поле от всех предметов
    this.grid.clear();
    // 3. Выполняем престиж (сброс уровня, увеличение раунда, бонусы)
    this.gameState.prestige();
    // 4. Заполняем поле новыми предметами 1-го уровня
    this.fillAllEmptyCells();
    // 5. Сохраняем прогресс
    this.saveGameProgress();
    // 6. Сбрасываем историю (undo больше не работает после престижа)
    this.historyService.clear();
  }

  // Вычисление уровня для кнопки спауна
  private getSpawnLevel(): number {
    // Если currentLevel <= 4, вернёт 1. Если 5, вернёт 2. Если 6, вернёт 3 и т.д.
    return Math.max(1, this.gameState.level - 6);
  }

  private handleLevelUp(): void {
    // 🎯 НОВОЕ: Очищаем поле от мёртвых предметов
    const spawnLevel = this.getSpawnLevel();
    const removedItems = this.grid.removeItemsBelowLevel(spawnLevel);

    // 💰 Компенсация: даём монеты за каждый удалённый предмет
    if (removedItems.length > 0) {
      const compensation = removedItems.length;
      this.gameState.addCoins(compensation);
    }

    this.historyService.clear();
  }

  // 🎯 ГЛАВНЫЙ МЕТОД: Спаун случайного предмета с учётом задержки
  private spawnRandomItem(): void {
    const levelToSpawn = this.getSpawnLevel();
    const cost = this.economy.getSpawnCost(this.gameState.level);

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
