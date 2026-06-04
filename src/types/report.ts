export interface IReportObject {
  TipoObj: "Label" | "Field" | "Shape" | "Line" | "Picture";
  Expr: string;
  Name?: string;     // <--- Nueva propiedad
  VPos: number;
  HPos: number;
  Width?: number;
  Height?: number;
  FontSize?: number; // <--- Nueva propiedad
}

export interface ReportBand {
  TipoBanda: "PageHeader" | "GroupHeader" | "Detail" | "GroupFooter" | "PageFooter" | "Summary";
  Nivel: number;
  AgrupaPor?: string;
  Objetos: IReportObject[];
}

export interface ReportObjectProps {
  obj: IReportObject;
  offsetVPos: number;
  bandIdx: number; // <--- Nuevo
  objIdx: number;  // <--- Nuevo
}

export interface BandRendererProps {
  band: ReportBand;
  bandIdx: number; 
}

export interface MetadataItem {
  Label: string;
  Expr: string;
  VPos: number;
  HPos: number;
  FontSize?: number; // <--- Agregado
}

export interface ReportMetadata {
  Company: MetadataItem;
  Title: MetadataItem;
  Subtitle: MetadataItem;
}

export interface SystemVariable {
  Label: string;
  Expr: string;
  VPos: number;
  HPos: number;
  FontSize: number;
}

export interface FoxProReport {
  ReportId: string;
  Tipo: string;
  Metadata: ReportMetadata;
  VariablesSistema: SystemVariable[];
  Bandas: ReportBand[];
}

export interface SelectionItem {
  bandIdx: number;
  objIdx: number;
}

export interface ReportStore {
  report: FoxProReport | null;
  selectedIndices: SelectionItem[];
  
  dragSnapshot: { bandIdx: number, objIdx: number, hPos: number, vPos: number, width: number, height: number }[];
  snapLines: { hPos: number | null, vPos: number | null, bandIdx: number | null };
  scale: number;

  setReport: (data: FoxProReport) => void;
  setSnapLines: (lines: { hPos: number | null, vPos: number | null, bandIdx: number | null }) => void;
  
  toggleSelection: (bandIdx: number, objIdx: number, multi: boolean) => void;
  updateSelectedObjects: (updates: Partial<IReportObject>) => void;
  
  captureSnapshot: () => void;
  applySnapshotDelta: (deltaX: number, deltaY: number, isResize?: boolean) => void;

  autoScale: (containerWidth: number) => void;
}