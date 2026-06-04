import { create } from 'zustand';
import { FoxProReport, IReportObject, ReportStore } from '@/types/report';



export const useReportStore = create<ReportStore>((set) => ({
  report: null,
  selectedObj: null,
  scale: 1, // <--- Valor inicial por defecto (100%)
  setReport: (data) => set({ report: data, selectedObj: null, scale: 1 }), // Reset scale al cambiar reporte
  setSelectedObj: (obj) => set({ selectedObj: obj }),
  autoScale: (containerWidth) => {
    const targetWidth = 816;
    const newScale = Math.min(containerWidth / targetWidth, 1);
    set({ scale: newScale });
  },
}));