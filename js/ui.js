import {
    getState,
    toggleJugadorDisponible,
    setPartitSeleccionat,
    addPartido,
    updatePartido,
    addClipToPartido,
    deleteClipFromPartido,
    setJugadoresDisponibles
} from './state.js';
import { generarMejorAlineacion } from './core.js';
import { guardarDatosEnSupabase } from './api.js';
import { mostrarGraficasJugador } from './charts.js';
import { guardarEstadisticasPartido,
         getJugadoresEquipo} from './api.js';
import { handleTeamLoginSubmit,
         handleCheckStatus,
         handleCancelRequest,
         handleVoteSubmit } from './auth.js';

// Utility Functions

/**
 * Muestra un modal de votación para una o más peticiones pendientes.
 * El contenido del modal es dinámico según el tipo de petición.
 * @param {Array<object>} peticiones - Un array con las peticiones pendientes de voto.
 */
export function mostrarModalDeVotacion(peticiones) {
    if (!peticiones || peticiones.length === 0) return;

    // Por ahora, manejamos la primera petición de la lista.
    // En el futuro, se podría crear un carrusel si hay varias.
    const peticion = peticiones[0];

    const { elements } = getState();
    let titulo, descripcion;

    // Generamos el contenido dinámicamente según el tipo de petición
    switch (peticion.tipo) {
        case 'añadir_jugador':
            titulo = `<i class="fas fa-user-plus"></i> Nova Sol·licitud d'Unió`;
            descripcion = `El jugador <strong>${peticion.metadata.nombre_solicitante}</strong> vol unir-se a l'equip. L'acceptes?`;
            break;
        case 'eliminar_jugador':
            titulo = `<i class="fas fa-user-minus"></i> Proposta d'Eliminació`;
            descripcion = `S'ha proposat eliminar el jugador <strong>${peticion.metadata.nombre_jugador_objetivo}</strong> de l'equip. Estàs d'acord?`;
            break;
        case 'cambiar_id_equip':
            titulo = `<i class="fas fa-id-card"></i> Proposta de Canvi d'ID`;
            descripcion = `S'ha proposat canviar l'ID de l'equip a <strong>"${peticion.metadata.nuevo_id_equip}"</strong>. L'acceptes?`;
            break;
        default:
            titulo = 'Nova Petició';
            descripcion = 'Hi ha una nova petició pendent de votació.';
    }

    // Creamos el HTML del modal
    const modalContent = `
        <div class="modal-header">
            <h2>${titulo}</h2>
            <p class="modal-subtitle">${descripcion}</p>
        </div>
        <div class="form-actions">
            <button class="btn-primary btn-vote" data-peticion-id="${peticion.id}" data-voto="true">
                <i class="fas fa-check"></i> Acceptar
            </button>
            <button class="btn-secondary btn-vote" data-peticion-id="${peticion.id}" data-voto="false">
                <i class="fas fa-times"></i> Denegar
            </button>
        </div>
    `;

    elements.modal.content.innerHTML = modalContent;
    abrirModal();

    // Añadimos un único listener para ambos botones de voto
    document.querySelectorAll('.btn-vote').forEach(button => {
        button.addEventListener('click', handleVoteSubmit);
    });
}

/**
 * Muestra una pantalla de espera para los usuarios cuya solicitud de unión está pendiente.
 * @param {object} peticion - El objeto de la petición pendiente.
 */
export function mostrarPantallaDeEspera(peticion) {
    const { elements } = getState();
    const nombreSolicitante = peticion.metadata.nombre_solicitante;

    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-hourglass-half"></i> Sol·licitud Pendent</h2>
            <p class="modal-subtitle">Hola, ${nombreSolicitante}. La teva sol·licitud per unir-te a l'equip està sent votada.</p>
        </div>
        <div class="espera-info">
            <p>Rebràs accés a l'aplicació un cop tots els membres de l'equip hagin acceptat la teva sol·licitud.</p>
            <p>Pots tancar aquesta pàgina de manera segura i tornar més tard.</p>
        </div>
        <div class="form-actions">
            <button id="btn-check-status" class="btn-primary" data-peticion-id="${peticion.id}">
                <i class="fas fa-sync-alt"></i> Comprovar Estat
            </button>
            <button id="btn-cancel-request" class="btn-secondary" data-peticion-id="${peticion.id}">
                <i class="fas fa-times"></i> Cancel·lar Sol·licitud
            </button>
        </div>
    `;

    elements.modal.content.innerHTML = modalContent;
    abrirModal(); // Aseguramos que el modal se muestre

    // Añadimos los listeners a los botones
    document.getElementById('btn-check-status').addEventListener('click', handleCheckStatus);
    document.getElementById('btn-cancel-request').addEventListener('click', handleCancelRequest);
}

/**
 * Muestra el segundo modal del flujo de login, permitiendo al usuario
 * seleccionarse de una lista o registrarse como nuevo jugador.
 * @param {object} equipo - El objeto del equipo al que el usuario intenta acceder.
 */
export async function mostrarLoginDeJugador(equipo) {
    const { elements } = getState();

    // Mostramos un estado de carga mientras buscamos los jugadores
    elements.modal.content.innerHTML = `<p>Carregant jugadors de l'equip "${equipo.nom_equip}"...</p>`;
    abrirModal(); // Aseguramos que el modal siga abierto o se abra

    // Obtenemos la lista de jugadores de la API
    const jugadores = await getJugadoresEquipo(equipo.id);

    if (jugadores === null) {
        elements.modal.content.innerHTML = `<p>Error al carregar la llista de jugadors.</p>`;
        return;
    }

    // Construimos dinámicamente la lista de jugadores como botones
    const listaJugadoresHtml = jugadores.length > 0
        ? jugadores.map(j => `<button class="btn-jugador-existente" data-player-id="${j.id}">${j.nom_mostrat}</button>`).join('')
        : "<p>Aquest equip encara no té jugadors. Sigues el primer!</p>";

    // Creamos el HTML final del modal
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-user-check"></i> Qui ets?</h2>
            <p class="modal-subtitle">Selecciona el teu nom o registra't si ets nou.</p>
        </div>
        <div class="lista-jugadores">
            ${listaJugadoresHtml}
        </div>
        <hr>
        <form id="form-new-player" class="form-login">
            <div class="form-group">
                <label for="new-player-name">...o introdueix el teu nom si ets nou</label>
                <input type="text" id="new-player-name" class="form-control" placeholder="El teu nom">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-paper-plane"></i> Sol·licitar Unir-se
                </button>
            </div>
        </form>
    `;

    elements.modal.content.innerHTML = modalContent;

    // AÑADIMOS LOS EVENT LISTENERS
    // 1. Para los jugadores existentes
    document.querySelectorAll('.btn-jugador-existente').forEach(button => {
        button.addEventListener('click', (e) => {
            const playerId = e.target.dataset.playerId;
            handlePlayerSelection(equipo.id, playerId);
        });
    });

    // 2. Para el formulario de nuevo jugador
    const form = document.getElementById('form-new-player');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = document.getElementById('new-player-name').value.trim();
        if (newName) {
            handleNewPlayerSubmit(equipo.id, newName);
        }
    });
}

export function abrirModal() {
    const { elements } = getState();
    elements.modal.backdrop.classList.add('visible');
    elements.modal.popup.classList.add('visible');
}

export function cerrarModal() {
    const { elements } = getState();
    elements.modal.backdrop.classList.remove('visible');
    elements.modal.popup.classList.remove('visible');
    elements.modal.popup.classList.remove('modal-large');
    elements.modal.content.innerHTML = '';

    // Modificación aquí: en lugar de cambiar el display, quitamos la clase 'visible'
    const teamIdModal = document.getElementById('team-id-modal');
    if (teamIdModal) {
        teamIdModal.classList.remove('visible');
    }
}

/**
 * Muestra el primer modal del flujo de login, pidiendo el ID de usuario del equipo.
 */
export function mostrarLoginDeEquipo() {
    const { elements } = getState(); // Asumimos que initElements ya se ha llamado

    // Reutilizamos el modal genérico que ya tienes en index.html
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-users"></i> Accés a l'Equip</h2>
            <p class="modal-subtitle">Introdueix l'identificador del teu equip per començar.</p>
        </div>
        <form id="form-team-login" class="form-login">
            <div class="form-group">
                <label for="team-id-input">ID de l'Equip</label>
                <input type="text" id="team-id-input" class="form-control" required placeholder="Ex: fs_vic_2024">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-arrow-right"></i> Següent
                </button>
            </div>
        </form>
    `;

    // Inyectamos el contenido en el popup y lo hacemos visible
    elements.modal.content.innerHTML = modalContent;
    elements.modal.backdrop.classList.add('visible');
    elements.modal.popup.classList.add('visible');

    // Añadimos el listener para el envío del formulario
    const form = document.getElementById('form-team-login');
    if (form) {
        // Adjuntamos una función que definiremos en auth.js
        form.addEventListener('submit', handleTeamLoginSubmit);
    }
}

export function renderizarCarrusel() {
    const { elements, plantilla, jugadoresDisponibles } = getState();
    elements.carrusel.innerHTML = '';
    plantilla.forEach(j => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-jugador';
        if (jugadoresDisponibles.includes(j.id)) {
            tarjeta.classList.add('seleccionado');
        }
        tarjeta.textContent = j.nombreMostrado;

        tarjeta.addEventListener('click', () => {
            toggleJugadorDisponible(j.id);
        });

        elements.carrusel.appendChild(tarjeta);
    });
}

export function renderizarAlineacion(alin, isPizarraMode = false) {
    const { elements, plantilla, inicialesPosicion, coordenadasPosiciones } = getState();
    if (!isPizarraMode) {
        elements.overlay.innerHTML = '';
    }
    for (const pos in alin) {
        const idTitular = alin[pos].titular;
        if (!idTitular) continue;

        const cont = document.createElement('div');
        cont.className = 'ficha-container';

        const posEl = document.createElement('div');
        posEl.className = 'posicion-nombre';

        const fichaEl = document.createElement('div');
        fichaEl.className = 'ficha-jugador';

        const suplentesEl = document.createElement('div');
        suplentesEl.className = 'info-suplentes';

        const jugadorTitular = plantilla.find(p => p.id === idTitular);
        const inicialesPos = inicialesPosicion[pos];
        const idsSuplentes = alin[pos].suplentes || [];
        const nombresSuplentes = idsSuplentes
            .map(id => plantilla.find(p => p.id === id)?.nombreMostrado)
            .filter(Boolean)
            .join(', ');

        posEl.textContent = inicialesPos;
        fichaEl.textContent = jugadorTitular ? jugadorTitular.nombreMostrado : '';
        if (nombresSuplentes && !isPizarraMode) {
            suplentesEl.textContent = nombresSuplentes;
        }

        cont.appendChild(posEl);
        cont.appendChild(fichaEl);
        if (nombresSuplentes && !isPizarraMode) {
            cont.appendChild(suplentesEl);
        }

        cont.style.top = coordenadasPosiciones[pos].top;
        cont.style.left = coordenadasPosiciones[pos].left;

        elements.overlay.appendChild(cont);
        setTimeout(() => cont.classList.add('visible'), 50);
    }
}

export function activarTab(tab) {
    const { elements } = getState();
    // Ocultar todas las secciones
    elements.sections.alineacio.style.display = 'none';
    elements.sections.estadistiques.style.display = 'none';
    elements.sections.clips.style.display = 'none';
    elements.sections.configuracion.style.display = 'none';

    // Gestionar visibilidad del carrusel
    document.querySelector('.carrusel-container').style.display = tab === 'alineacio' ? 'block' : 'none';

    // Mostrar todos los botones de navegación
    elements.nav.btnEstadistiques.style.display = 'block';
    elements.nav.btnAlineacio.style.display = 'block';
    elements.nav.btnClips.style.display = 'block';

    // Quitar clase active de todos los botones
    elements.nav.btnEstadistiques.classList.remove('active');
    elements.nav.btnAlineacio.classList.remove('active');
    elements.nav.btnClips.classList.remove('active');
    elements.nav.btnConfiguracion.classList.remove('active');

    // Hacer scroll al inicio de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Activar la sección correspondiente
    if (tab === 'alineacio') {
        elements.sections.alineacio.style.display = 'block';
        document.querySelector('footer').style.display = 'block';
        elements.nav.btnAlineacio.classList.add('active');
    } else if (tab === 'estadistiques') {
        elements.sections.estadistiques.style.display = 'block';
        elements.nav.btnEstadistiques.classList.add('active');
        renderizarEstadistiques();
    } else if (tab === 'clips') {
        elements.sections.clips.style.display = 'block';
        elements.nav.btnClips.classList.add('active');
        // Actualizar el selector de clips antes de renderizar
        actualizarSelectorClips();
        renderizarClips();
    } else if (tab === 'configuracion') {
        elements.sections.configuracion.style.display = 'block';
        elements.nav.btnConfiguracion.classList.add('active');
        // Aquí podríamos llamar a una función que renderice el contenido de la configuración
        // renderizarContenidoConfiguracion(); 
    }

    // Actualizar el estado de los botones
    elements.nav.btnAlineacio.title = tab === 'alineacio' ? 'Secció actual' : 'Anar a Alineació';
    elements.nav.btnEstadistiques.title = tab === 'estadistiques' ? 'Secció actual' : 'Anar a Estadístiques';
    elements.nav.btnClips.title = tab === 'clips' ? 'Secció actual' : 'Anar a Clips';
}

export function actualizarSelectorPartits(selectedId = 'global') {
    const { elements, partidos } = getState();
    const options = [`<option value="global">Global</option>`];
    partidos.forEach(p => {
        options.push(`<option value="${p.id}" ${p.id == selectedId ? 'selected' : ''}>
            ${p.nom} ${p.resultat ? `(${p.resultat})` : ''}
        </option>`);
    });
    elements.stats.selector.innerHTML = options.join('');
    setPartitSeleccionat(selectedId);
}

export function mostrarEstadisticas(jugadorId) {
    const { plantilla, estadisticasJugadores, partidos } = getState();
    const jugador = plantilla.find(j => j.id === jugadorId);

    // Obtener estadísticas de partidos antiguos
    const statsAntiguos = estadisticasJugadores[jugadorId] || [];
    const totalsAntiguos = statsAntiguos.reduce((acc, curr) => {
        acc.goles += curr.goles || 0;
        acc.asistencias += curr.asistencias || 0;
        acc.chutes += curr.chutes || 0;
        acc.perdidas += curr.perdidas || 0;
        acc.recuperaciones += curr.recuperaciones || 0;
        acc.goles_a_favor += curr.goles || 0; // En los datos antiguos usamos goles como goles a favor
        acc.goles_en_contra += 0; // No teníamos goles en contra en los datos antiguos
        acc.mvp_flow += calcularMvpFlow(curr);
        return acc;
    }, { goles: 0, asistencias: 0, chutes: 0, perdidas: 0, recuperaciones: 0, goles_a_favor: 0, goles_en_contra: 0, mvp_flow: 0 });

    // Obtener estadísticas de partidos nuevos
    const statsNuevos = partidos.map(p => p.estadistiques?.[jugadorId]).filter(Boolean);
    const totalsNuevos = statsNuevos.reduce((acc, curr) => {
        acc.goles += curr.goles || 0;
        acc.asistencias += curr.asistencias || 0;
        acc.chutes += curr.chutes || 0;
        acc.perdidas += curr.perdidas || 0;
        acc.recuperaciones += curr.recuperaciones || 0;
        acc.goles_a_favor += curr.goles_a_favor || 0;
        acc.goles_en_contra += curr.goles_en_contra || 0;
        acc.mvp_flow += calcularMvpFlow(curr);
        return acc;
    }, { goles: 0, asistencias: 0, chutes: 0, perdidas: 0, recuperaciones: 0, goles_a_favor: 0, goles_en_contra: 0, mvp_flow: 0 });

    // Combinar totales
    const totals = {
        goles: totalsAntiguos.goles + totalsNuevos.goles,
        asistencias: totalsAntiguos.asistencias + totalsNuevos.asistencias,
        chutes: totalsAntiguos.chutes + totalsNuevos.chutes,
        perdidas: totalsAntiguos.perdidas + totalsNuevos.perdidas,
        recuperaciones: totalsAntiguos.recuperaciones + totalsNuevos.recuperaciones,
        goles_a_favor: totalsAntiguos.goles_a_favor + totalsNuevos.goles_a_favor,
        goles_en_contra: totalsAntiguos.goles_en_contra + totalsNuevos.goles_en_contra,
        mvp_flow: (totalsAntiguos.mvp_flow + totalsNuevos.mvp_flow) / (statsAntiguos.length + statsNuevos.length || 1)
    };

    const partitsJugats = statsAntiguos.length + statsNuevos.length;
    const { elements } = getState();
    elements.modal.content.innerHTML = `
        <h3>Estadístiques de ${jugador.nombreMostrado}</h3>
        <div class="stats-viewer">
            <div class="stat-item"><span>Partits jugats:</span> <span>${partitsJugats}</span></div><hr>
            <div class="stat-item"><span>GOLES:</span> <span>${totals.goles}</span></div>
            <div class="stat-item"><span>ASSISTÈNCIES:</span> <span>${totals.asistencias}</span></div>
            <div class="stat-item"><span>XUTS:</span> <span>${totals.chutes}</span></div>
            <div class="stat-item"><span>PÈRDUES:</span> <span>${totals.perdidas}</span></div>
            <div class="stat-item"><span>RECUPERACIONS:</span> <span>${totals.recuperaciones}</span></div>
            <div class="stat-item"><span>EQUIP EN RATXA:</span> <span>${totals.goles_a_favor}</span></div>
            <div class="stat-item"><span>EQUIP EN CRISI:</span> <span>${totals.goles_en_contra}</span></div>
        </div>`;
    abrirModal();
}

// Importa la nueva función que hemos creado y también getState
import { crearPartidoEnSupabase } from './api.js';
import { getState, addPartido } from './state.js';


export function crearNuevoPartido() {
    const { elements } = getState();
    const form = `
        <div class="modal-header">
            <h2><i class="fas fa-plus-circle"></i> Afegir Partit</h2>
            <p class="modal-subtitle">Crea un nou partit per registrar-ne les estadístiques</p>
        </div>
        <div class="stats-form">
            <div class="form-group">
                <label for="nom-partit"><i class="fas fa-futbol"></i>Nom del partit</label>
                <input type="text" id="nom-partit" class="form-control" required placeholder="Ex: Jornada 5 vs Rival">
            </div>
            <div class="form-group">
                <label for="resultat-partit"><i class="fas fa-scoreboard"></i>Resultat</label>
                <input type="text" id="resultat-partit" class="form-control" placeholder="Ex: 3-2">
            </div>
            <div class="form-actions">
                <button id="btn-crear-partit" class="btn-primary">
                    <i class="fas fa-check"></i>Crear i Continuar
                </button>
                <button id="btn-cancelar" class="btn-secondary">
                    <i class="fas fa-times"></i>Cancel·lar
                </button>
            </div>
        </div>
    `;

    elements.modal.content.innerHTML = form;
    abrirModal();

    document.getElementById('btn-crear-partit').onclick = async () => { // Convertimos la función a 'async'
        const nom = document.getElementById('nom-partit').value.trim();
        const resultat = document.getElementById('resultat-partit').value.trim();
        const { teamId } = getState(); // Obtenemos el ID del equipo desde el estado

        if (!nom) {
            alert('Si us plau, introdueix el nom del partit');
            return;
        }
        
        // Llamamos a la nueva función de la API para crear el partido en la base de datos
        const nouPartit = await crearPartidoEnSupabase(nom, resultat, teamId);

        if (nouPartit) {
            // Si el partido se crea con éxito, lo añadimos al estado local de la app
            addPartido(nouPartit);
            cerrarModal();
            // Abrimos la edición de estadísticas para el nuevo partido
            setTimeout(() => mostrarEdicionEstadisticasHoja(nouPartit.id), 100);
        }
    };

    document.getElementById('btn-cancelar').onclick = cerrarModal;
}

export function mostrarEdicionEstadisticasHoja(partidoId) {
    const { partidos, plantilla, elements } = getState();
    const partido = partidos.find(p => p.id == partidoId);
    if (!partido) return;

    // Lista de estadísticas disponibles
    const estadisticasDisponibles = [
        { key: 'goles', nombre: 'Gols' },
        { key: 'asistencias', nombre: 'Assistències' },
        { key: 'chutes', nombre: 'Xuts' },
        { key: 'perdidas', nombre: 'Pèrdues' },
        { key: 'recuperaciones', nombre: 'Recuperacions' },
        { key: 'goles_a_favor', nombre: 'Gols a Favor' },
        { key: 'goles_en_contra', nombre: 'Gols en Contra' }
    ];
    let indiceEstadisticaActual = 0; // Goles por defecto

    // Función para renderizar la tabla de una estadística específica
    const renderizarTablaEstadistica = () => {
        const estadisticaActual = estadisticasDisponibles[indiceEstadisticaActual];

        const tablaHTML = `
            <table class="stats-table-mvp stats-table-edit">
                <thead>
                    <tr>
                        <th>Jugador</th>
                        <th id="stat-header" class="interactive-header"
                            data-stat-key="${estadisticaActual.key}">
                            <span>${estadisticaActual.nombre}</span>
                            <div class="header-icons">
                                <i class="fas fa-chevron-up"></i>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${plantilla.map(jugador => {
            const stats = partido.estadistiques[jugador.id] || {};
            const valor = stats[estadisticaActual.key] || 0;
            return `
                            <tr>
                                <td>${jugador.nombreMostrado}</td>
                                <td>
                                    <input type="number" class="form-control" min="0" value="${valor}"
                                        data-jugador="${jugador.id}"
                                        data-stat="${estadisticaActual.key}">
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;

        const container = elements.modal.content.querySelector('#stats-table-container');
        if (container) {
            container.innerHTML = tablaHTML;
        }
    };

    const form = `
        <div class="modal-header">
            <h2><i class="fas fa-edit"></i> Editar Estadístiques</h2>
            <p class="modal-subtitle">${partido.nom}</p>
        </div>
        <div class="stats-form">
            <div id="stats-table-container" class="stats-table-container">
                <!-- La tabla se renderizará aquí -->
            </div>
            <div class="form-actions">
                <button id="btn-guardar-stats" class="btn-primary">
                    <i class="fas fa-save"></i> Guardar
                </button>
                <button id="btn-cancelar-stats" class="btn-secondary">
                    <i class="fas fa-times"></i> Tancar
                </button>
            </div>
        </div>
    `;

    elements.modal.content.innerHTML = form;
    renderizarTablaEstadistica();
    abrirModal();

    // --- Lógica para cambiar de estadística ---
    const cambiarEstadistica = (direccion) => {
        // Guardar el valor actual antes de cambiar
        const inputs = elements.modal.content.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            const jugadorId = input.dataset.jugador;
            const statName = input.dataset.stat;
            const value = parseInt(input.value) || 0;
            if (!partido.estadistiques[jugadorId]) partido.estadistiques[jugadorId] = {};
            partido.estadistiques[jugadorId][statName] = value;
        });

        // Cambiar al siguiente índice de estadística
        indiceEstadisticaActual = (indiceEstadisticaActual + direccion + estadisticasDisponibles.length) % estadisticasDisponibles.length;

        // Volver a renderizar la tabla con la nueva estadística
        renderizarTablaEstadistica();
        configurarListenersEstadisticas(); // Re-configurar listeners para la nueva tabla
    };

    const configurarListenersEstadisticas = () => {
        const header = document.getElementById('stat-header');
        if (!header) return;

        // Listener para Clic
        header.onclick = () => cambiarEstadistica(1); // Avanza a la siguiente

        // Listeners para Swipe (gestos táctiles)
        let touchStartY = 0;
        let touchEndY = 0;

        header.addEventListener('touchstart', e => {
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        header.addEventListener('touchend', e => {
            touchEndY = e.changedTouches[0].screenY;
            if (touchStartY - touchEndY > 50) { // Swipe hacia arriba
                cambiarEstadistica(1);
            } else if (touchEndY - touchStartY > 50) { // Swipe hacia abajo
                cambiarEstadistica(-1);
            }
        }, { passive: true });
    };

    configurarListenersEstadisticas();

    // Event listener para guardar los cambios
document.getElementById('btn-guardar-stats').onclick = async () => { // Convertimos la función a 'async'
    const inputs = elements.modal.content.querySelectorAll('input[type="number"]');
    const estadisticasDelPartido = partido.estadistiques || {};

    // 1. Recopilamos todos los datos del formulario en un objeto, como ya hacías.
    inputs.forEach(input => {
        const jugadorId = input.dataset.jugador;
        const statName = input.dataset.stat;
        const value = parseInt(input.value) || 0;

        if (!estadisticasDelPartido[jugadorId]) {
            estadisticasDelPartido[jugadorId] = {};
        }
        estadisticasDelPartido[jugadorId][statName] = value;
    });

    // 2. Llamamos a la nueva función de la API para guardar los datos en Supabase.
    const exito = await guardarEstadisticasPartido(partido.id, estadisticasDelPartido);

    if (exito) {
        // 3. Si se guardó correctamente, actualizamos el estado local de la app.
        partido.estadistiques = estadisticasDelPartido; // Actualizamos el objeto del partido en el estado
        updatePartido(partido); // Esta función ya se encarga de redibujar la tabla de stats
        cerrarModal();
        alert('Estadísticas guardadas con éxito.');
    }
};

document.getElementById('btn-cancelar-stats').onclick = cerrarModal;
}

export const renderizarEstadistiques = () => {
    const { elements, partitSeleccionat, plantilla, estadisticasJugadores, partidos } = getState();
    let html = `<div class="stats-table-container"><table class="stats-table-mvp">
        <thead><tr>
            <th>Jugador</th>
            <th>Gols</th>
            <th>Assistències</th>
            <th>Xuts</th>
            <th>Pèrdues</th>
            <th>Recuperacions</th>
            <th>Gols a Favor</th>
            <th>Gols en Contra</th>
            <th>MVP Flow</th>
            </tr></thead><tbody>`;
    let primerJugadorId = null;
    if (partitSeleccionat === 'global') {
        plantilla.forEach(j => {
            // Obtener estadísticas de los partidos antiguos
            const statsAntiguos = (estadisticasJugadores[j.id] || []).reduce((acc, curr) => {
                acc.goles += curr.goles || 0;
                acc.asistencias += curr.asistencias || 0;
                acc.chutes += curr.chutes || 0;
                acc.perdidas += curr.perdidas || 0;
                acc.recuperaciones += curr.recuperaciones || 0;
                acc.goles_a_favor += curr.goles || 0;
                acc.goles_en_contra += 0;
                return acc;
            }, { goles: 0, asistencias: 0, chutes: 0, perdidas: 0, recuperaciones: 0, goles_a_favor: 0, goles_en_contra: 0 });

            // Obtener estadísticas de los partidos nuevos
            const statsNuevos = partidos.map(p => p.estadistiques?.[j.id] || {});
            const totalsNuevos = statsNuevos.reduce((acc, curr) => {
                acc.goles += curr.goles || 0;
                acc.asistencias += curr.asistencias || 0;
                acc.chutes += curr.chutes || 0;
                acc.perdidas += curr.perdidas || 0;
                acc.recuperaciones += curr.recuperaciones || 0;
                acc.goles_a_favor += curr.goles_a_favor || 0;
                acc.goles_en_contra += curr.goles_en_contra || 0;
                return acc;
            }, { goles: 0, asistencias: 0, chutes: 0, perdidas: 0, recuperaciones: 0, goles_a_favor: 0, goles_en_contra: 0 });

            // Combinar las estadísticas antiguas y nuevas
            const totals = {
                goles: statsAntiguos.goles + totalsNuevos.goles,
                asistencias: statsAntiguos.asistencias + totalsNuevos.asistencias,
                chutes: statsAntiguos.chutes + totalsNuevos.chutes,
                perdidas: statsAntiguos.perdidas + totalsNuevos.perdidas,
                recuperaciones: statsAntiguos.recuperaciones + totalsNuevos.recuperaciones,
                goles_a_favor: statsAntiguos.goles_a_favor + totalsNuevos.goles_a_favor,
                goles_en_contra: statsAntiguos.goles_en_contra + totalsNuevos.goles_en_contra
            };

            const mvp_flow = calcularMvpFlow(totals);

            if (!primerJugadorId) primerJugadorId = j.id;
            html += `<tr class="stat-row" data-jugador-id="${j.id}" style="cursor:pointer">
                <td>${j.nombreMostrado}</td>
                <td>${totals.goles}</td>
                <td>${totals.asistencias}</td>
                <td>${totals.chutes}</td>
                <td>${totals.perdidas}</td>
                <td>${totals.recuperaciones}</td>
                <td>${totals.goles_a_favor}</td>
                <td>${totals.goles_en_contra}</td>
                <td>${mvp_flow.toFixed(1)}</td>
            </tr>`;
        });
    } else {
        // Vista de partido específico
        const partit = partidos.find(p => p.id == partitSeleccionat);
        if (partit) {
            plantilla.forEach(j => {
                const stats = partit.estadistiques[j.id] || {};
                const mvp_flow = calcularMvpFlow(stats);

                if (!primerJugadorId) primerJugadorId = j.id;
                html += `<tr class="stat-row" data-jugador-id="${j.id}" style="cursor:pointer">
                    <td>${j.nombreMostrado}</td>
                    <td>${stats.goles || 0}</td>
                    <td>${stats.asistencias || 0}</td>
                    <td>${stats.chutes || 0}</td>
                    <td>${stats.perdidas || 0}</td>
                    <td>${stats.recuperaciones || 0}</td>
                    <td>${stats.goles_a_favor || 0}</td>
                    <td>${stats.goles_en_contra || 0}</td>
                    <td>${mvp_flow.toFixed(1)}</td>
                </tr>`;
            });
        }
    } html += '</tbody></table></div>';
    elements.stats.lista.innerHTML = html;
    setupEstadisticasListeners(primerJugadorId);
};

// Funciones para gestionar clips
export function mostrarFormularioClip() {
    const { elements } = getState();
    elements.modal.popup.classList.add('modal-large'); elements.modal.content.innerHTML = `
        <div class="modal-header">
            <h2><i class="fas fa-film"></i> Afegir Clip</h2>
            <p class="modal-subtitle">Afegeix un clip de vídeo per a aquest partit</p>
        </div>
        <form id="form-clip" class="form-clip">
            <div class="form-group">
                <label for="clip-url">
                    <i class="fas fa-link"></i> 
                    URL del vídeo (YouTube o enllaç directe)
                </label>
                <input type="text" id="clip-url" class="form-control" 
                    required placeholder="https://..." 
                    pattern="https?://.+" 
                    title="Ha de ser una URL vàlida començant per http:// o https://">
                <small class="form-help">Copia l'enllaç del vídeo de YouTube o qualsevol altre servei de vídeo</small>
            </div>
            <div class="form-group">
                <label for="clip-descripcio">
                    <i class="fas fa-align-left"></i>
                    Descripció
                </label>
                <textarea id="clip-descripcio" class="form-control" 
                    required placeholder="Descriu l'acció o jugada..."
                    rows="4"></textarea>
                <small class="form-help">Descriu breument què passa en aquesta jugada</small>
            </div>
            <div class="form-group">
                <label for="clip-minut">
                    <i class="fas fa-clock"></i>
                    Minut de joc
                </label>
                <input type="text" id="clip-minut" class="form-control"
                    required placeholder="Ex: 12:34"
                    pattern="[0-9]{1,2}:[0-9]{2}"
                    title="Format: mm:ss (exemple: 12:34)">
                <small class="form-help">Format: minuts:segons (exemple: 12:34)</small>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i>
                    Guardar
                </button>
                <button type="button" class="btn-secondary" onclick="cerrarModal()">
                    <i class="fas fa-times"></i>
                    Cancel·lar
                </button>
            </div>
        </form>
    `;

    document.getElementById('form-clip').onsubmit = function (e) {
        e.preventDefault();
        const url = document.getElementById('clip-url').value;
        const descripcio = document.getElementById('clip-descripcio').value;
        const minut = document.getElementById('clip-minut').value;
        const { elements } = getState();
        const partidoId = elements.clips.selector.value;
        const clip = {
            id: Date.now(),
            url: url,
            descripcio: descripcio,
            minut: minut
        };
        addClipToPartido(partidoId, clip);
        cerrarModal();
    };

    abrirModal();
}

export function eliminarClip(partitId, clipId) {
    if (!confirm('Estàs segur que vols eliminar aquest clip?')) return;
    deleteClipFromPartido(partitId, clipId);
}

function getEmbedUrl(url) {
    try {
        // YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.includes('youtu.be')
                ? url.split('/').pop()
                : new URLSearchParams(new URL(url).search).get('v');
            return `https://www.youtube.com/embed/${videoId}`;
        }
        // Otros tipos de vídeo
        return url;
    } catch (e) {
        return url;
    }
}

export function renderizarClips() {
    const { elements, partidos } = getState();
    const partitId = elements.clips.selector.value;
    const partit = partidos.find(p => p.id == partitId);
    const container = elements.clips.lista;

    // Si no hay partido seleccionado o es global, mostrar mensaje
    if (!partit || partitId === 'global') {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-film"></i>
                <p>Selecciona un partit per veure els clips</p>
                <p class="empty-state-sub">Escull un partit del menú desplegable</p>
            </div>`;
        elements.clips.addBtn.style.display = 'none';
        return;
    }

    // Mostrar el botón de añadir clip solo si hay un partido seleccionado
    elements.clips.addBtn.style.display = 'block';

    // Si el partido no tiene clips o está vacío
    if (!partit.clips || partit.clips.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <p>No hi ha clips per a aquest partit</p>
                <p class="empty-state-sub">Fes clic al botó "Afegeix Clip" per començar</p>
            </div>`;
        return;
    }

    // Renderizar los clips existentes
    const html = partit.clips.map(clip => `
        <div class="clip-card">
            <div class="clip-video">
                <iframe 
                    src="${getEmbedUrl(clip.url)}"
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            </div>
            <div class="clip-info">
                <div>
                    <div class="clip-minut">Minut ${clip.minut}</div>
                    <div class="clip-descripcio">${clip.descripcio}</div>
                </div>
                <button class="btn-delete" onclick="eliminarClip(${partit.id}, ${clip.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

export function actualizarSelectorClips(selectedId = 'global') {
    const { elements, partidos } = getState();
    const options = [`<option value="global">Selecciona un partit</option>`];
    partidos.forEach(p => {
        options.push(`<option value="${p.id}" ${p.id == selectedId ? 'selected' : ''}>
            ${p.nom} ${p.resultat ? `(${p.resultat})` : ''}
        </option>`);
    });
    elements.clips.selector.innerHTML = options.join('');
}

// Función helper para establecer los event listeners de la tabla de estadísticas
export function setupEstadisticasListeners(primerJugadorId) {
    const { elements } = getState();
    const analyticsContainer = document.getElementById('analytics-container');
    if (analyticsContainer) {
        analyticsContainer.innerHTML = `
            <div id="analisi-rendiment" class="analisi-rendiment-container">
                <h2>Selecciona un jugador per veure l'anàlisi</h2>
            </div>
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h3>Evolució MVP Flow</h3>
                    <canvas id="chart-rendimiento"></canvas>
                </div>
                <div class="analytics-card">
                    <h3>Rendiment per Estadístiques</h3>
                    <canvas id="chart-mvp"></canvas>
                </div>
            </div>
        `;
    }

    const filas = elements.stats.lista.querySelectorAll('.stat-row');
    filas.forEach(fila => {
        fila.addEventListener('click', () => {
            filas.forEach(f => f.classList.remove('selected'));
            fila.classList.add('selected');
            const jugadorId = parseInt(fila.dataset.jugadorId);
            mostrarGraficasJugador(jugadorId);
        });
    });

    // Seleccionar el primer jugador por defecto
    if (primerJugadorId) {
        const primeraFila = elements.stats.lista.querySelector(`[data-jugador-id="${primerJugadorId}"]`);
        if (primeraFila) {
            primeraFila.click(); // Esto activará el evento click que mostrará los gráficos
        }
    }
}

// Función para resetear los datos de la aplicación
export function resetearAplicacion() {
    if (confirm('Estàs segur que vols esborrar totes les dades? Aquesta acció no es pot desfer.')) {
        // Limpiar datos
        setPartidos([]);
        setPartitSeleccionat('global');
        setJugadoresDisponibles([]);

        // Limpiar localStorage
        localStorage.removeItem('partits');
        localStorage.removeItem('partitSeleccionat');

        // Resetear la interfaz
        actualizarSelectorPartits();
        actualizarSelectorClips();
        renderizarEstadistiques();
        renderizarClips();
        renderizarCarrusel();
        renderizarAlineacion(generarMejorAlineacion());

        alert('S\'han esborrat totes les dades correctament');
    }
}

export function calcularMvpFlow(stats) {
    let puntos = 0;
    puntos += Math.min(stats.goles || 0, 3) * 2;
    puntos += Math.min(stats.asistencias || 0, 3) * 1.5;
    puntos += Math.min(stats.chutes || 0, 6) * 0.5;
    if ((stats.goles || 0) === 0 && (stats.chutes || 0) >= 5) puntos -= 1;
    puntos -= Math.min(stats.perdidas || 0, 6) * 0.5;
    puntos += Math.min(stats.recuperaciones || 0, 6) * 0.5;
    puntos += Math.min(stats.goles_a_favor || 0, 8) * 0.25;
    puntos -= Math.min(stats.goles_en_contra || 0, 8) * 0.25;
    return Math.max(1.0, Math.min(puntos, 10.0));
}

function makeDraggable(element, container) {
    let isDragging = false;
    let offsetX, offsetY;

    const onPointerDown = (e) => {
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = 11;
        element.classList.add('dragging'); // Feedback visual
        e.preventDefault();
        element.setPointerCapture(e.pointerId);

        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // La magia: calcular el offset relativo al contenedor, no a la ventana
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
    };

    const onPointerMove = (e) => {
        if (!isDragging) return;

        const containerRect = container.getBoundingClientRect();
        // La posición del ratón relativa al contenedor
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        // Nueva posición del elemento es la del ratón menos el offset inicial
        let x = mouseX - offsetX;
        let y = mouseY - offsetY;

        const elementWidth = element.offsetWidth;
        const elementHeight = element.offsetHeight;

        // Asegurarse que la pieza no salga del contenedor
        x = Math.max(0, Math.min(x, containerRect.width - elementWidth));
        y = Math.max(0, Math.min(y, containerRect.height - elementHeight));

        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    };

    const onPointerUp = (e) => {
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = 10;
        element.releasePointerCapture(e.pointerId);
    };

    element.addEventListener('pointerdown', onPointerDown, { passive: false });
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
}

function renderizarPizarra() {
    const { elements } = getState();
    elements.overlay.innerHTML = '';
    elements.overlay.style.pointerEvents = 'auto';

    const crearElemento = (id, className, text, left, top) => {
        const el = document.createElement('div');
        el.id = id;
        el.className = className;
        if (text) el.textContent = text;
        el.style.left = left;
        el.style.top = top;
        elements.overlay.appendChild(el);
        makeDraggable(el, elements.campo);
        return el;
    };

    const formacionLocal = [
        { left: '50%', top: '85%' }, { left: '25%', top: '70%' },
        { left: '75%', top: '70%' }, { left: '50%', top: '55%' }
    ];
    const formacionRival = [
        { left: '50%', top: '15%' }, { left: '25%', top: '30%' },
        { left: '75%', top: '30%' }, { left: '50%', top: '45%' }
    ];

    crearElemento('local-p', 'pizarra-jugador-local', '', '50%', '95%');
    formacionLocal.forEach((pos, i) => {
        crearElemento(`local-${i + 1}`, 'pizarra-jugador-local', '', pos.left, pos.top);
    });

    crearElemento('rival-p', 'pizarra-jugador-rival', '', '50%', '5%');
    formacionRival.forEach((pos, i) => {
        crearElemento(`rival-${i + 1}`, 'pizarra-jugador-rival', '', pos.left, pos.top);
    });

    crearElemento('pelota', 'pizarra-pelota', '', '50%', '50%');
}

function reiniciarPosiciones() {
    renderizarPizarra();
}

let isRecording = false;
let jugadaActual = [];
let timeoutsAnimacion = [];

function setupPizarraEventListeners() {
    const { elements } = getState();

    document.getElementById('reiniciar-posiciones-btn').addEventListener('click', reiniciarPosiciones);
    document.getElementById('iniciar-grabacion-btn').addEventListener('click', iniciarGrabacion);
    document.getElementById('anadir-paso-btn').addEventListener('click', anadirPaso);
    document.getElementById('finalizar-jugada-btn').addEventListener('click', finalizarGrabacion);
}

function iniciarGrabacion() {
    isRecording = true;
    jugadaActual = [];
    document.getElementById('iniciar-grabacion-btn').disabled = true;
    document.getElementById('anadir-paso-btn').disabled = false;
    document.getElementById('finalizar-jugada-btn').disabled = false;
    getState().elements.campo.classList.add('recording');
    anadirPaso(); // Guardar el estado inicial
}

function anadirPaso() {
    if (!isRecording) return;
    const { elements } = getState();
    const paso = [];
    const fichas = elements.overlay.querySelectorAll('.pizarra-jugador-local, .pizarra-jugador-rival, .pizarra-pelota');
    fichas.forEach((ficha, index) => {
        paso.push({
            id: ficha.id || `ficha-${index}`, // Asegurar que cada ficha tenga un ID
            left: ficha.style.left,
            top: ficha.style.top
        });
    });
    jugadaActual.push(paso);

    const anadirPasoBtn = document.getElementById('anadir-paso-btn');
    anadirPasoBtn.classList.add('feedback');
    setTimeout(() => anadirPasoBtn.classList.remove('feedback'), 300);
}

function finalizarGrabacion() {
    isRecording = false;
    getState().elements.campo.classList.remove('recording');
    document.getElementById('iniciar-grabacion-btn').disabled = false;
    document.getElementById('anadir-paso-btn').disabled = true;
    document.getElementById('finalizar-jugada-btn').disabled = true;

    if (jugadaActual.length > 1) {
        const nombreJugada = prompt("Introdueix un nom per a la jugada:", "Nova Jugada");
        if (nombreJugada) {
            guardarJugada(nombreJugada, jugadaActual);
            renderizarJugadasGuardadas();
        }
    }
    jugadaActual = [];
}

function guardarJugada(nombre, jugada) {
    const jugadasGuardadas = JSON.parse(localStorage.getItem('jugadasPizarra') || '[]');
    jugadasGuardadas.push({ id: Date.now(), nombre, jugada });
    localStorage.setItem('jugadasPizarra', JSON.stringify(jugadasGuardadas));
}

function renderizarJugadasGuardadas() {
    const panel = document.getElementById('jugadas-guardadas-panel');
    const jugadasGuardadas = JSON.parse(localStorage.getItem('jugadasPizarra') || '[]');

    let html = '<h3>Jugadas Guardadas</h3>';
    if (jugadasGuardadas.length === 0) {
        html += '<p>No hi ha jugades guardades.</p>';
    } else {
        html += '<ul>';
        jugadasGuardadas.forEach(jugada => {
            html += `
                <li>
                    <span>${jugada.nombre}</span>
                    <div>
                        <button class="btn-reproducir" data-id="${jugada.id}"><i class="fas fa-play"></i></button>
                        <button class="btn-eliminar" data-id="${jugada.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </li>`;
        });
        html += '</ul>';
    }
    panel.innerHTML = html;

    panel.querySelectorAll('.btn-reproducir').forEach(btn => {
        btn.addEventListener('click', () => reproducirJugada(btn.dataset.id));
    });
    panel.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => eliminarJugada(btn.dataset.id));
    });
}

function reproducirJugada(id) {
    const jugadasGuardadas = JSON.parse(localStorage.getItem('jugadasPizarra') || '[]');
    const jugadaData = jugadasGuardadas.find(j => j.id == id);
    if (!jugadaData) return;

    const { elements } = getState();
    const fichas = elements.overlay.querySelectorAll('.pizarra-jugador-local, .pizarra-jugador-rival, .pizarra-pelota');

    // Limpiar animaciones anteriores
    timeoutsAnimacion.forEach(timeout => clearTimeout(timeout));
    timeoutsAnimacion = [];

    let pasoIndex = 0;
    function animarPaso() {
        if (pasoIndex >= jugadaData.jugada.length) {
            // Restaurar la interactividad
            fichas.forEach(ficha => ficha.style.pointerEvents = 'auto');
            return;
        }

        const pasoActual = jugadaData.jugada[pasoIndex];
        pasoActual.forEach(pos => {
            const ficha = document.getElementById(pos.id);
            if (ficha) {
                ficha.style.transition = 'left 0.5s ease-in-out, top 0.5s ease-in-out';
                ficha.style.left = pos.left;
                ficha.style.top = pos.top;
                ficha.style.pointerEvents = 'none'; // Desactivar drag durante la animación
            }
        });

        pasoIndex++;
        timeoutsAnimacion.push(setTimeout(animarPaso, 1500)); // 1.5s entre pasos
    }

    animarPaso();
}

function eliminarJugada(id) {
    if (!confirm('Estàs segur que vols eliminar aquesta jugada?')) return;
    let jugadasGuardadas = JSON.parse(localStorage.getItem('jugadasPizarra') || '[]');
    jugadasGuardadas = jugadasGuardadas.filter(j => j.id != id);
    localStorage.setItem('jugadasPizarra', JSON.stringify(jugadasGuardadas));
    renderizarJugadasGuardadas();
}

export function togglePizarraTactical() {
    const { elements } = getState();
    const state = getState();
    state.isPizarraTacticalMode = !state.isPizarraTacticalMode;
    elements.campo.classList.toggle('pizarra-activa', state.isPizarraTacticalMode);
    elements.togglePizarraBtn.textContent = state.isPizarraTacticalMode ? 'Modo Pizarra: ON' : 'Pizarra Táctica';

    const carruselContainer = document.querySelector('.carrusel-container');
    if (carruselContainer) {
        carruselContainer.style.display = state.isPizarraTacticalMode ? 'none' : 'block';
    }

    const pizarraControls = document.getElementById('pizarra-controls-container');
    if (pizarraControls) {
        pizarraControls.style.display = state.isPizarraTacticalMode ? 'block' : 'none';
    }

    if (state.isPizarraTacticalMode) {
        renderizarPizarra();
        setupPizarraEventListeners();
        renderizarJugadasGuardadas();
    } else {
        elements.overlay.style.pointerEvents = 'none';
        renderizarAlineacion(state.alineacionActual, false);
        elements.campo.classList.remove('recording');
    }
}
