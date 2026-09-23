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
import { AudioService } from "../core/AudioService";
import { GameState } from "../core/GameState";
import { ItemRegistry } from "../core/ItemRegistry";

export class Game extends Phaser.Scene {
  private gameState: GameState;
  private grid: Grid;
  private gridRenderer: GridRenderer;
  private economy: Economy;

  private historyService: HistoryService;
  private comboService: ComboService;
  private contractService: ContractService;
  private audioService: AudioService;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    this.load.image("bg_main", "assets/bg.png");
    this.load.atlas("squishes", "assets/spritesheet.png", "assets/spritesheet.json");
    this.load.atlas("ranks", "assets/rank_sprites.png", "assets/rank_sprites.json");
    this.load.atlas("rare-squishes", "assets/rare_texture.png", "assets/rare_texture.json");

    this.load.audio("merge_pop", "assets/sound/bubble_1.mp3");

    this.load.bitmapFont("russo", "assets/fonts/days.png", "assets/fonts/days.xml");

    // 1. Создаем временный Graphics объект
    const graphics = this.add.graphics({ x: 0, y: 0 });
    // 2. Рисуем мягкий круг (16x16 пикселей)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(8, 8, 8);
    // 3. Генерируем текстуру из нарисованного
    graphics.generateTexture("particle_blob", 16, 16);
    // 4. Сразу удаляем сам Graphics объект!
    // (Если этого не сделать, белый круг так и останется висеть в левом верхнем углу экрана)
    graphics.destroy();
  }

  create(): void {
    this.gameState = new GameState();
    this.registry.set("gameState", this.gameState);

    this.audioService = new AudioService(this);
    this.grid = new Grid({ cols: 7, rows: 5 });

    this.historyService = new HistoryService();
    this.historyService.bind(this.grid);

    this.gridRenderer = new GridRenderer(this, this.grid);
    this.comboService = new ComboService();
    this.contractService = new ContractService(this.grid, this.gameState);

    this.economy = new Economy(this.gameState);
    this.registry.set("economy", this.economy);

    this.scene.launch("UIScene", { economy: this.economy, contractService: this.contractService });
    this.scene.get("UIScene") as UIScene;

    this.setupEventListeners();

    const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, "bg_main").setDepth(-10);
    const coverScale = Math.max(this.scale.width / bg.width, this.scale.height / bg.height);
    bg.setScale(coverScale);

    // this.loadGameProgress();
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
      this.gameState.addCoins(reward);
      this.gameState.incrementMerges();

      console.log(`💰 Слияние в ур.${data.newLevel} → +${reward} монет`);

      if (data.newLevel > this.gameState.level) {
        this.gameState.setLevel(data.newLevel);
        this.handleLevelUp();
        this.scene.launch("LevelUpScene", { level: data.newLevel, rank: this.gameState.round });
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
      this.gameState.addSpins(1);
    });
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
      const compensation = removedItems.reduce((sum, item) => sum + item.level * 5, 0);
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
