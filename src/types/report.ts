export interface IReportObject {
  TipoObj: "Label" | "Field" | "Shape" | "Line" | "Picture";
  Expr: string;
  Name?: string;
  VPos: number;
  HPos: number;
  Width?: number;
  Height?: number;
  FontSize?: number;
}

export interface QaWarning {
  id: string;
  severidad: 'error' | 'warning';
  mensaje: string;
  banda?: string;
  objeto?: string;
  relatedItems?: SelectionItem[];
}

export interface ReportBand {
  TipoBanda: "PageHeader" | "GroupHeader" | "Detail" | "GroupFooter" | "PageFooter" | "Summary";
  Nivel: number;
  AgrupaPor?: string;
  Objetos: IReportObject[];
  BandHeight: number;
  StartVPos?: number;
}

export interface MetadataItem {
  Label?: string;
  Expr: string;
  VPos: number;
  HPos: number;
  Width?: number;  // <--- ¡NUEVO!
  Height?: number; // <--- ¡NUEVO!
  FontSize?: number; 
}

export interface SystemVariable {
  Label: string;
  Expr: string;
  VPos: number;
  HPos: number;
  Width?: number;  // <--- ¡NUEVO!
  Height?: number; // <--- ¡NUEVO!
  FontSize: number;
}

export interface ReportMetadata {
  Company: MetadataItem;
  Title: MetadataItem;
  Subtitle: MetadataItem;
}

export interface FoxProReport {
  ReportId: string;
  Tipo: string;
  sqlStri?: string; 
  Metadata: ReportMetadata;
  VariablesSistema: SystemVariable[];
  Bandas: ReportBand[];
}

export interface BandRendererProps {
  band: ReportBand;
  bandIdx: number; 
}

// === NUEVA SELECCIÓN UNIVERSAL ===
export interface SelectionItem {
  type: 'band' | 'meta' | 'sysvar';
  bandIdx?: number;
  objIdx?: number;
  metaKey?: 'Company' | 'Title' | 'Subtitle';
  sysIdx?: number;
}

export interface ReportObjectProps {
  obj: any; // Acepta IReportObject, MetadataItem o SystemVariable
  offsetVPos: number;
  bandIdx?: number; 
  objIdx?: number;
  type?: 'band' | 'meta' | 'sysvar';
  metaKey?: 'Company' | 'Title' | 'Subtitle';
  sysIdx?: number;
  customClass?: string;
}

export interface ReportStore {
  report: FoxProReport | null;
  selectedIndices: SelectionItem[];
  past: FoxProReport[];
  future: FoxProReport[];
  dragSnapshot: (SelectionItem & { hPos: number, vPos: number, width: number, height: number })[];
  snapLines: { hPos: number | null, vPos: number | null, bandIdx: number | null };
  scale: number;
  activeBandIdx: number | null;
  setActiveBandIdx: (idx: number | null) => void
  addObject: (tipoObj: 'Label' | 'Field' | 'Shape' | 'Line' | 'Picture') => void;
  saveHistory: (pastReport: FoxProReport) => void;
  undo: () => void;
  redo: () => void;
  nudgeSelected: (deltaX: number, deltaY: number) => void;
  setReport: (data: FoxProReport) => void;
  setSnapLines: (lines: { hPos: number | null, vPos: number | null, bandIdx: number | null }) => void;
  setSelections: (selections: SelectionItem[]) => void;
  toggleSelection: (item: SelectionItem, multi: boolean) => void;
  updateSelectedObjects: (updates: Partial<IReportObject & MetadataItem>) => void;
  captureSnapshot: () => void;
  applySnapshotDelta: (deltaX: number, deltaY: number, isResize?: boolean) => void;
  autoScale: (containerWidth: number) => void;
  updateBandHeight:(bandIdx: number, newHeight: number) => void;
  resizeSelected:(deltaX: number, deltaY: number, edge: string) => void
  deleteSelected: () => void;
  setScale: (newScale: number) => void;
  createNewReport: () => void;
  addBand: (tipoBanda: string, agrupaPor?: string) => void;
}