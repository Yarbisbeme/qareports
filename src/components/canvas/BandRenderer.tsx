import React, { useRef } from 'react';
import { BandRendererProps } from '@/types/report';
import { fruToPx } from '@/lib/fruConverter';
import ReportObject from './ReportObject';

export default function BandRenderer({ band, bandIdx }: BandRendererProps) {
  // Congelamos el techo de la banda para evitar la "Cinta de Correr"
  const minVPosRef = useRef<number | null>(null);

  if (!band.Objetos || band.Objetos.length === 0) return null;

  if (minVPosRef.current === null) {
    minVPosRef.current = band.TipoBanda === 'PageHeader' 
      ? 0 
      : Math.min(...band.Objetos.map(o => o.VPos || 0));
  }

  const minVPos = minVPosRef.current;
  const validObjects = band.Objetos.filter(o => (o.VPos - minVPos) < 20000);

  const maxHeight = validObjects.reduce((max, obj) => {
    const relativeBottom = (obj.VPos - minVPos) + (obj.Height || 0);
    return relativeBottom > max ? relativeBottom : max;
  }, 0);

  const bandHeight = Math.max(fruToPx(maxHeight) + 10, 30);

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
      <span className="absolute top-1 right-2 text-[9px] text-gray-400 font-mono select-none z-0">
        {band.TipoBanda} {band.AgrupaPor ? `(${band.AgrupaPor})` : ''} N{band.Nivel}
      </span>

      {validObjects.map((obj, idx) => (
        <ReportObject 
          key={idx} 
          obj={obj} 
          offsetVPos={minVPos} 
          bandIdx={bandIdx} 
          objIdx={idx}      
        />
      ))}
    </div>
  );
}