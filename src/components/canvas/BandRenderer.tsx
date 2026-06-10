import React, { useRef, useState, useEffect } from 'react';
import { BandRendererProps } from '@/types/report';
import { fruToPx, pxToFru } from '@/lib/fruConverter';
import ReportObject from './ReportObject';
import { useReportStore } from '@/store/useReportStore';

// 🚀 MODIFICACIÓN: Aceptamos previewData en los parámetros del componente
export default function BandRenderer({ band, bandIdx, previewData }: BandRendererProps & { previewData?: any }) {
  const report = useReportStore((state) => state.report);
  const scale = useReportStore((state) => state.scale);
  const updateBandHeight = useReportStore((state) => state.updateBandHeight);
  const saveHistory = useReportStore((state) => state.saveHistory);
  
  const activeBandIdx = useReportStore((state) => state.activeBandIdx);
  const setActiveBandIdx = useReportStore((state) => state.setActiveBandIdx);

  const [isResizing, setIsResizing] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const reportBeforeDrag = useRef<any>(null);

  const isActive = activeBandIdx === bandIdx;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaYPx = (e.clientY - startY.current) / scale;
      const deltaYFru = pxToFru(deltaYPx);
      updateBandHeight(bandIdx, Math.max(0, startHeight.current + deltaYFru));
    };

    const handleMouseUp = () => {
      if (isResizing && reportBeforeDrag.current) {
        saveHistory(reportBeforeDrag.current);
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

  const objetos = band.Objetos || []; 

  const minVPos = band.StartVPos !== undefined 
    ? band.StartVPos 
    : (band.TipoBanda === 'PageHeader' || !band.Objetos || band.Objetos.length === 0 
        ? 0 
        : Math.min(...band.Objetos.map((o: any) => o.VPos || 0)));

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

  let calculatedHeightFru = 0;
  if (report && bandIdx < report.Bandas.length - 1 && nextMinVPos > minVPos) {
    calculatedHeightFru = nextMinVPos - minVPos;
  } else if (objetos.length > 0) {
    const maxBottom = Math.max(...objetos.map(o => (o.VPos || 0) + (o.Height || 0)));
    calculatedHeightFru = maxBottom - minVPos;
  } else {
    calculatedHeightFru = 5000; 
  }

  const activeHeightFru = band.BandHeight !== undefined ? band.BandHeight : calculatedHeightFru;
  const bandHeightPx = Math.max(fruToPx(activeHeightFru), 30);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveBandIdx(bandIdx);
    reportBeforeDrag.current = useReportStore.getState().report;
    startY.current = e.clientY;
    startHeight.current = activeHeightFru;
    setIsResizing(true);
  };

  const bgColors: Record<string, string> = {
    PageHeader: '#f8fafc',
    GroupHeader: '#eff6ff',
    Detail: '#ffffff',
    GroupFooter: '#fefce8',
    PageFooter: '#fef2f2'
  };

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation(); 
        setActiveBandIdx(bandIdx);
      }}
      className={`relative w-full border-b border-dashed overflow-visible group transition-all duration-200 cursor-pointer ${
        isActive 
          ? 'border-blue-500 ring-1 ring-blue-500 ring-inset shadow-[inset_0_0_10px_rgba(59,130,246,0.1)] z-10' 
          : 'border-gray-300 hover:bg-gray-50/50 z-0'
      }`}
      style={{ height: `${bandHeightPx}px`, backgroundColor: bgColors[band.TipoBanda] || '#fff' }}
    >
      <span className={`absolute top-1 right-2 text-[9px] font-mono select-none z-0 pointer-events-none ${isActive ? 'text-blue-500 font-bold' : 'text-gray-400'}`}>
        {band.TipoBanda} {band.AgrupaPor ? `(${band.AgrupaPor})` : ''} N{band.Nivel}
      </span>

      {objetos.map((obj, originalIdx) => (
        <ReportObject 
          key={originalIdx} 
          obj={obj} 
          offsetVPos={minVPos} 
          bandIdx={bandIdx} 
          objIdx={originalIdx} 
          previewData={previewData} 
        />
      ))}

      <div 
        onMouseDown={handleMouseDown}
        className={`absolute bottom-0 left-0 w-full h-[6px] cursor-row-resize z-20 transition-colors ${
          isResizing ? 'bg-blue-500' : 'bg-transparent group-hover:bg-blue-300/60'
        }`}
        style={{ transform: 'translateY(50%)' }}
      />
    </div>
  );
}