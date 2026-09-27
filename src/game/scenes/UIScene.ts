import * as Phaser from "phaser";
import { HUD } from "../ui/HUD";
import { ActionButtons } from "../ui/ActionButtons";
import { Economy } from "../core/Economy";
import { ContractPanel } from "../ui/ContractPanel";
import { ContractService } from "../core/ContractService";
import { ModalManager } from "../ui/modals/ModalManager";
import { RouletteModal } from "../ui/modals/roulette/RouletteModal";

export class UIScene extends Phaser.Scene {
  private hud: HUD;
  private actionButtons: ActionButtons;
  private economy: Economy;
  private contractService: ContractService;
  private contractPanel: ContractPanel;
  private modalManager: ModalManager;

  constructor() {
    super({ key: "UIScene" });
  }

  create(data: { economy: Economy; contractService: ContractService }): void {
    this.economy = data.economy;
    this.contractService = data.contractService;
    this.hud = new HUD(this);
    this.actionButtons = new ActionButtons(this, this.economy);
    this.contractPanel = new ContractPanel(this, this.contractService);

    this.modalManager = new ModalManager(this);
    this.modalManager.register("ROULETTE", RouletteModal);
  }

  destroy(): void {
    this.hud.destroy();
    this.actionButtons.destroy();
    this.modalManager.destroy();
  }
}
