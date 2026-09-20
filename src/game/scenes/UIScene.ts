import * as Phaser from "phaser";
import { HUD } from "../ui/HUD";
import { ActionButtons } from "../ui/ActionButtons";
import { Economy } from "../core/Economy";
import { ComboScale } from "../ui/ComboScale";
import { ContractPanel } from "../ui/ContractPanel";
import { ContractService } from "../core/ContractService";

export class UIScene extends Phaser.Scene {
  private hud: HUD;
  private actionButtons: ActionButtons;
  private economy: Economy;
  private comboScale: ComboScale;
  private contractService: ContractService;
  private contractPanel: ContractPanel;

  constructor() {
    super({ key: "UIScene" });
  }

  create(data: { economy: Economy; contractService: ContractService }): void {
    this.economy = data.economy;
    this.contractService = data.contractService;
    this.hud = new HUD(this);
    this.actionButtons = new ActionButtons(this, this.economy);
    this.comboScale = new ComboScale(this, this.scale.width - 60, this.scale.height / 2);
    this.contractPanel = new ContractPanel(this, this.contractService);
  }

  destroy(): void {
    this.hud.destroy();
    this.actionButtons.destroy();
    this.comboScale.destroy();
  }
}
