import { AudioService } from "../game/core/AudioService";
import { ContractService } from "../game/core/ContractService";
import { GameState } from "../game/core/GameState";
import { Grid } from "../game/core/Grid";
import { SaveData } from "../game/types/SaveData";

export class GameSession {
  constructor(
    public readonly gameState: GameState,
    public readonly grid: Grid,
    public readonly audio: AudioService,
    public readonly contract: ContractService,
  ) {}

  public createSaveData(): SaveData {
    return {
      version: 1,
      updatedAt: Date.now(),

      game: this.gameState.serialize(),
      grid: this.grid.getSnapshot(),
      audio: this.audio.getSettings(),
      contract: this.contract.serialize(),
    };
  }

  public restoreSaveData(data: SaveData): void {
    this.contract.beginRestore();

    try {
      this.gameState.deserialize(data.game);

      this.grid.restoreSnapshot(data.grid);

      this.audio.setSettings(data.audio);

      this.contract.deserialize(data.contract);
    } finally {
      this.contract.endRestore();
    }
  }
}
