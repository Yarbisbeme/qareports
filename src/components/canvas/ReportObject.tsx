import React, { useRef, useState, useEffect } from 'react';
import { ReportObjectProps } from '@/types/report';
import { fruToPx, pxToFru } from '@/lib/fruConverter'; 
import { useReportStore } from '@/store/useReportStore';

export default function ReportObject({ obj, offsetVPos, bandIdx, objIdx }: ReportObjectProps) {
  const selectedIndices = useReportStore((state) => state.selectedIndices);
  const toggleSelection = useReportStore((state) => state.toggleSelection);
  const captureSnapshot = useReportStore((state) => state.captureSnapshot);
  const applySnapshotDelta = useReportStore((state) => state.applySnapshotDelta);
  const setSnapLines = useReportStore((state) => state.setSnapLines);
  const scale = useReportStore((state) => state.scale);

  const isSelected = selectedIndices.some(i => i.bandIdx === bandIdx && i.objIdx === objIdx);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const startMouse = useRef({ x: 0, y: 0 });
  const startMetrics = useRef({ hPos: 0, vPos: 0, width: 0, height: 0 });

  const handleMouseDownDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected || e.ctrlKey || e.shiftKey) {
      toggleSelection(bandIdx, objIdx, e.ctrlKey || e.shiftKey);
    }
    captureSnapshot();
    startMouse.current = { x: e.clientX, y: e.clientY };
    startMetrics.current = { hPos: obj.HPos, vPos: obj.VPos, width: obj.Width || 0, height: obj.Height || 0 };
    setIsDragging(true);
  };

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected || e.ctrlKey || e.shiftKey) toggleSelection(bandIdx, objIdx, e.ctrlKey || e.shiftKey);
    captureSnapshot();
    startMouse.current = { x: e.clientX, y: e.clientY };
    startMetrics.current = { hPos: obj.HPos, vPos: obj.VPos, width: obj.Width || 0, height: obj.Height || 0 };
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;

      const deltaPxX = (e.clientX - startMouse.current.x) / scale;
      const deltaPxY = (e.clientY - startMouse.current.y) / scale;
      
      const rawDeltaFruX = pxToFru(deltaPxX);
      const rawDeltaFruY = pxToFru(deltaPxY);

      const snapThreshold = 150; 
      const currentReport = useReportStore.getState().report;
      let snappedHPos: number | null = null;
      let snappedVPos: number | null = null;

      // ==========================================
      // 1. MODO ARRASTRE (Movimiento de Izquierda/Arriba)
      // ==========================================
      if (isDragging) {
        let intendedHPos = startMetrics.current.hPos + rawDeltaFruX;
        let intendedVPos = startMetrics.current.vPos + rawDeltaFruY;

        if (currentReport) {
          let closestH = intendedHPos;
          let closestV = intendedVPos;
          let minDiffH = snapThreshold;
          let minDiffV = snapThreshold;

          currentReport.Bandas.forEach((b, bIdx) => {
            b.Objetos.forEach((peer, pIdx) => {
              const peerIsSelected = useReportStore.getState().selectedIndices.some(sel => sel.bandIdx === bIdx && sel.objIdx === pIdx);
              if (peerIsSelected) return; 

              // Imán Horizontal: Busca alinear con bordes izq y der
              const peerEdgesH = [peer.HPos, peer.HPos + (peer.Width || 0)];
              peerEdgesH.forEach(edge => {
                const diffH = Math.abs(intendedHPos - edge);
                if (diffH < minDiffH) {
                  minDiffH = diffH;
                  closestH = edge;
                  snappedHPos = edge;
                }
              });

              // Imán Vertical
              if (bIdx === bandIdx) {
                const peerEdgesV = [peer.VPos, peer.VPos + (peer.Height || 0)];
                peerEdgesV.forEach(edge => {
                  const diffV = Math.abs(intendedVPos - edge);
                  if (diffV < minDiffV) {
                    minDiffV = diffV;
                    closestV = edge;
                    snappedVPos = edge;
                  }
                });
              }
            });
          });

          intendedHPos = closestH;
          intendedVPos = closestV;
        }

        setSnapLines({ hPos: snappedHPos, vPos: snappedVPos, bandIdx });
        const finalDeltaX = intendedHPos - startMetrics.current.hPos;
        const finalDeltaY = intendedVPos - startMetrics.current.vPos;
        applySnapshotDelta(finalDeltaX, finalDeltaY, false);

      // ==========================================
      // 2. MODO REDIMENSIONAMIENTO (Movimiento de Derecha/Abajo)
      // ==========================================
      } else if (isResizing) {
        let intendedWidth = Math.max(10, startMetrics.current.width + rawDeltaFruX);
        let intendedHeight = Math.max(10, startMetrics.current.height + rawDeltaFruY);

        // En resize, lo que queremos alinear es el borde DERECHO y el borde INFERIOR
        let intendedRightEdge = startMetrics.current.hPos + intendedWidth;
        let intendedBottomEdge = startMetrics.current.vPos + intendedHeight;

        if (currentReport) {
          let closestRight = intendedRightEdge;
          let closestBottom = intendedBottomEdge;
          let minDiffH = snapThreshold;
          let minDiffV = snapThreshold;

          currentReport.Bandas.forEach((b, bIdx) => {
            b.Objetos.forEach((peer, pIdx) => {
              const peerIsSelected = useReportStore.getState().selectedIndices.some(sel => sel.bandIdx === bIdx && sel.objIdx === pIdx);
              if (peerIsSelected) return; 

              // Imán Horizontal: ¿Se alinea mi borde derecho con algo?
              const peerEdgesH = [peer.HPos, peer.HPos + (peer.Width || 0)];
              peerEdgesH.forEach(edge => {
                const diffH = Math.abs(intendedRightEdge - edge);
                if (diffH < minDiffH) {
                  minDiffH = diffH;
                  closestRight = edge;
                  snappedHPos = edge; // Dibuja la línea donde hizo el "snap"
                }
              });

              // Imán Vertical: ¿Se alinea mi borde inferior con algo?
              if (bIdx === bandIdx) {
                const peerEdgesV = [peer.VPos, peer.VPos + (peer.Height || 0)];
                peerEdgesV.forEach(edge => {
                  const diffV = Math.abs(intendedBottomEdge - edge);
                  if (diffV < minDiffV) {
                    minDiffV = diffV;
                    closestBottom = edge;
                    snappedVPos = edge;
                  }
                });
              }
            });
          });

          // Re-calculamos el Width/Height final basado en si hubo imán o no
          intendedWidth = Math.max(10, closestRight - startMetrics.current.hPos);
          intendedHeight = Math.max(10, closestBottom - startMetrics.current.vPos);
        }

        setSnapLines({ hPos: snappedHPos, vPos: snappedVPos, bandIdx });
        const finalDeltaW = intendedWidth - startMetrics.current.width;
        const finalDeltaH = intendedHeight - startMetrics.current.height;
        applySnapshotDelta(finalDeltaW, finalDeltaH, true);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setSnapLines({ hPos: null, vPos: null, bandIdx: null });
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, scale, applySnapshotDelta, setSnapLines, bandIdx, objIdx]);

  // Cálculos de renderizado
  const top = fruToPx(obj.VPos) - fruToPx(offsetVPos);
  const left = fruToPx(obj.HPos);
  const rawWidth = fruToPx(obj.Width || 0);
  const rawHeight = fruToPx(obj.Height || 0);

  const isField = obj.TipoObj === "Field";
  const isShape = obj.TipoObj === "Shape";
  const isLine = obj.TipoObj === "Line";
  const isPicture = obj.TipoObj === "Picture";
  const isGraphic = isShape || isLine || isPicture;

  const width = isGraphic ? rawWidth : Math.max(rawWidth, 6);
  const height = isGraphic ? rawHeight : Math.max(rawHeight, 14);

  if (isShape) {
    return (
      <div onMouseDown={handleMouseDownDrag}
           className={`absolute border border-gray-400 bg-gray-100/30 cursor-move ${isSelected ? 'ring-2 ring-blue-500 z-40' : ''}`}
           style={{ top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px` }}>
        {isSelected && (
           <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 border border-white cursor-nwse-resize z-50 rounded-sm"
                onMouseDown={handleMouseDownResize} />
        )}
      </div>
    );
  }

  if (isLine) {
    const isVertical = rawWidth <= 2; 
    return (
      <div onMouseDown={handleMouseDownDrag}
           className={`absolute cursor-move ${isVertical ? 'border-l border-gray-500' : 'border-t border-gray-500'} ${isSelected ? 'ring-2 ring-blue-500 z-40' : ''}`}
           style={{ top: `${top}px`, left: `${left}px`, width: isVertical ? '1px' : `${width}px`, height: isVertical ? `${height}px` : '1px' }}>
        {isSelected && (
           <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 border border-white cursor-nwse-resize z-50 rounded-sm"
                onMouseDown={handleMouseDownResize} />
        )}
      </div>
    );
  }

  if (isPicture) {
    return (
      <div onMouseDown={handleMouseDownDrag}
           className={`absolute border border-blue-300 bg-blue-50/50 flex items-center justify-center overflow-hidden text-[8px] text-blue-500 font-bold cursor-move ${isSelected ? 'ring-2 ring-blue-500 z-40' : ''}`}
           style={{ top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px` }}>
        [IMG: {obj.Name || 'Logo'}]
        {isSelected && (
           <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 border border-white cursor-nwse-resize z-50 rounded-sm"
                onMouseDown={handleMouseDownResize} />
        )}
      </div>
    );
  }

  return (
    <div 
      onMouseDown={handleMouseDownDrag}
      className={`absolute flex items-center px-1 font-mono tracking-tight overflow-hidden cursor-move select-none border transition-colors ${
        isSelected
          ? 'ring-2 ring-blue-500 bg-blue-100/80 border-blue-400 z-40 shadow-lg scale-[1.02]' 
          : isField
            ? 'bg-blue-50/60 border-blue-200 text-blue-800' 
            : 'bg-transparent border-transparent text-gray-900 hover:border-gray-300'
      }`}
      style={{ top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px`, fontSize: `${obj.FontSize || 9}pt` }}
    >
      {obj.Expr ? obj.Expr.replace(/['"]/g, '') : <span className="opacity-30">vacío</span>}

      {isSelected && (
        <div 
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 border border-white cursor-nwse-resize z-50 rounded-sm"
          onMouseDown={handleMouseDownResize}
        />
      )}
    </div>
  );
}