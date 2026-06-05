import { create } from 'zustand';
import { FoxProReport, ReportStore, SelectionItem } from '@/types/report';

const isSame = (a: SelectionItem, b: SelectionItem) => {
  if (a.type !== b.type) return false;
  if (a.type === 'band') return a.bandIdx === b.bandIdx && a.objIdx === b.objIdx;
  if (a.type === 'meta') return a.metaKey === b.metaKey;
  if (a.type === 'sysvar') return a.sysIdx === b.sysIdx;
  return false;
};

export const useReportStore = create<ReportStore>((set) => ({
  report: null,
  selectedIndices: [],
  dragSnapshot: [],
  snapLines: { hPos: null, vPos: null, bandIdx: null },
  scale: 1,
  past: [],
  future: [],

  setSnapLines: (lines) => set({ snapLines: lines }),
  
  setReport: (data) => {
    console.log("JSON CRUDO RECIBIDO:", data.Metadata);
    set({ 
    report: data, 
    selectedIndices: [], 
    dragSnapshot: [], 
    past: [], 
    future: [], 
    scale: 1 
  })
  },
  
  saveHistory: (pastReport) => set((state) => ({ past: [...state.past, pastReport], future: [] })),

  undo: () => set((state) => {
    if (state.past.length === 0 || !state.report) return state;
    return { past: state.past.slice(0, -1), future: [state.report, ...state.future], report: state.past[state.past.length - 1], selectedIndices: [] };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0 || !state.report) return state;
    return { past: [...state.past, state.report], future: state.future.slice(1), report: state.future[0], selectedIndices: [] };
  }),

  deleteSelected: () => set((state) => {
    if (!state.report || state.selectedIndices.length === 0) return state;
    const newReport = { ...state.report };
    const newBandas = [...newReport.Bandas];
    const toRemoveByBand: Record<number, Set<number>> = {};
    const toRemoveSysVars = new Set<number>();

    state.selectedIndices.forEach((sel) => {
      if (sel.type === 'band') {
        if (!toRemoveByBand[sel.bandIdx!]) toRemoveByBand[sel.bandIdx!] = new Set();
        toRemoveByBand[sel.bandIdx!].add(sel.objIdx!);
      } else if (sel.type === 'meta') {
        newReport.Metadata[sel.metaKey!] = { ...newReport.Metadata[sel.metaKey!], VPos: -1 }; // Ocultamos la metadata en lugar de borrarla
      } else if (sel.type === 'sysvar') {
        toRemoveSysVars.add(sel.sysIdx!);
      }
    });

    Object.keys(toRemoveByBand).forEach((bIdxStr) => {
      const bIdx = parseInt(bIdxStr, 10);
      newBandas[bIdx] = { ...newBandas[bIdx], Objetos: newBandas[bIdx].Objetos.filter((_, oIdx) => !toRemoveByBand[bIdx].has(oIdx)) };
    });
    newReport.Bandas = newBandas;
    newReport.VariablesSistema = newReport.VariablesSistema.filter((_, i) => !toRemoveSysVars.has(i));

    return { past: [...state.past, state.report], future: [], report: newReport, selectedIndices: [] };
  }),

  toggleSelection: (selItem, multi) => set((state) => {
    const exists = state.selectedIndices.some(i => isSame(i, selItem));
    if (multi) {
      return exists ? { selectedIndices: state.selectedIndices.filter(i => !isSame(i, selItem)) } : { selectedIndices: [...state.selectedIndices, selItem] };
    }
    return exists ? state : { selectedIndices: [selItem] };
  }),

  updateSelectedObjects: (updates) => set((state) => {
    if (!state.report || state.selectedIndices.length === 0) return state;
    const newReport = { ...state.report };

    state.selectedIndices.forEach((sel) => {
      if (sel.type === 'band') {
        const newBandas = [...newReport.Bandas];
        const newObjetos = [...newBandas[sel.bandIdx!].Objetos];
        newObjetos[sel.objIdx!] = { ...newObjetos[sel.objIdx!], ...updates };
        newBandas[sel.bandIdx!] = { ...newBandas[sel.bandIdx!], Objetos: newObjetos };
        newReport.Bandas = newBandas;
      } else if (sel.type === 'meta') {
        newReport.Metadata[sel.metaKey!] = { ...newReport.Metadata[sel.metaKey!], ...updates };
      } else if (sel.type === 'sysvar') {
        const newSysVars = [...newReport.VariablesSistema];
        newSysVars[sel.sysIdx!] = { ...newSysVars[sel.sysIdx!], ...updates };
        newReport.VariablesSistema = newSysVars;
      }
    });
    return { past: [...state.past, state.report], future: [], report: newReport };
  }),

  captureSnapshot: () => set((state) => {
    if (!state.report) return state;
    const snapshot = state.selectedIndices.map(sel => {
      let obj: any;
      if (sel.type === 'band') obj = state.report!.Bandas[sel.bandIdx!].Objetos[sel.objIdx!];
      else if (sel.type === 'meta') obj = state.report!.Metadata[sel.metaKey!];
      else obj = state.report!.VariablesSistema[sel.sysIdx!];
      return { ...sel, hPos: obj.HPos, vPos: obj.VPos, width: obj.Width || 0, height: obj.Height || 0 };
    });
    return { dragSnapshot: snapshot };
  }),

  applySnapshotDelta: (deltaX, deltaY, isResize = false) => set((state) => {
    if (!state.report || state.dragSnapshot.length === 0) return state;
    const newReport = { ...state.report };
    const newBandas = [...newReport.Bandas];

    state.dragSnapshot.forEach(snap => {
      if (snap.type === 'band') {
        const newObjetos = [...newBandas[snap.bandIdx!].Objetos];
        const obj = { ...newObjetos[snap.objIdx!] };
        if (isResize) { obj.Width = Math.max(10, snap.width + deltaX); obj.Height = Math.max(10, snap.height + deltaY); } 
        else { obj.HPos = snap.hPos + deltaX; obj.VPos = snap.vPos + deltaY; }
        newObjetos[snap.objIdx!] = obj;
        newBandas[snap.bandIdx!] = { ...newBandas[snap.bandIdx!], Objetos: newObjetos };
      } 
      else if (snap.type === 'meta') {
        const obj = { ...newReport.Metadata[snap.metaKey!] };
        obj.HPos = snap.hPos + deltaX; obj.VPos = snap.vPos + deltaY;
        newReport.Metadata[snap.metaKey!] = obj;
      }
      else if (snap.type === 'sysvar') {
        const sysVars = [...newReport.VariablesSistema];
        sysVars[snap.sysIdx!] = { ...sysVars[snap.sysIdx!], HPos: snap.hPos + deltaX, VPos: snap.vPos + deltaY };
        newReport.VariablesSistema = sysVars;
      }
    });
    newReport.Bandas = newBandas;
    return { report: newReport };
  }),

  // === EMPUJE POR TECLADO (Nudging Magnético) ===
  nudgeSelected: (deltaX, deltaY) => set((state) => {
    if (!state.report || state.selectedIndices.length === 0) return state;
    
    // Usamos una clonación profunda y segura para no mutar el historial sin querer
    const newReport = JSON.parse(JSON.stringify(state.report)) as FoxProReport;
    
    // 1. Recolectamos todos los bordes de los objetos NO seleccionados (Nuestro radar)
    const allEdgesH = new Set<number>();
    const allEdgesV = new Set<number>();

    const isSelected = (type: string, bIdx?: number, oIdx?: number, mKey?: string, sIdx?: number) => 
      state.selectedIndices.some(s => s.type === type && s.bandIdx === bIdx && s.objIdx === oIdx && s.metaKey === mKey && s.sysIdx === sIdx);

    newReport.Bandas.forEach((b, bI) => b.Objetos.forEach((o, oI) => {
      if (!isSelected('band', bI, oI)) {
        if (o.HPos !== undefined) { allEdgesH.add(o.HPos); if (o.Width) allEdgesH.add(o.HPos + o.Width); }
        if (o.VPos !== undefined) { allEdgesV.add(o.VPos); if (o.Height) allEdgesV.add(o.VPos + o.Height); }
      }
    }));
    if (newReport.Metadata) {
      ['Company', 'Title', 'Subtitle'].forEach(k => {
        const m = newReport.Metadata[k as keyof typeof newReport.Metadata];
        if (m && m.VPos !== undefined && !isSelected('meta', undefined, undefined, k)) {
          if (m.HPos !== undefined) { allEdgesH.add(m.HPos); if (m.Width) allEdgesH.add(m.HPos + m.Width); }
          if (m.VPos !== undefined) { allEdgesV.add(m.VPos); if (m.Height) allEdgesV.add(m.VPos + m.Height); }
        }
      });
    }
    if (newReport.VariablesSistema) {
      newReport.VariablesSistema.forEach((sv, svI) => {
        if (!isSelected('sysvar', undefined, undefined, undefined, svI)) {
          if (sv.HPos !== undefined) { allEdgesH.add(sv.HPos); if (sv.Width) allEdgesH.add(sv.HPos + sv.Width); }
          if (sv.VPos !== undefined) { allEdgesV.add(sv.VPos); if (sv.Height) allEdgesV.add(sv.VPos + sv.Height); }
        }
      });
    }

    // 2. Lógica del Imán (Snapping)
    const NUDGE_STEP = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    const TOLERANCE = NUDGE_STEP - 1; // Si saltas 100, la tolerancia es 99 para evitar quedarte atascado

    let finalDeltaX = deltaX;
    let finalDeltaY = deltaY;
    let snappedHPos: number | null = null;
    let snappedVPos: number | null = null;
    let minDiffH = TOLERANCE + 1;
    let minDiffV = TOLERANCE + 1;

    // Evaluamos si el salto nos deja cerca de un borde
    state.selectedIndices.forEach((sel) => {
      let obj: any = null;
      if (sel.type === 'band') obj = newReport.Bandas[sel.bandIdx!].Objetos[sel.objIdx!];
      else if (sel.type === 'meta') obj = newReport.Metadata[sel.metaKey!];
      else if (sel.type === 'sysvar') obj = newReport.VariablesSistema[sel.sysIdx!];

      if (obj) {
        if (deltaX !== 0) {
          const intendedLeft = obj.HPos + deltaX;
          allEdgesH.forEach(edge => {
            const diff = Math.abs(intendedLeft - edge);
            if (diff < minDiffH) { minDiffH = diff; finalDeltaX = edge - obj.HPos; snappedHPos = edge; }
          });
          if (obj.Width) {
            const intendedRight = obj.HPos + obj.Width + deltaX;
            allEdgesH.forEach(edge => {
              const diff = Math.abs(intendedRight - edge);
              if (diff < minDiffH) { minDiffH = diff; finalDeltaX = edge - (obj.HPos + obj.Width); snappedHPos = edge; }
            });
          }
        }
        if (deltaY !== 0) {
          const intendedTop = obj.VPos + deltaY;
          allEdgesV.forEach(edge => {
            const diff = Math.abs(intendedTop - edge);
            if (diff < minDiffV) { minDiffV = diff; finalDeltaY = edge - obj.VPos; snappedVPos = edge; }
          });
          if (obj.Height) {
            const intendedBottom = obj.VPos + obj.Height + deltaY;
            allEdgesV.forEach(edge => {
              const diff = Math.abs(intendedBottom - edge);
              if (diff < minDiffV) { minDiffV = diff; finalDeltaY = edge - (obj.VPos + obj.Height); snappedVPos = edge; }
            });
          }
        }
      }
    });

    // 3. Aplicamos el movimiento final perfecto
    state.selectedIndices.forEach((sel) => {
      if (sel.type === 'band') {
        const obj = newReport.Bandas[sel.bandIdx!].Objetos[sel.objIdx!];
        obj.HPos += finalDeltaX;
        obj.VPos += finalDeltaY;
      } else if (sel.type === 'meta') {
        newReport.Metadata[sel.metaKey!].HPos += finalDeltaX;
        newReport.Metadata[sel.metaKey!].VPos += finalDeltaY;
      } else if (sel.type === 'sysvar') {
        newReport.VariablesSistema[sel.sysIdx!].HPos += finalDeltaX;
        newReport.VariablesSistema[sel.sysIdx!].VPos += finalDeltaY;
      }
    });

    return { 
      past: [...state.past, state.report], 
      future: [], 
      report: newReport,
      snapLines: { hPos: snappedHPos, vPos: snappedVPos, bandIdx: null } // <-- ENCIENDE LA LÍNEA
    };
  }),

  autoScale: (containerWidth) => {
    set({ scale: Math.min(containerWidth / 816, 1) });
  },
}));