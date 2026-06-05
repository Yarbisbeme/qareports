import React, { useEffect } from 'react';
import { useReportStore } from '@/store/useReportStore';
import { fruToPx } from '@/lib/fruConverter';
import BandRenderer from './BandRenderer';
import ReportObject from './ReportObject'; // <-- IMPORTANTE: Volvemos a importar ReportObject

export default function ReportCanvas() {
  const report = useReportStore((state) => state.report);
  const scale = useReportStore((state) => state.scale);
  const snapLines = useReportStore((state) => state.snapLines);

  const deleteSelected = useReportStore((state) => state.deleteSelected);
  const undo = useReportStore((state) => state.undo);
  const redo = useReportStore((state) => state.redo);
  const nudgeSelected = useReportStore((state) => state.nudgeSelected); // <-- RECUPERADO

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      const NUDGE_STEP = e.shiftKey ? 1000 : 100; // <-- RECUPERADO

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault(); // Prevenir deshacer del navegador
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
      // === FLECHAS DEL TECLADO RECUPERADAS ===
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudgeSelected(0, -NUDGE_STEP);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudgeSelected(0, NUDGE_STEP);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeSelected(-NUDGE_STEP, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeSelected(NUDGE_STEP, 0);
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

  const maxHPos = Math.max(
    ...(report.Bandas || []).flatMap(b => (b.Objetos || []).map(o => o.HPos + (o.Width || 0))),
    ...(report.VariablesSistema || []).map(v => v.HPos + 2000)
  );

  const isLandscape = maxHPos > 85000;
  const paperWidth = isLandscape ? '1056px' : '816px';
  const paperMinHeight = isLandscape ? '816px' : '1056px';

  return (
    <div className="flex-1 overflow-auto bg-gray-300 p-10 flex justify-center">
      <div 
        className="bg-white shadow-2xl ring-1 ring-black/10 relative origin-top transition-all duration-300"
        style={{ width: paperWidth, minHeight: paperMinHeight, height: 'auto', transform: `scale(${scale})` }}
      >

        {/* LÍNEAS GUÍA MAGNÉTICAS (SNAPPING) */}
        {snapLines.hPos !== null && (
          <div 
            className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none"
            style={{ left: `${fruToPx(snapLines.hPos)}px` }} 
          />
        )}
        {snapLines.vPos !== null && (
          <div 
            className="absolute left-0 right-0 h-[1px] bg-red-500 z-50 pointer-events-none"
            style={{ top: `${fruToPx(snapLines.vPos)}px` }} 
          />
        )}

        {/* === METADATA GLOBAL INTERACTIVA === */}
        {report.Metadata && (
          <>
            {report.Metadata.Company?.Expr && report.Metadata.Company.VPos >= 0 && (
              <ReportObject 
                obj={report.Metadata.Company} 
                offsetVPos={0} 
                type="meta" 
                metaKey="Company" 
                customClass="bg-transparent text-gray-900 uppercase font-bold" 
              />
            )}
            {report.Metadata.Title?.Expr && report.Metadata.Title.VPos >= 0 && (
              <ReportObject 
                obj={report.Metadata.Title} 
                offsetVPos={0} 
                type="meta" 
                metaKey="Title" 
                customClass="bg-transparent text-gray-800 uppercase font-bold" 
              />
            )}
            {report.Metadata.Subtitle?.Expr && report.Metadata.Subtitle.VPos >= 0 && (
              <ReportObject 
                obj={report.Metadata.Subtitle} 
                offsetVPos={0} 
                type="meta" 
                metaKey="Subtitle" 
                customClass="bg-transparent text-gray-600" 
              />
            )}
          </>
        )}

        {/* 1. RENDERIZAR BANDAS */}
        <div className="w-full relative z-0">
          {(report.Bandas || []).map((band, idx) => (
            <BandRenderer key={`band-${idx}`} band={band} bandIdx={idx} />
          ))}
        </div>

        {/* 2. RENDERIZAR VARIABLES DE SISTEMA INTERACTIVAS */}
        {(report.VariablesSistema || []).map((sysVar, idx) => (
          <ReportObject 
            key={`sys-${idx}`} 
            obj={sysVar} 
            offsetVPos={0} 
            type="sysvar" 
            sysIdx={idx} 
            customClass="bg-green-50/80 border-green-300 text-green-800" 
          />
        ))}
      </div>
    </div>
  );
}