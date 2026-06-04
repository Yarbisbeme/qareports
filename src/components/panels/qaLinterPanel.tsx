// src/components/panels/QaLinterPanel.tsx
import React from 'react';
import { useReportStore } from '@/store/useReportStore';
import { runQaLinter, QaWarning } from '@/lib/qaRules';

export default function QaLinterPanel() {
  const report = useReportStore((state) => state.report);
  const warnings = runQaLinter(report);

  if (!report) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm italic">
        Carga un JSON para correr auditorías de diseño.
      </div>
    );
  }

  if (warnings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-green-600 bg-green-50/50 rounded-lg border border-green-100 p-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wider">Reporte Limpio</span>
        <p className="text-xs text-green-700/80 mt-1">No se detectaron colisiones de campos ni pérdidas de desborde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Problemas Detectados
        </h3>
        <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[10px] rounded-full">
          {warnings.length}
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
        {warnings.map((warn) => (
          <div 
            key={warn.id}
            className={`p-3 rounded-lg border text-xs shadow-sm transition-all hover:scale-[1.01] ${
              warn.severidad === 'error' 
                ? 'bg-red-50/70 border-red-200 text-red-900' 
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex justify-between font-semibold text-[10px] uppercase tracking-wide opacity-75 mb-1">
              <span>{warn.banda || 'Global'}</span>
              <span className={warn.severidad === 'error' ? 'text-red-600' : 'text-amber-600'}>
                {warn.severidad}
              </span>
            </div>
            <p className="font-medium leading-relaxed">{warn.mensaje}</p>
          </div>
        ))}
      </div>
    </div>
  );
}