export interface HandPointerConfig {
  type: "tap" | "slide";
  x: number; // Целевая позиция (или позиция для tap)
  y: number;
  startX?: number; // Для slide: начальная позиция X (если не указано, будет смещение от x)
  startY?: number; // Для slide: начальная позиция Y
  endX?: number; // Для slide: конечная позиция X (если не указано, будет равно x)
  endY?: number; // Для slide: конечная позиция Y
}

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
  handPointer?: HandPointerConfig;
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
