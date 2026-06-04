import { create } from 'zustand';
import { ReportStore } from '@/types/report';

export const useReportStore = create<ReportStore>((set) => ({
  report: null,
  selectedIndices: [], // <-- Arreglo vacío por defecto
  dragSnapshot: [],
  snapLines: { hPos: null, vPos: null, bandIdx: null },
  scale: 1,
  
  setSnapLines: (lines) => set({ snapLines: lines }),
  setReport: (data) => set({ report: data, selectedIndices: [], dragSnapshot: [], scale: 1 }),
  
  toggleSelection: (bandIdx, objIdx, multi) => set((state) => {
    const exists = state.selectedIndices.find(i => i.bandIdx === bandIdx && i.objIdx === objIdx);
    if (multi) {
      return exists 
        ? { selectedIndices: state.selectedIndices.filter(i => !(i.bandIdx === bandIdx && i.objIdx === objIdx)) }
        : { selectedIndices: [...state.selectedIndices, { bandIdx, objIdx }] };
    }
    // Si no presionas Ctrl, selecciona solo este (a menos que ya esté en el grupo, para poder arrastrarlos juntos)
    return exists ? state : { selectedIndices: [{ bandIdx, objIdx }] };
  }),

  // Actualiza desde el panel de propiedades
  updateSelectedObjects: (updates) => set((state) => {
    if (!state.report || state.selectedIndices.length === 0) return state;
    const newReport = { ...state.report };
    const newBandas = [...newReport.Bandas];

    state.selectedIndices.forEach(({ bandIdx, objIdx }) => {
      const newObjetos = [...newBandas[bandIdx].Objetos];
      newObjetos[objIdx] = { ...newObjetos[objIdx], ...updates };
      newBandas[bandIdx] = { ...newBandas[bandIdx], Objetos: newObjetos };
    });

    newReport.Bandas = newBandas;
    return { report: newReport };
  }),

  // 1. TOMA LA FOTO
  captureSnapshot: () => set((state) => {
    if (!state.report) return state;
    const snapshot = state.selectedIndices.map(sel => {
      const obj = state.report!.Bandas[sel.bandIdx].Objetos[sel.objIdx];
      return { ...sel, hPos: obj.HPos, vPos: obj.VPos, width: obj.Width || 0, height: obj.Height || 0 };
    });
    return { dragSnapshot: snapshot };
  }),

  // 2. MUEVE EL GRUPO BASADO EN LA FOTO
  applySnapshotDelta: (deltaX, deltaY, isResize = false) => set((state) => {
    if (!state.report || state.dragSnapshot.length === 0) return state;
    const newReport = { ...state.report };
    const newBandas = [...newReport.Bandas];

    state.dragSnapshot.forEach(snap => {
      const newObjetos = [...newBandas[snap.bandIdx].Objetos];
      const obj = { ...newObjetos[snap.objIdx] };

      if (isResize) {
        obj.Width = Math.max(10, snap.width + deltaX);
        obj.Height = Math.max(10, snap.height + deltaY);
      } else {
        obj.HPos = snap.hPos + deltaX;
        obj.VPos = snap.vPos + deltaY;
      }

      newObjetos[snap.objIdx] = obj;
      newBandas[snap.bandIdx] = { ...newBandas[snap.bandIdx], Objetos: newObjetos };
    });

    newReport.Bandas = newBandas;
    return { report: newReport };
  }),

  autoScale: (containerWidth) => {
    const targetWidth = 816;
    const newScale = Math.min(containerWidth / targetWidth, 1);
    set({ scale: newScale });
  },
}));