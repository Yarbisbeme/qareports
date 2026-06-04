import { create } from 'zustand';
import { ReportStore } from '@/types/report';

export const useReportStore = create<ReportStore>((set) => ({
  report: null,
  selectedObj: null,
  selectedIndex: null,
  scale: 1,

  snapLines: { hPos: null, vPos: null, bandIdx: null },
  setSnapLines: (lines) => set({ snapLines: lines }),
  
  setReport: (data) => set({ report: data, selectedObj: null, selectedIndex: null, scale: 1 }),
  
  setSelectedObj: (obj, bandIdx, objIdx) => set({ 
    selectedObj: obj, 
    selectedIndex: bandIdx !== undefined && objIdx !== undefined ? { bandIdx, objIdx } : null 
  }),

  // Esta única función sirve para mover (HPos, VPos) y estirar (Width, Height)
  updateSelectedObject: (updates) => set((state) => {
    if (!state.report || !state.selectedIndex || !state.selectedObj) return state;

    const { bandIdx, objIdx } = state.selectedIndex;
    const newReport = { ...state.report };
    const newBandas = [...newReport.Bandas];
    const newObjetos = [...newBandas[bandIdx].Objetos];

    const updatedObject = { ...newObjetos[objIdx], ...updates };
    newObjetos[objIdx] = updatedObject;
    newBandas[bandIdx] = { ...newBandas[bandIdx], Objetos: newObjetos };
    newReport.Bandas = newBandas;

    return { 
      report: newReport, 
      selectedObj: updatedObject 
    };
  }),

  autoScale: (containerWidth) => {
    const targetWidth = 816;
    const newScale = Math.min(containerWidth / targetWidth, 1);
    set({ scale: newScale });
  },
}));