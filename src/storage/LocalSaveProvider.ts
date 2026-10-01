import { SaveData } from "../game/types/SaveData";
import { SaveProvider } from "../game/types/SaveProvider";

export class LocalSaveProvider implements SaveProvider {
  private readonly key = "game_save";

  async load(): Promise<SaveData | null> {
    const raw = localStorage.getItem(this.key);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SaveData;
    } catch (error) {
      console.error("Failed to load local save:", error);
      return null;
    }
  }

  async save(data: SaveData): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.key);
  }
}
