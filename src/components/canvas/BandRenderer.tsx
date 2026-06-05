import React, { useRef, useState, useEffect } from 'react';
import { BandRendererProps } from '@/types/report';
import { fruToPx, pxToFru } from '@/lib/fruConverter';
import ReportObject from './ReportObject';
import { useReportStore } from '@/store/useReportStore';

export default function BandRenderer({ band, bandIdx }: BandRendererProps) {
  const report = useReportStore((state) => state.report);
  const scale = useReportStore((state) => state.scale);
  const updateBandHeight = useReportStore((state) => state.updateBandHeight);
  const saveHistory = useReportStore((state) => state.saveHistory);

  const [isResizing, setIsResizing] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const reportBeforeDrag = useRef<any>(null);

  if (!band.Objetos || band.Objetos.length === 0) return null;

  // 1. Calculamos el inicio EXACTO de esta banda
  const minVPos = band.TipoBanda === 'PageHeader' 
    ? 0 
    : Math.min(...band.Objetos.map(o => o.VPos || 0));

  let nextMinVPos = minVPos;
  if (report && bandIdx < report.Bandas.length - 1) {
    for (let i = bandIdx + 1; i < report.Bandas.length; i++) {
      const nextBand = report.Bandas[i];
      if (nextBand.Objetos && nextBand.Objetos.length > 0) {
        nextMinVPos = Math.min(...nextBand.Objetos.map(o => o.VPos || 0));
        break;
      }
    }
  }

  // 2. Calculamos la altura real (Distancia a la próxima banda)
  let calculatedHeightFru = 0;
  if (report && bandIdx < report.Bandas.length - 1 && nextMinVPos > minVPos) {
    calculatedHeightFru = nextMinVPos - minVPos;
  } else {
    // Si es la última banda, su altura llega hasta su objeto más bajo
    const maxBottom = Math.max(...band.Objetos.map(o => (o.VPos || 0) + (o.Height || 0)));
    calculatedHeightFru = maxBottom - minVPos;
  }

  // 3. Tomamos la altura manual si existe, de lo contrario usamos la calculada
  const activeHeightFru = band.BandHeight !== undefined ? band.BandHeight : calculatedHeightFru;
  const bandHeightPx = Math.max(fruToPx(activeHeightFru), 30); // Le damos mínimo 30px visuales

  // === LÓGICA DE REDIMENSIONAMIENTO (DRAG) ===
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se seleccione la caja de selección múltiple (Marquee)
    reportBeforeDrag.current = useReportStore.getState().report;
    startY.current = e.clientY;
    startHeight.current = activeHeightFru;
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaYPx = (e.clientY - startY.current) / scale;
      const deltaYFru = pxToFru(deltaYPx);

      updateBandHeight(bandIdx, Math.max(0, startHeight.current + deltaYFru));
    };

    const handleMouseUp = () => {
      if (isResizing && reportBeforeDrag.current) {
        saveHistory(reportBeforeDrag.current); // Guardamos para el Undo (Ctrl+Z)
      }
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, scale, bandIdx, updateBandHeight, saveHistory]);

  const bgColors: Record<string, string> = {
    PageHeader: '#f8fafc',
    GroupHeader: '#eff6ff',
    Detail: '#ffffff',
    GroupFooter: '#fefce8',
    PageFooter: '#fef2f2'
  };

  return (
    <div 
      className="relative w-full border-b border-dashed border-gray-300 overflow-visible group"
      style={{ height: `${bandHeightPx}px`, backgroundColor: bgColors[band.TipoBanda] || '#fff' }}
    >
      <span className="absolute top-1 right-2 text-[9px] text-gray-400 font-mono select-none z-0 pointer-events-none">
        {band.TipoBanda} {band.AgrupaPor ? `(${band.AgrupaPor})` : ''} N{band.Nivel}
      </span>

      {band.Objetos.map((obj, originalIdx) => (
        <ReportObject 
          key={originalIdx} 
          obj={obj} 
          offsetVPos={minVPos} 
          bandIdx={bandIdx} 
          objIdx={originalIdx} 
        />
      ))}

      <div 
        onMouseDown={handleMouseDown}
        className={`absolute bottom-0 left-0 w-full h-[6px] cursor-row-resize z-10 transition-colors ${
          isResizing ? 'bg-blue-500' : 'bg-transparent group-hover:bg-blue-300/60'
        }`}
        style={{ transform: 'translateY(50%)' }} // Centramos el área sensible exactamente en el borde
        title="Arrastra para ajustar la altura de la banda"
      />
    </div>
  );
}