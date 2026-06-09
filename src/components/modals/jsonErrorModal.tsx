import React from 'react';

interface JsonErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  missingKeys?: string[];
  exampleCode?: string;
}

export default function JsonErrorModal({
  isOpen,
  onClose,
  title = "Estructura JSON Inválida",
  message,
  missingKeys = [],
  exampleCode
}: JsonErrorModalProps) {
  
  if (!isOpen) return null;

  // Ejemplo por defecto (FoxPro Report) si no se pasa uno personalizado
  const defaultExample = `{
  "ReportId": "repo_001",
  "Tipo": "Tabular",
  "Metadata": {
    "Title": { "Expr": "\\"TITULO\\"", "VPos": 0, "HPos": 0 }
  },
  "VariablesSistema": [],
  "Bandas": [
    {
      "TipoBanda": "Detail",
      "Nivel": 0,
      "Objetos": []
    }
  ]
}`;

  const displayCode = exampleCode || defaultExample;

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-lg w-full border-t-4 border-red-500 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>

        {/* Solo renderiza la caja de llaves faltantes si el array tiene elementos */}
        {missingKeys.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3 mb-4 border border-red-100">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider block mb-1">
              Llaves Faltantes / Errores:
            </span>
            <ul className="list-disc list-inside text-sm text-red-700 pl-4">
              {missingKeys.map(k => <li key={k} className="font-mono">{k}</li>)}
            </ul>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto text-left shadow-inner">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 block border-b border-gray-700 pb-1">
            Ejemplo Estructura Requerida:
          </span>
          <pre className="text-[12px] font-mono leading-tight text-green-400">
            {displayCode}
          </pre>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}