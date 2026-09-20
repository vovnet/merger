import * as Phaser from "phaser";
import { Grid, MergeResult } from "./Grid";
import { GridPosition } from "../types/Item";

export class GridDragController {
  constructor(
    private scene: Phaser.Scene,
    private grid: Grid,
    private onSnapBack: (container: Phaser.GameObjects.Container, pos: GridPosition) => void,
    private pixelToGrid: (px: number, py: number) => GridPosition | null,
  ) {}

  public makeDraggable(container: Phaser.GameObjects.Container): void {
    const hitArea = new Phaser.Geom.Circle(0, 0, 45);

    container.setInteractive({
      draggable: true,
      hitArea: hitArea,
      hitAreaCallback: Phaser.Geom.Circle.Contains,
    });

    container.on("dragstart", () => container.setDepth(100));
    container.on("drag", (_: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.x = dragX;
      container.y = dragY;
    });

    container.on("dragend", () => {
      container.setDepth(0);
      const startPos = container.getData("gridPos");
      const targetPos = this.pixelToGrid(container.x, container.y);

      if (!targetPos || (targetPos.x === startPos.x && targetPos.y === startPos.y)) {
        this.onSnapBack(container, startPos);
        return;
      }

      const mergeResult = this.grid.tryMerge(startPos, targetPos);
      if (mergeResult.result === MergeResult.INVALID) {
        this.onSnapBack(container, startPos);
      }
    });
  }
}
