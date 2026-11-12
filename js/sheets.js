/**
 * GESTIÓN DE CONSULTAS A GOOGLE SHEETS Y ENDPOINTS DE ALUMNOS
 * Descarga de CSV, parsing con soporte de fechas, tiempos y filtros.
 */

const SheetsService = {
  // Caché en memoria durante la sesión
  _cacheGruposValidos: null,
  _cacheAlumnosPorGrupo: {},
  _cacheCalificacionesPorApp: {},
  _cacheCsvPorGrupo: {},

  // ==========================================
  // OBTENER GRUPOS CON ALUMNOS (Carga Ultra-Rápida Instantánea)
  // ==========================================
  // OBTENER GRUPOS CON ALUMNOS (Carga Ultra-Rápida con Sincronización Dinámica)
  // ==========================================
  async obtenerGruposConAlumnos(forzarRed = false) {
    if (forzarRed) {
      return await this._consultarGruposDeRed();
    }

    if (this._cacheGruposValidos && this._cacheGruposValidos.length > 0) {
      return this._cacheGruposValidos;
    }

    // 1. Intentar desde localStorage (caché previa persistente en el dispositivo)
    const guardados = StorageManager.getGroupsCache();
    if (guardados && guardados.length > 0) {
      this._cacheGruposValidos = guardados;
      guardados.forEach(grp => {
        this._cacheAlumnosPorGrupo[grp.id] = grp.alumnos;
      });
      return guardados;
    }

    // 2. Si no hay nada en caché local aún, usar datos maestros iniciales (0 ms)
    const cacheData = {
      "1ESO-A": ["Arance Sánchez, Lucía", "Arrieta Senra, Nicolás", "Baena Suárez, Noelia", "Baena Suárez, Raúl", "Barba Romero, Rocío", "Barua Conde, Lucca Naon", "Boza Payán, Carmen", "Campos Hidalgo, Hugo", "Delgado Echegoyan, Rocío", "Fernández Berrocal, Manuel", "Gómez Carmona, Dylan Andrés", "González Guerra, Abel", "Lin, Zixuan", "Luceño Guzmán, Rodrigo", "Molina Reina, Daniela", "Mondir, Mohamed", "Morgado Santos, Oriana", "Negrón Garófano, Enrique", "Olivares Benítez, Isidoro", "Orellana Cazorla, Salvador", "Romero Cid, Julia", "Romero Hermoso, Teresa", "Romero Rodríguez, Inés", "Sánchez-Arjona Santos, Emma", "Segura Lobón, Vega", "Simino Ramos, Lara", "Toscano Soto, Mireya", "Tsyrul, Anna", "Villalón Rubio, Leo"],
      "1ESO-B": ["Abreu Álvarez, Ana María", "Alvez Macías, Javier", "Barrios Paraíso, Cherezade", "Bustos Benítez, Kira", "Cárdenas Salas, Sophia", "Delgado Naya, Lucía", "Faus Zürcher, Inés", "Fernández Ruiz, Manuel", "Hurtado Hernández, Rubén", "Lama De Luque, Lucía", "Lara García, Dolores", "León Fernández, Juan Manuel", "Muñoz Quintero, Gabriela", "Parra Triano, Esperanza Triana", "Peña González, Claudia", "Pérez Márquez, Nacho", "Polvillo Orden, Manuel", "Poncelet Villarejo, Inés", "Postigo Gómez, Carlos", "Pozo Oliva, José Manuel", "Ramírez de Aguilera Mazo, Pablo", "Romero Pérez, Juan José", "Rubio González, Claudia", "Rubio Rosales, Jesús", "Rubio Rosales, Lola", "Sánchez De Paz, Ángela", "Santos Romero, Ezequiel", "Sosa Sanabria, Cecilio"],
      "1ESO-C": ["Berenjeno Mesa, Jaime", "Berradi García, Inas", "Bezze Soto, Lucas", "Castejón Santos, Guillermo", "Conde El Ghazouani, Ayman", "De Alba Ruiz, Rafael", "Díaz Cotán, Lucía", "Díaz Román, Triana", "Fernández Luna, Jesús", "García Rodríguez, José Antonio", "García Rodríguez, María", "González Ramos, Aitor", "Guerrero Miranda, Victoria", "Hidalgo Aguilar, Daniel", "Lefevre López, Santiago", "López Martín, Jorge", "López Moral, Arun", "Manso Márquez, Vera", "Márquez Míguez, Nicolás", "Martín Seoane, Martina", "Mora Martín, Mario", "Otero Ortega, José", "Ramírez Hidalgo, Adrián", "Rodríguez Contreras, Hugo", "Salas Huidobro, Alejandra", "Sánchez Tortolero, Alejandra", "Soriano De Serpa Pimentel, Mariana", "Vargas Arellano, Alba", "Vázquez Muñoz, Macarena"],
      "2ESO-A": ["Aguilar Rodríguez, Antonio", "Benítez Arce, José Antonio", "Caballero Cumplido, José Antonio", "Domínguez Benítez, Eire", "Garfia Gutiérrez, Hugo", "Gordillo Jaramillo, Juan Pablo", "Guzmán Castellón, Gonzálo", "Hernández Gutiérrez, Nadia", "López Leiva, Abel", "Marqués Ortega, Alejandro", "Medina Chamorro, Ainara", "Méndez Palomo, Alejandra", "Monge Peterova, Teresa Trinidad", "Montañez Pozo, Saray", "Peña Marín, Antonio", "Respaldo Bazán, Oscar", "Rosales Sollo, Sergio", "Rubio Magro, Ayla", "Ruiz de Alarcón Carmona, María", "Ruiz Slienger, Milo", "Salas García, Javier", "Sánchez-Garrido Martín, Daniel", "Sivianes Hidalgo, Blanca", "Suárez Muñoz, Angela"],
      "2ESO-B": ["Amine, Aya", "Barroso Garrido, Adrián", "Carbonero Casadiego, Daniela", "Del Bosch Olivares, José Pablo", "Del Valle Ruiz, Marco", "Delgado García, Alba", "Denton Álvarez, James", "Egea Gemba, Lorenzo", "Espinosa López, David", "Fernández Ibáñez, Esperanza", "Fernández Márquez, Jesús", "Fernández Muñoz, Esperanza", "Galván Martínez, Ángela", "Gotor Rodríguez, Iván", "Guerra López, Lola", "Jaime Gómez, Carlos", "Jurado Agraz, Lola", "Linares Mora, Adriana", "Montané Rivera, Paula", "Moreno Fernández, Aitor", "Murciano Losada, Marina", "Ortiz Domínguez, Marcos", "Parrilla Caro, Eva", "Romero Fernández, Valeria", "Suárez García, Aitor", "Zapico Señas, Gonzalo"],
      "2ESO-C": ["Blanco Herrera, Emilio", "Camino Martínez, Guillermo", "Caparrós Rodríguez, Mario", "Cherradi Amezean, Mohammed Saad", "Delgado García, Pablo", "Fernández Berrocal, Matías", "Fernández Moreno, Lorenzo", "Fernández Moreno, Pepe", "Gómez Garrido, Julia", "Hidalgo Wolf, Leo", "León Campos, Amanda", "López Raposo, Martina", "López Zapata, Manuel", "Maldonado Domínguez, Alejandro David", "Marín Pérez, María", "Martín Castillo, Alba", "Parra Oyarzun, Juan Antonio", "Romero Carrascal, Valentina", "Santos Aguilar, Abraham", "Segura Lobón, Ariadna", "Vidal García, Pablo", "Zambrano Romero, Ana"],
      "4ESO-A": ["Pérez Sánchez, Pepito"]
    };

    const gruposEncontrados = [];
    for (const [idGrupo, lista] of Object.entries(cacheData)) {
      if (lista && lista.length > 0) {
        const [curso, letra] = idGrupo.split("-");
        const numCurso = curso.replace(/\D/g, "");
        const alumnosObjs = lista.map(nombreCompleto => ({
          textoDesplegable: nombreCompleto,
          nombreOriginal: nombreCompleto.split(",")[1]?.trim() || "",
          apellidosOriginal: nombreCompleto.split(",")[0]?.trim() || nombreCompleto
        }));

        gruposEncontrados.push({
          id: idGrupo,
          curso: curso,
          letra: letra,
          codigo: idGrupo,
          titulo: idGrupo,
          subtitulo: `Clase de Música. ${numCurso}º de ESO`,
          numAlumnos: alumnosObjs.length,
          alumnos: alumnosObjs
        });
        this._cacheAlumnosPorGrupo[idGrupo] = alumnosObjs;
      }
    }

    gruposEncontrados.sort((a, b) => a.id.localeCompare(b.id));
    this._cacheGruposValidos = gruposEncontrados;
    StorageManager.saveGroupsCache(gruposEncontrados);
    return gruposEncontrados;
  },

  // Consulta en tiempo real al Apps Script de todos los cursos y grupos posibles en paralelo
  async _consultarGruposDeRed() {
    const cursos = CONFIG.CURSOS_POSIBLES || ["1ESO", "2ESO", "3ESO", "4ESO"];
    const letras = CONFIG.GRUPOS_LETRAS || ["A", "B", "C", "D"];
    const promesas = [];

    for (const curso of cursos) {
      for (const letra of letras) {
        promesas.push(
          this._consultarAlumnosGrupo(curso, letra).then(alumnos => {
            if (alumnos && alumnos.length > 0) {
              const idGrupo = `${curso}-${letra}`;
              const numCurso = curso.replace(/\D/g, "");
              const alumnosFormateados = alumnos.map(al => {
                if (typeof al === "string") {
                  return {
                    textoDesplegable: al,
                    nombreOriginal: al.split(",")[1]?.trim() || "",
                    apellidosOriginal: al.split(",")[0]?.trim() || al
                  };
                }
                return al;
              });

              return {
                id: idGrupo,
                curso: curso,
                letra: letra,
                codigo: idGrupo,
                titulo: idGrupo,
                subtitulo: `Clase de Música. ${numCurso}º de ESO`,
                numAlumnos: alumnosFormateados.length,
                alumnos: alumnosFormateados
              };
            }
            return null;
          }).catch(() => null)
        );
      }
    }

    try {
      const resultados = (await Promise.all(promesas)).filter(Boolean);
      if (resultados.length > 0) {
        resultados.sort((a, b) => a.id.localeCompare(b.id));
        this._cacheGruposValidos = resultados;
        resultados.forEach(grp => {
          this._cacheAlumnosPorGrupo[grp.id] = grp.alumnos;
        });
        StorageManager.saveGroupsCache(resultados);
        return resultados;
      }
    } catch(e) {
      console.warn("Error al consultar grupos de red:", e);
    }
    return this._cacheGruposValidos || [];
  },

  // Consulta individual al Apps Script oficial
  async _consultarAlumnosGrupo(curso, letra) {
    const url = `${CONFIG.URL_LISTADO_ALUMNOS}?curso=${encodeURIComponent(curso)}&grupo=${encodeURIComponent(letra)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.alumnos) ? data.alumnos : [];
    } catch(e) {
      clearTimeout(timeout);
      return [];
    }
  },

  // Obtiene los alumnos de un grupo específico
  async obtenerAlumnosDeGrupo(idGrupo) {
    if (this._cacheAlumnosPorGrupo[idGrupo]) {
      return this._cacheAlumnosPorGrupo[idGrupo];
    }
    const grupos = await this.obtenerGruposConAlumnos();
    const grp = grupos.find(g => g.id === idGrupo);
    return grp ? grp.alumnos : [];
  },

  // ==========================================
  // OBTENER Y PROCESAR CALIFICACIONES DE UNA APP
  // ==========================================
  async obtenerCalificacionesApp(app, idGrupo, rangoFechas, forzar = false) {
    const cacheKey = `${app.id}_${idGrupo}`;

    // Si no tiene sheetId vinculado
    if (!app.sheetId) {
      if (StorageManager.isDemoModeActive()) {
        return this._generarDatosSimuladosApp(app, idGrupo, rangoFechas);
      }
      return {
        id: app.id,
        appId: app.id,
        nombre: app.nombre,
        titulo: app.tituloVisible,
        tienePruebas: false,
        totalPruebas: 0,
        alumnosDatos: {}
      };
    }

    try {
      // 1. Intentar descargar CSV de la pestaña del grupo (ej: 1ESO-A)
      // Google Sheets soporta CORS abierto en /export?format=csv&sheet=...
      const lineasCsv = await this._descargarCsvGrupo(app.sheetId, idGrupo, forzar);
      const pruebas = this._parsearCsvCalificaciones(lineasCsv, idGrupo);

      // Si no hay filas de prueba en la pestaña del grupo, intentar pestaña general
      let pruebasFinales = pruebas;
      if (pruebas.length === 0) {
        // Intentar pestaña "A", "B", etc. o "Medias_y_Resumen"
        const letraGrupo = idGrupo.split("-")[1] || "A";
        try {
          const altCsv = await this._descargarCsvGrupo(app.sheetId, letraGrupo, forzar);
          const altPruebas = this._parsearCsvCalificaciones(altCsv, idGrupo);
          if (altPruebas.length > 0) {
            pruebasFinales = altPruebas;
          }
        } catch(e) {}
      }

      // Si aún así no hay pruebas y estamos en modo demo, permitir preview
      if (pruebasFinales.length === 0 && StorageManager.isDemoModeActive()) {
        return this._generarDatosSimuladosApp(app, idGrupo, rangoFechas);
      }

      // 2. Filtrar pruebas por el rango de fechas (Requisito 4)
      const pruebasFiltradas = pruebasFinales.filter(p => {
        if (!p.fecha) return true; // Si no tiene fecha, se incluye
        const t = p.fecha.getTime();
        return t >= rangoFechas.inicio.getTime() && t <= rangoFechas.fin.getTime();
      });

      // 3. Regla de negocio (Requisito 5):
      // "Si no se han realizado pruebas en alguna de las apps debe obviarse de esta pantalla,
      // es decir, sólo deben aparecer resultados a partir de la primera prueba."
      const tienePruebas = pruebasFiltradas.length > 0;

      // 4. Agrupar por alumno y calcular medias y tiempos
      const alumnosDatos = {};
      for (const p of pruebasFiltradas) {
        const nombreNormalizado = this.normalizarNombre(p.nombreAlumno);
        if (!alumnosDatos[nombreNormalizado]) {
          alumnosDatos[nombreNormalizado] = {
            nombreOriginal: p.nombreAlumno,
            pruebas: [],
            sumaNotas: 0,
            sumaSegundos: 0,
            notaMedia: 0,
            totalPruebas: 0
          };
        }
        alumnosDatos[nombreNormalizado].pruebas.push(p);
        alumnosDatos[nombreNormalizado].sumaNotas += p.nota;
        alumnosDatos[nombreNormalizado].sumaSegundos += (p.segundos || 60);
      }

      // Calcular medias finales por alumno
      for (const key in alumnosDatos) {
        const ad = alumnosDatos[key];
        ad.totalPruebas = ad.pruebas.length;
        ad.notaMedia = ad.totalPruebas > 0 ? (ad.sumaNotas / ad.totalPruebas) : null;
      }

      return {
        id: app.id,
        appId: app.id,
        nombre: app.nombre,
        titulo: app.tituloVisible,
        tituloVisible: app.tituloVisible,
        bloque: app.bloque || CONFIG.BLOQUES.LENGUAJE,
        bloqueNombre: app.bloqueNombre || CONFIG.NOMBRES_BLOQUES[CONFIG.BLOQUES.LENGUAJE],
        color: app.color,
        icono: app.icono,
        tienePruebas: tienePruebas,
        totalPruebas: pruebasFiltradas.length,
        alumnosDatos: alumnosDatos
      };
    } catch(err) {
      console.warn(`Error al consultar calificaciones de ${app.nombre}:`, err);
      if (StorageManager.isDemoModeActive()) {
        return this._generarDatosSimuladosApp(app, idGrupo, rangoFechas);
      }
      return {
        id: app.id,
        appId: app.id,
        nombre: app.nombre,
        titulo: app.tituloVisible,
        tituloVisible: app.tituloVisible,
        bloque: app.bloque || CONFIG.BLOQUES.LENGUAJE,
        bloqueNombre: app.bloqueNombre || CONFIG.NOMBRES_BLOQUES[CONFIG.BLOQUES.LENGUAJE],
        tienePruebas: false,
        totalPruebas: 0,
        alumnosDatos: {},
        error: err.message
      };
    }
  },

  // Descarga el CSV de una pestaña de Google Sheet con caché corta en memoria y bypass para Tiempo Real
  async _descargarCsvGrupo(sheetId, nombrePestana, forzar = false) {
    if (!sheetId) return [];
    const cacheKey = `${sheetId}_${nombrePestana}`;
    const ahora = Date.now();

    // Si tenemos datos en caché con menos de 15 segundos y no es forzado, devolver instantáneo
    if (!forzar && this._cacheCsvPorGrupo[cacheKey] && (ahora - this._cacheCsvPorGrupo[cacheKey].timestamp < 15000)) {
      return this._cacheCsvPorGrupo[cacheKey].data;
    }

    const timestamp = ahora;
    // Usamos el endpoint GViz oficial que siempre respeta el nombre exacto de pestaña y tiene CORS abierto
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nombrePestana)}&t=${timestamp}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store"
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const lineas = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      this._cacheCsvPorGrupo[cacheKey] = {
        data: lineas,
        timestamp: ahora
      };
      return lineas;
    } catch(e) {
      clearTimeout(timeout);
      // Fallback a /export si gviz falla
      try {
        const fallbackUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(nombrePestana)}&_nocache=${timestamp}`;
        const res2 = await fetch(fallbackUrl);
        if (res2.ok) {
          const text2 = await res2.text();
          const lineas2 = text2.split(/\r?\n/).filter(l => l.trim().length > 0);
          return lineas2;
        }
      } catch(e2) {}

      // Si la petición falla o hace timeout pero tenemos caché previa, devolverla
      if (this._cacheCsvPorGrupo[cacheKey]) {
        return this._cacheCsvPorGrupo[cacheKey].data;
      }
      throw e;
    }
  },

  // Parsea las filas CSV a objetos de calificación
  _parsearCsvCalificaciones(lineas, idGrupo) {
    if (!lineas || lineas.length <= 1) return [];

    // Fila 1: Cabeceras
    const cabeceras = this._parsearLineaCsv(lineas[0]).map(c => c.toLowerCase().trim());
    
    // Identificar índices de columnas
    let idxNombre = cabeceras.findIndex(c => c.includes("nombre"));
    if (idxNombre === -1) idxNombre = 0;

    let idxNotaMedia = cabeceras.findIndex(c => c.includes("media"));
    let idxPuntos = cabeceras.findIndex(c => c.includes("punto") || c.includes("puntuaci"));
    let idxNivel = cabeceras.findIndex(c => c.includes("nivel") || c.includes("dictado") || c.includes("intervalo"));
    let idxTiempo = cabeceras.findIndex(c => c.includes("tiempo"));
    let idxFecha = cabeceras.findIndex(c => c.includes("fecha") || c.includes("hora"));

    const resultados = [];

    for (let i = 1; i < lineas.length; i++) {
      const celdas = this._parsearLineaCsv(lineas[i]);
      if (celdas.length <= 1) continue;

      const nombre = celdas[idxNombre]?.trim();
      if (!nombre || nombre.toLowerCase().includes("test_") || nombre.toLowerCase() === "nombre") continue;

      // Obtener la nota de esta prueba (o la media de la fila si solo hay 1 columna de nota)
      let notaStr = "";
      if (idxPuntos !== -1 && celdas[idxPuntos] !== undefined && celdas[idxPuntos] !== "") {
        notaStr = celdas[idxPuntos];
      } else if (idxNotaMedia !== -1 && celdas[idxNotaMedia] !== undefined && celdas[idxNotaMedia] !== "") {
        notaStr = celdas[idxNotaMedia];
      }

      // Convertir "9,5" o "9.5" a float
      const notaNum = this.parsearNota(notaStr);
      if (notaNum === null) continue;

      const nivelStr = idxNivel !== -1 ? (celdas[idxNivel] || "") : "";
      const tiempoStr = idxTiempo !== -1 ? (celdas[idxTiempo] || "") : "";
      const fechaStr = idxFecha !== -1 ? (celdas[idxFecha] || "") : "";

      const fechaObj = this.parsearFecha(fechaStr);
      const segundos = this.parsearTiempoASegundos(tiempoStr);

      resultados.push({
        nombreAlumno: nombre,
        nota: notaNum,
        nivel: nivelStr || "Prueba estándar",
        tiempoTexto: tiempoStr || `${Math.round(segundos / 60)} min`,
        segundos: segundos,
        fecha: fechaObj,
        fechaVisible: this.formatearFechaVisible(fechaObj)
      });
    }

    return resultados;
  },

  // Parser robusto de líneas CSV que respeta comillas dobles y comas internas
  _parsearLineaCsv(linea) {
    const res = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (inQuotes && linea[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        res.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    res.push(cur);
    return res;
  },

  // Convierte cadenas como "9,5" o "10" o "8.25" a número 0-10
  parsearNota(str) {
    if (str === null || str === undefined) return null;
    let s = String(str).replace(",", ".").trim();
    const num = parseFloat(s);
    if (isNaN(num)) return null;
    return Math.min(10, Math.max(0, num));
  },

  // Convierte textos de tiempo ("1 Minuto", "45 seg", "17 min", "02:15") a segundos
  parsearTiempoASegundos(str) {
    if (!str) return 60; // 1 min por defecto
    const s = String(str).toLowerCase().trim();

    // Formato mm:ss
    if (s.includes(":")) {
      const partes = s.split(":");
      const min = parseInt(partes[0], 10) || 0;
      const sec = parseInt(partes[1], 10) || 0;
      return (min * 60) + sec;
    }

    // "X min" o "X minutos"
    const matchMin = s.match(/(\d+)\s*(min|m)/);
    if (matchMin) {
      return parseInt(matchMin[1], 10) * 60;
    }

    // "X seg" o "X segundos"
    const matchSeg = s.match(/(\d+)\s*(s|seg)/);
    if (matchSeg) {
      return parseInt(matchSeg[1], 10);
    }

    const soloNum = parseInt(s, 10);
    if (!isNaN(soloNum)) {
      // Si es un número pequeño (< 30), interpretarlo como minutos
      return soloNum <= 30 ? soloNum * 60 : soloNum;
    }

    return 60;
  },

  // Formatea segundos a texto legible ("17 min", "1 min 20 s")
  formatearSegundos(segundos) {
    if (!segundos || segundos <= 0) return "0 min";
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    if (min === 0) return `${seg} seg`;
    if (seg === 0) return `${min} min`;
    return `${min} min ${seg} s`;
  },

  // Parsea fechas de Google Sheets (formato "dd/MM/yyyy HH:mm:ss" o ISO o Date(y,m,d))
  parsearFecha(str) {
    if (!str) return new Date();
    const s = String(str).trim();

    // Formato GViz: Date(2026,10,6,13,11,18)
    const matchGviz = s.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
    if (matchGviz) {
      const y = parseInt(matchGviz[1], 10);
      const m = parseInt(matchGviz[2], 10);
      const d = parseInt(matchGviz[3], 10);
      const hh = parseInt(matchGviz[4] || 0, 10);
      const mm = parseInt(matchGviz[5] || 0, 10);
      const ss = parseInt(matchGviz[6] || 0, 10);
      return new Date(y, m, d, hh, mm, ss);
    }

    // Formato español: "6/11/2026 13:11:18" o "06/11/2026"
    const partesEsp = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (partesEsp) {
      const d = parseInt(partesEsp[1], 10);
      const m = parseInt(partesEsp[2], 10) - 1;
      const y = parseInt(partesEsp[3], 10);
      const hh = parseInt(partesEsp[4] || 12, 10);
      const mm = parseInt(partesEsp[5] || 0, 10);
      const ss = parseInt(partesEsp[6] || 0, 10);
      return new Date(y, m, d, hh, mm, ss);
    }

    const t = Date.parse(s);
    if (!isNaN(t)) return new Date(t);

    return new Date();
  },

  // Formato visual amigable de fecha estilo Edpuzzle (ej: "nov. 6º" o "06 nov. 2026, 13:11")
  formatearFechaVisible(fecha) {
    if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) return "";
    const meses = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
    const m = meses[fecha.getMonth()];
    const d = fecha.getDate();
    const hh = String(fecha.getHours()).padStart(2, "0");
    const mm = String(fecha.getMinutes()).padStart(2, "0");
    return `${m} ${d}º - ${hh}:${mm}`;
  },

  // Normaliza nombres para comparación flexible (acentos, mayúsculas, comas)
  normalizarNombre(nombre) {
    if (!nombre) return "";
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  },

  // Obtiene lista de palabras/tokens normalizados para comparar sin importar el orden
  obtenerTokensNombre(nombre) {
    if (!nombre) return [];
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(t => t.length >= 2)
      .sort();
  },

  // Comprueba si dos cadenas representan el mismo alumno (ej: "Arance Sánchez, Lucía" vs "Lucía Arance Sánchez")
  sonMismoAlumno(a, b) {
    if (!a || !b) return false;
    const na = this.normalizarNombre(a);
    const nb = this.normalizarNombre(b);
    if (na === nb) return true;
    if (na.length > 5 && nb.includes(na)) return true;
    if (nb.length > 5 && na.includes(nb)) return true;

    // Comparar por palabras ordenadas alfabéticamente
    const tokA = this.obtenerTokensNombre(a);
    const tokB = this.obtenerTokensNombre(b);
    if (tokA.length > 0 && tokB.length > 0) {
      if (tokA.join("_") === tokB.join("_")) return true;
      // Si ambos tienen más de 2 palabras y comparten al menos 2 palabras clave
      const comunes = tokA.filter(t => tokB.includes(t));
      if (comunes.length >= 2 && comunes.length >= Math.min(tokA.length, tokB.length) - 1) {
        return true;
      }
    }
    return false;
  },

  // =========================================================================
  // GENERADOR DE DATOS DE SIMULACIÓN PARA PREVIEW IDÉNTICO A CAPTURA 1 Y 2
  // =========================================================================
  _generarDatosSimuladosApp(app, idGrupo, rangoFechas) {
    // Si estamos en 1ESO-A, replicar las notas de CAPTURA_1.png y CAPTURA_2.png
    const alumnos = this._cacheAlumnosPorGrupo[idGrupo] || [];
    const alumnosDatos = {};

    // Puntuaciones base para los primeros alumnos de la captura 1
    const notasCaptura = {
      "arancesanchezlucia": [10.0, 8.4, 6.7, 10.0, 10.0],
      "arrietasenranicolas": [10.0, 9.5, 10.0, 8.9, 8.4],
      "baenasuareznoelia": [10.0, 9.2, 8.4, 10.0, 10.0],
      "baenasuarezraul": [10.0, 10.0, 10.0, 10.0, 10.0],
      "barbaromerorocio": [8.4, 10.0, 10.0, 10.0, 6.7]
    };

    // Tiempos invertidos de la captura 1
    const tiemposCaptura = {
      "arancesanchezlucia": 17 * 60,
      "arrietasenranicolas": 39 * 60,
      "baenasuareznoelia": 17 * 60,
      "baenasuarezraul": 19 * 60,
      "barbaromerorocio": 23 * 60
    };

    // Títulos de actividades de CAPTURA_2.png
    const actividadesCaptura2 = [
      { tit: "U1. LAS CUALIDADES DEL SONIDO (VIII). LA INTENSIDAD", fecha: "2026-11-11T10:00:00" },
      { tit: "U1. LAS CUALIDADES DEL SONIDO. LA DURACIÓN (VI). SIGNOS DE PROLONGACIÓN (VII)", fecha: "2026-11-02T11:15:00" },
      { tit: "U1. LAS CUALIDADES DEL SONIDO (VI). LA DURACIÓN", fecha: "2026-11-02T10:45:00" },
      { tit: "U1. LAS CUALIDADES DEL SONIDO (VII). LA DURACIÓN. SIGNOS DE PROLONGACIÓN", fecha: "2026-11-02T09:30:00" },
      { tit: "U1. LAS CUALIDADES DEL SONIDO (V). LA ALTURA", fecha: "2026-10-27T12:00:00" }
    ];

    // Asignar una actividad correspondiente según la app
    const appIndex = CONFIG.APPS_BASE.findIndex(b => b.id === app.id);
    const idxAct = appIndex >= 0 ? appIndex : 0;

    let totalPruebasGlobal = 0;

    for (let i = 0; i < alumnos.length; i++) {
      const al = alumnos[i];
      const norm = this.normalizarNombre(al.textoDesplegable);
      
      let notaFinal = 0;
      let segundos = 0;
      let listaPruebas = [];

      if (notasCaptura[norm]) {
        notaFinal = notasCaptura[norm][idxAct % notasCaptura[norm].length];
        segundos = Math.round((tiemposCaptura[norm] || 1200) / 5);
        
        // Generar las pruebas del alumno para esta app
        const actInfo = actividadesCaptura2[idxAct % actividadesCaptura2.length];
        const fechaObj = new Date(actInfo.fecha);

        // Si la prueba cae dentro del rango de fechas
        if (fechaObj >= rangoFechas.inicio && fechaObj <= rangoFechas.fin) {
          listaPruebas.push({
            nombreAlumno: al.textoDesplegable,
            nota: notaFinal,
            nivel: actInfo.tit,
            tiempoTexto: `${Math.round(segundos / 60)} min`,
            segundos: segundos,
            fecha: fechaObj,
            fechaVisible: this.formatearFechaVisible(fechaObj)
          });
        }
      } else {
        // Alumnos restantes: notas generadas aleatoriamente realistas (entre 5.5 y 10)
        // Pseudo-aleatorio consistente basado en el índice
        const seed = (i * 17 + idxAct * 31) % 100;
        notaFinal = Math.round((5.5 + (seed / 100) * 4.5) * 10) / 10;
        segundos = (2 + (seed % 6)) * 60;
        
        const fechaObj = new Date(2026, 10, (i % 8) + 1, 10, seed % 60);
        if (fechaObj >= rangoFechas.inicio && fechaObj <= rangoFechas.fin) {
          listaPruebas.push({
            nombreAlumno: al.textoDesplegable,
            nota: notaFinal,
            nivel: `${app.tituloVisible} - Ejercicio Unidad ${(idxAct + 1)}`,
            tiempoTexto: `${Math.round(segundos / 60)} min`,
            segundos: segundos,
            fecha: fechaObj,
            fechaVisible: this.formatearFechaVisible(fechaObj)
          });
        }
      }

      if (listaPruebas.length > 0) {
        totalPruebasGlobal += listaPruebas.length;
        alumnosDatos[norm] = {
          nombreOriginal: al.textoDesplegable,
          pruebas: listaPruebas,
          sumaNotas: listaPruebas.reduce((acc, p) => acc + p.nota, 0),
          sumaSegundos: listaPruebas.reduce((acc, p) => acc + p.segundos, 0),
          notaMedia: notaFinal,
          totalPruebas: listaPruebas.length
        };
      }
    }

    return {
      id: app.id,
      appId: app.id,
      nombre: app.nombre,
      titulo: app.tituloVisible,
      tituloVisible: app.tituloVisible,
      bloque: app.bloque || CONFIG.BLOQUES.LENGUAJE,
      bloqueNombre: app.bloqueNombre || CONFIG.NOMBRES_BLOQUES[CONFIG.BLOQUES.LENGUAJE],
      color: app.color,
      icono: app.icono,
      tienePruebas: totalPruebasGlobal > 0,
      totalPruebas: totalPruebasGlobal,
      alumnosDatos: alumnosDatos
    };
  }
};

window.SheetsService = SheetsService;
