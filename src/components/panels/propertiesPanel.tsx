import React from 'react';
import { useReportStore } from '@/store/useReportStore';
import { fruToPx } from '@/lib/fruConverter';

export default function PropertiesPanel() {
  const selectedIndices = useReportStore((state) => state.selectedIndices);
  const report = useReportStore((state) => state.report);
  const updateSelectedObjects = useReportStore((state) => state.updateSelectedObjects);

  if (selectedIndices.length === 0 || !report) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm italic">
        Haz clic sobre un objeto o usa Ctrl+Clic para selección múltiple.
      </div>
    );
  }

  if (selectedIndices.length > 1) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Selección Múltiple</h3>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-center text-blue-800 font-medium">
          {selectedIndices.length} objetos seleccionados
        </div>
      </div>
    );
  }

  // === MAGIA UNIVERSAL: Buscamos el objeto dependiendo de su tipo ===
  const sel = selectedIndices[0];
  let selectedObj: any = null;

  if (sel.type === 'band') {
    selectedObj = report.Bandas[sel.bandIdx!].Objetos[sel.objIdx!];
  } else if (sel.type === 'meta') {
    selectedObj = report.Metadata[sel.metaKey!];
  } else if (sel.type === 'sysvar') {
    selectedObj = report.VariablesSistema[sel.sysIdx!];
  }

  if (!selectedObj) return null;

  const handleNumberChange = (field: string, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) updateSelectedObjects({ [field]: num });
  };

  const handleTextChange = (field: string, value: string) => {
    updateSelectedObjects({ [field]: value });
  };

  return (
    <div className="space-y-4 animate-fadeIn p-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2">
        Inspector de Diseño
      </h3>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-medium">Tipo:</span>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded border border-gray-200">
          {sel.type === 'band' ? selectedObj.TipoObj : sel.type === 'meta' ? `Metadata (${sel.metaKey})` : 'Variable Sistema'}
        </span>
      </div>

      <div className="space-y-3 bg-white p-3 rounded-md border shadow-sm">
        {/* === NUEVO: CAMPO LABEL === */}
        {/* Lo mostramos si el objeto ya tiene Label, o si es explícitamente una Variable de Sistema */}
        {(selectedObj.Label !== undefined || sel.type === 'sysvar') && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-blue-600 font-bold tracking-wide">Etiqueta (Label):</span>
            <input 
              type="text" 
              value={selectedObj.Label || ''}
              onChange={(e) => handleTextChange('Label', e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded font-mono text-xs text-gray-700 focus:border-blue-500 focus:bg-white outline-none transition-colors"
              placeholder="Ej: Página :"
            />
          </div>
        )}

        {/* CAMPO EXPR ORIGINAL */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 font-bold tracking-wide">Expresión (Expr):</span>
          <textarea 
            rows={2}
            value={selectedObj.Expr || ''}
            onChange={(e) => handleTextChange('Expr', e.target.value)}
            className="w-full p-2 bg-gray-50 border border-gray-200 rounded font-mono text-xs text-gray-700 focus:border-blue-500 focus:bg-white outline-none transition-colors resize-none"
            placeholder="Ej: str(_pageno)"
          />
        </div>
      </div>

      {/* TABLA DE PROPIEDADES NUMÉRICAS */}
      <div className="border rounded-md overflow-hidden bg-white shadow-sm mt-4">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-500 font-semibold">
              <th className="p-2">Propiedad</th>
              <th className="p-2 text-right">Valor (FRU)</th>
              <th className="p-2 text-right w-16">PX</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700 font-mono">
            {(['HPos', 'VPos', 'Width', 'Height', 'FontSize'] as const).map((prop) => {
              if (selectedObj[prop] === undefined && (prop === 'Width' || prop === 'Height')) return null;

              return (
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}