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

declare module "@supabase/supabase-js" {
  export function createClient(url: string, key: string): {
    from: (table: string) => {
      select: (columns: string) => any;
      insert: (payload: unknown) => Promise<{ error: { message: string } | null }>;
      update: (payload: unknown) => { eq: (column: string, value: string | number) => Promise<{ error: { message: string } | null }> };
      delete: () => { eq: (column: string, value: string | number) => Promise<{ error: { message: string } | null }> };
      upsert: (payload: unknown) => Promise<{ error: { message: string } | null }>;
      eq: (column: string, value: string | number) => any;
      maybeSingle: () => Promise<{ data: any; error: { message: string } | null }>;
    };
    storage: {
      from: (bucket: string) => {
        upload: (
          path: string,
          file: Blob,
          options?: { cacheControl?: string; upsert?: boolean; contentType?: string }
        ) => Promise<{ error: { message: string } | null }>;
        getPublicUrl: (path: string) => { data: { publicUrl: string } };
      };
    };
  };
}
