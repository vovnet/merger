import * as Phaser from "phaser";
import { HUD } from "../ui/HUD";
import { ActionButtons } from "../ui/ActionButtons";
import { Economy } from "../core/Economy";
import { ContractService } from "../core/ContractService";
import { ModalManager } from "../ui/modals/ModalManager";
import { ContractView } from "../ui/ContractView";

export class UIScene extends Phaser.Scene {
  private hud: HUD;
  private actionButtons: ActionButtons;
  private economy: Economy;
  private contractService: ContractService;
  private contractview: ContractView;
  private modalManager: ModalManager;

  constructor() {
    super({ key: "UIScene" });
  }

  create(data: { economy: Economy; contractService: ContractService }): void {
    this.economy = data.economy;
    this.contractService = data.contractService;
    this.hud = new HUD(this);
    this.actionButtons = new ActionButtons(this, this.economy);
    this.contractview = new ContractView(this, this.contractService);

    this.modalManager = new ModalManager(this);
    // this.modalManager.register("SETTINGS", SettingsModal);
  }

  destroy(): void {
    this.hud.destroy();
    this.actionButtons.destroy();
    this.modalManager.destroy();
  }
}
