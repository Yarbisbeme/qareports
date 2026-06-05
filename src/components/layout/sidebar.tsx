import React, { useState, useEffect, useRef } from 'react';
import { useReportStore } from '@/store/useReportStore';
import QaLinterPanel from '../panels/qaLinterPanel';
import PropertiesPanel from '../panels/propertiesPanel';
import JsonPanel from '../panels/JsonPanel';

export default function Sidebar() {
  const report = useReportStore((state) => state.report);
  const [activeTab, setActiveTab] = useState<'info' | 'qa' | 'json' | 'props'>('info');

  // === ESTADOS Y REFERENCIAS PARA REDIMENSIONAR ===
  // 320px equivale a 'w-80' de Tailwind para mantener tu tamaño inicial
  const [width, setWidth] = useState(320); 
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // === LÓGICA DE REDIMENSIONAMIENTO ===
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      // Límites: mínimo 250px, máximo 800px
      const newWidth = Math.min(Math.max(e.clientX, 250), 800);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('cursor-col-resize', 'select-none');
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('cursor-col-resize', 'select-none');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('cursor-col-resize', 'select-none');
    };
  }, [isResizing]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    // Se quitó 'w-80' y se agregaron 'relative', 'flex-shrink-0' y el 'style'
    <aside 
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className="relative flex-shrink-0 border-r bg-white flex flex-col overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 transition-[width] duration-0"
    >
      {/* Tabs */}
      <div className="flex border-b bg-gray-50 text-xs font-medium text-gray-500">
        <button className={`flex-1 py-3 text-center ${activeTab === 'info' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'hover:bg-gray-100'}`} onClick={() => setActiveTab('info')}>Info</button>
        <button className={`flex-1 py-3 text-center ${activeTab === 'qa' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'hover:bg-gray-100'}`} onClick={() => setActiveTab('qa')}>QA Linter</button>
        <button className={`flex-1 py-3 text-center ${activeTab === 'json' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'hover:bg-gray-100'}`} onClick={() => setActiveTab('json')}>Json</button>
        <button className={`flex-1 py-3 text-center ${activeTab === 'props' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'hover:bg-gray-100'}`} onClick={() => setActiveTab('props')}>Props</button>
      </div>

      {/* Contenido del Panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Metadata del Reporte</h2>
            {!report ? (
              <p className="text-sm text-gray-400 italic">Carga un JSON...</p>
            ) : (
              <div className="space-y-3">
                {/* RENDERIZANDO LA METADATA */}
                <InfoItem 
                  label={report.Metadata?.Company?.Label || "Compañía"} 
                  value={report.Metadata?.Company?.Expr} 
                />
                <InfoItem 
                  label={report.Metadata?.Title?.Label || "Título"} 
                  value={report.Metadata?.Title?.Expr} 
                />
                <InfoItem label="Subtítulo" value={report.Metadata?.Subtitle?.Expr} />
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'qa' && <QaLinterPanel />}
        {activeTab === 'json' && <JsonPanel />}
        {activeTab === 'props' && <PropertiesPanel />}
      </div>

      {/* === MANIJA DE REDIMENSIONAMIENTO === */}
      <div
        onMouseDown={startResizing}
        className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 group hover:bg-blue-400 transition-colors ${
          isResizing ? 'bg-blue-500' : 'bg-transparent'
        }`}
        title="Arrastra para ajustar el ancho"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-0.5 bg-gray-300 group-hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </aside>
  );
}

function InfoItem({ label, value }: { label: string, value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase text-gray-500 font-semibold">{label}</span>
      <span className="text-sm text-gray-800 break-words font-mono bg-gray-50 p-2 rounded border border-gray-100 mt-1">
        {value.replace(/^["']|["']$/g, '')}
      </span>
    </div>
  );
}