declare module "html-to-image" {
  export function toPng(
    node: HTMLElement,
    options?: {
      cacheBust?: boolean;
      backgroundColor?: string;
      pixelRatio?: number;
    }
  ): Promise<string>;
}

declare module "jspdf" {
  export class jsPDF {
    constructor(options?: {
      orientation?: "portrait" | "landscape";
      unit?: string;
      format?: [number, number] | string;
    });
    addImage(
      imageData: string,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number
    ): void;
    save(filename: string): void;
  }
}

declare module "elkjs/lib/elk.bundled.js" {
  type ElkNode = {
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };

  type ElkEdge = {
    id: string;
    sources: string[];
    targets: string[];
  };

  type ElkGraph = {
    id: string;
    layoutOptions?: Record<string, string>;
    children?: ElkNode[];
    edges?: ElkEdge[];
  };

  export default class ELK {
    layout(graph: ElkGraph): Promise<ElkGraph>;
  }
}
