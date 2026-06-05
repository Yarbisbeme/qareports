import React, { useEffect } from 'react';
import { useReportStore } from '@/store/useReportStore';
import { fruToPx } from '@/lib/fruConverter';
import BandRenderer from './BandRenderer';

export default function ReportCanvas() {
  const report = useReportStore((state) => state.report);
  const scale = useReportStore((state) => state.scale);
  const snapLines = useReportStore((state) => state.snapLines);

  const deleteSelected = useReportStore((state) => state.deleteSelected);
  const undo = useReportStore((state) => state.undo);
  const redo = useReportStore((state) => state.redo);
  const nudgeSelected = useReportStore((state) => state.nudgeSelected);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      const NUDGE_STEP = e.shiftKey ? 1000 : 100;

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
  }, [deleteSelected, undo, redo]);

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

        {snapLines.hPos !== null && (
          <div 
            className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none"
            style={{ left: `${fruToPx(snapLines.hPos)}px` }} 
          />
        )}

        {/* 1. RENDERIZAR BANDAS */}
        <div className="w-full relative z-0">
          {(report.Bandas || []).map((band, idx) => (
            <BandRenderer key={`band-${idx}`} band={band} bandIdx={idx} />
          ))}
        </div>

        {/* 2. RENDERIZAR VARIABLES DE SISTEMA */}
        {(report.VariablesSistema || []).map((sysVar, idx) => {
          const top = fruToPx(sysVar.VPos || 0);
          const left = fruToPx(sysVar.HPos || 0);
          
          return (
            <div key={`sysvar-${idx}`} 
                 className="absolute flex items-center gap-1 text-green-800 bg-green-50 border border-green-300 px-1.5 py-0.5 rounded shadow-sm z-30 opacity-90"
                 style={{ 
                   top: `${top}px`, 
                   left: `${left}px`,
                   fontSize: `${sysVar.FontSize || 8}pt` // <--- APLICADO A VARIABLES
                 }}>
              {sysVar.Label && <span className="font-bold">{sysVar.Label.replace(/['"]/g, '')}</span>}
              <span className="font-mono">{sysVar.Expr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}