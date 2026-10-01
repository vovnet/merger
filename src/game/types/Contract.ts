export interface ContractTask {
  id: string;
  targetLevel: number; // Какой уровень сквиша нужен
  requiredCount: number; // Сколько штук нужно держать на поле
  currentCount: number; // Текущее количество на поле (обновляется при проверке)
  isCompleted: boolean; // Флаг: задача выполнена и больше не проверяется
  isLocked: boolean;
}

export interface Contract {
  id: string;
  tasks: ContractTask[];
  isCompleted: boolean;
}

export interface ContractUpdateData {
  contract: Contract | null;
  activeTargetLevel: number | null;
}
