import React from 'react';
import { useReportStore } from '@/store/useReportStore';
import { fruToPx } from '@/lib/fruConverter';
import BandRenderer from './BandRenderer';

export default function ReportCanvas() {
  const report = useReportStore((state) => state.report);
  const scale = useReportStore((state) => state.scale);

  if (!report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
        <p className="font-medium text-gray-500">Carga un JSON para visualizar el reporte</p>
      </div>
    );
  }

  // ==========================================
  // LA MAGIA: AUTODETECTAR ORIENTACIÓN (LANDSCAPE)
  // ==========================================
  // Buscamos cuál es la coordenada X (HPos) más lejana en todo el reporte
  const maxHPos = Math.max(
    ...(report.Bandas || []).flatMap(b => (b.Objetos || []).map(o => o.HPos + (o.Width || 0))),
    ...(report.VariablesSistema || []).map(v => v.HPos + 2000)
  );

  // Si pasa de 85,000 FRUs (8.5 pulgadas), la hoja debe ser apaisada (Landscape)
  const isLandscape = maxHPos > 85000;
  
  // Asignamos el tamaño de la hoja (Carta normal = 816x1056, Landscape = 1056x816)
  const paperWidth = isLandscape ? '1056px' : '816px';
  const paperMinHeight = isLandscape ? '816px' : '1056px';

  return (
    <div className="flex-1 overflow-auto bg-gray-300 p-10 flex justify-center">
      <div 
        className="bg-white shadow-2xl ring-1 ring-black/10 relative origin-top transition-all duration-300"
        style={{ 
          width: paperWidth,          // <--- Usa la variable inteligente
          minHeight: paperMinHeight,  // <--- Usa la variable inteligente
          height: 'auto',
          transform: `scale(${scale})` 
        }}
      >
        
        {/* === METADATA GLOBAL === */}
        {report.Metadata && (
          <>
            {report.Metadata.Company?.Expr && report.Metadata.Company.VPos >= 0 && (
              <h2 className="absolute font-bold text-sm text-gray-900 uppercase tracking-wide z-20 pointer-events-none"
                  style={{ top: `${fruToPx(report.Metadata.Company.VPos)}px`, left: `${fruToPx(report.Metadata.Company.HPos)}px` }}>
                {report.Metadata.Company.Expr.replace(/^["']|["']$/g, '')}
              </h2>
            )}
            
            {report.Metadata.Title?.Expr && report.Metadata.Title.VPos >= 0 && (
              <h3 className="absolute font-bold text-lg text-gray-800 uppercase z-20 pointer-events-none"
                  style={{ top: `${fruToPx(report.Metadata.Title.VPos)}px`, left: `${fruToPx(report.Metadata.Title.HPos)}px` }}>
                {report.Metadata.Title.Expr.replace(/^["']|["']$/g, '')}
              </h3>
            )}
            
            {report.Metadata.Subtitle?.Expr && report.Metadata.Subtitle.VPos >= 0 && (
              <h4 className="absolute text-xs text-gray-600 z-20 pointer-events-none"
                  style={{ top: `${fruToPx(report.Metadata.Subtitle.VPos)}px`, left: `${fruToPx(report.Metadata.Subtitle.HPos)}px` }}>
                {report.Metadata.Subtitle.Expr.replace(/^["']|["']$/g, '')}
              </h4>
            )}
          </>
        )}

        {/* 1. RENDERIZAR BANDAS */}
        <div className="w-full relative z-0">
          {(report.Bandas || []).map((band, idx) => (
            <BandRenderer key={`band-${idx}`} band={band} />
          ))}
        </div>

        {/* 2. RENDERIZAR VARIABLES DE SISTEMA */}
        {(report.VariablesSistema || []).map((sysVar, idx) => {
          const top = fruToPx(sysVar.VPos || 0);
          const left = fruToPx(sysVar.HPos || 0);
          
          return (
            <div key={`sysvar-${idx}`} className="absolute flex items-center gap-1 text-[10px] text-green-800 bg-green-50 border border-green-300 px-1.5 py-0.5 rounded shadow-sm z-30 opacity-90"
                 style={{ top: `${top}px`, left: `${left}px` }}>
              {sysVar.Label && <span className="font-bold">{sysVar.Label.replace(/['"]/g, '')}</span>}
              <span className="font-mono">{sysVar.Expr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}