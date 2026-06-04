// src/components/panels/PropertiesPanel.tsx
import React from 'react';
import { useReportStore } from '@/store/useReportStore';
import { fruToPx } from '@/lib/fruConverter';

export default function PropertiesPanel() {
  const selectedObj = useReportStore((state) => state.selectedObj);

  if (!selectedObj) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm italic">
        Haz clic sobre cualquier objeto en el lienzo para inspeccionar sus coordenadas de diseño.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2">
        Geometría del Objeto
      </h3>

      {/* Tipo de Objeto Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Tipo:</span>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded border border-gray-200">
          {selectedObj.TipoObj}
        </span>
      </div>

      {/* Expresión original */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 font-medium">Expresión (FRX):</span>
        <div className="p-2 bg-gray-50 border rounded font-mono text-xs text-gray-700 break-all select-all">
          {selectedObj.Expr || '""'}
        </div>
      </div>

      {/* Tabla de coordenadas FRU vs PX */}
      <div className="border rounded-md overflow-hidden bg-white shadow-sm mt-4">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-500 font-semibold">
              <th className="p-2">Propiedad</th>
              <th className="p-2 text-right">FoxPro (FRU)</th>
              <th className="p-2 text-right">Pantalla (PX)</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700 font-mono">
            <tr>
              <td className="p-2 font-sans text-gray-500">HPos (X)</td>
              <td className="p-2 text-right">{selectedObj.HPos}</td>
              <td className="p-2 text-right text-blue-600">{fruToPx(selectedObj.HPos)}px</td>
            </tr>
            <tr>
              <td className="p-2 font-sans text-gray-500">VPos (Y)</td>
              <td className="p-2 text-right">{selectedObj.VPos}</td>
              <td className="p-2 text-right text-blue-600">{fruToPx(selectedObj.VPos)}px</td>
            </tr>
            <tr>
              <td className="p-2 font-sans text-gray-500">Width</td>
              <td className="p-2 text-right">{selectedObj.Width || 0}</td>
              <td className="p-2 text-right text-blue-600">{fruToPx(selectedObj.Width)}px</td>
            </tr>
            <tr>
              <td className="p-2 font-sans text-gray-500">Height</td>
              <td className="p-2 text-right">{selectedObj.Height || 0}</td>
              <td className="p-2 text-right text-blue-600">{fruToPx(selectedObj.Height)}px</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}