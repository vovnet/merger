import { SaveData } from "./SaveData";

export interface SaveProvider {
  load(): Promise<SaveData | null>;
  save(data: SaveData): Promise<void>;
  clear(): Promise<void>;
}
