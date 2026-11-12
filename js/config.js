/**
 * CONFIGURACIÓN GLOBAL - CUADERNO DIGITAL DEL PROFESOR
 * Claves de Música / Edpuzzle Style
 */

const CONFIG = {
  // Clave maestra de acceso docente (Requisito 2 y Landing Page Segura)
  CLAVE_DOCENTE: "1750*Diag0nal*121068",

  // Bloques oficiales de evaluación
  BLOQUES: {
    LENGUAJE: "lenguaje_musical",
    ACTIVIDADES: "actividades_interactivas"
  },
  NOMBRES_BLOQUES: {
    "lenguaje_musical": "Lenguaje Musical",
    "actividades_interactivas": "Actividades Interactivas Evaluables"
  },

  // Intervalo de sincronización en tiempo real (milisegundos)
  INTERVALO_SYNC_MS: 15000,

  // Endpoint oficial del listado de alumnos del centro
  URL_LISTADO_ALUMNOS: "https://script.google.com/macros/s/AKfycbx_gQN9MXHqm_y6QpAO-S00VsaGwc0CjozRHBtxgah6VBtYbLEZ9SA7-mT-WzALbwjXLw/exec",

  // Imagen corporativa oficial
  LOGO_CORPORATIVO_URL: "https://clavesdemusica.com/wp-content/uploads/2023/08/header2.png",
  WEB_OFICIAL_URL: "https://clavesdemusica.com",

  // Las 5 aplicaciones oficiales del bloque "Lenguaje Musical" (Requisito 5)
  // 1. Calificaciones_Lectura
  // 2. Calificaciones_Equivalencias
  // 3. Calificaciones_Compases
  // 4. Calificaciones_Intervalos
  // 5. Calificaciones_Dictados
  APPS_BASE: [
    {
      id: "lectura",
      nombre: "Calificaciones_Lectura",
      tituloVisible: "Lectura Musical",
      descripcion: "Identificación de notas en clave de sol",
      urlSheet: "https://docs.google.com/spreadsheets/d/1dnJ9PbfZVo_5UoF_xDMp5NIHzmAUzVpkpUqhyjRFFL8/edit",
      sheetId: "1dnJ9PbfZVo_5UoF_xDMp5NIHzmAUzVpkpUqhyjRFFL8",
      bloque: "lenguaje_musical",
      bloqueNombre: "Lenguaje Musical",
      icono: "🎵",
      color: "#4f46e5"
    },
    {
      id: "equivalencias",
      nombre: "Calificaciones_Equivalencias",
      tituloVisible: "Equivalencias Rítmicas",
      descripcion: "Relaciones de figuras y pulsos",
      urlSheet: "",
      sheetId: "",
      bloque: "lenguaje_musical",
      bloqueNombre: "Lenguaje Musical",
      icono: "⏱️",
      color: "#0891b2"
    },
    {
      id: "compases",
      nombre: "Calificaciones_Compases",
      tituloVisible: "Completar Compases",
      descripcion: "Compases simples y compuestos",
      urlSheet: "",
      sheetId: "",
      bloque: "lenguaje_musical",
      bloqueNombre: "Lenguaje Musical",
      icono: "🎼",
      color: "#d97706"
    },
    {
      id: "intervalos",
      nombre: "Calificaciones_Intervalos",
      tituloVisible: "Entrenador de Intervalos",
      descripcion: "Identificación de intervalos auditivos y visuales",
      urlSheet: "",
      sheetId: "",
      bloque: "lenguaje_musical",
      bloqueNombre: "Lenguaje Musical",
      icono: "🎹",
      color: "#059669"
    },
    {
      id: "dictados",
      nombre: "Calificaciones_Dictados",
      tituloVisible: "Dictados Rítmicos",
      descripcion: "Dictados rítmicos interactivos",
      urlSheet: "",
      sheetId: "",
      bloque: "lenguaje_musical",
      bloqueNombre: "Lenguaje Musical",
      icono: "🎧",
      color: "#7c3aed"
    }
  ],

  // Definición de cursos y grupos conocidos para el filtrado dinámico
  CURSOS_POSIBLES: ["1ESO", "2ESO", "3ESO", "4ESO"],
  GRUPOS_LETRAS: ["A", "B", "C", "D"],

  // Función para obtener el año académico actual (ej: "2627")
  obtenerCodigoAnoAcademico() {
    const ahora = new Date();
    const ano = ahora.getFullYear();
    const mes = ahora.getMonth(); // 0 a 11 (8 = Septiembre)
    const inicio = mes >= 7 ? ano : ano - 1; // Curso empieza en agosto/septiembre
    const fin = inicio + 1;
    const strInicio = String(inicio).slice(-2);
    const strFin = String(fin).slice(-2);
    return `${strInicio}${strFin}`;
  },

  // Genera el código del grupo idéntico a la hoja de cálculo (ej: "1ESO-A", "2ESO-B")
  generarCodigoGrupo(cursoStr, grupoLetra) {
    return `${cursoStr}-${grupoLetra.toUpperCase()}`;
  },

  // Mantenido para compatibilidad: devuelve exactamente el nombre de la hoja de cálculo
  generarCodigoEdpuzzle(cursoStr, grupoLetra) {
    return `${cursoStr}-${grupoLetra.toUpperCase()}`;
  },

  // Obtiene el rango de fechas por defecto:
  // Desde el 1 de septiembre anterior hasta hoy a las 23:59:59 (Requisito 4)
  obtenerRangoFechasPorDefecto() {
    const hoy = new Date();
    const anoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth(); // 0-11
    
    // Si estamos en enero-agosto, el 1 de septiembre anterior fue el año pasado.
    // Si estamos en septiembre-diciembre, el 1 de septiembre anterior es este año.
    const anoSeptiembre = mesActual >= 8 ? anoActual : anoActual - 1;
    const fechaInicio = new Date(anoSeptiembre, 8, 1, 0, 0, 0, 0); // 1 de Septiembre 00:00:00

    const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);

    return {
      inicio: fechaInicio,
      fin: fechaFin,
      inicioISO: fechaInicio.toISOString().split("T")[0],
      finISO: fechaFin.toISOString().split("T")[0]
    };
  },

  // Mapa de calor para calificaciones (Requisito 5)
  // - Por debajo de 5: Rojo
  // - Entre 5 y 6: Naranja
  // - Entre 6 y 7: Amarillo
  // - Entre 7 y 10: Verde
  obtenerColorNota(nota) {
    if (nota === null || nota === undefined || isNaN(nota) || nota === "") {
      return {
        rango: "vacio",
        bg: "#f1f5f9",
        color: "#64748b",
        border: "#e2e8f0",
        label: "Sin datos",
        claseCss: "nota-vacio"
      };
    }
    const n = parseFloat(nota);
    if (n < 5.0) {
      return {
        rango: "insuficiente",
        bg: "#fee2e2",
        color: "#991b1b",
        border: "#f87171",
        label: "Insuficiente (< 5)",
        claseCss: "nota-rojo"
      };
    } else if (n < 6.0) {
      return {
        rango: "suficiente",
        bg: "#ffedd5",
        color: "#9a3412",
        border: "#fb923c",
        label: "Suficiente (5 - 6)",
        claseCss: "nota-naranja"
      };
    } else if (n < 7.0) {
      return {
        rango: "bien",
        bg: "#fef9c3",
        color: "#854d0e",
        border: "#facc15",
        label: "Bien (6 - 7)",
        claseCss: "nota-amarillo"
      };
    } else {
      return {
        rango: "notable-sobresaliente",
        bg: "#dcfce7",
        color: "#166534",
        border: "#4ade80",
        label: "Notable / Sobresaliente (7 - 10)",
        claseCss: "nota-verde"
      };
    }
  },

  // Extrae el ID de una URL de Google Sheets
  extraerSheetId(url) {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }
};

window.CONFIG = CONFIG;
