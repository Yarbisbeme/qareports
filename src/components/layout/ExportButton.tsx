"use client";

import React from 'react';
import { useReportStore } from '@/store/useReportStore';

export default function ExportButton() {
  const report = useReportStore((state) => state.report);

  const handleExport = () => {
    if (!report) return;

    // Convertir el reporte a JSON legible
    const jsonString = JSON.stringify(report, null, 2);
    
    // Crear el archivo virtual
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Configurar la descarga
    const link = document.createElement('a');
    link.href = url;
    const fileName = `reporte_${report.ReportId || 'editado'}.json`;
    link.download = fileName;
    
    // Ejecutar clic y limpiar memoria
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Si no hay reporte cargado, no mostramos el botón
  if (!report) return null;

  return (
    <button 
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      {/* Icono de descarga nativo (SVG) */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Exportar JSON
    </button>
  );
}