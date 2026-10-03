export interface TutorialStep {
  id: string;
  text: string;
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  waitForEvent?: string;
  waitForClick?: boolean;
  duration?: number;
  textPosition?: { x: number; y: number };
}

export interface TutorialStage {
  id: string;
  steps: TutorialStep[];
  trigger: () => boolean;
}

export interface TutorialSaveData {
  currentStageIndex: number;
  currentStepIndex: number;
  completedStages: string[]; // ID пройденных этапов
}
