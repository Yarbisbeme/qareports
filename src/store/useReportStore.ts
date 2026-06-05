import { create } from 'zustand';
import { ReportStore } from '@/types/report';

export const useReportStore = create<ReportStore>((set) => ({
  report: null,
  selectedIndices: [],
  dragSnapshot: [],
  snapLines: { hPos: null, vPos: null, bandIdx: null },
  scale: 1,
  
  past: [],
  future: [],

  setSnapLines: (lines) => set({ snapLines: lines }),
  
  // Al cargar un nuevo archivo, limpiamos la historia
  setReport: (data) => set({ report: data, selectedIndices: [], dragSnapshot: [], past: [], future: [], scale: 1 }),
  
  // === MÁQUINA DEL TIEMPO ===
  saveHistory: (pastReport) => set((state) => ({
    past: [...state.past, pastReport],
    future: [] // Si hacemos algo nuevo, perdemos el futuro
  })),

  undo: () => set((state) => {
    if (state.past.length === 0 || !state.report) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      future: [state.report, ...state.future],
      report: previous,
      selectedIndices: [], // Limpiamos selección para evitar errores de índice
      selectedObj: null
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0 || !state.report) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.report],
      future: state.future.slice(1),
      report: next,
      selectedIndices: [],
      selectedObj: null
    };
  }),

  deleteSelected: () => set((state) => {
    if (!state.report || state.selectedIndices.length === 0) return state;

    const newReport = { ...state.report };
    const newBandas = [...newReport.Bandas];

    // Agrupamos los índices a borrar por banda
    const toRemoveByBand: Record<number, Set<number>> = {};
    state.selectedIndices.forEach(({ bandIdx, objIdx }) => {
      if (!toRemoveByBand[bandIdx]) toRemoveByBand[bandIdx] = new Set();
      toRemoveByBand[bandIdx].add(objIdx);
    });

    // Filtramos los objetos que NO están en la lista de borrado
    Object.keys(toRemoveByBand).forEach((bIdxStr) => {
      const bIdx = parseInt(bIdxStr, 10);
      newBandas[bIdx] = {
        ...newBandas[bIdx],
        Objetos: newBandas[bIdx].Objetos.filter((_, oIdx) => !toRemoveByBand[bIdx].has(oIdx))
      };
    });

    newReport.Bandas = newBandas;

    return {
      past: [...state.past, state.report], // Guardamos historia antes de borrar
      future: [],
      report: newReport,
      selectedIndices: [],
      selectedObj: null
    };
  }),

  toggleSelection: (bandIdx, objIdx, multi) => set((state) => {
    const exists = state.selectedIndices.find(i => i.bandIdx === bandIdx && i.objIdx === objIdx);
    if (multi) {
      return exists 
        ? { selectedIndices: state.selectedIndices.filter(i => !(i.bandIdx === bandIdx && i.objIdx === objIdx)) }
        : { selectedIndices: [...state.selectedIndices, { bandIdx, objIdx }] };
    }
    return exists ? state : { selectedIndices: [{ bandIdx, objIdx }] };
  }),

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
    return { 
      past: [...state.past, state.report], // Guardamos historia al editar en el panel
      future: [],
      report: newReport 
    };
  }),

  captureSnapshot: () => set((state) => {
    if (!state.report) return state;
    const snapshot = state.selectedIndices.map(sel => {
      const obj = state.report!.Bandas[sel.bandIdx].Objetos[sel.objIdx];
      return { ...sel, hPos: obj.HPos, vPos: obj.VPos, width: obj.Width || 0, height: obj.Height || 0 };
    });
    return { dragSnapshot: snapshot };
  }),

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