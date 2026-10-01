import { Game as MainGame } from "./scenes/Game";
import { AUTO, Game, Scale, Types } from "phaser";
import { UIScene } from "./scenes/UIScene";
import { CollectionScene } from "./scenes/CollectionScene";
import { RouletteScene } from "./scenes/RouletteScene";
import { RewardScene } from "./scenes/RewardScene";
import { AdNotificationScene } from "./scenes/AdNotificationScene";
import { BootScene } from "./scenes/BootScene";
import { PreloaderScene } from "./scenes/PreloadScene";

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 1280,
  height: 720,
  parent: "game-container",
  backgroundColor: "#111827",
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  disableContextMenu: true,
  scene: [
    BootScene,
    PreloaderScene,
    MainGame,
    UIScene,
    RewardScene,
    CollectionScene,
    RouletteScene,
    AdNotificationScene,
  ],
  banner: { hidePhaser: true },
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
