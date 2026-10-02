import * as Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.image("logo", "assets/6xGamesLogo.png");
    this.load.image("boot_bg", "assets/boot_bg.png");
  }

  create() {
    this.scene.start("PreloaderScene");
  }
}
