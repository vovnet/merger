import { SaveData } from "../game/types/SaveData";
import { SaveProvider } from "../game/types/SaveProvider";
import { ygProvider } from "../YGProvider";

export class CloudSaveProvider implements SaveProvider {
  async save(data: SaveData): Promise<void> {
    await ygProvider.saveData(data, true);
  }

  async load(): Promise<SaveData | null> {
    return await ygProvider.loadData();
  }

  async clear(): Promise<void> {
    await ygProvider.clearData();
  }
}
