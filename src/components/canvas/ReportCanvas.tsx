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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

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

        {/* === METADATA GLOBAL (Aplicando FontSize nativo en 'pt') === */}
        {report.Metadata && (
          <>
            {report.Metadata.Company?.Expr && report.Metadata.Company.VPos >= 0 && (
              <h2 className="absolute font-bold text-gray-900 uppercase tracking-wide z-20 pointer-events-none"
                  style={{ 
                    top: `${fruToPx(report.Metadata.Company.VPos)}px`, 
                    left: `${fruToPx(report.Metadata.Company.HPos)}px`,
                    fontSize: `${report.Metadata.Company.FontSize || 10}pt` // <--- AQUÍ ESTÁ LA MAGIA
                  }}>
                {report.Metadata.Company.Expr.replace(/^["']|["']$/g, '')}
              </h2>
            )}
            
            {report.Metadata.Title?.Expr && report.Metadata.Title.VPos >= 0 && (
              <h3 className="absolute font-bold text-gray-800 uppercase z-20 pointer-events-none"
                  style={{ 
                    top: `${fruToPx(report.Metadata.Title.VPos)}px`, 
                    left: `${fruToPx(report.Metadata.Title.HPos)}px`,
                    fontSize: `${report.Metadata.Title.FontSize || 12}pt` // <--- AQUÍ ESTÁ LA MAGIA
                  }}>
                {report.Metadata.Title.Expr.replace(/^["']|["']$/g, '')}
              </h3>
            )}
            
            {report.Metadata.Subtitle?.Expr && report.Metadata.Subtitle.VPos >= 0 && (
              <h4 className="absolute text-gray-600 z-20 pointer-events-none"
                  style={{ 
                    top: `${fruToPx(report.Metadata.Subtitle.VPos)}px`, 
                    left: `${fruToPx(report.Metadata.Subtitle.HPos)}px`,
                    fontSize: `${report.Metadata.Subtitle.FontSize || 9}pt` // <--- AQUÍ ESTÁ LA MAGIA
                  }}>
                {report.Metadata.Subtitle.Expr.replace(/^["']|["']$/g, '')}
              </h4>
            )}
          </>
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