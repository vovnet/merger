import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { Economy } from "../core/Economy";
import { GameState } from "../core/GameState";
import { Grid } from "../core/Grid";
import { AddCoinButton } from "./AddCoinButton";
import { FillButton } from "./FillButton"; // 🎯 Новый импорт
import { AlertButton } from "./AlertButton";
import { RewardData } from "../types/Rewards";
import { ygProvider } from "../../YGProvider";

export class ActionButtons {
  private scene: Phaser.Scene;
  private economy: Economy;
  private gameState: GameState;
  private grid: Grid;

  private fillButton!: FillButton;
  private addCoinButton!: AddCoinButton;

  private rouletteButton: AlertButton;
  private collectionButton: AlertButton;
  private settingsButton: AlertButton;
  private achivementsButton: AlertButton;
  private leaderboardButton: AlertButton;

  private adButton: AlertButton;

  constructor(scene: Phaser.Scene, economy: Economy) {
    this.scene = scene;
    this.gameState = scene.registry.get("gameState") as GameState;
    this.grid = scene.registry.get("grid") as Grid;
    this.economy = economy;

    this.create();
    this.setupListeners();
  }

  private create(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // 🎯 1. Создаем кнопку заполнения через новый класс
    this.fillButton = new FillButton(this.scene, 1130, 500, this.gameState, this.grid);

    // 🎯 2. Кнопка добавления монет (твоя отладочная/основная кнопка)
    const debugBtnX = width - 160;
    const debugBtnY = 220;
    this.addCoinButton = new AddCoinButton(this.scene, debugBtnX, debugBtnY, this.gameState);

    this.rouletteButton = new AlertButton(this.scene, {
      x: 350,
      y: 660,
      scale: 0.6,
      frameKey: "roulette_btn",
      textureKey: "ui",
      onClick: () => {
        this.scene.scene.launch("RouletteScene");
      },
      alert: this.gameState.spins > 0,
    });

    this.collectionButton = new AlertButton(this.scene, {
      x: 500,
      y: 660,
      scale: 0.6,
      textureKey: "ui",
      frameKey: "collection_btn",
      onClick: () => {
        this.scene.scene.launch("CollectionScene");
      },
    });

    this.achivementsButton = new AlertButton(this.scene, {
      x: 650,
      y: 660,
      scale: 0.6,
      textureKey: "ui",
      frameKey: "achivements_btn",
      disabled: true,
      onClick: () => {
        console.log("open achivements");
      },
    });

    this.leaderboardButton = new AlertButton(this.scene, {
      x: 800,
      y: 660,
      scale: 0.6,
      textureKey: "ui",
      frameKey: "leaderboard_btn",
      onClick: () => {
        console.log("open leaderboard");
      },
    });

    const buttonContent = this.scene.add.container(0, 0);

    const coinIcon = this.scene.add.image(20, 0, "ui", "coin").setScale(1.8).setRotation(-0.3);

    const labelText = this.scene.add
      .bitmapText(10, 0, "russo", "x30", 64)
      .setOrigin(0, 0.5)
      .setTint(0x40c00d);

    buttonContent.add([coinIcon, labelText]);

    this.adButton = new AlertButton(this.scene, {
      x: 1140,
      y: 660,
      scale: 0.7,
      textureKey: "ui",
      frameKey: "ad_btn",
      contentContainer: buttonContent,
      onClick: () => {
        ygProvider.showRewardedVideo({
          onRewarded: () =>
            this.scene.scene.launch("RewardScene", {
              reward: { type: "COINS", amount: 30 } as RewardData,
              onComplete: () => this.gameState.addCoins(30),
            }),
        });
      },
    });

    this.settingsButton = new AlertButton(this.scene, {
      x: 1220,
      y: 40,
      scale: 0.7,
      textureKey: "ui",
      frameKey: "settings_btn",
      onClick: () => {
        console.log("open settings modal");
      },
    });
  }

  private setupListeners(): void {
    EventBus.on(GameEvents.SPINS_CHANGED, () => {
      this.rouletteButton.setAlert(this.gameState.spins > 0);
    });
  }

  destroy(): void {
    // 🎯 Вызываем destroy у вложенных компонентов
    this.fillButton.destroy();
    this.addCoinButton.destroy();
  }
}
