import React, { useEffect, useState, useRef } from 'react';
import { useReportStore } from '@/store/useReportStore';
import { fruToPx, pxToFru } from '@/lib/fruConverter';
import { SelectionItem } from '@/types/report';
import BandRenderer from './BandRenderer';
import ReportObject from './ReportObject';


export default function ReportCanvas() {
  const report = useReportStore((state) => state.report);
  const scale = useReportStore((state) => state.scale);
  const snapLines = useReportStore((state) => state.snapLines);

  const deleteSelected = useReportStore((state) => state.deleteSelected);
  const undo = useReportStore((state) => state.undo);
  const redo = useReportStore((state) => state.redo);
  const nudgeSelected = useReportStore((state) => state.nudgeSelected);
  const selectedIndices = useReportStore((state) => state.selectedIndices);
  const setSelections = useReportStore((state) => state.setSelections);
  const setScale = useReportStore((state) => state.setScale); 
  
  const createNewReport = useReportStore((state) => state.createNewReport);
  const addObject = useReportStore((state) => state.addObject);
  const addBand = useReportStore((state) => state.addBand);
  const [isBandMenuOpen, setIsBandMenuOpen] = useState(false);
  const bandMenuRef = useRef<HTMLDivElement>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [pendingGroupType, setPendingGroupType] = useState('');
  const [groupVariable, setGroupVariable] = useState('');
  const setActiveBandIdx = useReportStore((state) => state.setActiveBandIdx);

  // === ESTADOS Y REFS ===
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); 
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, currentX: number, currentY: number} | null>(null);

  // === ESTADOS PARA EL PANEO (DESPLAZAMIENTO) ===
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const zoomIn = () => setScale(Math.min(3, scale + 0.1));
  const zoomOut = () => setScale(Math.max(0.2, scale - 0.1));
  const zoomReset = () => setScale(1);

  // Este efecto cierra el menú si haces clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bandMenuRef.current && !bandMenuRef.current.contains(event.target as Node)) {
        setIsBandMenuOpen(false);
      }
    };

    if (isBandMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBandMenuOpen]);

  const handleAddBand = (tipoBanda: string) => {
    if (tipoBanda.includes('Group')) {
      setPendingGroupType(tipoBanda);
      setGroupVariable('');
      setIsGroupModalOpen(true);
      setIsBandMenuOpen(false); // Cerramos el menú desplegable
    } else {
      addBand(tipoBanda, "");
      setIsBandMenuOpen(false);
    }
  };

  // Esta función se llamará cuando el usuario haga clic en "Aceptar" en el modal
  const confirmGroupBand = () => {
    addBand(pendingGroupType, groupVariable);
    setIsGroupModalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.code === 'Space') {
        e.preventDefault(); 
        setIsSpacePressed(true);
        return;
      }

      const NUDGE_STEP = e.shiftKey ? 1000 : 100;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault(); 
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'ArrowUp') { e.preventDefault(); nudgeSelected(0, -NUDGE_STEP); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); nudgeSelected(0, NUDGE_STEP); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeSelected(-NUDGE_STEP, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nudgeSelected(NUDGE_STEP, 0); }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [deleteSelected, undo, redo, nudgeSelected]);

  // === EFECTO 2: ZOOM DIRECTO AL RATÓN ===
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); 
        const canvas = canvasRef.current;
        if (!canvas) return;

        const currentScale = useReportStore.getState().scale;
        const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1; 
        const newScale = Math.min(Math.max(0.2, currentScale + zoomDelta), 3);
        
        if (newScale === currentScale) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const ratio = newScale / currentScale;
        const dx = (mouseX * ratio) - mouseX;
        const dy = (mouseY * ratio) - mouseY;

        useReportStore.getState().setScale(newScale);

        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollLeft += dx;
            containerRef.current.scrollTop += dy;
          }
        }, 0);
      }
    };

    container.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelZoom);
  }, [report]);

  if (!report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">🦊 FoxPro Report Editor</h2>
          <p className="text-gray-500">Comienza tu flujo de trabajo de migración:</p>
          <div className="flex gap-4 justify-center pt-4">
            <button 
              onClick={createNewReport}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-md transition-all"
            >
              Crear Nuevo Reporte
            </button>
            <label className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 cursor-pointer transition-all">
              Cargar JSON existente
              <input type="file" className="hidden" onChange={(e) => {/* lógica de carga aquí */}} />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // === NUEVA LÓGICA DE LIENZO INFINITO (TAMAÑO DINÁMICO) ===
  // =========================================================================
  let maxRightFru = 0;

  // Función para registrar el punto más a la derecha del reporte
  const checkRightEdge = (obj: any) => {
    if (!obj || obj.HPos === undefined) return;
    // Si no tiene Width, inferimos su tamaño en base a su texto
    const estimatedWidth = obj.Width || (obj.Expr ? obj.Expr.length * 100 : 2000);
    const rightEdge = obj.HPos + estimatedWidth;
    if (rightEdge > maxRightFru) maxRightFru = rightEdge;
  };

  report.Bandas?.forEach(b => b.Objetos?.forEach(checkRightEdge));
  ['Company', 'Title', 'Subtitle'].forEach(k => checkRightEdge(report.Metadata?.[k as keyof typeof report.Metadata]));
  report.VariablesSistema?.forEach(checkRightEdge);

  const maxContentWidthPx = fruToPx(maxRightFru);

  let paperWidthPx = 816; // Vertical Clásico por defecto
  
  if (maxContentWidthPx > 800 && maxContentWidthPx <= 1040) {
    paperWidthPx = 1056; // Horizontal Clásico
  } else if (maxContentWidthPx > 1040) {
    // Lienzo infinito: Crece dinámicamente con un margen de seguridad de 100px
    paperWidthPx = maxContentWidthPx + 100; 
  }

  // La altura mínima sigue siendo el estándar, pero la altura real se calculará abajo
  const paperMinHeightPx = paperWidthPx === 816 ? 1056 : 816;

  let totalHeightFru = 0;
  report.Bandas.forEach((band, bandIdx) => {
    let minVPos = band.StartVPos !== undefined 
      ? band.StartVPos 
      : (band.TipoBanda === 'PageHeader' || !band.Objetos || band.Objetos.length === 0 ? 0 : Math.min(...band.Objetos.map(o => o.VPos || 0)));
      
    let calculatedHeightFru = 0;
    let nextMinVPos = minVPos;

    if (bandIdx < report.Bandas.length - 1) {
      for (let i = bandIdx + 1; i < report.Bandas.length; i++) {
        if (report.Bandas[i].Objetos && report.Bandas[i].Objetos.length > 0) {
          nextMinVPos = Math.min(...report.Bandas[i].Objetos.map(o => o.VPos || 0));
          break;
        }
      }
    }

    if (bandIdx < report.Bandas.length - 1 && nextMinVPos > minVPos) {
      calculatedHeightFru = nextMinVPos - minVPos;
    } else {
      const maxBottom = band.Objetos && band.Objetos.length > 0 ? Math.max(...band.Objetos.map(o => (o.VPos || 0) + (o.Height || 0))) : minVPos + 5000;
      calculatedHeightFru = maxBottom - minVPos;
    }
    totalHeightFru += (band.BandHeight !== undefined ? band.BandHeight : calculatedHeightFru);
  });
  
  const totalCanvasHeightPx = Math.max(paperMinHeightPx, fruToPx(totalHeightFru));

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (isSpacePressed || e.ctrlKey))) {
      e.preventDefault(); 
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current?.scrollLeft || 0,
        scrollTop: containerRef.current?.scrollTop || 0
      };
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isPanning && containerRef.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      containerRef.current.scrollLeft = panStart.current.scrollLeft - dx;
      containerRef.current.scrollTop = panStart.current.scrollTop - dy;
      return; 
    }

    if (!selectionBox) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min((e.clientX - rect.left) / scale, rect.width / scale));
    const y = Math.max(0, Math.min((e.clientY - rect.top) / scale, rect.height / scale));
    setSelectionBox(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  };

  const handleContainerMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return; 
    }
    handleMouseUp(e); 
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isSpacePressed || e.ctrlKey) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });

    if (!e.shiftKey) setSelections([]);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!selectionBox) return;

    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const right = Math.max(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const bottom = Math.max(selectionBox.startY, selectionBox.currentY);

    const boxFru = {
      left: pxToFru(left), right: pxToFru(right), top: pxToFru(top), bottom: pxToFru(bottom)
    };

    const bandVisualTops: number[] = [];
    const bandMinVPos: number[] = [];
    let currentTopFru = 0;

    report.Bandas.forEach((band, bandIdx) => {
      bandVisualTops.push(currentTopFru);
      
      const minVPos = band.StartVPos !== undefined 
        ? band.StartVPos 
        : (band.TipoBanda === 'PageHeader' || !band.Objetos || band.Objetos.length === 0 ? 0 : Math.min(...band.Objetos.map(o => o.VPos || 0)));
      
      bandMinVPos.push(minVPos);

      let calculatedHeightFru = 0;
      let nextMinVPos = minVPos;

      if (bandIdx < report.Bandas.length - 1) {
        for (let i = bandIdx + 1; i < report.Bandas.length; i++) {
          const nextBand = report.Bandas[i];
          if (nextBand.Objetos && nextBand.Objetos.length > 0) {
            nextMinVPos = Math.min(...nextBand.Objetos.map(o => o.VPos || 0));
            break;
          }
        }
      }

      if (bandIdx < report.Bandas.length - 1 && nextMinVPos > minVPos) {
        calculatedHeightFru = nextMinVPos - minVPos;
      } else {
        const maxBottom = band.Objetos && band.Objetos.length > 0 
          ? Math.max(...band.Objetos.map(o => (o.VPos || 0) + (o.Height || 0)))
          : minVPos + 5000;
        calculatedHeightFru = maxBottom - minVPos;
      }

      const activeHeightFru = band.BandHeight !== undefined ? band.BandHeight : calculatedHeightFru;
      currentTopFru += activeHeightFru;
    });

    const isIntersecting = (obj: any, bIdx?: number) => {
      if (!obj || obj.HPos === undefined || obj.VPos === undefined) return false;
      let visualTop = obj.VPos;
      if (bIdx !== undefined) visualTop = bandVisualTops[bIdx] + (obj.VPos - bandMinVPos[bIdx]);
      const estimatedWidth = obj.Expr ? obj.Expr.length * 100 : 2000; 
      const oLeft = obj.HPos;
      const oRight = obj.HPos + (obj.Width || estimatedWidth); 
      const oTop = visualTop;
      const oBottom = visualTop + (obj.Height || 1000); 
      return oLeft < boxFru.right && oRight > boxFru.left && oTop < boxFru.bottom && oBottom > boxFru.top;
    };

    const newSelections: SelectionItem[] = [];

    report.Bandas.forEach((band, bIdx) => {
      band.Objetos.forEach((obj, oIdx) => {
        if (isIntersecting(obj, bIdx)) newSelections.push({ type: 'band', bandIdx: bIdx, objIdx: oIdx });
      });
    });

    ['Company', 'Title', 'Subtitle'].forEach(k => {
      const m = report.Metadata[k as 'Company'|'Title'|'Subtitle'];
      if (m && m.VPos >= 0 && isIntersecting(m)) newSelections.push({ type: 'meta', metaKey: k as any });
    });

    report.VariablesSistema.forEach((sv, sIdx) => {
      if (isIntersecting(sv)) newSelections.push({ type: 'sysvar', sysIdx: sIdx });
    });

    const finalSelections = e.shiftKey ? [...selectedIndices, ...newSelections] : newSelections;
    const uniqueSelections = finalSelections.filter((sel, index, self) => 
      index === self.findIndex((t) => (t.type === sel.type && t.bandIdx === sel.bandIdx && t.objIdx === sel.objIdx && t.metaKey === sel.metaKey && t.sysIdx === sel.sysIdx))
    );

    setSelections(uniqueSelections);
    setSelectionBox(null);
  };

  
    return (
    <>
      {/* === MODAL PARA VARIABLES DE GRUPO === */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-96 border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-2">
              Añadir {pendingGroupType === 'GroupHeader' ? 'Encabezado' : 'Pie'} de Grupo
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Introduce el nombre de la variable o expresión por la cual deseas agrupar (ej. <code className="bg-gray-100 px-1 py-0.5 rounded text-pink-600">Wc_Codigo</code>):
            </p>
            
            <input 
              type="text" 
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-mono"
              placeholder="Nombre de la variable..."
              value={groupVariable}
              onChange={(e) => setGroupVariable(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmGroupBand();
                if (e.key === 'Escape') setIsGroupModalOpen(false);
              }}
            />
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsGroupModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmGroupBand}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === BARRA DE HERRAMIENTAS (TOOLBAR ESTILO FIGMA) === */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-white/90 backdrop-blur-md rounded-full shadow-xl shadow-black/5 border border-black p-1.5 z-[60] select-none gap-1">
        <button 
          onClick={() => addObject('Label')}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100/80 rounded-full text-gray-600 hover:text-gray-900 text-[13px] font-medium transition-all active:scale-95"
          title="Añadir Etiqueta (Texto Fijo)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
          Label
        </button>
        
        <button 
          onClick={() => addObject('Field')}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100/80 rounded-full text-gray-600 hover:text-gray-900 text-[13px] font-medium transition-all active:scale-95"
          title="Añadir Campo (Variable/Expresión)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          Field
        </button>

        <div className="w-[1px] h-5 bg-gray-300/60 mx-1"></div>

        <button 
          onClick={() => addObject('Shape')}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100/80 rounded-full text-gray-600 hover:text-gray-900 text-[13px] font-medium transition-all active:scale-95"
          title="Añadir Rectángulo (Shape)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
          Shape
        </button>

        <button 
          onClick={() => addObject('Line')}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100/80 rounded-full text-gray-600 hover:text-gray-900 text-[13px] font-medium transition-all active:scale-95"
          title="Añadir Línea"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="5" y1="19" x2="19" y2="5"></line></svg>
          Line
        </button>

        <button 
          onClick={() => addObject('Picture')}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100/80 rounded-full text-gray-600 hover:text-gray-900 text-[13px] font-medium transition-all active:scale-95"
          title="Añadir Imagen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          Picture
        </button>

        <div className="w-[1px] h-5 bg-gray-300/60 mx-1"></div>

        {/* === DROPDOWN DE BANDAS === */}
        <div className="relative" ref={bandMenuRef}>
          <button 
            onClick={() => setIsBandMenuOpen(!isBandMenuOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95 ${
              isBandMenuOpen ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100/80 text-gray-600 hover:text-gray-900'
            }`}
            title="Añadir Banda al Reporte"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            Bandas
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 opacity-60 ${isBandMenuOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>

          {isBandMenuOpen && (
            <div className="absolute top-full right-0 mt-3 w-52 bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-xl shadow-black/5 py-2 flex flex-col z-[60]">
              <span className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Añadir Sección</span>
              
              <button onClick={() => handleAddBand('Title')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                Título (Title)
              </button>
              <button onClick={() => handleAddBand('PageHeader')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                Encabezado de Página
              </button>
              <button onClick={() => handleAddBand('GroupHeader')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                Encabezado de Grupo
              </button>
              <button onClick={() => handleAddBand('Detail')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                Detalle (Detail)
              </button>
              <button onClick={() => handleAddBand('GroupFooter')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                Pie de Grupo
              </button>
              <button onClick={() => handleAddBand('PageFooter')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                Pie de Página
              </button>
              <button onClick={() => handleAddBand('Summary')} className="text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                Resumen (Summary)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* === CONTENEDOR PRINCIPAL DEL LIENZO === */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-auto bg-gray-300 text-center relative ${isPanning ? 'cursor-grabbing' : (isSpacePressed ? 'cursor-grab' : '')}`}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp} 
        onMouseLeave={(e) => {
          if (isPanning) setIsPanning(false);
          handleMouseUp(e);
        }}
        onClick={() => setActiveBandIdx(null)}
      >
        <div 
          className="inline-block text-left relative transition-all duration-75"
          style={{
            margin: '40px', 
            marginTop: '100px', // Añadido margen superior para que el lienzo no choque con la barra flotante
            width: `${paperWidthPx * scale}px`, 
            height: `${totalCanvasHeightPx * scale}px` 
          }}
        >
          <div 
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            className="bg-white shadow-2xl ring-1 ring-black/10 absolute top-0 left-0 origin-top-left select-none"
            style={{ 
              width: `${paperWidthPx}px`, 
              minHeight: `${totalCanvasHeightPx}px`, 
              transform: `scale(${scale})`
            }}
          >
            {selectionBox && (
              <div 
                className="absolute border border-blue-500 bg-blue-500/20 z-50 pointer-events-none"
                style={{
                  left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                  top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                  width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
                  height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
                }}
              />
            )}

            {snapLines.hPos !== null && <div className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-50 pointer-events-none" style={{ left: `${fruToPx(snapLines.hPos)}px` }} />}
            {snapLines.vPos !== null && <div className="absolute left-0 right-0 h-[1px] bg-red-500 z-50 pointer-events-none" style={{ top: `${fruToPx(snapLines.vPos)}px` }} />}

            {report.Metadata && (
              <>
                {report.Metadata.Company?.Expr && report.Metadata.Company.VPos >= 0 && (
                  <ReportObject obj={report.Metadata.Company} offsetVPos={0} type="meta" metaKey="Company" customClass="bg-transparent text-gray-900 uppercase font-bold" />
                )}
                {report.Metadata.Title?.Expr && report.Metadata.Title.VPos >= 0 && (
                  <ReportObject obj={report.Metadata.Title} offsetVPos={0} type="meta" metaKey="Title" customClass="bg-transparent text-gray-800 uppercase font-bold" />
                )}
                {report.Metadata.Subtitle?.Expr && report.Metadata.Subtitle.VPos >= 0 && (
                  <ReportObject obj={report.Metadata.Subtitle} offsetVPos={0} type="meta" metaKey="Subtitle" customClass="bg-transparent text-gray-600" />
                )}
              </>
            )}

            <div className="w-full relative z-0">
              {(report.Bandas || []).map((band, idx) => (
                <BandRenderer key={`band-${band.TipoBanda}-${band.Nivel}-${band.AgrupaPor || 'none'}-${idx}`} band={band} bandIdx={idx} />
              ))}
            </div>

            {(report.VariablesSistema || []).map((sysVar, idx) => (
              <ReportObject key={`sys-${idx}`} obj={sysVar} offsetVPos={0} type="sysvar" sysIdx={idx} customClass="bg-green-50/80 border-green-300 text-green-800" />
            ))}
          </div>
        </div>
      </div>

      {/* === CONTROLES DE ZOOM FLOTANTES === */}
      <div className="fixed bottom-6 right-6 flex items-center bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-black overflow-hidden z-[60] select-none p-1">
        <button onClick={zoomOut} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors" title="Alejar (Ctrl + Rueda Abajo)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button onClick={zoomReset} className="px-3 py-1.5 text-[13px] font-mono font-bold text-gray-700 hover:bg-gray-100 rounded-full transition-colors min-w-[60px] text-center" title="Restablecer al 100%">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={zoomIn} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors" title="Acercar (Ctrl + Rueda Arriba)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
    </>
  );
}