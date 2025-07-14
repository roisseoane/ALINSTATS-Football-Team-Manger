
// Global variables
let jugadoresDisponibles = [];
let alineacionActual = {};
let partits = [];
let partitSeleccionat = 'global';
let elements = {
    overlay: null,
    carrusel: null,
    modal: {
        backdrop: null,
        popup: null,
        content: null,
        closeBtn: null
    },
    sections: {
        alineacio: null,
        estadistiques: null,
        clips: null
    },
    stats: {
        selector: null,
        lista: null,
        addBtn: null,
        editBtn: null
    },
    clips: {
        selector: null,
        lista: null,
        addBtn: null
    },
    nav: {
        btnEstadistiques: null,
        btnAlineacio: null,
        btnClips: null
    }
};

// Utility Functions
function abrirModal() {
    elements.modal.backdrop.classList.add('visible');
    elements.modal.popup.classList.add('visible');
}

function cerrarModal() {
    elements.modal.backdrop.classList.remove('visible');
    elements.modal.popup.classList.remove('visible');
    elements.modal.popup.classList.remove('modal-large');
    elements.modal.content.innerHTML = '';
}

function calcularMvpFlow(stats) {
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

function renderizarCarrusel() {
    elements.carrusel.innerHTML = '';
    plantilla.forEach(j => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-jugador';
        if (jugadoresDisponibles.includes(j.id)) {
            tarjeta.classList.add('seleccionado');
        }
        tarjeta.textContent = j.nombreMostrado;
        
        tarjeta.addEventListener('click', () => {
            const isSelected = tarjeta.classList.toggle('seleccionado');
            if (isSelected) {
                if (!jugadoresDisponibles.includes(j.id)) {
                    jugadoresDisponibles.push(j.id);
                }
            } else {
                jugadoresDisponibles = jugadoresDisponibles.filter(x => x !== j.id);
            }
            renderizarAlineacion(generarMejorAlineacion());
        });

        elements.carrusel.appendChild(tarjeta);
    });
}

function renderizarAlineacion(alin) {
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

function activarTab(tab) {
    // Ocultar todas las secciones
    elements.sections.alineacio.style.display = 'none';
    elements.sections.estadistiques.style.display = 'none';
    elements.sections.clips.style.display = 'none';

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
    }

    // Actualizar el estado de los botones
    elements.nav.btnAlineacio.title = tab === 'alineacio' ? 'Secció actual' : 'Anar a Alineació';
    elements.nav.btnEstadistiques.title = tab === 'estadistiques' ? 'Secció actual' : 'Anar a Estadístiques';
    elements.nav.btnClips.title = tab === 'clips' ? 'Secció actual' : 'Anar a Clips';
}

function actualizarSelectorPartits(selectedId = 'global') {
    const options = [`<option value="global">Global</option>`];
    partits.forEach(p => {
        options.push(`<option value="${p.id}" ${p.id == selectedId ? 'selected' : ''}>
            ${p.nom} ${p.resultat ? `(${p.resultat})` : ''}
        </option>`);
    });
    elements.stats.selector.innerHTML = options.join('');
    partitSeleccionat = selectedId;
    elements.stats.editBtn.style.display = selectedId !== 'global' ? 'block' : 'none';
}

function generarMejorAlineacion() {
    const alineacion = {
        portero: {titular: null, suplentes: []},
        cierre: {titular: null, suplentes: []},
        alaIzquierdo: {titular: null, suplentes: []},
        alaDerecho: {titular: null, suplentes: []},
        pivot: {titular: null, suplentes: []}
    };

    let jugadoresPorAsignar = [...jugadoresDisponibles];

    // Assign starters
    for (const pos in habilidadPorPosicion) {
        for (const id of habilidadPorPosicion[pos]) {
            if (jugadoresPorAsignar.includes(id)) {
                alineacion[pos].titular = id;
                jugadoresPorAsignar = jugadoresPorAsignar.filter(x => x !== id);
                break;
            }
        }
    }

    // Assign substitutes
    let restantes = [...jugadoresPorAsignar];
    while (restantes.length > 0) {
        let mejor = {jugadorId: null, posicion: null, ranking: Infinity};
        for (const id of restantes) {
            for (const pos in habilidadPorPosicion) {
                if (!alineacion[pos].titular) continue;
                const rank = habilidadPorPosicion[pos].indexOf(id);
                if (rank !== -1 && rank < mejor.ranking && !Object.values(alineacion).some(p => p.suplentes.includes(id))) {
                    mejor = {jugadorId: id, posicion: pos, ranking: rank};
                }
            }
        }
        if (mejor.jugadorId) {
            alineacion[mejor.posicion].suplentes.push(mejor.jugadorId);
            restantes = restantes.filter(x => x !== mejor.jugadorId);
        } else {
            break;
        }
    }

    alineacionActual = alineacion;
    return alineacion;
}

function mostrarEstadisticas(jugadorId) {
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
    const statsNuevos = partits.map(p => p.estadistiques?.[jugadorId]).filter(Boolean);
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

function crearNuevoPartido() {
    const form = `
        <div class="stats-form">
            <h3>Nou Partit</h3>
            <div class="form-group">
                <label>Nom del partit:</label>
                <input type="text" id="nom-partit" required>
            </div>
            <div class="form-group">
                <label>Resultat:</label>
                <input type="text" id="resultat-partit" placeholder="Ex: 3-2">
            </div>
            <div class="form-actions">
                <button id="btn-crear-partit" class="nav-btn">Crear i afegir estadístiques</button>
                <button id="btn-cancelar" class="nav-btn">Cancel·lar</button>
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

        const nouId = partits.length > 0 ? Math.max(...partits.map(p => p.id)) + 1 : 1;
        const nouPartit = {
            id: nouId,
            nom: nom,
            resultat: resultat,
            estadistiques: {}
        };            partits.push(nouPartit);
                    guardarDatos();
            actualizarSelectorPartits(nouId);
            cerrarModal();
            setTimeout(() => mostrarEdicionEstadistiquesHoja(nouId), 100);
    };

    document.getElementById('btn-cancelar').onclick = cerrarModal;
}

function mostrarEdicionEstadisticasHoja(partidoId) {
    const partido = partits.find(p => p.id == partidoId);
    if (!partido) return;
    
    // Añadir clase para modal grande
    elements.modal.popup.classList.add('modal-large');

    const form = `
        <div class="stats-form">
            <h3>Editar Estadístiques - ${partido.nom}</h3>
            <div style="overflow-x: auto;">
                <table class="stats-table-mvp">
                    <thead>
                        <tr>
                            <th>Jugador</th>
                            <th>Gols</th>
                            <th>Assistències</th>
                            <th>Xuts</th>
                            <th>Pèrdues</th>
                            <th>Recuperacions</th>
                            <th>Gols a Favor</th>
                            <th>Gols en Contra</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${plantilla.map(jugador => {
                            const stats = partido.estadistiques[jugador.id] || {};
                            return `
                                <tr>
                                    <td>${jugador.nombreMostrado}</td>
                                    <td><input type="number" min="0" value="${stats.goles || 0}" 
                                        data-jugador="${jugador.id}" data-stat="goles"></td>
                                    <td><input type="number" min="0" value="${stats.asistencias || 0}"
                                        data-jugador="${jugador.id}" data-stat="asistencias"></td>
                                    <td><input type="number" min="0" value="${stats.chutes || 0}"
                                        data-jugador="${jugador.id}" data-stat="chutes"></td>
                                    <td><input type="number" min="0" value="${stats.perdidas || 0}"
                                        data-jugador="${jugador.id}" data-stat="perdidas"></td>
                                    <td><input type="number" min="0" value="${stats.recuperaciones || 0}"
                                        data-jugador="${jugador.id}" data-stat="recuperaciones"></td>
                                    <td><input type="number" min="0" value="${stats.goles_a_favor || 0}"
                                        data-jugador="${jugador.id}" data-stat="goles_a_favor"></td>
                                    <td><input type="number" min="0" value="${stats.goles_en_contra || 0}"
                                        data-jugador="${jugador.id}" data-stat="goles_en_contra"></td>
                                </tr>
                            `;
                        }).join('')}

                        ${Object.keys(partido.estadistiques).length < plantilla.length ? `
                            <tr class="empty-row">
                                <td colspan="8" style="text-align: center; color: #aaa;">
                                    (Sense dades d'estadístiques per a aquest partit)
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
            <div class="form-actions" style="margin-top: 20px;">
                <button id="btn-guardar-stats" class="nav-btn">Guardar</button>
                <button id="btn-cancelar-stats" class="nav-btn">Cancel·lar</button>
            </div>
        </div>
    `;

    elements.modal.content.innerHTML = form;
    abrirModal();

    // Event listener para guardar los cambios
    document.getElementById('btn-guardar-stats').onclick = () => {
        const inputs = elements.modal.content.querySelectorAll('input[type="number"]');
        
        // Inicializamos las estadísticas del partido si no existen
        if (!partido.estadistiques) {
            partido.estadistiques = {};
        }

        // Recorremos todos los inputs y guardamos sus valores
        inputs.forEach(input => {
            const jugadorId = input.dataset.jugador;
            const statName = input.dataset.stat;
            const value = parseInt(input.value) || 0;

            // Inicializamos las estadísticas del jugador si no existen
            if (!partido.estadistiques[jugadorId]) {
                partido.estadistiques[jugadorId] = {};
            }

            // Guardamos el valor
            partido.estadistiques[jugadorId][statName] = value;
        });

        // Actualizamos la vista
        guardarDatos();
        cerrarModal();
        renderizarEstadistiques();
    };

    document.getElementById('btn-cancelar-stats').onclick = cerrarModal;
}

const renderizarEstadistiques = () => {
    let html = `<div style='overflow-x:auto;'><table class="stats-table-mvp">
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
            const statsNuevos = partits.map(p => p.estadistiques?.[j.id] || {});
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
        const partit = partits.find(p => p.id == partitSeleccionat);
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
    }    html += '</tbody></table></div>';
    elements.stats.lista.innerHTML = html;
    setupEstadisticasListeners();
};
// Función para guardar partidos y estadísticas en localStorage
function guardarDatos() {
    localStorage.setItem('partits', JSON.stringify(partits));
    localStorage.setItem('partitSeleccionat', partitSeleccionat);
}

// Función para cargar partidos y estadísticas de localStorage
function cargarDatos() {
    const savedPartits = localStorage.getItem('partits');
    if (savedPartits) partits = JSON.parse(savedPartits);
    const savedPartitSel = localStorage.getItem('partitSeleccionat');
    if (savedPartitSel) partitSeleccionat = savedPartitSel;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    
    // Initialize elements
    elements.overlay = document.getElementById('overlay-fichas');
    elements.carrusel = document.getElementById('carrusel-convocatoria');
    elements.modal.backdrop = document.getElementById('modal-backdrop');
    elements.modal.popup = document.getElementById('modal-popup');
    elements.modal.content = document.getElementById('modal-content');
    elements.modal.closeBtn = document.getElementById('modal-close-btn');
    
    // Sections
    elements.sections.alineacio = document.getElementById('section-alineacio');
    elements.sections.estadistiques = document.getElementById('section-estadistiques');
    elements.sections.clips = document.getElementById('section-clips');
    
    // Stats elements
    elements.stats.selector = document.getElementById('partit-selector');
    elements.stats.lista = document.getElementById('estadistiques-lista');
    elements.stats.addBtn = document.getElementById('add-match-btn');
    elements.stats.editBtn = document.getElementById('edit-match-btn');
    
    // Clips elements
    elements.clips.selector = document.getElementById('partit-selector-clips');
    elements.clips.lista = document.getElementById('clips-lista');
    elements.clips.addBtn = document.getElementById('add-clip-btn-main');
    
    // Navigation buttons
    elements.nav.btnEstadistiques = document.getElementById('btn-estadistiques');
    elements.nav.btnAlineacio = document.getElementById('btn-alineacio');
    elements.nav.btnClips = document.getElementById('btn-clips');
    
    // Initialize state
    jugadoresDisponibles = []; // Empezamos sin jugadores seleccionados
    
    // Event Listeners for Stats
    if (elements.stats.addBtn) {
        elements.stats.addBtn.addEventListener('click', crearNuevoPartido);
    }
    
    if (elements.stats.editBtn) {
        elements.stats.editBtn.addEventListener('click', () => {
            if (partitSeleccionat && partitSeleccionat !== 'global') {
                mostrarEdicionEstadisticasHoja(partitSeleccionat);
            }
        });
    }
    
    if (elements.stats.selector) {
        elements.stats.selector.addEventListener('change', (e) => {
            partitSeleccionat = e.target.value;
            guardarDatos();
            if (elements.stats.editBtn) {
                elements.stats.editBtn.style.display = partitSeleccionat !== 'global' ? 'block' : 'none';
            }
            renderizarEstadistiques();
        });
    }

    // Event Listeners for Clips
    if (elements.clips.selector) {
        elements.clips.selector.addEventListener('change', () => {
            renderizarClips();
        });
    }

    if (elements.clips.addBtn) {
        elements.clips.addBtn.addEventListener('click', mostrarFormularioClip);
    }

    // Navigation Event Listeners
    elements.nav.btnEstadistiques.addEventListener('click', () => activarTab('estadistiques'));
    elements.nav.btnAlineacio.addEventListener('click', () => activarTab('alineacio'));
    elements.nav.btnClips.addEventListener('click', () => activarTab('clips'));
    elements.modal.closeBtn.addEventListener('click', cerrarModal);
    elements.modal.backdrop.addEventListener('click', cerrarModal);

    // Initial render
    renderizarCarrusel();
    renderizarAlineacion(generarMejorAlineacion());
    activarTab('alineacio');
    actualizarSelectorPartits(partitSeleccionat);
    actualizarSelectorClips();
    renderizarEstadistiques();
});

// --- Gráficas con Chart.js ---
let chartRendimiento = null;
let chartRadar = null;

function mostrarGraficasJugador(jugadorId) {
    const ctxRend = document.getElementById('chart-rendimiento').getContext('2d');
    const ctxRadar = document.getElementById('chart-mvp').getContext('2d');
    
    // Actualizar título
    const tituloAnalisis = document.querySelector('#analisi-rendiment h2');
    if (tituloAnalisis) {
        tituloAnalisis.textContent = `Anàlisi de rendiment de ${plantilla.find(j => j.id === jugadorId)?.nombreMostrado || ''}`;
    }
    
    // Limpiar gráficos anteriores
    if (chartRendimiento) chartRendimiento.destroy();
    if (chartRadar) chartRadar.destroy();    // Datos de rendimiento por partido
    const partidosJugador = partits.map(p => {
        const stats = p.estadistiques?.[jugadorId] || {};
        return {
            partido: p.nom,
            mvp: calcularMvpFlow(stats),
            stats: stats
        };
    }).sort((a, b) => partits.findIndex(p => p.nom === a.partido) - partits.findIndex(p => p.nom === b.partido));

    const mvpData = partidosJugador.map(p => p.mvp);
    const mediaMovil = mvpData.map((val, idx, arr) => {
        const start = Math.max(0, idx - 2);
        const end = idx + 1;
        const slice = arr.slice(start, end);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    });

    chartRendimiento = new Chart(ctxRend, {
        type: 'line',
        data: {
            labels: partidosJugador.map(p => p.partido),
            datasets: [{
                label: 'MVP Flow',
                data: mvpData,
                borderColor: '#00aaff',
                backgroundColor: 'rgba(0,170,255,0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#00aaff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8
            }, {
                label: 'Tendència (últims 3 partits)',
                data: mediaMovil,
                borderColor: '#ff9900',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                borderDash: [5, 5],
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: { 
                legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#fff',
                        font: { size: 12 },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: 'Evolució MVP Flow',
                    color: '#fff',
                    font: { size: 16, weight: 'bold' },
                    padding: { bottom: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    usePointStyle: true,
                    callbacks: {
                        afterBody: function(context) {
                            const idx = context[0].dataIndex;
                            const stats = partidosJugador[idx].stats;
                            return [
                                '',
                                `Gols: ${stats.goles || 0}`,
                                `Assistències: ${stats.asistencias || 0}`,
                                `Xuts: ${stats.chutes || 0}`,
                                `Recuperacions: ${stats.recuperaciones || 0}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    max: 10,
                    ticks: { 
                        color: '#aaa',
                        font: { size: 12 },
                        stepSize: 1
                    },
                    grid: { 
                        color: 'rgba(255,255,255,0.1)',
                        drawTicks: false
                    },
                    border: { dash: [2, 4] }
                },
                x: { 
                    ticks: { 
                        color: '#aaa',
                        font: { size: 12 },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { 
                        color: 'rgba(255,255,255,0.1)',
                        drawTicks: false
                    },
                    border: { dash: [2, 4] }
                }
            }
        }
    });

    // Datos radar del partido seleccionado
    let stats = {};
    let mediaEquipo = {
        goles: 0,
        asistencias: 0,
        chutes: 0,
        perdidas: 0,
        recuperaciones: 0
    };
    
    if (partitSeleccionat === 'global') {
        // Sumar todos los partidos del jugador
        stats = partits.reduce((acc, p) => {
            const s = p.estadistiques?.[jugadorId] || {};
            acc.goles += s.goles || 0;
            acc.asistencias += s.asistencias || 0;
            acc.chutes += s.chutes || 0;
            acc.perdidas += s.perdidas || 0;
            acc.recuperaciones += s.recuperaciones || 0;
            return acc;
        }, {goles:0, asistencias:0, chutes:0, perdidas:0, recuperaciones:0});

        // Calcular media del equipo
        let totalJugadores = plantilla.length;
        plantilla.forEach(jugador => {
            let statsJugador = partits.reduce((acc, p) => {
                const s = p.estadistiques?.[jugador.id] || {};
                acc.goles += s.goles || 0;
                acc.asistencias += s.asistencias || 0;
                acc.chutes += s.chutes || 0;
                acc.perdidas += s.perdidas || 0;
                acc.recuperaciones += s.recuperaciones || 0;
                return acc;
            }, {goles:0, asistencias:0, chutes:0, perdidas:0, recuperaciones:0});
            
            mediaEquipo.goles += statsJugador.goles;
            mediaEquipo.asistencias += statsJugador.asistencias;
            mediaEquipo.chutes += statsJugador.chutes;
            mediaEquipo.perdidas += statsJugador.perdidas;
            mediaEquipo.recuperaciones += statsJugador.recuperaciones;
        });

        // Calcular medias
        Object.keys(mediaEquipo).forEach(key => {
            mediaEquipo[key] = mediaEquipo[key] / totalJugadores;
        });
    } else {
        const p = partits.find(p => p.id == partitSeleccionat);
        stats = p?.estadistiques?.[jugadorId] || {goles:0, asistencias:0, chutes:0, perdidas:0, recuperaciones:0};
        
        // Calcular media del equipo para el partido seleccionado
        let totalJugadores = plantilla.length;
        plantilla.forEach(jugador => {
            const s = p?.estadistiques?.[jugador.id] || {};
            mediaEquipo.goles += s.goles || 0;
            mediaEquipo.asistencias += s.asistencias || 0;
            mediaEquipo.chutes += s.chutes || 0;
            mediaEquipo.perdidas += s.perdidas || 0;
            mediaEquipo.recuperaciones += s.recuperaciones || 0;
        });

        Object.keys(mediaEquipo).forEach(key => {
            mediaEquipo[key] = mediaEquipo[key] / totalJugadores;
        });
    }

    // Calcular valores máximos para normalización
    const maxValues = {
        goles: Math.max(3, stats.goles || 0, mediaEquipo.goles),
        asistencias: Math.max(3, stats.asistencias || 0, mediaEquipo.asistencias),
        chutes: Math.max(6, stats.chutes || 0, mediaEquipo.chutes),
        perdidas: Math.max(6, stats.perdidas || 0, mediaEquipo.perdidas),
        recuperaciones: Math.max(6, stats.recuperaciones || 0, mediaEquipo.recuperaciones)
    };

    // Normalizar valores a escala 0-10
    const normalizedData = {
        goles: (stats.goles || 0) * (10 / maxValues.goles),
        asistencias: (stats.asistencias || 0) * (10 / maxValues.asistencias),
        chutes: (stats.chutes || 0) * (10 / maxValues.chutes),
        perdidas: (stats.perdidas || 0) * (10 / maxValues.perdidas),
        recuperaciones: (stats.recuperaciones || 0) * (10 / maxValues.recuperaciones)
    };

    const normalizedMedia = {
        goles: mediaEquipo.goles * (10 / maxValues.goles),
        asistencias: mediaEquipo.asistencias * (10 / maxValues.asistencias),
        chutes: mediaEquipo.chutes * (10 / maxValues.chutes),
        perdidas: mediaEquipo.perdidas * (10 / maxValues.perdidas),
        recuperaciones: mediaEquipo.recuperaciones * (10 / maxValues.recuperaciones)
    };

    chartRadar = new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: ['Gols', 'Assistències', 'Xuts', 'Pèrdues', 'Recuperacions'],
            datasets: [{
                label: 'Jugador',
                data: [
                    normalizedData.goles,
                    normalizedData.asistencias,
                    normalizedData.chutes,
                    normalizedData.perdidas,
                    normalizedData.recuperaciones
                ],
                borderColor: '#00aaff',
                backgroundColor: 'rgba(0,170,255,0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#00aaff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'Mitjana equip',
                data: [
                    normalizedMedia.goles,
                    normalizedMedia.asistencias,
                    normalizedMedia.chutes,
                    normalizedMedia.perdidas,
                    normalizedMedia.recuperaciones
                ],
                borderColor: '#ff9900',
                backgroundColor: 'rgba(255,153,0,0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#ff9900',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderDash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#fff',
                        font: { size: 12 },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: partitSeleccionat === 'global' ? 'Rendiment Global' : 'Rendiment del Partit',
                    color: '#fff',
                    font: { size: 16, weight: 'bold' },
                    padding: { bottom: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const originalValue = context.datasetIndex === 0 ? 
                                stats[['goles', 'asistencias', 'chutes', 'perdidas', 'recuperaciones'][context.dataIndex]] || 0 :
                                mediaEquipo[['goles', 'asistencias', 'chutes', 'perdidas', 'recuperaciones'][context.dataIndex]];
                            return ` ${context.dataset.label}: ${originalValue.toFixed(1)} (${value.toFixed(1)}/10)`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 10,
                    ticks: {
                        stepSize: 2,
                        color: '#aaa',
                        font: { size: 10 },
                        backdropColor: 'rgba(0,0,0,0.3)'
                    },
                    grid: { 
                        color: 'rgba(255,255,255,0.1)',
                        circular: true
                    },
                    angleLines: {
                        color: 'rgba(255,255,255,0.15)',
                        lineWidth: 1
                    },
                    pointLabels: {
                        color: '#fff',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 2
                }
            }
        }
    });
}

// Funciones para gestionar clips
function mostrarFormularioClip() {
    elements.modal.popup.classList.add('modal-large');    elements.modal.content.innerHTML = `
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

    document.getElementById('form-clip').onsubmit = function(e) {
        e.preventDefault();
        const url = document.getElementById('clip-url').value;
        const descripcio = document.getElementById('clip-descripcio').value;
        const minut = document.getElementById('clip-minut').value;
        
        const partit = partits.find(p => p.id == elements.clips.selector.value);
        if (!partit) return;

        if (!partit.clips) partit.clips = [];
        partit.clips.push({
            id: Date.now(),
            url: url,
            descripcio: descripcio,
            minut: minut
        });

        guardarDatos();
        renderizarClips();
        cerrarModal();
    };

    abrirModal();
}

function eliminarClip(partitId, clipId) {
    if (!confirm('Estàs segur que vols eliminar aquest clip?')) return;

    const partit = partits.find(p => p.id == partitId);
    if (!partit || !partit.clips) return;

    partit.clips = partit.clips.filter(c => c.id !== clipId);
    guardarDatos();
    renderizarClips();
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

function renderizarClips() {
    const partitId = elements.clips.selector.value;
    const partit = partits.find(p => p.id == partitId);
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
                <div class="clip-minut">Minut ${clip.minut}</div>
                <div class="clip-descripcio">${clip.descripcio}</div>
                <button class="btn-delete" onclick="eliminarClip(${partit.id}, ${clip.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function actualizarSelectorClips(selectedId = 'global') {
    const options = [`<option value="global">Selecciona un partit</option>`];
    partits.forEach(p => {
        options.push(`<option value="${p.id}" ${p.id == selectedId ? 'selected' : ''}>
            ${p.nom} ${p.resultat ? `(${p.resultat})` : ''}
        </option>`);
    });
    elements.clips.selector.innerHTML = options.join('');
}

function activarTab(tab) {
    // Ocultar todas las secciones
    elements.sections.alineacio.style.display = 'none';
    elements.sections.estadistiques.style.display = 'none';
    elements.sections.clips.style.display = 'none';

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
    }

    // Actualizar el estado de los botones
    elements.nav.btnAlineacio.title = tab === 'alineacio' ? 'Secció actual' : 'Anar a Alineació';
    elements.nav.btnEstadistiques.title = tab === 'estadistiques' ? 'Secció actual' : 'Anar a Estadístiques';
    elements.nav.btnClips.title = tab === 'clips' ? 'Secció actual' : 'Anar a Clips';
}

// Función helper para establecer los event listeners de la tabla de estadísticas
function setupEstadisticasListeners() {
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
function resetearAplicacion() {
    if (confirm('Estàs segur que vols esborrar totes les dades? Aquesta acció no es pot desfer.')) {
        // Limpiar datos
        partits = [];
        partitSeleccionat = 'global';
        jugadoresDisponibles = [];
        
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
