import React, { useRef, useState, useEffect } from 'react';
import { IReportObject, ReportObjectProps } from '@/types/report';
import { fruToPx, pxToFru } from '@/lib/fruConverter'; 
import { useReportStore } from '@/store/useReportStore';

export default function ReportObject({ obj, offsetVPos, bandIdx, objIdx }: ReportObjectProps) {
  const selectedObj = useReportStore((state) => state.selectedObj);
  const setSelectedObj = useReportStore((state) => state.setSelectedObj);
  const updateSelectedObject = useReportStore((state) => state.updateSelectedObject);
  const scale = useReportStore((state) => state.scale);

  const isSelected = selectedObj?.HPos === obj.HPos && selectedObj?.VPos === obj.VPos;
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Memorias síncronas para evitar el "Efecto Bola de Nieve"
  const startMouse = useRef({ x: 0, y: 0 });
  const startMetrics = useRef({ hPos: 0, vPos: 0, width: 0, height: 0 });

  // Iniciar Arrastre
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedObj(obj, bandIdx, objIdx);
    startMouse.current = { x: e.clientX, y: e.clientY };
    startMetrics.current = { hPos: obj.HPos, vPos: obj.VPos, width: obj.Width || 0, height: obj.Height || 0 };
    setIsDragging(true);
  };


  // Iniciar Redimensionamiento
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedObj(obj, bandIdx, objIdx);
    startMouse.current = { x: e.clientX, y: e.clientY };
    startMetrics.current = { hPos: obj.HPos, vPos: obj.VPos, width: obj.Width || 0, height: obj.Height || 0 };
    setIsResizing(true);
  };

  const setSnapLines = useReportStore((state) => state.setSnapLines);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;

      const deltaPxX = (e.clientX - startMouse.current.x) / scale;
      const deltaPxY = (e.clientY - startMouse.current.y) / scale;

      if (isDragging) {
        let intendedHPos = startMetrics.current.hPos + pxToFru(deltaPxX);
        let intendedVPos = startMetrics.current.vPos + pxToFru(deltaPxY);

        // --- MOTOR DE GUÍAS INTELIGENTES ---
        const snapThreshold = 150; 
        const currentReport = useReportStore.getState().report;
        
        let snappedHPos: number | null = null;
        let snappedVPos: number | null = null;

        if (currentReport) {
          let closestH = intendedHPos;
          let closestV = intendedVPos;
          let minDiffH = snapThreshold;
          let minDiffV = snapThreshold;

          // Escaneamos TODOS los objetos de TODAS las bandas
          currentReport.Bandas.forEach((b, bIdx) => {
            b.Objetos.forEach((peer, pIdx) => {
              if (bIdx === bandIdx && pIdx === objIdx) return; // Ignorarnos a nosotros mismos

              // Atracción Horizontal (Para alinear columnas)
              const diffH = Math.abs(intendedHPos - peer.HPos);
              if (diffH < minDiffH) {
                minDiffH = diffH;
                closestH = peer.HPos;
                snappedHPos = peer.HPos; // ¡Imantado X!
              }

              // Atracción Vertical (Solo dentro de la misma banda)
              if (bIdx === bandIdx) {
                const diffV = Math.abs(intendedVPos - peer.VPos);
                if (diffV < minDiffV) {
                  minDiffV = diffV;
                  closestV = peer.VPos;
                  snappedVPos = peer.VPos; // ¡Imantado Y!
                }
              }
            });
          });

          intendedHPos = closestH;
          intendedVPos = closestV;
        }

        // Encendemos las guías visuales en la pantalla
        setSnapLines({ hPos: snappedHPos, vPos: snappedVPos, bandIdx });

        updateSelectedObject({ HPos: intendedHPos, VPos: intendedVPos });

      } else if (isResizing) {
        updateSelectedObject({
          Width: Math.max(10, startMetrics.current.width + pxToFru(deltaPxX)),
          Height: Math.max(10, startMetrics.current.height + pxToFru(deltaPxY))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      // Apagamos las líneas al soltar el ratón
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
  }, [isDragging, isResizing, scale, updateSelectedObject, setSnapLines, bandIdx, objIdx]);
  // Cálculos visuales
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

  // === RENDERIZADOS ESPECÍFICOS ===
  if (isShape) {
    return (
      <div onMouseDown={handleMouseDownDrag}
           className={`absolute border border-gray-400 bg-gray-100/30 cursor-move ${isSelected ? 'ring-2 ring-blue-500 z-50' : ''}`}
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
           className={`absolute cursor-move ${isVertical ? 'border-l border-gray-500' : 'border-t border-gray-500'} ${isSelected ? 'ring-2 ring-blue-500 z-50' : ''}`}
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
           className={`absolute border border-blue-300 bg-blue-50/50 flex items-center justify-center overflow-hidden text-[8px] text-blue-500 font-bold cursor-move ${isSelected ? 'ring-2 ring-blue-500 z-50' : ''}`}
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
        isSelected || isDragging 
          ? 'ring-2 ring-blue-500 bg-blue-100/80 border-blue-400 z-50 shadow-lg scale-[1.02]' 
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