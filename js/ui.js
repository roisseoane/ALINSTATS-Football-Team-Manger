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
import { generarMejorAlineacion } from './main.js';
import { guardarDatos } from './api.js';
import { mostrarGraficasJugador } from './charts.js';

// Utility Functions
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

export function renderizarAlineacion(alin) {
    const { elements, plantilla, inicialesPosicion, coordenadasPosiciones } = getState();
    elements.overlay.innerHTML = '';
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
        if (nombresSuplentes) {
            suplentesEl.textContent = nombresSuplentes;
        }

        cont.appendChild(posEl);
        cont.appendChild(fichaEl);
        if (nombresSuplentes) {
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
    elements.sections.pissarra.style.display = 'none';

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
    elements.nav.btnPissarra.classList.remove('active');

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
    } else if (tab === 'pissarra') {
        elements.sections.pissarra.style.display = 'block';
        elements.nav.btnPissarra.classList.add('active');
    }

    // Actualizar el estado de los botones
    elements.nav.btnAlineacio.title = tab === 'alineacio' ? 'Secció actual' : 'Anar a Alineació';
    elements.nav.btnEstadistiques.title = tab === 'estadistiques' ? 'Secció actual' : 'Anar a Estadístiques';
    elements.nav.btnClips.title = tab === 'clips' ? 'Secció actual' : 'Anar a Clips';
    elements.nav.btnPissarra.title = tab === 'pissarra' ? 'Secció actual' : 'Anar a Pissarra';
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

export function crearNuevoPartido() {
    const { elements, partidos } = getState();
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

    document.getElementById('btn-crear-partit').onclick = () => {
        const nom = document.getElementById('nom-partit').value.trim();
        const resultat = document.getElementById('resultat-partit').value.trim();

        if (!nom) {
            alert('Si us plau, introdueix el nom del partit');
            return;
        }

        const nouId = partidos.length > 0 ? Math.max(...partidos.map(p => p.id)) + 1 : 1;
        const nouPartit = {
            id: nouId,
            nom: nom,
            resultat: resultat,
            estadistiques: {}
        };
        addPartido(nouPartit);
        cerrarModal();
        setTimeout(() => mostrarEdicionEstadisticasHoja(nouId), 100);
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
    document.getElementById('btn-guardar-stats').onclick = () => {
        const inputs = elements.modal.content.querySelectorAll('input[type="number"]');

        if (!partido.estadistiques) {
            partido.estadistiques = {};
        }

        inputs.forEach(input => {
            const jugadorId = input.dataset.jugador;
            const statName = input.dataset.stat;
            const value = parseInt(input.value) || 0;

            if (!partido.estadistiques[jugadorId]) {
                partido.estadistiques[jugadorId] = {};
            }
            partido.estadistiques[jugadorId][statName] = value;
        });

        updatePartido(partido);
        cerrarModal();
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
