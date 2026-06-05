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
  
  // En src/store/useReportStore.ts, busca tu setReport y cámbialo por esto:

  setReport: (data) => {
    console.log("JSON CRUDO RECIBIDO:", data);

    // =========================================================
    // 🧹 MÓDULO DE SANITIZACIÓN AUTOMÁTICA (ETL)
    // =========================================================
    // Clonamos los datos para no mutar el JSON original directo
    const cleanData = JSON.parse(JSON.stringify(data)) as FoxProReport;

    if (cleanData.Bandas && cleanData.Bandas.length > 0) {
      // 1. Extraer TODOS los objetos a una piscina global
      const allObjects: any[] = [];
      cleanData.Bandas.forEach((band) => {
        if (band.Objetos) {
          allObjects.push(...band.Objetos);
        }
        band.Objetos = []; // Vaciamos las bandas para rellenarlas limpiamente
      });

      // 2. Calcular las "fronteras" (Start y End) físicas de cada banda
      let currentTop = 0;
      const bandBoundaries = cleanData.Bandas.map((band, idx) => {
        // ¿Dónde empieza lógicamente esta banda según sus objetos originales?
        // Miramos el JSON crudo original para saber la intención de FoxPro
        const originalObjs = data.Bandas[idx].Objetos || [];
        const minVPos = originalObjs.length > 0 
          ? Math.min(...originalObjs.map(o => o.VPos || 0)) 
          : currentTop;

        const startVPos = band.TipoBanda === 'PageHeader' ? 0 : Math.max(currentTop, minVPos);
        currentTop = startVPos;

        return {
          idx,
          tipo: band.TipoBanda,
          start: startVPos,
          end: 9999999 // Por defecto infinito, lo ajustamos en el paso 3
        };
      });

      // 3. Ajustar el 'end' de cada banda usando el 'start' de la siguiente
      for (let i = 0; i < bandBoundaries.length; i++) {
        if (i < bandBoundaries.length - 1) {
          bandBoundaries[i].end = bandBoundaries[i + 1].start;
        }
      }

      // 4. Reasignar cada objeto a su banda CORRECTA según su VPos
      allObjects.forEach((obj) => {
        let targetIdx = bandBoundaries.findIndex(b => obj.VPos >= b.start && obj.VPos < b.end);
        
        // Si por alguna razón el VPos es inmenso, lo mandamos a la última banda (Footer)
        if (targetIdx === -1) targetIdx = bandBoundaries.length - 1;
        
        cleanData.Bandas[targetIdx].Objetos.push(obj);
      });

      // 5. Ordenar los objetos de arriba hacia abajo para un renderizado limpio
      cleanData.Bandas.forEach(band => {
        band.Objetos.sort((a, b) => (a.VPos || 0) - (b.VPos || 0));
      });

      console.log("JSON SANITIZADO Y ESTRUCTURADO:", cleanData);
    }
    // =========================================================

    set({ 
      report: cleanData, // Pasamos la data limpia al lienzo
      selectedIndices: [], 
      dragSnapshot: [], 
      past: [], 
      future: [], 
      scale: 1,
      snapLines: { hPos: null, vPos: null, bandIdx: null }
    });
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

  setSelections: (selections: SelectionItem[]) => set({ selectedIndices: selections }),

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
        
        if (isResize) { 
          obj.Width = Math.max(10, snap.width + deltaX); 
          obj.Height = Math.max(10, snap.height + deltaY); 
        } else { 
          obj.HPos = snap.hPos + deltaX; 
          obj.VPos = snap.vPos + deltaY; 
        }
        
        newObjetos[snap.objIdx!] = obj;
        newBandas[snap.bandIdx!] = { ...newBandas[snap.bandIdx!], Objetos: newObjetos };
      } 
      else if (snap.type === 'meta') {
        const obj = { ...newReport.Metadata[snap.metaKey!] };
        
        // === LÓGICA DE RESIZE AÑADIDA PARA METADATA ===
        if (isResize) {
          obj.Width = Math.max(10, snap.width + deltaX);
          obj.Height = Math.max(10, snap.height + deltaY);
        } else {
          obj.HPos = snap.hPos + deltaX; 
          obj.VPos = snap.vPos + deltaY;
        }
        
        newReport.Metadata[snap.metaKey!] = obj;
      }
      else if (snap.type === 'sysvar') {
        const sysVars = [...newReport.VariablesSistema];
        const obj = { ...sysVars[snap.sysIdx!] };
        
        // === LÓGICA DE RESIZE AÑADIDA PARA VARIABLES DE SISTEMA ===
        if (isResize) {
          obj.Width = Math.max(10, snap.width + deltaX);
          obj.Height = Math.max(10, snap.height + deltaY);
        } else {
          obj.HPos = snap.hPos + deltaX; 
          obj.VPos = snap.vPos + deltaY;
        }
        
        sysVars[snap.sysIdx!] = obj;
        newReport.VariablesSistema = sysVars;
      }
    });
    
    newReport.Bandas = newBandas;
    return { report: newReport };
  }),

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

  updateBandHeight: (bandIdx, newHeight) => set((state) => {
    if (!state.report) return state;
    // Usamos JSON.parse/stringify para clonar profundamente de forma segura
    const newReport = JSON.parse(JSON.stringify(state.report));
    
    // Actualizamos solo la altura de la banda indicada
    newReport.Bandas[bandIdx].BandHeight = newHeight;
    
    return { report: newReport };
  }),

  resizeSelected: (deltaX, deltaY, edge) => set((state) => {
    if (!state.report || state.selectedIndices.length === 0) return state;
    const newReport = JSON.parse(JSON.stringify(state.report));
    
    state.selectedIndices.forEach((sel) => {
      let obj: any;
      if (sel.type === 'band') obj = newReport.Bandas[sel.bandIdx!].Objetos[sel.objIdx!];
      else if (sel.type === 'meta') obj = newReport.Metadata[sel.metaKey!];
      else if (sel.type === 'sysvar') obj = newReport.VariablesSistema[sel.sysIdx!];

      if (!obj) return;

      if (edge.includes('e')) obj.Width = Math.max(10, obj.Width + deltaX);
      if (edge.includes('s')) obj.Height = Math.max(10, obj.Height + deltaY);
      if (edge.includes('w')) {
        const oldRight = obj.HPos + obj.Width;
        obj.HPos += deltaX;
        obj.Width = Math.max(10, oldRight - obj.HPos);
      }
      if (edge.includes('n')) {
        const oldBottom = obj.VPos + obj.Height;
        obj.VPos += deltaY;
        obj.Height = Math.max(10, oldBottom - obj.VPos);
      }
    });
    return { report: newReport };
  }),

  autoScale: (containerWidth) => {
    set({ scale: Math.min(containerWidth / 816, 1) });
  },
}));