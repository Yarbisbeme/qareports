import React from 'react';
import { BandRendererProps } from '@/types/report';
import { fruToPx } from '@/lib/fruConverter';
import ReportObject from './ReportObject';
import { useReportStore } from '@/store/useReportStore';

export default function BandRenderer({ band, bandIdx }: BandRendererProps) {
  const report = useReportStore((state) => state.report);

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

  // 3. Calculamos la altura real (Distancia a la próxima banda)
  let bandHeightFru = 0;
  if (report && bandIdx < report.Bandas.length - 1 && nextMinVPos > minVPos) {
    bandHeightFru = nextMinVPos - minVPos;
  } else {
    // Si es la última banda (PageFooter), su altura llega hasta su objeto más bajo
    const maxBottom = Math.max(...band.Objetos.map(o => (o.VPos || 0) + (o.Height || 0)));
    bandHeightFru = maxBottom - minVPos;
  }

  const bandHeight = Math.max(fruToPx(bandHeightFru), 30); // Le damos mínimo 30px visuales

  const bgColors: Record<string, string> = {
    PageHeader: '#f8fafc',
    GroupHeader: '#eff6ff',
    Detail: '#ffffff',
    GroupFooter: '#fefce8',
    PageFooter: '#fef2f2'
  };

  return (
    <div 
      className="relative w-full border-b border-dashed border-gray-300 overflow-visible"
      style={{ height: `${bandHeight}px`, backgroundColor: bgColors[band.TipoBanda] || '#fff' }}
    >
      {/* Etiqueta de la Banda */}
      <span className="absolute top-1 right-2 text-[9px] text-gray-400 font-mono select-none z-0 pointer-events-none">
        {band.TipoBanda} {band.AgrupaPor ? `(${band.AgrupaPor})` : ''} N{band.Nivel}
      </span>

      {/* Renderizado de Objetos */}
      {band.Objetos.map((obj, originalIdx) => (
        <ReportObject 
          key={originalIdx} 
          obj={obj} 
          offsetVPos={minVPos} 
          bandIdx={bandIdx} 
          objIdx={originalIdx} 
        />
      ))}
    </div>
  );
}