import * as Phaser from "phaser";
import { Grid } from "../core/Grid";
import { GridRenderer } from "../core/GridRenderer";
import { Economy } from "../core/Economy";
import { EventBus } from "../core/EventBus";
import { GameEvents, UIEvents } from "../types/GameEvents";
import { ContractService } from "../core/ContractService";
import { AudioService } from "../core/AudioService";
import { GameState } from "../core/GameState";
import { GridPosition } from "../types/Item";
import { GrassWind } from "../core/GrassWind";
import { ParallaxController } from "../core/ParallaxController";
import { GameSession } from "../../storage/GameSession";
import { SaveManager } from "../../storage/SaveManager";
import { SaveProvider } from "../types/SaveProvider";
import { LocalSaveProvider } from "../../storage/LocalSaveProvider";
import { CloudSaveProvider } from "../../storage/CloudSaveProvider";
import { adsService } from "../../AdsService";
import { TutorialManager } from "../core/tutorial/TutorialManager";
import { createTutorialStages } from "../core/tutorial/createTutorialStages";
import { onceWhen } from "../utils/EventUtils";
import { ModalManager } from "../ui/modals/ModalManager";
import { ygProvider } from "../../YGProvider";
import { canShowRatingModal, saveLastTimeOpenModal } from "../utils/canShowRatingModal";

export class Game extends Phaser.Scene {
  private gameState: GameState;
  private grid: Grid;
  private gridRenderer: GridRenderer;
  private economy: Economy;

  private contractService: ContractService;
  private audioService: AudioService;
  private grassWind: GrassWind;

  private bgParallax: ParallaxController;
  private gameSession: GameSession;
  private saveManager: SaveManager;
  private localProvider: SaveProvider;
  private cloudProvider: SaveProvider;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {}

  async create() {
    this.gameState = new GameState();
    this.registry.set("gameState", this.gameState);

    this.audioService = new AudioService(this);
    this.registry.set("audioService", this.audioService);
    this.grid = new Grid({ cols: 7, rows: 5 });
    this.registry.set("grid", this.grid);

    this.contractService = new ContractService(this.grid, this.gameState);

    const tutorialManager = new TutorialManager(createTutorialStages(this.gameState));
    this.registry.set("tutorialManager", tutorialManager);

    this.localProvider = new LocalSaveProvider();
    this.cloudProvider = new CloudSaveProvider();
    this.gameSession = new GameSession(
      this.gameState,
      this.grid,
      this.audioService,
      this.contractService,
      tutorialManager,
    );
    this.saveManager = new SaveManager(this.gameSession, this.localProvider, this.cloudProvider);

    this.economy = new Economy(this.gameState);
    this.registry.set("economy", this.economy);

    this.gridRenderer = new GridRenderer(this, this.grid);

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

    this.game.events.on(Phaser.Core.Events.HIDDEN, () => {
      EventBus.emit(GameEvents.GAME_PAUSE_REQUEST);
    });

    this.game.events.on(Phaser.Core.Events.VISIBLE, () => {
      EventBus.emit(GameEvents.GAME_RESUME_REQUEST);
    });

    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      EventBus.emit(GameEvents.GAME_PAUSE_REQUEST);
    });

    this.game.events.on(Phaser.Core.Events.FOCUS, () => {
      EventBus.emit(GameEvents.GAME_RESUME_REQUEST);
    });

    await this.saveManager.loadIntoSession();

    this.contractService.initialize();
    adsService.init(this.time);

    this.scene.launch("UIScene", { economy: this.economy, contractService: this.contractService });
    this.scene.launch("TutorialOverlayScene");
    this.scene.launch("AdNotificationScene");

    EventBus.once(GameEvents.TUTORIAL_SCENE_READY, () => tutorialManager.checkAndStart());

    onceWhen(
      GameEvents.GRID_ITEM_MERGED,
      () => this.gameState.totalMerges === 6,
      () => tutorialManager.checkAndStart(),
    );
    onceWhen(
      GameEvents.RANK_SQUISH_CLOSED,
      () => this.gameState.level === 6,
      () => {
        this.gameState.addSpins(1);
        tutorialManager.checkAndStart();
      },
    );
    EventBus.once(GameEvents.CONTRACT_CREATED, () => tutorialManager.checkAndStart());
    onceWhen(
      GameEvents.CONTRACT_COMPLETED,
      () => this.contractService.canClaimReward(),
      () => tutorialManager.checkAndStart(),
    );

    EventBus.emit(GameEvents.GAME_READY);
  }

  private async rateGame() {
    if (!canShowRatingModal()) {
      return;
    }

    const canReview = await ygProvider.canReview();

    if (canReview) {
      const modalManager = this.registry.get("modalManager") as ModalManager;
      modalManager.open("RATING");
      saveLastTimeOpenModal();
    }
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
    EventBus.on(GameEvents.GAME_PAUSE_REQUEST, () => {
      console.log("🔴 Игра на паузе");
      this.game.pause();
      this.sound.pauseAll();
    });
    EventBus.on(GameEvents.GAME_RESUME_REQUEST, () => {
      console.log("🟢 Игра возобновлена");
      this.game.resume();
      this.sound.resumeAll();
    });

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
          onComplete: () => {
            EventBus.emit(GameEvents.RANK_SQUISH_CLOSED);
            if (this.gameState.level >= 15 || this.gameState.round > 1) {
              this.rateGame();
            }
          },
        });
      }
    });

    // 🎯 Престиж-слияния (два предмета максимального уровня)
    EventBus.on(GameEvents.GRID_PRESTIGE_MERGED, () => this.handlePrestige());

    EventBus.on(UIEvents.SPAWN_REQUESTED, () => {
      this.spawnRandomItem();
    });

    EventBus.on(UIEvents.FILL_REQUESTED, () => {
      this.fillAllEmptyCells();
    });

    EventBus.on(UIEvents.DEBUG_ADD_COINS, () => {
      this.economy.addSpawnRefund(this.gameState.level);
    });

    EventBus.on(
      GameEvents.ITEM_TAP_DESTROYED,
      (data: { itemId: string; position: GridPosition; level: number }) => {
        this.grid.removeItem(data.position);
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

    this.gameState.prestige();

    this.scene.launch("RewardScene", {
      reward: { type: "RANK_SQUISH", level: 1, rank: this.gameState.round },
      onComplete: () => EventBus.emit(GameEvents.RANK_SQUISH_CLOSED),
    });

    this.grid.clear();
    this.fillAllEmptyCells();
  }

  // Вычисление уровня для кнопки спауна
  private getSpawnLevel(): number {
    // Если currentLevel <= 4, вернёт 1. Если 5, вернёт 2. Если 6, вернёт 3 и т.д.
    return Math.max(1, this.gameState.level - 6);
  }

  private handleLevelUp(): void {
    const spawnLevel = this.getSpawnLevel();
    this.grid.removeItemsBelowLevel(spawnLevel);
  }

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
