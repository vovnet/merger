import * as Phaser from "phaser";
import { HUD } from "../ui/HUD";
import { ActionButtons } from "../ui/ActionButtons";
import { Economy } from "../core/Economy";

export class UIScene extends Phaser.Scene {
  private hud: HUD;
  private actionButtons: ActionButtons;
  private economy: Economy;

  constructor() {
    super({ key: "UIScene" });
  }

  create(data: { economy: Economy }): void {
    this.economy = data.economy;
    this.hud = new HUD(this);
    this.actionButtons = new ActionButtons(this, this.economy);
  }

  destroy(): void {
    this.hud.destroy();
    this.actionButtons.destroy();
  }
}
