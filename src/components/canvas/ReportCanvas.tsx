import React, { useEffect, useState, useRef } from 'react';
import { useReportStore } from '@/store/useReportStore';
import { fruToPx, pxToFru } from '@/lib/fruConverter';
import { SelectionItem } from '@/types/report';
import BandRenderer from './BandRenderer';
import ReportObject from './ReportObject';

export default function ReportCanvas() {
  const report = useReportStore((state) => state.report);
  const scale = useReportStore((state) => state.scale);
  const snapLines = useReportStore((state) => state.snapLines);

  const deleteSelected = useReportStore((state) => state.deleteSelected);
  const undo = useReportStore((state) => state.undo);
  const redo = useReportStore((state) => state.redo);
  const nudgeSelected = useReportStore((state) => state.nudgeSelected);
  const selectedIndices = useReportStore((state) => state.selectedIndices);
  const setSelections = useReportStore((state) => state.setSelections);

  // === ESTADO Y REF PARA LA SELECCIÓN MÚLTIPLE (CAJA) ===
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, currentX: number, currentY: number} | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const NUDGE_STEP = e.shiftKey ? 1000 : 100;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault(); 
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'ArrowUp') { e.preventDefault(); nudgeSelected(0, -NUDGE_STEP); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); nudgeSelected(0, NUDGE_STEP); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeSelected(-NUDGE_STEP, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nudgeSelected(NUDGE_STEP, 0); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        console.log("Guardando...");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, undo, redo, nudgeSelected]);

  if (!report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
        <p className="font-medium text-gray-500">Carga un JSON para visualizar el reporte</p>
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });

    if (!e.shiftKey) setSelections([]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionBox) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min((e.clientX - rect.left) / scale, rect.width / scale));
    const y = Math.max(0, Math.min((e.clientY - rect.top) / scale, rect.height / scale));
    setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!selectionBox) return;

    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const right = Math.max(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const bottom = Math.max(selectionBox.startY, selectionBox.currentY);

    const boxFru = {
      left: pxToFru(left), right: pxToFru(right), top: pxToFru(top), bottom: pxToFru(bottom)
    };

    // =========================================================================
    // 1. REPRODUCIR CÁLCULO VISUAL (Saber dónde está cada banda en la pantalla)
    // =========================================================================
    const bandVisualTops: number[] = [];
    const bandMinVPos: number[] = [];
    let currentTopFru = 0;

    report.Bandas.forEach((band, bandIdx) => {
      bandVisualTops.push(currentTopFru);
      
      // Encontrar el Offset interno de la banda
      const minVPos = band.TipoBanda === 'PageHeader' || !band.Objetos || band.Objetos.length === 0
        ? 0 
        : Math.min(...band.Objetos.map(o => o.VPos || 0));
      bandMinVPos.push(minVPos);

      // Calcular altura tal como lo hace BandRenderer
      let calculatedHeightFru = 0;
      let nextMinVPos = minVPos;

      if (bandIdx < report.Bandas.length - 1) {
        for (let i = bandIdx + 1; i < report.Bandas.length; i++) {
          const nextBand = report.Bandas[i];
          if (nextBand.Objetos && nextBand.Objetos.length > 0) {
            nextMinVPos = Math.min(...nextBand.Objetos.map(o => o.VPos || 0));
            break;
          }
        }
      }

      if (bandIdx < report.Bandas.length - 1 && nextMinVPos > minVPos) {
        calculatedHeightFru = nextMinVPos - minVPos;
      } else {
        const maxBottom = band.Objetos && band.Objetos.length > 0 
          ? Math.max(...band.Objetos.map(o => (o.VPos || 0) + (o.Height || 0)))
          : minVPos + 5000;
        calculatedHeightFru = maxBottom - minVPos;
      }

      const activeHeightFru = band.BandHeight !== undefined ? band.BandHeight : calculatedHeightFru;
      currentTopFru += activeHeightFru; // Acumular para la próxima banda
    });

    // =========================================================================
    // 2. LÓGICA DE COLISIÓN USANDO COORDENADAS VISUALES
    // =========================================================================
    const isIntersecting = (obj: any, bIdx?: number) => {
      if (!obj || obj.HPos === undefined || obj.VPos === undefined) return false;
      
      // A) Ajuste en Y: Si pertenece a una banda, usamos su posición real en pantalla
      let visualTop = obj.VPos;
      if (bIdx !== undefined) {
        visualTop = bandVisualTops[bIdx] + (obj.VPos - bandMinVPos[bIdx]);
      }
      
      // B) Ajuste en X: Mejoramos el fallback de Ancho para que no seleccione fantasmas
      const estimatedWidth = obj.Expr ? obj.Expr.length * 100 : 2000; 

      const oLeft = obj.HPos;
      const oRight = obj.HPos + (obj.Width || estimatedWidth); 
      const oTop = visualTop;
      const oBottom = visualTop + (obj.Height || 1000); 

      return oLeft < boxFru.right && oRight > boxFru.left && oTop < boxFru.bottom && oBottom > boxFru.top;
    };

    const newSelections: SelectionItem[] = [];

    // 3. Revisamos qué objetos chocaron
    report.Bandas.forEach((band, bIdx) => {
      band.Objetos.forEach((obj, oIdx) => {
        if (isIntersecting(obj, bIdx)) newSelections.push({ type: 'band', bandIdx: bIdx, objIdx: oIdx });
      });
    });

    ['Company', 'Title', 'Subtitle'].forEach(k => {
      const m = report.Metadata[k as 'Company'|'Title'|'Subtitle'];
      if (m && m.VPos >= 0 && isIntersecting(m)) newSelections.push({ type: 'meta', metaKey: k as any });
    });

    report.VariablesSistema.forEach((sv, sIdx) => {
      if (isIntersecting(sv)) newSelections.push({ type: 'sysvar', sysIdx: sIdx });
    });

    // 4. Guardar selecciones
    const finalSelections = e.shiftKey ? [...selectedIndices, ...newSelections] : newSelections;

    const uniqueSelections = finalSelections.filter((sel, index, self) => 
      index === self.findIndex((t) => (t.type === sel.type && t.bandIdx === sel.bandIdx && t.objIdx === sel.objIdx && t.metaKey === sel.metaKey && t.sysIdx === sel.sysIdx))
    );

    setSelections(uniqueSelections);
    setSelectionBox(null);
  };

  const maxHPos = Math.max(
    ...(report.Bandas || []).flatMap(b => (b.Objetos || []).map(o => o.HPos + (o.Width || 0))),
    ...(report.VariablesSistema || []).map(v => v.HPos + 2000)
  );

  const isLandscape = maxHPos > 85000;
  const paperWidth = isLandscape ? '1056px' : '816px';
  const paperMinHeight = isLandscape ? '816px' : '1056px';

  return (
    <div 
      className="flex-1 overflow-auto bg-gray-300 p-10 flex justify-center"
      onMouseUp={handleMouseUp} 
      onMouseLeave={handleMouseUp}
    >
      <div 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className="bg-white shadow-2xl ring-1 ring-black/10 relative origin-top transition-all duration-300 select-none"
        style={{ width: paperWidth, minHeight: paperMinHeight, height: 'auto', transform: `scale(${scale})` }}
      >
        
        {selectionBox && (
          <div 
            className="absolute border border-blue-500 bg-blue-500/20 z-50 pointer-events-none"
            style={{
              left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
              top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
              width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
              height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
            }}
          />
        )}

        {snapLines.hPos !== null && <div className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none" style={{ left: `${fruToPx(snapLines.hPos)}px` }} />}
        {snapLines.vPos !== null && <div className="absolute left-0 right-0 h-[1px] bg-red-500 z-50 pointer-events-none" style={{ top: `${fruToPx(snapLines.vPos)}px` }} />}

        {report.Metadata && (
          <>
            {report.Metadata.Company?.Expr && report.Metadata.Company.VPos >= 0 && (
              <ReportObject obj={report.Metadata.Company} offsetVPos={0} type="meta" metaKey="Company" customClass="bg-transparent text-gray-900 uppercase font-bold" />
            )}
            {report.Metadata.Title?.Expr && report.Metadata.Title.VPos >= 0 && (
              <ReportObject obj={report.Metadata.Title} offsetVPos={0} type="meta" metaKey="Title" customClass="bg-transparent text-gray-800 uppercase font-bold" />
            )}
            {report.Metadata.Subtitle?.Expr && report.Metadata.Subtitle.VPos >= 0 && (
              <ReportObject obj={report.Metadata.Subtitle} offsetVPos={0} type="meta" metaKey="Subtitle" customClass="bg-transparent text-gray-600" />
            )}
          </>
        )}

        <div className="w-full relative z-0">
          {(report.Bandas || []).map((band, idx) => (
            <BandRenderer key={`band-${band.TipoBanda}-${band.Nivel}-${band.AgrupaPor || 'none'}-${idx}`} band={band} bandIdx={idx} />
          ))}
        </div>

        {(report.VariablesSistema || []).map((sysVar, idx) => (
          <ReportObject key={`sys-${idx}`} obj={sysVar} offsetVPos={0} type="sysvar" sysIdx={idx} customClass="bg-green-50/80 border-green-300 text-green-800" />
        ))}
      </div>
    </div>
  );
}