import React from 'react';
import { IReportObject } from '@/types/report';
import { fruToPx } from '@/lib/fruConverter';
import { useReportStore } from '@/store/useReportStore';

interface ReportObjectProps {
  obj: IReportObject;
  offsetVPos: number; // Recibimos el techo de la banda
}

export default function ReportObject({ obj, offsetVPos }: ReportObjectProps) {
  const selectedObj = useReportStore((state) => state.selectedObj);
  const setSelectedObj = useReportStore((state) => state.setSelectedObj);

  // 1. Calculamos la posición base
  const top = fruToPx(obj.VPos) - fruToPx(offsetVPos);
  const left = fruToPx(obj.HPos);
  
  // 2. Obtenemos las medidas en píxeles crudos
  const rawWidth = fruToPx(obj.Width || 0);
  const rawHeight = fruToPx(obj.Height || 0);

  // 3. Variables de tipo para limpiar el código
  const isField = obj.TipoObj === "Field";
  const isShape = obj.TipoObj === "Shape";
  const isLine = obj.TipoObj === "Line";
  const isGraphic = isShape || isLine;

  // 4. SOLO forzamos tamaño mínimo en textos, NO en gráficos
  const width = isGraphic ? rawWidth : Math.max(rawWidth, 6);
  const height = isGraphic ? rawHeight : Math.max(rawHeight, 14);

  const isSelected = selectedObj?.HPos === obj.HPos && selectedObj?.VPos === obj.VPos;

  // ==========================================
  // RENDER: RECTÁNGULOS (SHAPES)
  // ==========================================
  if (isShape) {
    return (
      <div 
        className="absolute border border-gray-400 bg-gray-100/30 pointer-events-none"
        style={{ top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px` }}
      />
    );
  }

  // ==========================================
  // RENDER: LÍNEAS (Detectando si son V o H)
  // ==========================================
  if (isLine) {
    // Si el ancho original es casi 0, es una línea vertical
    const isVertical = rawWidth <= 2; 
    
    return (
      <div 
        className={`absolute pointer-events-none ${isVertical ? 'border-l border-gray-500' : 'border-t border-gray-500'}`}
        style={{ 
          top: `${top}px`, 
          left: `${left}px`, 
          width: isVertical ? '1px' : `${width}px`, 
          height: isVertical ? `${height}px` : '1px' 
        }}
      />
    );
  }

  // ==========================================
  // RENDER: TEXTOS Y CAMPOS (LABEL / FIELD)
  // ==========================================
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation(); 
        setSelectedObj(obj);
      }}
      className={`absolute flex items-center px-1 text-[10px] font-mono tracking-tight overflow-hidden cursor-pointer border transition-all z-10 ${
        isSelected 
          ? 'ring-2 ring-blue-500 bg-blue-100 border-blue-400 text-blue-900 z-50 shadow-md scale-[1.02]' 
          : isField
            ? 'bg-blue-50/60 border-blue-200 text-blue-800 hover:border-blue-400' 
            : 'bg-transparent border-transparent text-gray-900 font-semibold hover:border-gray-300'
      }`}
      style={{ top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px` }}
      title={`[${obj.TipoObj}] HPos:${obj.HPos} VPos:${obj.VPos}`}
    >
      {obj.Expr ? obj.Expr.replace(/['"]/g, '') : <span className="opacity-30">vacío</span>}
    </div>
  );
}