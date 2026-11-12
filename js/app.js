/**
 * CONTROLADOR PRINCIPAL DEL CUADERNO DIGITAL DEL PROFESOR
 * Gestión de interfaz, vistas, modales, mapa de calor y navegación.
 */

(function() {
  // Estado local de la aplicación
  let state = {
    autenticado: false,
    gruposDisponibles: [],
    grupoSeleccionado: null,
    appsConfiguradas: [],
    appsConPruebas: [],
    alumnosGrupo: [],
    matrizCalificaciones: [],
    filtroBusqueda: "",
    rangoFechas: {
      inicio: null,
      fin: null,
      inicioISO: "",
      finISO: ""
    },
    alumnoModalActual: null,
    indiceAlumnoModal: 0,
    cargando: false,
    escalaCien: false // Escala oficial de calificaciones 0 - 10 por defecto
  };

  // Avatar SVG oficial del profesor estilo Edpuzzle (Captura 1 y 2)
  const SVG_AVATAR_DOCENTE = `
    <div style="display:inline-flex; align-items:center; gap:4px;">
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="18" fill="#FDE68A"/>
        <circle cx="18" cy="15" r="9" fill="#FCD34D"/>
        <path d="M9 14C9 9 13 6 18 6C23 6 27 9 27 14C27 11 23 8 18 8C13 8 9 11 9 14Z" fill="#D97706"/>
        <circle cx="14" cy="15" r="3" stroke="#1F2937" stroke-width="1.5" fill="none"/>
        <circle cx="22" cy="15" r="3" stroke="#1F2937" stroke-width="1.5" fill="none"/>
        <line x1="17" y1="15" x2="19" y2="15" stroke="#1F2937" stroke-width="1.5"/>
        <path d="M15 20C16 21 20 21 21 20" stroke="#92400E" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M12 28C12 24 14 23 18 23C22 23 24 24 24 28" fill="#3B82F6"/>
        <polygon points="18,23 16.5,27 18,29 19.5,27" fill="#EF4444"/>
      </svg>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12h1M6 8v8M10 5v14M14 9v6M18 11v2M21 12h1"/>
      </svg>
    </div>
  `;

  function formatearNotaValor(nota) {
    if (nota === null || nota === undefined || isNaN(nota) || nota === "") return "-";
    const n = parseFloat(nota);
    if (state.escalaCien) {
      return Math.round(n * 10);
    }
    // Escala oficial 0 a 10: entero sin decimales (ej: 10, 8) o con decimal (ej: 9.5, 6.7)
    return Number(n.toFixed(1)).toString();
  }

  function formatearFechaCorta(fecha) {
    if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) return "";
    const meses = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
    return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
  }

  function actualizarTextosFechas() {
    const dInicio = document.getElementById("display-fecha-inicio");
    const dFin = document.getElementById("display-fecha-fin");
    if (dInicio && state.rangoFechas.inicio) {
      dInicio.textContent = formatearFechaCorta(state.rangoFechas.inicio);
    }
    if (dFin && state.rangoFechas.fin) {
      const hoy = new Date();
      if (state.rangoFechas.fin.toDateString() === hoy.toDateString()) {
        dFin.textContent = "Hoy";
      } else {
        dFin.textContent = formatearFechaCorta(state.rangoFechas.fin);
      }
    }
  }

  // =========================================================================
  // INICIALIZACIÓN
  // =========================================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initApp());
  } else {
    initApp();
  }

  async function initApp() {
    // Modo preview rápido por URL si se requiere
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demo") === "1" || urlParams.get("preview") === "1") {
      StorageManager.login(CONFIG.CLAVE_DOCENTE);
      StorageManager.setDemoMode(true);
    }

    // 1. Rango de fechas por defecto (Requisito 4: 1 sept anterior a hoy)
    const rangoDef = StorageManager.getDateRange();
    state.rangoFechas = {
      inicio: new Date(rangoDef.inicioISO + "T00:00:00"),
      fin: new Date(rangoDef.finISO + "T23:59:59"),
      inicioISO: rangoDef.inicioISO,
      finISO: rangoDef.finISO
    };

    // Actualizar campos de fecha en la UI
    const inputInicio = document.getElementById("filtro-fecha-inicio");
    const inputFin = document.getElementById("filtro-fecha-fin");
    if (inputInicio) inputInicio.value = state.rangoFechas.inicioISO;
    if (inputFin) inputFin.value = state.rangoFechas.finISO;
    actualizarTextosFechas();

    // 2. Comprobar autenticación (Requisito 2 y Landing Page Segura)
    state.autenticado = StorageManager.isAuthenticated();
    if (!state.autenticado) {
      mostrarLandingPage();
    } else {
      ocultarLandingPage();
      await cargarCuadernoDocente();
      iniciarSincronizacionTiempoReal();
      if (urlParams.get("modal") !== null) {
        const modalIdx = parseInt(urlParams.get("modal") || "0", 10);
        const appId = urlParams.get("app");
        const scrollPos = parseInt(urlParams.get("scroll") || "0", 10);
        setTimeout(() => {
          abrirModalAlumno(modalIdx, appId);
          if (scrollPos > 0) {
            setTimeout(() => {
              const cont = document.getElementById("modal-alumno-desglose-apps");
              if (cont) cont.scrollTop = scrollPos;
            }, 250);
          }
        }, 350);
      }
    }

    // 3. Vincular eventos globales de la interfaz
    vincularEventosUI();
  }

  // =========================================================================
  // GESTIÓN DE LA LANDING PAGE DE ACCESO SEGURO (Clave: 1750*Diag0nal*121068)
  // =========================================================================
  function mostrarLandingPage() {
    const landing = document.getElementById("landing-page-portal");
    const dashboard = document.getElementById("app-dashboard-wrapper");
    if (landing) landing.classList.remove("hidden");
    if (dashboard) dashboard.classList.add("hidden");

    const inputPass = document.getElementById("landing-password-input");
    if (inputPass) {
      inputPass.value = "";
      setTimeout(() => inputPass.focus(), 250);
    }
  }

  function ocultarLandingPage() {
    const landing = document.getElementById("landing-page-portal");
    const dashboard = document.getElementById("app-dashboard-wrapper");
    if (landing) landing.classList.add("hidden");
    if (dashboard) dashboard.classList.remove("hidden");
  }

  function procesarLandingLogin() {
    const inputPass = document.getElementById("landing-password-input");
    const errorMsg = document.getElementById("landing-error-alert");
    const clave = inputPass ? inputPass.value : "";

    if (StorageManager.login(clave)) {
      state.autenticado = true;
      if (errorMsg) errorMsg.classList.add("hidden");
      ocultarLandingPage();
      cargarCuadernoDocente();
      iniciarSincronizacionTiempoReal();
    } else {
      if (errorMsg) {
        errorMsg.textContent = "Contraseña incorrecta. Por favor, introduce la clave autorizada.";
        errorMsg.classList.remove("hidden");
      }
      if (inputPass) {
        inputPass.classList.add("input-shake");
        setTimeout(() => inputPass.classList.remove("input-shake"), 500);
        inputPass.select();
      }
    }
  }

  function procesarLogout() {
    if (confirm("¿Deseas cerrar la sesión docente de tu cuaderno de calificaciones?")) {
      StorageManager.logout();
      state.autenticado = false;
      location.reload();
    }
  }

  // =========================================================================
  // CARGA DE DATOS DEL CUADERNO
  // =========================================================================
  async function cargarCuadernoDocente() {
    mostrarLoader("Cargando grupos y alumnos...");

    // Cargar apps configuradas
    state.appsConfiguradas = StorageManager.getAppsList();

    try {
      // Requisito 3: Solo los grupos en los que haya alumnos dentro de la hoja común
      state.gruposDisponibles = await SheetsService.obtenerGruposConAlumnos();
      
      // Renderizar sidebar de grupos (Requisito 3)
      renderizarSidebarGrupos();

      // Seleccionar grupo activo guardado o el primero disponible
      const idGuardado = StorageManager.getActiveGroupId();
      const grupoTarget = state.gruposDisponibles.find(g => g.id === idGuardado) || state.gruposDisponibles[0];

      if (grupoTarget) {
        await seleccionarGrupo(grupoTarget.id);
      } else {
        ocultarLoader();
        mostrarEstadoVacio("No se han encontrado grupos con alumnos en el listado común.");
      }

      // Sincronización en segundo plano de grupos oficiales de Drive (Stale-While-Revalidate)
      setTimeout(async () => {
        try {
          const gruposNuevos = await SheetsService.obtenerGruposConAlumnos(true);
          if (gruposNuevos && gruposNuevos.length > 0) {
            const idsActuales = state.gruposDisponibles.map(g => `${g.id}_${g.numAlumnos}`).join(",");
            const idsNuevos = gruposNuevos.map(g => `${g.id}_${g.numAlumnos}`).join(",");
            if (idsActuales !== idsNuevos) {
              state.gruposDisponibles = gruposNuevos;
              renderizarSidebarGrupos();
            }
          }
        } catch(e) {}
      }, 400);
    } catch(err) {
      console.error("Error al cargar grupos:", err);
      ocultarLoader();
      mostrarNotificacion("Error al conectar con el listado de alumnos.", "error");
    }
  }

  // =========================================================================
  // RENDERIZADO DE LA BARRA LATERAL (Cursos activos ordenados de 1º a 4º de ESO)
  // =========================================================================
  function renderizarSidebarGrupos() {
    const contenedor = document.getElementById("lista-clases-sidebar");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (!state.gruposDisponibles || state.gruposDisponibles.length === 0) {
      contenedor.innerHTML = `<div class="sidebar-empty">No hay cursos activos con alumnos</div>`;
      return;
    }

    // Agrupar por curso (1º ESO, 2º ESO, 3º ESO, 4º ESO)
    const gruposPorCurso = {};
    state.gruposDisponibles.forEach(grp => {
      const numCurso = parseInt(grp.curso.replace(/\D/g, "") || "1", 10);
      if (!gruposPorCurso[numCurso]) {
        gruposPorCurso[numCurso] = [];
      }
      gruposPorCurso[numCurso].push(grp);
    });

    // Ordenar estrictamente de 1º a 4º de ESO
    const cursosOrdenados = Object.keys(gruposPorCurso).map(Number).sort((a, b) => a - b);

    cursosOrdenados.forEach(numCurso => {
      const listaGrupos = gruposPorCurso[numCurso];

      // Cabecera separadora del curso (1º de ESO, 2º de ESO...)
      const cursoHeader = document.createElement("div");
      cursoHeader.className = "sidebar-curso-header";
      cursoHeader.innerHTML = `
        <span class="curso-header-titulo">${numCurso}º de ESO</span>
        <span class="curso-header-badge">${listaGrupos.length} grupo${listaGrupos.length > 1 ? 's' : ''}</span>
      `;
      contenedor.appendChild(cursoHeader);

      // Grupos de este curso ordenados por letra (A, B, C...)
      listaGrupos.sort((a, b) => a.letra.localeCompare(b.letra));

      listaGrupos.forEach(grp => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `clase-item ${state.grupoSeleccionado && state.grupoSeleccionado.id === grp.id ? "active" : ""}`;
        btn.dataset.grupoId = grp.id;

        btn.innerHTML = `
          <div class="clase-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
          </div>
          <div class="clase-item-info">
            <span class="clase-item-codigo">${grp.titulo}</span>
            <span class="clase-item-subtitulo">Grupo ${grp.letra} • ${grp.numAlumnos} al.</span>
          </div>
          <div class="clase-item-badge">${grp.numAlumnos}</div>
        `;

        btn.addEventListener("click", () => {
          seleccionarGrupo(grp.id);
        });

        contenedor.appendChild(btn);
      });
    });
  }

  // =========================================================================
  // SELECCIÓN Y CARGA DE UN GRUPO (Requisitos 4 y 5)
  // =========================================================================
  async function seleccionarGrupo(idGrupo) {
    const grp = state.gruposDisponibles.find(g => g.id === idGrupo);
    if (!grp) return;

    state.grupoSeleccionado = grp;
    StorageManager.setActiveGroupId(idGrupo);

    // Actualizar clase activa en sidebar
    document.querySelectorAll(".clase-item").forEach(el => {
      if (el.dataset.grupoId === idGrupo) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });

    // Actualizar cabecera del grupo (Estilo Edpuzzle - Captura 1)
    const titGrupo = document.getElementById("header-grupo-titulo");
    const subGrupo = document.getElementById("header-grupo-subtitulo");
    const countAlumnos = document.getElementById("badge-total-alumnos");
    
    if (titGrupo) titGrupo.textContent = grp.titulo;
    if (subGrupo) subGrupo.textContent = grp.subtitulo;
    if (countAlumnos) countAlumnos.textContent = `${grp.numAlumnos} alumnos`;

    // Cargar calificaciones de este grupo
    await refrescarCalificacionesGrupo();
  }

  // =========================================================================
  // OBTENCIÓN Y CÁLCULO DE CALIFICACIONES DE TODAS LAS APPS
  // =========================================================================
  async function refrescarCalificacionesGrupo(forzar = false) {
    if (!state.grupoSeleccionado) return;

    mostrarLoader(`Cargando notas de ${state.grupoSeleccionado.titulo}...`);

    try {
      // 1. Obtener lista de alumnos del grupo
      state.alumnosGrupo = await SheetsService.obtenerAlumnosDeGrupo(state.grupoSeleccionado.id);

      // 2. Consultar las notas de todas las apps en paralelo simultáneo (Ultra-rápido)
      const appsResultados = await Promise.all(
        state.appsConfiguradas.map(app => 
          SheetsService.obtenerCalificacionesApp(
            app,
            state.grupoSeleccionado.id,
            state.rangoFechas,
            forzar
          )
        )
      );

      // 3. Regla de negocio (Requisito 5):
      // "Si no se han realizado pruebas en alguna de las apps debe obviarse de esta pantalla,
      // es decir, sólo deben aparecer resultados a partir de la primera prueba."
      state.appsConPruebas = appsResultados.filter(ar => ar.tienePruebas === true);

      // 4. Construir la matriz de datos por alumno
      state.matrizCalificaciones = construirMatrizAlumnos(state.alumnosGrupo, appsResultados);

      // 5. Renderizar tabla con mapa de calor
      renderizarTablaCalificaciones();

      ocultarLoader();
    } catch(err) {
      console.error("Error al refrescar calificaciones:", err);
      ocultarLoader();
      mostrarNotificacion("Error al procesar las calificaciones.", "error");
    }
  }

  // =========================================================================
  // SINCRONIZACIÓN EN TIEMPO REAL (En vivo desde Google Sheets)
  // =========================================================================
  let timerSincronizacionAuto = null;
  let timerIndicadorTiempo = null;
  let sincronizandoSilencioso = false;
  let ultimaSyncTimestamp = Date.now();

  function iniciarSincronizacionTiempoReal() {
    if (timerSincronizacionAuto) clearInterval(timerSincronizacionAuto);
    if (timerIndicadorTiempo) clearInterval(timerIndicadorTiempo);

    // Consulta automática cada 15 segundos sin bloquear la pantalla
    timerSincronizacionAuto = setInterval(async () => {
      await sincronizarEnTiempoReal(false);
    }, CONFIG.INTERVALO_SYNC_MS || 15000);

    // Actualizador visual de "hace X segundos" cada 2 segundos
    timerIndicadorTiempo = setInterval(actualizarIndicadorTiempoReal, 2000);

    // Sincronización instantánea al volver a la pestaña (focus o visibilidad)
    window.addEventListener("focus", () => sincronizarEnTiempoReal(true));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) sincronizarEnTiempoReal(true);
    });
  }

  async function sincronizarEnTiempoReal(forzar = false) {
    if (sincronizandoSilencioso || !state.autenticado || !state.grupoSeleccionado) return;
    sincronizandoSilencioso = true;

    const badgeLive = document.getElementById("live-sync-badge");
    const btnSync = document.getElementById("btn-sincronizar-drive");
    if (badgeLive) badgeLive.classList.add("syncing");
    if (btnSync) btnSync.classList.add("spinning");

    try {
      // 1. Re-consultar las notas de todas las apps en paralelo simultáneo con bypass de caché HTTP
      const appsResultados = await Promise.all(
        state.appsConfiguradas.map(app => 
          SheetsService.obtenerCalificacionesApp(
            app,
            state.grupoSeleccionado.id,
            state.rangoFechas,
            forzar
          )
        )
      );

      state.appsConPruebas = appsResultados.filter(ar => ar.tienePruebas === true);
      const nuevaMatriz = construirMatrizAlumnos(state.alumnosGrupo, appsResultados);

      // Comprobar si hubo cambios reales en los datos
      const matrizAnteriorJson = JSON.stringify(state.matrizCalificaciones.map(m => ({ id: m.index, n: m.notaMediaGlobal, t: m.totalPruebasRealizadas })));
      const matrizNuevaJson = JSON.stringify(nuevaMatriz.map(m => ({ id: m.index, n: m.notaMediaGlobal, t: m.totalPruebasRealizadas })));
      const hayCambios = matrizAnteriorJson !== matrizNuevaJson;

      if (hayCambios || forzar) {
        state.matrizCalificaciones = nuevaMatriz;
        renderizarTablaCalificaciones();

        // Si el modal de un alumno está abierto en este instante, actualizar sus datos en vivo
        const modalAlumno = document.getElementById("modal-detalle-alumno");
        if (modalAlumno && !modalAlumno.classList.contains("hidden") && state.alumnoModalActual) {
          window.abrirModalAlumno(state.alumnoModalActual.index);
        }

        // Si el usuario forzó la sincronización, re-comprobar también si hay grupos nuevos o cambios en el listado común
        if (forzar) {
          try {
            const gruposNuevos = await SheetsService.obtenerGruposConAlumnos(true);
            if (gruposNuevos && gruposNuevos.length > 0) {
              const idsActuales = state.gruposDisponibles.map(g => `${g.id}_${g.numAlumnos}`).join(",");
              const idsNuevos = gruposNuevos.map(g => `${g.id}_${g.numAlumnos}`).join(",");
              if (idsActuales !== idsNuevos) {
                state.gruposDisponibles = gruposNuevos;
                renderizarSidebarGrupos();
              }
            }
          } catch(e) {}
        }

        if (hayCambios) {
          mostrarNotificacion("⚡ Calificaciones actualizadas en tiempo real desde Google Sheets.", "success");
        } else if (forzar) {
          mostrarNotificacion("✓ Datos sincronizados con Google Drive.", "info");
        }
      }

      ultimaSyncTimestamp = Date.now();
      actualizarIndicadorTiempoReal();
    } catch(err) {
      console.warn("Sincronización en tiempo real:", err);
    } finally {
      sincronizandoSilencioso = false;
      if (badgeLive) badgeLive.classList.remove("syncing");
      if (btnSync) btnSync.classList.remove("spinning");
    }
  }

  function actualizarIndicadorTiempoReal() {
    const elTexto = document.getElementById("live-sync-last-time");
    if (!elTexto) return;
    const segs = Math.max(0, Math.round((Date.now() - ultimaSyncTimestamp) / 1000));
    if (segs < 5) {
      elTexto.textContent = "en vivo";
    } else if (segs < 60) {
      elTexto.textContent = `hace ${segs}s`;
    } else {
      const mins = Math.floor(segs / 60);
      elTexto.textContent = `hace ${mins}m`;
    }
  }

  // Construye la fila de datos para cada alumno con sus medias y tiempos
  function construirMatrizAlumnos(alumnos, appsResultados) {
    const matriz = [];

    alumnos.forEach((al, index) => {
      const norm = SheetsService.normalizarNombre(al.textoDesplegable);
      
      let sumaNotasApps = 0;
      let totalAppsConNota = 0;
      let tiempoTotalSegundos = 0;
      let totalPruebasRealizadas = 0;
      const appsNotas = {};

      // Recorrer cada una de las apps en orden oficial
      appsResultados.forEach(appRes => {
        // Buscar las notas del alumno en esta app
        let datoAlumno = appRes.alumnosDatos[norm];
        
        // Si no coincide exactamente por nombre normalizado, buscar de forma flexible
        if (!datoAlumno) {
          for (const k in appRes.alumnosDatos) {
            const ad = appRes.alumnosDatos[k];
            if (SheetsService.sonMismoAlumno(ad.nombreOriginal || k, al.textoDesplegable)) {
              datoAlumno = ad;
              break;
            }
          }
        }

        const idK = appRes.id || appRes.appId;
        if (datoAlumno && datoAlumno.notaMedia !== null && datoAlumno.totalPruebas > 0) {
          const objNota = {
            notaMedia: datoAlumno.notaMedia,
            totalPruebas: datoAlumno.totalPruebas,
            sumaSegundos: datoAlumno.sumaSegundos,
            pruebas: datoAlumno.pruebas || []
          };
          appsNotas[idK] = objNota;
          if (appRes.appId) appsNotas[appRes.appId] = objNota;
          if (appRes.id) appsNotas[appRes.id] = objNota;
          sumaNotasApps += datoAlumno.notaMedia;
          totalAppsConNota++;
          tiempoTotalSegundos += (datoAlumno.sumaSegundos || 0);
          totalPruebasRealizadas += datoAlumno.totalPruebas;
        } else {
          const objVacio = {
            notaMedia: null,
            totalPruebas: 0,
            sumaSegundos: 0,
            pruebas: []
          };
          appsNotas[idK] = objVacio;
          if (appRes.appId) appsNotas[appRes.appId] = objVacio;
          if (appRes.id) appsNotas[appRes.id] = objVacio;
        }
      });

      // Nota media global del alumno (media de las apps o de todas las pruebas)
      const notaMediaGlobal = totalAppsConNota > 0 ? (sumaNotasApps / totalAppsConNota) : null;

      matriz.push({
        index: index,
        alumno: al,
        notaMediaGlobal: notaMediaGlobal,
        tiempoTotalSegundos: tiempoTotalSegundos,
        tiempoTotalTexto: SheetsService.formatearSegundos(tiempoTotalSegundos),
        totalPruebasRealizadas: totalPruebasRealizadas,
        appsNotas: appsNotas
      });
    });

    return matriz;
  }

  // =========================================================================
  // RENDERIZADO DE LA TABLA DE CALIFICACIONES (Requisito 5)
  // =========================================================================
  function renderizarTablaCalificaciones() {
    const contenedorThead = document.getElementById("tabla-cabecera-tr");
    const contenedorTbody = document.getElementById("tabla-cuerpo");
    const contadorFiltro = document.getElementById("contador-alumnos-visibles");

    if (!contenedorThead || !contenedorTbody) return;

    // 1. Renderizar Cabecera de la Tabla
    // Columna 1: Alumno
    // Columna 2: Nota Media Global
    // Columna 3: Tiempo Total Invertido
    // Columnas 4+: Las apps con pruebas (Requisito 5)
    let htmlCabecera = `
      <th class="th-fija th-alumno">
        <div class="th-content-left">
          <span>Nombre del Alumno</span>
        </div>
      </th>
      <th class="th-centrada th-media-global">
        <div class="th-content-center">
          <span class="th-titulo-principal">Nota global</span>
          <span class="th-subtitulo">de ${state.escalaCien ? '100' : '10'}</span>
        </div>
      </th>
      <th class="th-centrada th-tiempo-total">
        <div class="th-content-center">
          <span class="th-titulo-principal">tiempo total</span>
          <span class="th-subtitulo">invertido</span>
        </div>
      </th>
    `;

    // Renderizar cabeceras rotadas estilo Edpuzzle con distintivo de bloque claramente debajo del título
    state.appsConPruebas.forEach((app, idx) => {
      const esActividad = app.bloque === CONFIG.BLOQUES.ACTIVIDADES;
      htmlCabecera += `
        <th class="th-app-rotada ${esActividad ? 'th-bloque-actividad' : 'th-bloque-lenguaje'}" title="${app.titulo} (${app.nombre}) - ${app.bloqueNombre || 'Lenguaje Musical'}">
          <div class="th-rotada-wrap">
            <span class="th-rotada-texto">${app.titulo}</span>
          </div>
          <div class="th-rotada-meta-area">
            <span class="th-rotada-bloque-tag ${esActividad ? 'tag-actividad' : 'tag-lenguaje'}">${esActividad ? '🧩 Actividad' : '🎼 Lenguaje'}</span>
            <div class="th-rotada-avatar-box">
              ${SVG_AVATAR_DOCENTE}
              <span class="th-rotada-conteo">${app.totalPruebas} act.</span>
            </div>
          </div>
        </th>
      `;
    });

    contenedorThead.innerHTML = htmlCabecera;

    // 2. Filtrar alumnos por búsqueda de texto
    const q = (state.filtroBusqueda || "").toLowerCase().trim();
    const filasFiltradas = state.matrizCalificaciones.filter(f => {
      if (!q) return true;
      const nom = f.alumno.textoDesplegable.toLowerCase();
      return nom.includes(q);
    });

    if (contadorFiltro) {
      contadorFiltro.textContent = `${filasFiltradas.length} de ${state.matrizCalificaciones.length} alumnos`;
    }

    // 3. Renderizar Filas de Alumnos
    if (filasFiltradas.length === 0) {
      contenedorTbody.innerHTML = `
        <tr>
          <td colspan="${3 + state.appsConPruebas.length}" class="td-sin-resultados">
            <div class="empty-state-inner">
              <span class="empty-state-icon">🔍</span>
              <p>No se encontraron alumnos con el criterio de búsqueda.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let htmlCuerpo = "";
    filasFiltradas.forEach((fila, pos) => {
      // Cálculo del mapa de calor para la nota global
      const infoColorGlobal = CONFIG.obtenerColorNota(fila.notaMediaGlobal);
      const strNotaGlobal = formatearNotaValor(fila.notaMediaGlobal);

      htmlCuerpo += `
        <tr class="fila-alumno" data-index="${fila.index}">
          <!-- Columna 1: Alumno (Click para abrir Modal Detalle - Requisito 6) -->
          <td class="td-alumno" onclick="window.abrirModalAlumno(${fila.index})">
            <div class="alumno-nombre-celda">
              <span class="alumno-avatar-circulo">${fila.alumno.textoDesplegable.charAt(0)}</span>
              <span class="alumno-nombre-texto" title="Pulsar para ver detalle del alumno">${fila.alumno.textoDesplegable}</span>
              <svg class="alumno-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </td>

          <!-- Columna 2: Nota Media Global (Mapa de Calor - Requisito 5) -->
          <td class="td-centrada">
            <div class="celda-nota-wrap">
              <div class="pill-nota ${infoColorGlobal.claseCss}" 
                   style="background-color: ${infoColorGlobal.bg}; color: ${infoColorGlobal.color}; border-color: ${infoColorGlobal.border};"
                   title="Nota Media Global: ${strNotaGlobal} (${infoColorGlobal.label})">
                <span>${strNotaGlobal}</span>
              </div>
              <div class="celda-nota-linea" style="background-color: ${infoColorGlobal.border};"></div>
            </div>
          </td>

          <!-- Columna 3: Tiempo Total Invertido -->
          <td class="td-centrada">
            <span class="texto-tiempo">${fila.tiempoTotalTexto}</span>
          </td>
      `;

      // Columnas de cada una de las Apps con Pruebas (Requisito 5)
      state.appsConPruebas.forEach(app => {
        const appKey = app.id || app.appId;
        const datoApp = fila.appsNotas[appKey];
        if (datoApp && datoApp.notaMedia !== null && datoApp.totalPruebas > 0) {
          const infoColor = CONFIG.obtenerColorNota(datoApp.notaMedia);
          const strNotaApp = formatearNotaValor(datoApp.notaMedia);
          htmlCuerpo += `
            <td class="td-centrada td-app-celda" onclick="window.abrirModalAlumno(${fila.index}, '${app.id}')">
              <div class="celda-nota-wrap">
                <div class="pill-nota ${infoColor.claseCss}" 
                     style="background-color: ${infoColor.bg}; color: ${infoColor.color}; border-color: ${infoColor.border};"
                     title="${app.titulo}: ${strNotaApp} (${datoApp.totalPruebas} prueba${datoApp.totalPruebas > 1 ? 's' : ''})">
                  <span>${strNotaApp}</span>
                </div>
                <div class="celda-nota-linea" style="background-color: ${infoColor.border};"></div>
              </div>
            </td>
          `;
        } else {
          // Sin pruebas realizadas por este alumno en esta app
          htmlCuerpo += `
            <td class="td-centrada td-app-celda">
              <div class="pill-nota nota-vacio" title="Sin exámenes realizados en esta app">-</div>
            </td>
          `;
        }
      });

      htmlCuerpo += `</tr>`;
    });

    contenedorTbody.innerHTML = htmlCuerpo;
  }

  // =========================================================================
  // MODAL DETALLE DE ALUMNO (Requisito 6 - Semejante a Captura 2)
  // =========================================================================
  window.abrirModalAlumno = function(indexAlumno, appIdScroll = null) {
    const fila = state.matrizCalificaciones.find(f => f.index === indexAlumno);
    if (!fila) return;

    state.alumnoModalActual = fila;
    state.indiceAlumnoModal = state.matrizCalificaciones.indexOf(fila);

    const modal = document.getElementById("modal-detalle-alumno");
    if (!modal) return;

    // 1. Cabecera del modal: Nombre, Nota Global, Tiempo Total y Paginación
    const elNombre = document.getElementById("modal-alumno-nombre");
    const elNotaGlobalPill = document.getElementById("modal-alumno-nota-global-pill");
    const elTiempo = document.getElementById("modal-alumno-tiempo");
    const elPaginacion = document.getElementById("modal-alumno-paginacion");
    const btnAnterior = document.getElementById("btn-modal-anterior");
    const btnSiguiente = document.getElementById("btn-modal-siguiente");
    const elFechaInicio = document.getElementById("modal-fecha-inicio-txt");
    const elFechaEntrega = document.getElementById("modal-fecha-entrega-txt");

    if (elNombre) elNombre.textContent = fila.alumno.textoDesplegable;
    
    // Nota global
    const infoColor = CONFIG.obtenerColorNota(fila.notaMediaGlobal);
    if (elNotaGlobalPill) {
      elNotaGlobalPill.textContent = formatearNotaValor(fila.notaMediaGlobal);
      elNotaGlobalPill.className = `modal-nota-badge ${infoColor.claseCss}`;
      elNotaGlobalPill.style.backgroundColor = infoColor.bg;
      elNotaGlobalPill.style.color = infoColor.color;
      elNotaGlobalPill.style.borderColor = infoColor.border;
    }

    if (elTiempo) {
      const minTot = Math.round((fila.tiempoTotalSegundos || 0) / 60);
      elTiempo.textContent = `Tiempo total invertido: ${minTot} minutos`;
    }

    // Paginación (1/29) estilo Edpuzzle
    const totalAlumnos = state.matrizCalificaciones.length;
    const numActual = state.indiceAlumnoModal + 1;
    if (elPaginacion) elPaginacion.textContent = `${numActual}/${totalAlumnos}`;
    
    if (btnAnterior) btnAnterior.disabled = (state.indiceAlumnoModal === 0);
    if (btnSiguiente) btnSiguiente.disabled = (state.indiceAlumnoModal >= totalAlumnos - 1);

    // Fechas visibles idénticas a Captura 2
    if (elFechaInicio) elFechaInicio.textContent = formatearFechaCorta(state.rangoFechas.inicio) || "12 oct.";
    if (elFechaEntrega) {
      const hoy = new Date();
      elFechaEntrega.textContent = state.rangoFechas.fin.toDateString() === hoy.toDateString() ? "Hoy" : formatearFechaCorta(state.rangoFechas.fin);
    }

    // 2. Cuerpo del modal: Desglose agrupado en los dos bloques oficiales (Requisito del usuario)
    // - Bloque 1: Lenguaje Musical
    // - Bloque 2: Actividades Interactivas Evaluables
    const contenedorApps = document.getElementById("modal-alumno-desglose-apps");
    if (contenedorApps) {
      let htmlDesglose = "";
      let totalAppsMostradas = 0;

      const bloquesConfig = [
        {
          id: CONFIG.BLOQUES.LENGUAJE,
          titulo: CONFIG.NOMBRES_BLOQUES[CONFIG.BLOQUES.LENGUAJE] || "Lenguaje Musical",
          icono: "🎼",
          descripcion: "Lectura, Equivalencias, Compases, Intervalos y Dictados rítmicos",
          apps: state.appsConPruebas.filter(a => a.bloque !== CONFIG.BLOQUES.ACTIVIDADES)
        },
        {
          id: CONFIG.BLOQUES.ACTIVIDADES,
          titulo: CONFIG.NOMBRES_BLOQUES[CONFIG.BLOQUES.ACTIVIDADES] || "Actividades Interactivas Evaluables",
          icono: "🧩",
          descripcion: "Pruebas y actividades evaluables ampliables (+ Añadir app)",
          apps: state.appsConPruebas.filter(a => a.bloque === CONFIG.BLOQUES.ACTIVIDADES)
        }
      ];

      bloquesConfig.forEach(bloqueInfo => {
        // Filtrar apps del bloque que tengan pruebas para este alumno
        const appsConPruebasAlumno = bloqueInfo.apps.filter(app => {
          const appKey = app.id || app.appId;
          const datoApp = fila.appsNotas[appKey];
          return datoApp && datoApp.pruebas && datoApp.pruebas.length > 0;
        });

        // Si el alumno no tiene pruebas en este bloque, se obvia de la pantalla
        if (appsConPruebasAlumno.length === 0) return;

        totalAppsMostradas += appsConPruebasAlumno.length;

        // Calcular media del bloque
        const sumaMedias = appsConPruebasAlumno.reduce((acc, app) => {
          const appKey = app.id || app.appId;
          return acc + (fila.appsNotas[appKey].notaMedia || 0);
        }, 0);
        const mediaBloque = sumaMedias / appsConPruebasAlumno.length;
        const infoMediaBloque = CONFIG.obtenerColorNota(mediaBloque);
        const strMediaBloque = formatearNotaValor(mediaBloque);

        htmlDesglose += `
          <div class="modal-bloque-grupo modal-bloque-${bloqueInfo.id}">
            <!-- Encabezado del Bloque -->
            <div class="modal-bloque-banner">
              <div class="bloque-banner-left">
                <span class="bloque-banner-icono">${bloqueInfo.icono}</span>
                <div class="bloque-banner-textos">
                  <h3 class="bloque-banner-titulo">${bloqueInfo.titulo}</h3>
                  <span class="bloque-banner-sub">${appsConPruebasAlumno.length} aplicación${appsConPruebasAlumno.length > 1 ? 'es' : ''} realizada${appsConPruebasAlumno.length > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div class="bloque-banner-right">
                <span class="bloque-banner-media-label">Media del bloque:</span>
                <div class="pill-nota ${infoMediaBloque.claseCss}"
                     style="background-color:${infoMediaBloque.bg}; color:${infoMediaBloque.color}; border-color:${infoMediaBloque.border};">
                  ${strMediaBloque}
                </div>
              </div>
            </div>

            <!-- Lista de aplicaciones del bloque -->
            <div class="modal-bloque-apps-lista">
        `;

        appsConPruebasAlumno.forEach(app => {
          const appKey = app.id || app.appId;
          const datoApp = fila.appsNotas[appKey];
          const infoNotaApp = CONFIG.obtenerColorNota(datoApp.notaMedia);
          const strMediaApp = formatearNotaValor(datoApp.notaMedia);

          htmlDesglose += `
            <div class="modal-seccion-app" id="modal-app-${app.id}">
              <!-- Cabecera de la App -->
              <div class="modal-seccion-app-header">
                <div class="app-header-left">
                  <span class="app-header-icono">${app.icono || '🎵'}</span>
                  <div class="app-header-textos">
                    <h4>${app.tituloVisible || app.titulo || app.nombre}</h4>
                    <span class="app-header-sub">${app.nombre}</span>
                  </div>
                </div>
                <div class="app-header-right">
                  <span class="app-header-media-label">Nota media:</span>
                  <div class="pill-nota ${infoNotaApp.claseCss}"
                       style="background-color:${infoNotaApp.bg}; color:${infoNotaApp.color}; border-color:${infoNotaApp.border};">
                    ${strMediaApp}
                  </div>
                </div>
              </div>

              <!-- Lista de pruebas individuales de esta app (Captura 2) -->
              <div class="modal-lista-pruebas">
          `;

          datoApp.pruebas.forEach(prueba => {
            const infoP = CONFIG.obtenerColorNota(prueba.nota);
            const strP = formatearNotaValor(prueba.nota);

            htmlDesglose += `
              <div class="modal-item-prueba">
                <!-- Calificación -->
                <div class="prueba-col-nota">
                  <div class="pill-nota ${infoP.claseCss}"
                       style="background-color:${infoP.bg}; color:${infoP.color}; border-color:${infoP.border};">
                    ${strP}
                  </div>
                </div>

                <!-- Avatar pequeño musical docente (Idéntico a Captura 2) -->
                <div class="prueba-col-avatar">
                  ${SVG_AVATAR_DOCENTE}
                </div>

                <!-- Información de la actividad y fecha -->
                <div class="prueba-col-info">
                  <strong class="prueba-titulo">${prueba.nivel || app.tituloVisible || app.titulo || app.nombre}</strong>
                  <div class="prueba-meta">
                    <span class="prueba-fecha">${prueba.fechaVisible || 'nov. 11º'}</span>
                    <span class="prueba-tiempo-bullet">•</span>
                    <span class="prueba-tiempo">${prueba.tiempoTexto || '1 min'}</span>
                  </div>
                </div>

                <!-- Barra de progreso verde línea (Idéntico a Captura 2) -->
                <div class="prueba-col-progreso">
                  <div class="barra-progreso-verde-linea"></div>
                </div>
              </div>
            `;
          });

          htmlDesglose += `
              </div>
            </div>
          `;
        });

        htmlDesglose += `
            </div>
          </div>
        `;
      });

      if (totalAppsMostradas === 0) {
        htmlDesglose = `
          <div class="empty-state-inner" style="padding: 40px 20px;">
            <span class="empty-state-icon">📋</span>
            <p>Este alumno no tiene calificaciones registradas en el período de fechas seleccionado.</p>
          </div>
        `;
      }

      contenedorApps.innerHTML = htmlDesglose;
      contenedorApps.scrollTop = 0;
    }

    modal.classList.remove("hidden");

    // Si se pulsó en la celda de una app específica, hacer scroll suave hasta esa sección
    if (appIdScroll) {
      setTimeout(() => {
        const targetAppEl = document.getElementById(`modal-app-${appIdScroll}`);
        if (targetAppEl) {
          targetAppEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);
    }
  };

  window.cerrarModalAlumno = function() {
    const modal = document.getElementById("modal-detalle-alumno");
    if (modal) modal.classList.add("hidden");
  };

  function navegarAlumnoModal(delta) {
    const nuevoIndice = state.indiceAlumnoModal + delta;
    if (nuevoIndice >= 0 && nuevoIndice < state.matrizCalificaciones.length) {
      const nuevoAlumno = state.matrizCalificaciones[nuevoIndice];
      window.abrirModalAlumno(nuevoAlumno.index);
    }
  }

  // =========================================================================
  // VINCULACIÓN DE EVENTOS DE INTERFAZ
  // =========================================================================
  function vincularEventosUI() {
    // 1. Landing Page Login y Toggle Contraseña
    const formLanding = document.getElementById("form-landing-login");
    if (formLanding) {
      formLanding.addEventListener("submit", (e) => {
        e.preventDefault();
        procesarLandingLogin();
      });
    }

    const btnEye = document.getElementById("btn-toggle-landing-eye");
    const inPass = document.getElementById("landing-password-input");
    if (btnEye && inPass) {
      btnEye.addEventListener("click", () => {
        const isPass = inPass.type === "password";
        inPass.type = isPass ? "text" : "password";
        btnEye.classList.toggle("active", isPass);
      });
    }

    const btnLogout = document.getElementById("btn-docente-logout");
    if (btnLogout) {
      btnLogout.addEventListener("click", procesarLogout);
    }

    // 2. Filtro de Búsqueda
    const inputBuscar = document.getElementById("input-buscar-alumno");
    if (inputBuscar) {
      inputBuscar.addEventListener("input", (e) => {
        state.filtroBusqueda = e.target.value;
        renderizarTablaCalificaciones();
      });
    }

    // 3. Filtro de Fechas (Requisito 4)
    const inputFechaInicio = document.getElementById("filtro-fecha-inicio");
    const inputFechaFin = document.getElementById("filtro-fecha-fin");
    
    const actualizarRango = () => {
      const vInicio = inputFechaInicio ? inputFechaInicio.value : "";
      const vFin = inputFechaFin ? inputFechaFin.value : "";
      if (vInicio && vFin) {
        state.rangoFechas = {
          inicio: new Date(vInicio + "T00:00:00"),
          fin: new Date(vFin + "T23:59:59"),
          inicioISO: vInicio,
          finISO: vFin
        };
        StorageManager.saveDateRange(vInicio, vFin);
        actualizarTextosFechas();
        refrescarCalificacionesGrupo();
      }
    };

    if (inputFechaInicio) inputFechaInicio.addEventListener("change", actualizarRango);
    if (inputFechaFin) inputFechaFin.addEventListener("change", actualizarRango);

    // Apertura fluida instantánea del calendario nativo al hacer clic en las tarjetas de fecha
    const cardInicio = document.getElementById("card-fecha-inicio");
    if (cardInicio && inputFechaInicio) {
      cardInicio.addEventListener("click", (e) => {
        try {
          if (typeof inputFechaInicio.showPicker === "function") {
            inputFechaInicio.showPicker();
          } else {
            inputFechaInicio.focus();
          }
        } catch(err) {
          inputFechaInicio.focus();
        }
      });
    }

    const cardFin = document.getElementById("card-fecha-fin");
    if (cardFin && inputFechaFin) {
      cardFin.addEventListener("click", (e) => {
        try {
          if (typeof inputFechaFin.showPicker === "function") {
            inputFechaFin.showPicker();
          } else {
            inputFechaFin.focus();
          }
        } catch(err) {
          inputFechaFin.focus();
        }
      });
    }

    // Flechas de navegación horizontal de tabla (Captura 1)
    const btnPrev = document.getElementById("btn-tabla-prev");
    const btnNext = document.getElementById("btn-tabla-next");
    const scrollContainer = document.getElementById("tabla-scroll-container");
    if (btnPrev && scrollContainer) {
      btnPrev.addEventListener("click", () => {
        scrollContainer.scrollBy({ left: -220, behavior: "smooth" });
      });
    }
    if (btnNext && scrollContainer) {
      btnNext.addEventListener("click", () => {
        scrollContainer.scrollBy({ left: 220, behavior: "smooth" });
      });
    }

    // Alternar escala de notas (0-10 vs 0-100 como en Edpuzzle)
    const btnEscala = document.getElementById("btn-toggle-escala");
    const txtEscala = document.getElementById("txt-escala-activa");
    if (btnEscala) {
      btnEscala.addEventListener("click", () => {
        state.escalaCien = !state.escalaCien;
        if (txtEscala) txtEscala.textContent = state.escalaCien ? "0 - 100" : "0 - 10";
        renderizarTablaCalificaciones();
        if (state.alumnoModalActual) {
          window.abrirModalAlumno(state.alumnoModalActual.index);
        }
      });
    }

    // Botones de filtro rápido de fechas
    document.querySelectorAll(".btn-preset-fecha").forEach(btn => {
      btn.addEventListener("click", () => {
        const preset = btn.dataset.preset;
        aplicarPresetFecha(preset);
      });
    });

    // 4. Botón Descargar Notas (Requisito 7)
    const btnDescargar = document.getElementById("btn-descargar-notas");
    if (btnDescargar) {
      btnDescargar.addEventListener("click", () => {
        if (!state.grupoSeleccionado) {
          mostrarNotificacion("Selecciona primero una clase para descargar notas.", "warning");
          return;
        }
        ExportService.mostrarModalDescarga(
          state.grupoSeleccionado,
          state.matrizCalificaciones,
          state.appsConPruebas
        );
      });
    }

    // Radio buttons en el modal de descarga
    const radiosDescarga = document.querySelectorAll("input[name='tipo_descarga']");
    const wrapSelectApp = document.getElementById("wrap-descarga-select-app");
    radiosDescarga.forEach(r => {
      r.addEventListener("change", () => {
        if (wrapSelectApp) {
          if (r.value === "app_especifica") {
            wrapSelectApp.classList.remove("hidden");
          } else {
            wrapSelectApp.classList.add("hidden");
          }
        }
      });
    });

    const btnConfirmarDescarga = document.getElementById("btn-confirmar-descarga");
    if (btnConfirmarDescarga) {
      btnConfirmarDescarga.addEventListener("click", () => {
        const seleccion = document.querySelector("input[name='tipo_descarga']:checked");
        const tipo = seleccion ? seleccion.value : "solo_medias";
        const selectApp = document.getElementById("descarga-select-app");
        const appId = selectApp ? selectApp.value : "";

        ExportService.ejecutarDescarga(
          tipo,
          state.grupoSeleccionado,
          state.matrizCalificaciones,
          state.appsConPruebas,
          appId
        );
      });
    }

    // 5. Botón "Añadir app +" (Requisito 8)
    const btnsAnadirApp = document.querySelectorAll(".btn-anadir-app-trigger");
    btnsAnadirApp.forEach(btn => {
      btn.addEventListener("click", () => {
        abrirModalAnadirApp();
      });
    });

    const formAnadirApp = document.getElementById("form-anadir-app");
    if (formAnadirApp) {
      formAnadirApp.addEventListener("submit", (e) => {
        e.preventDefault();
        procesarAnadirApp();
      });
    }

    // 6. Botón Configuración de Hojas de Drive
    const btnConfigSheets = document.getElementById("btn-config-sheets");
    if (btnConfigSheets) {
      btnConfigSheets.addEventListener("click", () => {
        abrirModalConfigApps();
      });
    }

    // 7. Colapsar/expandir cursos en el sidebar
    const btnColapsar = document.getElementById("btn-colapsar-sidebar-clases");
    if (btnColapsar) {
      btnColapsar.addEventListener("click", () => {
        const contenedor = document.getElementById("lista-clases-sidebar");
        if (contenedor) {
          const isHidden = contenedor.style.display === "none";
          contenedor.style.display = isHidden ? "flex" : "none";
          btnColapsar.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
        }
      });
    }

    // 7. Navegación modal alumno (Captura 2)
    const btnModalAnt = document.getElementById("btn-modal-anterior");
    const btnModalSig = document.getElementById("btn-modal-siguiente");
    if (btnModalAnt) btnModalAnt.addEventListener("click", () => navegarAlumnoModal(-1));
    if (btnModalSig) btnModalSig.addEventListener("click", () => navegarAlumnoModal(1));

    // Cerrar modales con tecla Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        window.cerrarModalAlumno();
        ExportService.cerrarModalDescarga();
        cerrarModalAnadirApp();
        cerrarModalConfigApps();
      }
    });

    // 8. Botón Sincronizar / Refrescar Drive y Badge En Vivo
    const btnSync = document.getElementById("btn-sincronizar-drive");
    if (btnSync) {
      btnSync.addEventListener("click", () => {
        sincronizarEnTiempoReal(true);
      });
    }

    const badgeLive = document.getElementById("live-sync-badge");
    if (badgeLive) {
      badgeLive.addEventListener("click", () => {
        sincronizarEnTiempoReal(true);
      });
    }

    // 9. Modo Demo / Simulación Toggle
    const btnToggleDemo = document.getElementById("btn-toggle-demo");
    if (btnToggleDemo) {
      actualizarBotonDemo(btnToggleDemo);
      btnToggleDemo.addEventListener("click", () => {
        const actual = StorageManager.isDemoModeActive();
        StorageManager.setDemoMode(!actual);
        actualizarBotonDemo(btnToggleDemo);
        refrescarCalificacionesGrupo();
      });
    }
  }

  function actualizarBotonDemo(btn) {
    const activo = StorageManager.isDemoModeActive();
    if (activo) {
      btn.classList.add("activo");
      btn.innerHTML = `<span class="demo-dot online"></span><span>Modo Demo: Activo</span>`;
      btn.title = "Mostrando datos simulados para apps sin exámenes. Pulsa para ver solo datos reales de Drive.";
    } else {
      btn.classList.remove("activo");
      btn.innerHTML = `<span class="demo-dot offline"></span><span>Modo Drive: Real</span>`;
      btn.title = "Mostrando solo datos reales vinculados a tus Google Sheets. Pulsa para activar Modo Demo.";
    }
  }

  function aplicarPresetFecha(preset) {
    const hoy = new Date();
    const inputInicio = document.getElementById("filtro-fecha-inicio");
    const inputFin = document.getElementById("filtro-fecha-fin");

    let fInicio = new Date();
    let fFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

    if (preset === "todo_curso") {
      const def = CONFIG.obtenerRangoFechasPorDefecto();
      fInicio = def.inicio;
    } else if (preset === "trimestre1") {
      const y = hoy.getMonth() >= 8 ? hoy.getFullYear() : hoy.getFullYear() - 1;
      fInicio = new Date(y, 8, 1); // 1 sept
      fFin = new Date(y, 11, 22, 23, 59, 59); // 22 dic
    } else if (preset === "ultimos_30") {
      fInicio = new Date(hoy.getTime() - (30 * 24 * 60 * 60 * 1000));
    } else if (preset === "hoy") {
      fInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
    }

    const isoInicio = fInicio.toISOString().split("T")[0];
    const isoFin = fFin.toISOString().split("T")[0];

    if (inputInicio) inputInicio.value = isoInicio;
    if (inputFin) inputFin.value = isoFin;

    state.rangoFechas = {
      inicio: fInicio,
      fin: fFin,
      inicioISO: isoInicio,
      finISO: isoFin
    };
    StorageManager.saveDateRange(isoInicio, isoFin);
    actualizarTextosFechas();
    refrescarCalificacionesGrupo();
  }

  // =========================================================================
  // GESTIÓN DEL MODAL "AÑADIR APP +" (Requisito 8)
  // =========================================================================
  function abrirModalAnadirApp() {
    const modal = document.getElementById("modal-anadir-app");
    if (modal) {
      modal.classList.remove("hidden");
      const inNombre = document.getElementById("anadir-app-nombre");
      const inUrl = document.getElementById("anadir-app-url");
      const msgError = document.getElementById("anadir-app-error");
      if (inNombre) inNombre.value = "";
      if (inUrl) inUrl.value = "";
      if (msgError) msgError.classList.add("hidden");
    }
  }

  window.cerrarModalAnadirApp = function() {
    const modal = document.getElementById("modal-anadir-app");
    if (modal) modal.classList.add("hidden");
  };

  function procesarAnadirApp() {
    const inNombre = document.getElementById("anadir-app-nombre");
    const inUrl = document.getElementById("anadir-app-url");
    const msgError = document.getElementById("anadir-app-error");

    const nombre = inNombre ? inNombre.value.trim() : "";
    const url = inUrl ? inUrl.value.trim() : "";

    if (!nombre || !url) {
      if (msgError) {
        msgError.textContent = "Por favor, completa tanto el nombre como la URL de la hoja.";
        msgError.classList.remove("hidden");
      }
      return;
    }

    const selBloque = document.getElementById("anadir-app-bloque");
    const bloque = selBloque ? selBloque.value : CONFIG.BLOQUES.ACTIVIDADES;

    try {
      const nueva = StorageManager.addCustomApp(nombre, url, bloque);
      state.appsConfiguradas = StorageManager.getAppsList();
      cerrarModalAnadirApp();
      mostrarNotificacion(`✓ Aplicación "${nueva.tituloVisible}" incorporada a ${nueva.bloqueNombre}.`, "success");
      refrescarCalificacionesGrupo();
    } catch(err) {
      if (msgError) {
        msgError.textContent = err.message || "URL no válida. Asegúrate de pegar un enlace de Google Sheet.";
        msgError.classList.remove("hidden");
      }
    }
  }

  // =========================================================================
  // GESTIÓN DEL MODAL CONFIGURACIÓN DE HOJAS
  // =========================================================================
  function abrirModalConfigApps() {
    const modal = document.getElementById("modal-config-apps");
    if (!modal) return;

    renderizarListaConfigApps();
    modal.classList.remove("hidden");
  }

  window.cerrarModalConfigApps = function() {
    const modal = document.getElementById("modal-config-apps");
    if (modal) modal.classList.add("hidden");
  };

  function renderizarListaConfigApps() {
    const contenedor = document.getElementById("lista-config-apps-items");
    if (!contenedor) return;

    const apps = StorageManager.getAppsList();
    let html = "";

    apps.forEach(app => {
      const estadoVinculo = app.sheetId 
        ? `<span class="badge-vinculo online">✓ Vinculada (${app.sheetId.slice(0, 8)}...)</span>`
        : `<span class="badge-vinculo offline">⚠️ Pendiente de vincular</span>`;

      html += `
        <div class="config-app-card" data-app-id="${app.id}">
          <div class="config-app-header">
            <div class="config-app-title">
              <span>${app.icono || '📊'}</span>
              <strong>${app.tituloVisible}</strong>
              <small>(${app.nombre})</small>
            </div>
            ${estadoVinculo}
          </div>
          <div class="config-app-body">
            <label>URL de Google Sheet en Drive:</label>
            <div class="config-app-input-row">
              <input type="url" class="input-app-url" value="${app.urlSheet || ''}" placeholder="https://docs.google.com/spreadsheets/d/.../edit" />
              <button type="button" class="btn-guardar-url-app" onclick="window.guardarUrlApp('${app.id}', this)">Guardar</button>
              ${app.esPersonalizada ? `<button type="button" class="btn-eliminar-app-custom" onclick="window.eliminarAppCustom('${app.id}')" title="Eliminar app">🗑️</button>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    contenedor.innerHTML = html;
  }

  window.guardarUrlApp = function(appId, btnElement) {
    const card = btnElement.closest(".config-app-card");
    const input = card.querySelector(".input-app-url");
    const url = input ? input.value.trim() : "";

    try {
      StorageManager.updateAppUrl(appId, url);
      state.appsConfiguradas = StorageManager.getAppsList();
      mostrarNotificacion("URL de Google Sheet guardada con éxito.", "success");
      renderizarListaConfigApps();
      refrescarCalificacionesGrupo();
    } catch(e) {
      mostrarNotificacion("Error al guardar la URL.", "error");
    }
  };

  window.eliminarAppCustom = function(appId) {
    if (confirm("¿Estás seguro de eliminar esta aplicación personalizada?")) {
      StorageManager.deleteCustomApp(appId);
      state.appsConfiguradas = StorageManager.getAppsList();
      renderizarListaConfigApps();
      refrescarCalificacionesGrupo();
    }
  };

  // =========================================================================
  // UTILIDADES DE INTERFAZ (LOADER Y NOTIFICACIONES)
  // =========================================================================
  function mostrarLoader(texto = "Cargando...") {
    state.cargando = true;
    const loader = document.getElementById("app-loader");
    const loaderTxt = document.getElementById("app-loader-text");
    if (loader) loader.classList.remove("hidden");
    if (loaderTxt) loaderTxt.textContent = texto;
  }

  function ocultarLoader() {
    state.cargando = false;
    const loader = document.getElementById("app-loader");
    if (loader) loader.classList.add("hidden");
  }

  function mostrarNotificacion(mensaje, tipo = "info") {
    const contenedor = document.getElementById("toast-container");
    if (!contenedor) return;

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${tipo}`;
    toast.innerHTML = `<span>${mensaje}</span>`;
    contenedor.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-fadeout");
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  function mostrarEstadoVacio(mensaje) {
    const tbody = document.getElementById("tabla-cuerpo");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="td-sin-resultados">
            <div class="empty-state-inner">
              <span class="empty-state-icon">⚠️</span>
              <p>${mensaje}</p>
            </div>
          </td>
        </tr>
      `;
    }
  }

})();
