import * as Phaser from "phaser";
import { HUD } from "../ui/HUD";
import { ActionButtons } from "../ui/ActionButtons";
import { Economy } from "../core/Economy";
import { ComboScale } from "../ui/ComboScale";
import { ContractPanel } from "../ui/ContractPanel";
import { ContractService } from "../core/ContractService";
import { ModalManager } from "../ui/modals/ModalManager";
import { RouletteModal } from "../ui/modals/RouletteModal";
import { EventBus } from "../core/EventBus";
import { UIEvents } from "../types/GameEvents";

export class UIScene extends Phaser.Scene {
  private hud: HUD;
  private actionButtons: ActionButtons;
  private economy: Economy;
  private comboScale: ComboScale;
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
    this.comboScale = new ComboScale(this, this.scale.width - 60, this.scale.height / 2);
    this.contractPanel = new ContractPanel(this, this.contractService);

    this.modalManager = new ModalManager(this);
    this.modalManager.register("ROULETTE", RouletteModal);

    EventBus.on(UIEvents.ROULETTE_OPEN_REQUESTED, () => {
      this.modalManager.open("ROULETTE");
    });
  }

  destroy(): void {
    this.hud.destroy();
    this.actionButtons.destroy();
    this.comboScale.destroy();
    this.modalManager.destroy();
  }
}
