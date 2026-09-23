import * as Phaser from "phaser";
import { HUD } from "../ui/HUD";
import { ActionButtons } from "../ui/ActionButtons";
import { Economy } from "../core/Economy";
import { ContractPanel } from "../ui/ContractPanel";
import { ContractService } from "../core/ContractService";
import { ModalManager } from "../ui/modals/ModalManager";
import { RouletteModal } from "../ui/modals/roulette/RouletteModal";
import { EventBus } from "../core/EventBus";
import { UIEvents } from "../types/GameEvents";

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

    this.createCollectionButton();

    EventBus.on(UIEvents.ROULETTE_OPEN_REQUESTED, () => {
      this.modalManager.open("ROULETTE");
    });
  }

  private createCollectionButton(): void {
    const screenWidth = this.scale.width;

    const btn = this.add
      .rectangle(screenWidth - 50, 50, 70, 70, 0x4a4a6e)
      .setInteractive({ useHandCursor: true });
    btn.setStrokeStyle(2, 0xffd700, 0.8);

    const icon = this.add
      .text(screenWidth - 50, 50, "📚", {
        fontSize: "36px",
      })
      .setOrigin(0.5);

    btn.on("pointerdown", () => {
      // Защита от двойного открытия
      if (this.scene.isActive("CollectionScene")) return;
      this.scene.launch("CollectionScene");
    });

    // Hover-эффект: лёгкое увеличение
    btn.on("pointerover", () => {
      this.tweens.add({ targets: [btn, icon], scale: 1.1, duration: 100, ease: "Power2.out" });
    });
    btn.on("pointerout", () => {
      this.tweens.add({ targets: [btn, icon], scale: 1, duration: 100, ease: "Power2.out" });
    });
  }

  destroy(): void {
    this.hud.destroy();
    this.actionButtons.destroy();
    this.modalManager.destroy();
  }
}
