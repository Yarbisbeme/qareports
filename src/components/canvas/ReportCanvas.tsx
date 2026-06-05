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

  // === LÓGICA DE DIBUJO Y COLISIÓN DE LA CAJA ===
  const handleMouseDown = (e: React.MouseEvent) => {
    // Solo clic izquierdo
    if (e.button !== 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calcular posición X/Y exacta teniendo en cuenta el Zoom (Scale)
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });

    // Si no mantenemos SHIFT, limpiamos la selección anterior
    if (!e.shiftKey) setSelections([]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionBox) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Actualizamos el extremo final de la caja, limitándolo a los bordes de la hoja
    const x = Math.max(0, Math.min((e.clientX - rect.left) / scale, rect.width / scale));
    const y = Math.max(0, Math.min((e.clientY - rect.top) / scale, rect.height / scale));
    setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!selectionBox) return;

    // 1. Calculamos los bordes finales de la caja en píxeles (Top/Left/Right/Bottom)
    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const right = Math.max(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const bottom = Math.max(selectionBox.startY, selectionBox.currentY);

    // 2. Convertimos la caja a escala FRU (FoxPro) para la colisión matemática
    const boxFru = {
      left: pxToFru(left), right: pxToFru(right), top: pxToFru(top), bottom: pxToFru(bottom)
    };

    const isIntersecting = (obj: { HPos: number; VPos: number; Width?: number; Height?: number } | undefined) => {
      if (!obj || obj.HPos === undefined || obj.VPos === undefined) return false;
      const oLeft = obj.HPos;
      const oRight = obj.HPos + (obj.Width || 2000); // Fallback si no tiene width
      const oTop = obj.VPos;
      const oBottom = obj.VPos + (obj.Height || 1000); // Fallback si no tiene height

      return oLeft < boxFru.right && oRight > boxFru.left && oTop < boxFru.bottom && oBottom > boxFru.top;
    };

    const newSelections: SelectionItem[] = [];

    // 3. Revisamos qué objetos chocaron con nuestra caja
    report.Bandas.forEach((band, bIdx) => {
      band.Objetos.forEach((obj, oIdx) => {
        if (isIntersecting(obj)) newSelections.push({ type: 'band', bandIdx: bIdx, objIdx: oIdx });
      });
    });
    ['Company', 'Title', 'Subtitle'].forEach(k => {
      const m = report.Metadata[k as 'Company'|'Title'|'Subtitle'];
      if (m && m.VPos >= 0 && isIntersecting(m)) newSelections.push({ type: 'meta', metaKey: k as any });
    });
    report.VariablesSistema.forEach((sv, sIdx) => {
      if (isIntersecting(sv)) newSelections.push({ type: 'sysvar', sysIdx: sIdx });
    });

    // 4. Agregamos a la selección (o unimos si presionamos Shift)
    const finalSelections = e.shiftKey ? [...selectedIndices, ...newSelections] : newSelections;

    // Filtramos duplicados por si acaso
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
      onMouseUp={handleMouseUp} // Por si soltamos el clic fuera del papel
      onMouseLeave={handleMouseUp}
    >
      <div 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className="bg-white shadow-2xl ring-1 ring-black/10 relative origin-top transition-all duration-300 select-none"
        style={{ width: paperWidth, minHeight: paperMinHeight, height: 'auto', transform: `scale(${scale})` }}
      >
        
        {/* === RENDER DE LA CAJA AZUL (MARQUEE) === */}
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

        {/* LÍNEAS GUÍA MAGNÉTICAS */}
        {snapLines.hPos !== null && <div className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none" style={{ left: `${fruToPx(snapLines.hPos)}px` }} />}
        {snapLines.vPos !== null && <div className="absolute left-0 right-0 h-[1px] bg-red-500 z-50 pointer-events-none" style={{ top: `${fruToPx(snapLines.vPos)}px` }} />}

        {/* METADATA GLOBAL */}
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

        {/* BANDAS */}
        <div className="w-full relative z-0">
          {(report.Bandas || []).map((band, idx) => (
            <BandRenderer key={`band-${band.TipoBanda}-${band.Nivel}-${band.AgrupaPor || 'none'}-${idx}`} band={band} bandIdx={idx} />
          ))}
        </div>

        {/* VARIABLES DE SISTEMA */}
        {(report.VariablesSistema || []).map((sysVar, idx) => (
          <ReportObject key={`sys-${idx}`} obj={sysVar} offsetVPos={0} type="sysvar" sysIdx={idx} customClass="bg-green-50/80 border-green-300 text-green-800" />
        ))}
      </div>
    </div>
  );
}