export interface DbfFieldMeta {
  name: string;
  type: 'C' | 'N' | 'D' | 'L';
  length?: number;
  decimals?: number;
}

export interface SystemVariable {
  Label: string;
  Expr: string;
  VPos: number;
  HPos: number;
  Width: number;
  Height: number;
  FontSize: number;
}

export interface RenderedSystemVariable extends SystemVariable {
  cleanLabel: string;
  evaluatedValue: string;
  renderedText: string;
  style: Record<string, string | number>;
}


export const FOXPRO_METADATA: Record<string, DbfFieldMeta> = {
  // ===== Maestro =====
  maenomi: { name: 'maenomi', type: 'C', length: 8 },
  maenume: { name: 'maenume', type: 'C', length: 8 },
  maenomb: { name: 'maenomb', type: 'C', length: 30 },
  maeapel: { name: 'maeapel', type: 'C', length: 30 },
  macedun: { name: 'maecedun', type: 'C', length: 15 },
  maesuel: { name: 'maesuel', type: 'N', decimals: 2 },
  maefein: { name: 'maefein', type: 'D' },
  tipo_empl: { name: 'tipo_empl', type: 'C' },
  of_codigo: { name: 'of_codigo', type: 'C' },
  ub_codigo: { name: 'ub_codigo', type: 'C' },
  of_descri: { name: 'of_descri', type: 'C' },
  ub_descri: { name: 'ub_descri', type: 'C' },

  // ===== Nómina =====
  wp_monto: { name: 'wp_monto', type: 'N', decimals: 2 },
  wv_cantida: { name: 'wv_cantida', type: 'N', decimals: 3 },
  wp_valuada: { name: 'wp_valuada', type: 'L' },
  wc_codigo: { name: 'wc_codigo', type: 'C' },
  wc_descri: { name: 'wc_descri', type: 'C' },
  wc_comenta: { name: 'wc_comenta', type: 'C', length: 100 }, 
  wb_codigo: { name: 'wb_codigo', type: 'C' },
  wb_descri: { name: 'wb_descri', type: 'C' },
  wg_ano_ref: { name: 'wg_ano_ref', type: 'N' },
  wg_secuen: { name: 'wg_secuen', type: 'N' },
  wg_inicial: { name: 'wg_inicial', type: 'D' }, 
  wh_final_f: { name: 'wh_final_f', type: 'D' }, 
  md_nomina: { name: 'md_nomina', type: 'C', length: 20 }, 

  // ===== 🚀 NUEVOS: Campos de Consultas y Relaciones (Eikôn Schema) =====
  codepe: { name: 'codepe', type: 'C', length: 6 },
  cc_codigo: { name: 'cc_codigo', type: 'C', length: 6 },
  nivel: { name: 'nivel', type: 'N', decimals: 0 }
};

function generateValueByMetadata(field: string, meta: DbfFieldMeta, rowIndex: number): any {
  switch (meta.type) {
    case 'L': return rowIndex % 2 === 0;
    case 'D': return new Date(2026, rowIndex % 12, (rowIndex % 28) + 1).toLocaleDateString('es-ES');
    case 'N':
      if (field.includes('monto')) return 15000 + rowIndex * 500;
      if (field.includes('cant')) return (rowIndex % 5) + 1;
      if (field.includes('ano')) return 2026;
      if (field.includes('secuen')) return (rowIndex % 12) + 1;
      if (field === 'nivel') return (rowIndex % 3) + 1; // Generación para query.nivel
      return rowIndex;
    default: return null;
  }
}

/**
 * 1. Extrae alias y campos limpios del SQL
 */
export function extractFieldsFromSql(sql: string): string[] {
  if (!sql) return [];
  const cleanSql = sql.replace(/[\r\n\t]/g, ' ');
  const fromIndex = cleanSql.toLowerCase().indexOf(' from ');
  if (fromIndex === -1) return [];
  
  const fieldsSection = cleanSql.substring(0, fromIndex).replace(/^SELECT\s+/i, '');
  const fields: string[] = [];

  fieldsSection.split(',').forEach(field => {
    const trimmed = field.trim();
    const asMatch = trimmed.match(/as\s+([a-zA-Z0-9_]+)/i);
    if (asMatch && asMatch[1]) {
      fields.push(asMatch[1]);
    } else {
      const fieldParts = trimmed.split('.');
      const finalName = fieldParts[fieldParts.length - 1].trim().replace(/[^a-zA-Z0-9_]/g, '');
      if (finalName) fields.push(finalName);
    }
  });

  return fields;
}

/**
 * 2. Escanea todo el reporte para encontrar variables ocultas
 */
export function extractFieldsFromReport(bandas: any[]): string[] {
  const fields = new Set<string>();
  // 🚀 ADVERTENCIA: Agregamos 'gdesc_cod' para evitar que se confunda con un campo real de la DB
  const reserved = ['iif', 'allt', 'alltr', 'alltrim', 'str', 'date', 'time', 'gmes', 'val', 'etiquetas', 'gdesc_cod'];
  
  bandas.forEach(b => {
    b.Objetos?.forEach((o: any) => {
      if ((o.TipoObj === 'Field' || o.TipoObj === 'Label') && o.Expr) {
        const matches = o.Expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
        if (matches) {
          matches.forEach((m: string) => {
            if (!reserved.includes(m.toLowerCase())) fields.add(m.toLowerCase());
          });
        }
      }
    });
  });
  return Array.from(fields);
}

/**
 * 3. Generador de Datos Hiper-Realista y Jerárquico (Eikôn ERP Schema)
 */
export function generateMockRows(fields: string[], numRows: number = 10): Record<string, any>[] {
  const mockData: Record<string, any>[] = [];

  const nombres = ['ARIANA JOSEFINA', 'ALFONSO', 'MARIA', 'JULIO', 'ANA', 'ROBERTO'];
  const apellidos = ['SUERO', 'MENDOZA', 'ALCANTARA', 'CASTILLO', 'DOMINGUEZ', 'SUAREZ'];
  const ubicacionesDesc = ['TECNOLOGÍA', 'VENTAS', 'CONTABILIDAD', 'ALMACÉN', 'RECURSOS HUMANOS'];
  const oficinasDesc = ['OF. PRINCIPAL', 'SUCURSAL NORTE', 'SEDE CENTRAL', 'ZONA SUR'];
  const centrosDesc = ['CENTRO OPERATIVO HERRERA', 'ADMINISTRACIÓN CENTRAL', 'CENTRO DE DISTRIBUCIÓN', 'PRODUCCIÓN PLANTA 1'];
  const empresasDesc = ['EIKON CORPORATION', 'GRUPO TECNOLÓGICO', 'EMPRESA DEMO'];
  const puestosDesc = ['ANALISTA QA', 'DESARROLLADOR', 'GERENTE', 'CAJERO', 'SOPORTE IT'];
  const transaccionesDesc = ['SALARIO REGULAR', 'HORAS EXTRAS', 'DEDUCCION ISR', 'BONIFICACION'];
  const calles = ['AV. WINSTON CHURCHILL', 'CALLE EL CONDE', 'AV. 27 DE FEBRERO', 'AUT. DUARTE'];
  const estatus = ['A', 'I', 'V', 'S', 'L'];
  const tiposEmpl = ['F', 'T', 'C', 'P'];

  for (let i = 0; i < numRows; i++) {
    const row: Record<string, any> = {};
    const seed = i;
    const sueldoBase = Math.floor(Math.random() * 60000) + 20000;
    
    fields.forEach(field => {
      const lowerField = field.toLowerCase();
      const meta = FOXPRO_METADATA[lowerField];
      
      if (meta) {
        const generated = generateValueByMetadata(lowerField, meta, i);
        if (generated !== null) {
          row[field] = generated;
          return;
        }
      }

      switch (true) {
        // 1. IDENTIFICACIÓN
        case lowerField === 'wb_codigo' || lowerField === 'em_empresa': row[field] = '00001'; break;
        case lowerField === 'maenomi': row[field] = `0000${2250 + seed}`; break;
        case lowerField === 'maenume': row[field] = `0000${2640 + seed}`; break;
        case lowerField === 'maeapel': row[field] = apellidos[seed % apellidos.length]; break;
        case lowerField === 'maenomb': row[field] = nombres[seed % nombres.length]; break;
        case lowerField === 'maecedun': row[field] = `402-${String(1000000 + seed).substring(1)}-${seed % 9}`; break; 
        case lowerField.includes('name') || lowerField === 'nombre': row[field] = `${nombres[seed % nombres.length]} ${apellidos[seed % apellidos.length]}`; break;
        case lowerField === 'fullname': row[field] = `${row.maenomb ?? 'ARIANA'} ${row.maeapel ?? 'SUERO'}`; break;

        // 🚀 NUEVOS: Mapeos para variables cruzadas de consultas FoxPro
        case lowerField === 'codepe': row[field] = `0${(seed % 5) + 1}`; break;
        case lowerField === 'cc_codigo': row[field] = `0${(seed % 4) + 1}`; break;
        case lowerField === 'nivel': row[field] = (seed % 3) + 1; break;

        // 2. UBICACIÓN ORGANIZACIONAL
        case /^(of|ub|rg|ho|nc|ca|np|ct|cy|ba)_codigo$/.test(lowerField): row[field] = `0${(seed % 5) + 1}`; break;
        case lowerField === 'ub_descri': row[field] = ubicacionesDesc[seed % ubicacionesDesc.length]; break;
        case lowerField === 'of_descri': row[field] = oficinasDesc[seed % oficinasDesc.length]; break;
        case lowerField === 'em_descri': row[field] = empresasDesc[seed % empresasDesc.length]; break;
        case lowerField === 'cc_descri': row[field] = centrosDesc[seed % centrosDesc.length]; break;
        case ['np_descri', 'ct_descri', 'gr_descri'].includes(lowerField): row[field] = 'NIVEL PROFESIONAL ' + ((seed % 3) + 1); break;

        // 3. DATOS LABORALES Y GEOGRÁFICOS
        case lowerField === 'maefein': row[field] = `15/0${(seed % 9) + 1}/201${seed % 9}`; break;
        case lowerField === 'maecalle': row[field] = calles[seed % calles.length]; break;
        case ['tipo_empl', 'tipoempl'].includes(lowerField): row[field] = tiposEmpl[seed % tiposEmpl.length]; break;
        case lowerField === 'puetitu': row[field] = puestosDesc[seed % puestosDesc.length]; break;
        case lowerField === 'maecnta': row[field] = `100-245-${seed}99`; break;

        // 4. ESCALA SALARIAL Y SEGURIDAD SOCIAL
        case lowerField === 'maesuel' || lowerField.includes('monto_acum'): row[field] = sueldoBase; break;
        case lowerField === 'minimo': row[field] = sueldoBase * 0.8; break;
        case lowerField === 'midpoint': row[field] = sueldoBase; break;
        case lowerField === 'maximo': row[field] = sueldoBase * 1.5; break;
        case lowerField === 'np_puntos': row[field] = 100 + (seed * 10); break;
        case ['maenss', 'no_idss'].includes(lowerField): row[field] = `001-000${1234 + seed}-2`; break;

        // 5. TRANSACCIONAL Y NÓMINA
        case ['wg_ano_ref', 'year', 'ano'].includes(lowerField): row[field] = 2026; break;
        case ['wg_secuen', 'periodo'].includes(lowerField): row[field] = (seed % 12) + 1; break;
        case lowerField === 'md_nomina': row[field] = `NOM-15Q${(seed % 4) + 1}`; break; 
        case lowerField === 'wg_inicial': row[field] = `01/10/2026`; break; 
        case lowerField === 'wh_final_f': row[field] = `15/10/2026`; break; 
        case lowerField === 'wc_codigo': row[field] = `000${(seed % 9) + 1}`; break;
        case ['wc_descri', 'ctransaction'].includes(lowerField): row[field] = transaccionesDesc[seed % transaccionesDesc.length]; break;
        case lowerField === 'wc_comenta': row[field] = `PAGO CORRESPONDIENTE A LA 1RA QUINCENA`; break;
        case ['wp_monto', 'monto'].includes(lowerField): row[field] = 2400.00 + (seed * 100); break;
        case lowerField === 'wv_cantida' || lowerField.includes('cantida') || lowerField === 'qty': row[field] = 40.00; break;
        case lowerField === 'wv_monto_u': row[field] = 60.00; break;
        case lowerField === 'wp_valuada': row[field] = 1; break; 
        case lowerField === 'wp_coment': row[field] = "PAGO PROCESADO AUTOMÁTICAMENTE."; break;

        // 6. CAMPOS DE CONTROL
        case lowerField === 'identity_c': row[field] = 381951 + seed; break;
        case ['created_by', 'changed_by'].includes(lowerField): row[field] = "ADMIN"; break;
        case ['created_on', 'changed_on'].includes(lowerField): row[field] = new Date().toLocaleDateString('es-ES'); break;
        case lowerField === 'code': row[field] = Number(`001${15 + i}`); break;

        // 7. REGLAS GENÉRICAS
        case lowerField.includes('ingreso'): row[field] = Math.floor(Math.random() * 10000); break;
        case lowerField.includes('descuento'): row[field] = Math.floor(Math.random() * 2000); break;
        case lowerField === 'neto': row[field] = sueldoBase * 0.9; break;
        case lowerField === 'estatus': row[field] = estatus[seed % estatus.length]; break;

        default: row[field] = `[${field}]`; break;
      }
    });
    
    mockData.push({ ...row });
  }

  return mockData.sort((a, b) => {
    if (a.of_codigo !== b.of_codigo) return a.of_codigo > b.of_codigo ? 1 : -1;
    if (a.ub_codigo !== b.ub_codigo) return a.ub_codigo > b.ub_codigo ? 1 : -1;
    return 0;
  });
}

/**
 * 4. Traductor Matemático y Lógico de FoxPro a JS (Versión Segura con inyección de Scope)
 */
export function evaluateFoxProExpr(
  expr: string, 
  dataRow: Record<string, any>, 
  context?: { pageNo?: number }
): string {
  const cleanExpr = expr.trim();

  const exactMatchKey = Object.keys(dataRow).find(k => k.toLowerCase() === cleanExpr.toLowerCase());
  if (exactMatchKey && !cleanExpr.includes('+') && !cleanExpr.includes('(')) {
    const val = dataRow[exactMatchKey];
    return typeof val === 'number' 
      ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : String(val);
  }

  // 🚀 PASO 1: Limpieza de punteros/estructuras (query.Codepe -> Codepe)
  let jsExpr = cleanExpr
    .replace(/[a-zA-Z_]+\./g, '') // Remueve prefijos de cursores/alias (ej: "query.", "maestro.")
    .replace(/\.T\./gi, 'true')    
    .replace(/\.F\./gi, 'false')
    .replace(/\.NULL\./gi, 'null')
    .replace(/alltrim\(([^)]+)\)/gi, '$1')
    .replace(/allt\(([^)]+)\)/gi, '$1')
    .replace(/alltr\(([^)]+)\)/gi, '$1')
    .replace(/str\(([^)]+)\)/gi, '$1')
    .replace(/gmes\(([^)]+)\)/gi, '"OCTUBRE"') 
    .replace(/date\(\)/gi, `"${new Date().toLocaleDateString('es-ES')}"`)
    .replace(/time\(\)/gi, `"${new Date().toLocaleTimeString('es-ES')}"`)
    .replace(/_pageno/gi, `"${context?.pageNo ?? 1}"`);

  // Reemplazo de variables/columnas por sus valores en la fila actual
  const keys = Object.keys(dataRow).sort((a, b) => b.length - a.length);
  keys.forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    let val = dataRow[key];
    if (typeof val === 'string') {
      val = `'${val.replace(/'/g, "\\'")}'`; 
    }
    jsExpr = jsExpr.replace(regex, String(val));
  });

  jsExpr = jsExpr.replace(/iif\(([^,]+),([^,]+),([^)]+)\)/gi, '($1 ? $2 : $3)');
  jsExpr = jsExpr.replace(/<>/g, '!==');
  jsExpr = jsExpr.replace(/(?<![=<>!])=(?![=])/g, '==='); 

  try {
    // 🚀 PASO 2: Inyección de la UDF gdesc_cod en el Runtime Local antes de evaluar
    const gdesc_cod = (codigo: any, tabla: string, campoDesc: string, campoCod: string) => {
      const t = String(tabla).toLowerCase();
      // Extraemos cualquier número en el código simulado para amarrarlo al índice del array mock
      const idx = parseInt(String(codigo).replace(/[^0-9]/g, '')) || 0;

      if (t === 'tubicacion') {
        const ubiDesc = ['TECNOLOGÍA', 'VENTAS', 'CONTABILIDAD', 'ALMACÉN', 'RECURSOS HUMANOS'];
        return ubiDesc[idx % ubiDesc.length];
      }
      if (t === 'tcentro') {
        const centroDesc = ['CENTRO OPERATIVO HERRERA', 'ADMINISTRACIÓN CENTRAL', 'CENTRO DE DISTRIBUCIÓN', 'PRODUCCIÓN PLANTA 1'];
        return centroDesc[idx % centroDesc.length];
      }
      return `[MOCK DESC: ${tabla} (${codigo})]`;
    };

    // eslint-disable-next-line no-eval
    const result = eval(jsExpr);
    if (typeof result === 'number' && !Number.isNaN(result)) {
        return result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return result !== undefined && result !== null ? String(result) : '';
  } catch (e) {
    return cleanExpr.replace(/^["']|["']$/g, '');
  }
}

/**
 * 5. Procesa las variables del sistema y genera los estilos CSS de posicionamiento
 */
export function prepareSystemVariablesForPreview(
  variables: SystemVariable[],
  dataRow: Record<string, any>,
  pageNo: number = 1,
  unitConversionFactor: number = 1 
): RenderedSystemVariable[] {
  return variables.map(v => {
    const evaluated = evaluateFoxProExpr(v.Expr, dataRow, { pageNo });
    const cleanLabel = v.Label.replace(/^"+|"+$/g, '').trim();
    const renderedText = `${cleanLabel} ${evaluated}`.trim();

    return {
      ...v,
      cleanLabel,
      evaluatedValue: evaluated,
      renderedText,
      style: {
        position: 'absolute',
        top: `${v.VPos * unitConversionFactor}px`,
        left: `${v.HPos * unitConversionFactor}px`,
        width: `${v.Width * unitConversionFactor}px`,
        height: `${v.Height * unitConversionFactor}px`,
        fontSize: `${v.FontSize}pt`,
        whiteSpace: 'nowrap',
        fontFamily: 'monospace' 
      }
    };
  });
}