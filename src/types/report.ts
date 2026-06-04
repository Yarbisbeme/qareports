// src/types/report.ts
export interface IReportObject {
  TipoObj: "Label" | "Field" | "Shape" | "Line" | "Picture";
  Expr: string;
  VPos: number;
  HPos: number;
  Width?: number;
  Height?: number;
}

export interface ReportBand {
  TipoBanda: "PageHeader" | "GroupHeader" | "Detail" | "GroupFooter" | "PageFooter" | "Summary";
  Nivel: number;
  AgrupaPor?: string;
  Objetos: IReportObject[];
}

export interface MetadataItem {
  Label: string;
  Expr: string;
  VPos: number;
  HPos: number;
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
}

export interface FoxProReport {
  ReportId: string;
  Tipo: string;
  Metadata: ReportMetadata;
  VariablesSistema: SystemVariable[];
  Bandas: ReportBand[];
}

export interface ReportStore {
  report: FoxProReport | null;
  selectedObj: IReportObject | null;
  scale: number; // <--- Agregamos la propiedad al estado
  setReport: (data: FoxProReport) => void;
  setSelectedObj: (obj: IReportObject | null) => void;
  autoScale: (containerWidth: number) => void; // <--- Definimos la función
}