import { SaveData } from "../game/types/SaveData";
import { SaveProvider } from "../game/types/SaveProvider";

export class CloudSaveProvider implements SaveProvider {
  async load(): Promise<SaveData | null> {
    // API request

    return null;
  }

  async save(data: SaveData): Promise<void> {
    // API request
  }

  async clear(): Promise<void> {
    // API request
  }
}
