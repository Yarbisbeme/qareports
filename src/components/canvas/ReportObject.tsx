import React, { useEffect, useState, useRef } from 'react';
import { FoxProReport, ReportObjectProps, SelectionItem } from '@/types/report';
import { fruToPx, pxToFru } from '@/lib/fruConverter'; 
import { useReportStore } from '@/store/useReportStore';

// 🚀 MODIFICACIÓN: Agregamos pageNo a las props extendidas
export default function ReportObject({ 
  obj, 
  offsetVPos, 
  bandIdx, 
  objIdx, 
  type = 'band', 
  metaKey, 
  sysIdx, 
  customClass, 
  previewData,
  pageNo = 1 // 👈 Valor por defecto 1
}: ReportObjectProps & { previewData?: any; pageNo?: number }) {
  
  const selectedIndices = useReportStore((state) => state.selectedIndices);
  const toggleSelection = useReportStore((state) => state.toggleSelection);
  const captureSnapshot = useReportStore((state) => state.captureSnapshot);
  const applySnapshotDelta = useReportStore((state) => state.applySnapshotDelta);
  const setSnapLines = useReportStore((state) => state.setSnapLines);
  const scale = useReportStore((state) => state.scale);

  const selItem: SelectionItem = { type, bandIdx, objIdx, metaKey, sysIdx };

  const isSelected = selectedIndices.some(s => 
    s.type === type && s.bandIdx === bandIdx && s.objIdx === objIdx && s.metaKey === metaKey && s.sysIdx === sysIdx
  );
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeCursor, setActiveCursor] = useState('move');

  const startMouse = useRef({ x: 0, y: 0 });
  const startMetrics = useRef({ hPos: 0, vPos: 0, width: 0, height: 0 });
  const snapEdges = useRef<{ h: number[], v: number[] }>({ h: [], v: [] });
  const reportBeforeDrag = useRef<FoxProReport | null>(null);
  const saveHistory = useReportStore((state) => state.saveHistory);

  const updateCursorType = (e: React.MouseEvent) => {
    if (!isSelected) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const buffer = 10; 
    
    const nearRight = Math.abs(e.clientX - rect.right) < buffer;
    const nearBottom = Math.abs(e.clientY - rect.bottom) < buffer;

    if (nearRight && nearBottom) setActiveCursor('nwse-resize');
    else if (nearRight) setActiveCursor('ew-resize');
    else if (nearBottom) setActiveCursor('ns-resize');
    else setActiveCursor('move');
  };

  const populateSnapEdges = () => {
    const report = useReportStore.getState().report;
    const selected = useReportStore.getState().selectedIndices;
    const h = new Set<number>();
    const v = new Set<number>();

    if (!report) return;

    const addEdges = (o: any, isSel: boolean) => {
      if (isSel || !o) return;
      if (o.HPos !== undefined) h.add(o.HPos);
      if (o.HPos !== undefined && o.Width) h.add(o.HPos + o.Width);
      if (o.VPos !== undefined) v.add(o.VPos);
      if (o.VPos !== undefined && o.Height) v.add(o.VPos + o.Height);
    };

    report.Bandas.forEach((b, bI) => b.Objetos.forEach((o, oI) => addEdges(o, selected.some(s => s.type === 'band' && s.bandIdx === bI && s.objIdx === oI))));
    if (report.Metadata) ['Company', 'Title', 'Subtitle'].forEach(k => {
      const m = report.Metadata[k as keyof typeof report.Metadata];
      if (m && m.VPos >= 0) addEdges(m, selected.some(s => s.type === 'meta' && s.metaKey === k));
    });
    if (report.VariablesSistema) report.VariablesSistema.forEach((sv, svI) => addEdges(sv, selected.some(s => s.type === 'sysvar' && s.sysIdx === svI)));

    snapEdges.current = { h: Array.from(h), v: Array.from(v) };
  };

  const handleMouseDownDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected || e.ctrlKey || e.shiftKey) toggleSelection(selItem, e.ctrlKey || e.shiftKey);
    captureSnapshot();
    populateSnapEdges();
    reportBeforeDrag.current = useReportStore.getState().report;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startMetrics.current = { hPos: obj.HPos, vPos: obj.VPos, width: obj.Width || 0, height: obj.Height || 0 };
    setIsDragging(true);
    setIsResizing(false);
  };
  
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected || e.ctrlKey || e.shiftKey) toggleSelection(selItem, e.ctrlKey || e.shiftKey);
    captureSnapshot();
    populateSnapEdges();
    reportBeforeDrag.current = useReportStore.getState().report;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startMetrics.current = { hPos: obj.HPos, vPos: obj.VPos, width: obj.Width || 0, height: obj.Height || 0 };
    setIsDragging(false);
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;
      const rawDeltaFruX = pxToFru((e.clientX - startMouse.current.x) / scale);
      const rawDeltaFruY = pxToFru((e.clientY - startMouse.current.y) / scale);
      
      const snapThreshold = 150;
      let snappedHPos: number | null = null;
      let snappedVPos: number | null = null;

      if (isDragging) {
        let intendedHPos = startMetrics.current.hPos + rawDeltaFruX;
        let intendedVPos = startMetrics.current.vPos + rawDeltaFruY;

        let closestH = intendedHPos, minDiffH = snapThreshold;
        snapEdges.current.h.forEach(edge => {
          const diffL = Math.abs(intendedHPos - edge);
          if (diffL < minDiffH) { minDiffH = diffL; closestH = edge; snappedHPos = edge; }
          const diffR = Math.abs((intendedHPos + startMetrics.current.width) - edge);
          if (diffR < minDiffH) { minDiffH = diffR; closestH = edge - startMetrics.current.width; snappedHPos = edge; }
        });

        let closestV = intendedVPos, minDiffV = snapThreshold;
        snapEdges.current.v.forEach(edge => {
          const diffT = Math.abs(intendedVPos - edge);
          if (diffT < minDiffV) { minDiffV = diffT; closestV = edge; snappedVPos = edge; }
          const diffB = Math.abs((intendedVPos + startMetrics.current.height) - edge);
          if (diffB < minDiffV) { minDiffV = diffB; closestV = edge - startMetrics.current.height; snappedVPos = edge; }
        });

        setSnapLines({ hPos: snappedHPos, vPos: snappedVPos, bandIdx: null });
        applySnapshotDelta(closestH - startMetrics.current.hPos, closestV - startMetrics.current.vPos, false);
      } 
      else if (isResizing) {
        let intendedWidth = Math.max(10, startMetrics.current.width + rawDeltaFruX);
        let intendedHeight = Math.max(10, startMetrics.current.height + rawDeltaFruY);

        let rightEdge = startMetrics.current.hPos + intendedWidth;
        let bottomEdge = startMetrics.current.vPos + intendedHeight;

        let minDiffH = snapThreshold;
        snapEdges.current.h.forEach(edge => {
          const diff = Math.abs(rightEdge - edge);
          if (diff < minDiffH) { minDiffH = diff; rightEdge = edge; snappedHPos = edge; }
        });

        let minDiffV = snapThreshold;
        snapEdges.current.v.forEach(edge => {
          const diff = Math.abs(bottomEdge - edge);
          if (diff < minDiffV) { minDiffV = diff; bottomEdge = edge; snappedVPos = edge; }
        });

        setSnapLines({ hPos: snappedHPos, vPos: snappedVPos, bandIdx: null });
        applySnapshotDelta((rightEdge - startMetrics.current.hPos) - startMetrics.current.width, (bottomEdge - startMetrics.current.vPos) - startMetrics.current.height, true);
      }
    };

    const handleMouseUp = () => {
      if ((isDragging || isResizing) && reportBeforeDrag.current) saveHistory(reportBeforeDrag.current);
      setIsDragging(false);
      setIsResizing(false);
      setSnapLines({ hPos: null, vPos: null, bandIdx: null });
    };

    if (isDragging || isResizing) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, isResizing, scale, applySnapshotDelta, setSnapLines, saveHistory]);

  const top = fruToPx(obj.VPos) - fruToPx(offsetVPos);
  const left = fruToPx(obj.HPos);
  const width = obj.Width ? fruToPx(obj.Width) : undefined;
  const height = obj.Height ? fruToPx(obj.Height) : undefined;

  const baseStyle: React.CSSProperties = { 
    top: `${top}px`, 
    left: `${left}px`, 
    width, 
    height, 
    fontSize: `${obj.FontSize || 9}pt`,
    lineHeight: 1, 
    padding: 0 
  };

  if (obj.TipoObj === "Shape" || obj.TipoObj === "Line" || obj.TipoObj === "Picture") {
    return (
      <div 
        onMouseMove={updateCursorType}
        onMouseDown={(e) => activeCursor.includes('resize') ? handleMouseDownResize(e) : handleMouseDownDrag(e)} 
        className={`absolute border ${isSelected ? 'ring-2 ring-blue-500 z-40' : 'border-gray-400 bg-gray-100/30'} z-20`} 
        style={{...baseStyle, cursor: isSelected ? activeCursor : 'move'}}
      >
        {obj.TipoObj === "Picture" && <span className="text-[8px] text-blue-500 flex justify-center items-center h-full">[IMG]</span>}
        {isSelected && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 cursor-nwse-resize z-50 rounded-sm" onMouseDown={handleMouseDownResize} />}
      </div>
    );
  }

  // === PROCESAMIENTO DE TEXTO (MODIFICADO) ===
  let textToRender = obj.Expr ? obj.Expr.replace(/^["']|["']$/g, '').trim() : '';

  if (obj.TipoObj === 'Label') {
    textToRender = obj.Label ? obj.Label.replace(/['"]/g, '') : textToRender;
  } 
  else if (previewData && (obj.TipoObj === 'Field' || obj.TipoObj === 'sysvar' || type === 'sysvar')) {
    // 🚀 Pasamos la configuración de la página actual al traductor
    const { evaluateFoxProExpr } = require('@/lib/dataSimulator');
    textToRender = evaluateFoxProExpr(obj.Expr || '', previewData, { pageNo });
  }

  return (
    <div 
      onMouseMove={updateCursorType}
      onMouseDown={(e) => {
        if (activeCursor.includes('resize')) {
          handleMouseDownResize(e); 
        } else {
          handleMouseDownDrag(e);
        }
      }}
      className={`absolute flex items-center overflow-hidden whitespace-nowrap font-mono tracking-tight select-none border transition-colors ${
        isSelected 
          ? 'ring-2 ring-blue-500 bg-blue-100/80 z-40 shadow-lg scale-[1.01]' 
          : customClass ? customClass : (obj.TipoObj === "Field" ? 'bg-blue-50/60 border-blue-200 text-blue-800' : 'bg-transparent border-transparent text-gray-900 hover:border-gray-300')
      } z-20`}
      style={{
        ...baseStyle,
        cursor: isSelected ? activeCursor : 'move'
      }}
    >
      {/* 🚀 Limpieza automática de las dobles comillas repetidas del JSON nativo */}
      {obj.Label && (
        <span className="font-bold mr-1">
          {obj.Label.replace(/^"+|"+$/g, '').replace(/['"]/g, '').trim()}
        </span>
      )}
      
      {textToRender ? textToRender : <span className="opacity-30">vacío</span>}
      
      {isSelected && <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 cursor-nwse-resize z-50" onMouseDown={handleMouseDownResize} />}
    </div>
  );
}