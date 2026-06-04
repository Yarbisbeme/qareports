import React from 'react';
import { useReportStore } from '@/store/useReportStore';
import { fruToPx } from '@/lib/fruConverter';

export default function PropertiesPanel() {
  const selectedObj = useReportStore((state) => state.selectedObj);
  const updateSelectedObject = useReportStore((state) => state.updateSelectedObject);

  if (!selectedObj) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm italic">
        Haz clic sobre cualquier objeto en el lienzo para editar sus propiedades.
      </div>
    );
  }

  // Manejador genérico para los inputs numéricos
  const handleNumberChange = (field: keyof typeof selectedObj, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      updateSelectedObject({ [field]: num });
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2">
        Inspector de Diseño
      </h3>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Tipo:</span>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded border border-gray-200">
          {selectedObj.TipoObj}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 font-medium">Expresión (FRX):</span>
        <div className="p-2 bg-gray-50 border rounded font-mono text-xs text-gray-700 break-all">
          {selectedObj.Expr || '""'}
        </div>
      </div>

      {/* Editor Interactivo */}
      <div className="border rounded-md overflow-hidden bg-white shadow-sm mt-4">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-500 font-semibold">
              <th className="p-2">Propiedad</th>
              <th className="p-2 text-right">FoxPro (FRU)</th>
              <th className="p-2 text-right w-20">PX</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700 font-mono">
            {(['HPos', 'VPos', 'Width', 'Height', 'FontSize'] as const).map((prop) => (
              <tr key={prop} className="hover:bg-blue-50/30 transition-colors">
                <td className="p-2 font-sans text-gray-500">{prop}</td>
                <td className="p-1 text-right">
                  <input 
                    type="number" 
                    value={selectedObj[prop] || 0}
                    onChange={(e) => handleNumberChange(prop, e.target.value)}
                    className="w-full text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white rounded px-1 py-0.5 outline-none font-bold text-gray-800"
                  />
                </td>
                <td className="p-2 text-right text-gray-400">
                  {prop === 'FontSize' ? `${selectedObj.FontSize || 9}pt` : `${fruToPx(selectedObj[prop as keyof typeof selectedObj] as number)}px`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}