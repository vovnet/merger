import * as Phaser from "phaser";
import { BaseModal } from "./BaseModal";
import { EventBus } from "../../core/EventBus";
import { UIEvents, ModalData } from "../../types/GameEvents";

export class ModalManager {
  private scene: Phaser.Scene;
  private activeModal: BaseModal | null = null;

  // Реестр: 'ROULETTE' -> класс RouletteModal
  private modalRegistry = new Map<string, new (scene: Phaser.Scene) => BaseModal>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupListeners();
  }

  // 🎯 Регистрация новой модалки в системе
  public register(modalId: string, modalClass: new (scene: Phaser.Scene) => BaseModal): void {
    this.modalRegistry.set(modalId, modalClass);
  }

  // 🎯 Открытие модалки по ID
  public open(modalId: string, data?: ModalData): void {
    // Если уже есть открытая модалка, закрываем её
    if (this.activeModal) {
      this.activeModal.close();
    }

    const ModalClass = this.modalRegistry.get(modalId);
    if (!ModalClass) {
      console.error(`❌ Модалка с ID "${modalId}" не зарегистрирована!`);
      return;
    }

    this.activeModal = new ModalClass(this.scene);

    // Передаем данные в модалку (если в базовом классе добавить метод setData,
    // но пока можно просто вызвать open)
    this.activeModal.open(data);
  }

  // 🎯 Принудительное закрытие активной модалки
  public closeActive(): void {
    if (this.activeModal) {
      this.activeModal.close();
      this.activeModal = null;
    }
  }

  private setupListeners(): void {
    // Универсальный слушатель: кто-то просит открыть модалку по ID
    EventBus.on(UIEvents.MODAL_OPEN_REQUESTED, (payload: { id: string; data?: ModalData }) => {
      this.open(payload.id, payload.data);
    });
  }

  public destroy(): void {
    this.closeActive();
    EventBus.off(UIEvents.MODAL_OPEN_REQUESTED);
  }
}
