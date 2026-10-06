import { AchievementManager } from "../game/core/achivements/AchivementsManager";
import { AudioService } from "../game/core/AudioService";
import { ContractService } from "../game/core/ContractService";
import { GameState } from "../game/core/GameState";
import { Grid } from "../game/core/Grid";
import { TutorialManager } from "../game/core/tutorial/TutorialManager";
import { SaveData } from "../game/types/SaveData";

export class GameSession {
  constructor(
    public readonly gameState: GameState,
    public readonly grid: Grid,
    public readonly audio: AudioService,
    public readonly contract: ContractService,
    public readonly tutorial: TutorialManager,
    public readonly achivements: AchievementManager,
  ) {}

  public createSaveData(): SaveData {
    return {
      version: 1,
      updatedAt: Date.now(),

      game: this.gameState.serialize(),
      grid: this.grid.getSnapshot(),
      audio: this.audio.getSettings(),
      contract: this.contract.serialize(),
      tutorial: this.tutorial.serialize(),
      achivements: this.achivements.serialize(),
    };
  }

  public restoreSaveData(data: SaveData): void {
    this.gameState.deserialize(data.game);
    this.grid.restoreSnapshot(data.grid);
    this.audio.setSettings(data.audio);
    this.contract.deserialize(data.contract);
    this.tutorial.deserialize(data.tutorial);
    this.achivements.deserialize(data.achivements);
  }
}
