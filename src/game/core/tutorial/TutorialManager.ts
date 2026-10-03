import { GameEvents } from "../../types/GameEvents";
import { TutorialSaveData, TutorialStage, TutorialStep } from "../../types/Tutorial";
import { EventBus } from "../EventBus";

export class TutorialManager {
  private currentStageIndex = 0;
  private currentStepIndex = 0;
  private completedStages: string[] = [];
  private isActive = false;

  private eventHandler?: () => void;

  constructor(private stages: TutorialStage[]) {}

  // 🎯 Проверка и запуск обучения
  public checkAndStart(): void {
    if (this.isActive) return;

    const stage = this.stages[this.currentStageIndex];
    if (!stage) return; // Все этапы пройдены

    if (stage.trigger()) {
      this.startStage();
    }
  }

  // 🎯 Запуск этапа
  private startStage(): void {
    this.isActive = true;
    this.showCurrentStep();
  }

  // 🎯 Показ текущего шага
  private showCurrentStep(): void {
    const stage = this.stages[this.currentStageIndex];
    const step = stage.steps[this.currentStepIndex];

    EventBus.emit(GameEvents.SHOW_TUTORIAL_STEP, step);
    this.setupStepCompletion(step);
  }

  // 🎯 Настройка условия завершения шага
  private setupStepCompletion(step: TutorialStep): void {
    // Очищаем предыдущий обработчик, если был
    this.cleanupEventHandler();

    if (step.waitForEvent) {
      this.eventHandler = () => this.goToNextStep();
      EventBus.once(step.waitForEvent, this.eventHandler);
    } else if (step.waitForClick) {
      this.eventHandler = () => this.goToNextStep();
      EventBus.once(GameEvents.TUTORIAL_STEP_CLICKED, this.eventHandler);
    } else if (step.duration) {
      this.eventHandler = () => this.goToNextStep();
      setTimeout(this.eventHandler, step.duration);
    }
  }

  // 🎯 Очистка обработчика события
  private cleanupEventHandler(): void {
    // Обработчик автоматически удалится через EventBus.once или setTimeout
    this.eventHandler = undefined;
  }

  // 🎯 Переход к следующему шагу
  private goToNextStep(): void {
    const stage = this.stages[this.currentStageIndex];
    this.currentStepIndex++;

    if (this.currentStepIndex >= stage.steps.length) {
      this.completeStage();
    } else {
      this.showCurrentStep();
    }
  }

  // 🎯 Завершение этапа
  private completeStage(): void {
    const stage = this.stages[this.currentStageIndex];

    // Добавляем ID этапа в список пройденных
    if (!this.completedStages.includes(stage.id)) {
      this.completedStages.push(stage.id);
    }

    this.isActive = false;
    EventBus.emit(GameEvents.HIDE_TUTORIAL_STEP);

    this.currentStageIndex++;
    this.currentStepIndex = 0;
  }

  // 🎯 Пропуск всего обучения
  public skipAll(): void {
    this.currentStageIndex = this.stages.length;
    this.currentStepIndex = 0;
    this.isActive = false;
    this.cleanupEventHandler();
    EventBus.emit(GameEvents.HIDE_TUTORIAL_STEP);
  }

  // 🎯 Сброс обучения (для тестирования)
  public reset(): void {
    this.currentStageIndex = 0;
    this.currentStepIndex = 0;
    this.completedStages = [];
    this.isActive = false;
    this.cleanupEventHandler();
    EventBus.emit(GameEvents.HIDE_TUTORIAL_STEP);
  }

  // 🎯 Сериализация для сохранения
  public serialize(): TutorialSaveData {
    return {
      currentStageIndex: this.currentStageIndex,
      currentStepIndex: this.currentStepIndex,
      completedStages: [...this.completedStages],
    };
  }

  // 🎯 Десериализация из сохранения
  public deserialize(data: Partial<TutorialSaveData>): void {
    this.currentStageIndex = data.currentStageIndex ?? 0;
    this.currentStepIndex = data.currentStepIndex ?? 0;
    this.completedStages = data.completedStages ?? [];
    this.isActive = false;
  }

  // 🎯 Геттеры для отладки
  public get isTutorialActive(): boolean {
    return this.isActive;
  }

  public get currentStageId(): string | undefined {
    return this.stages[this.currentStageIndex]?.id;
  }

  public get isCompleted(): boolean {
    return this.currentStageIndex >= this.stages.length;
  }
}
