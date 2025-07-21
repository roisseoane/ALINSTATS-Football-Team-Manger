import { initElements, getState, setAlineacionActual, setPartitSeleccionat, inicializarEstado } from './state.js';
import { cargarDatosIniciales, exportarDatos, importarDatos } from './api.js';
import { renderizarCarrusel, renderizarAlineacion, activarTab, actualizarSelectorPartits, renderizarEstadistiques, crearNuevoPartido, mostrarEdicionEstadisticasHoja, renderizarClips, mostrarFormularioClip, cerrarModal, actualizarSelectorClips, togglePizarraTactical } from './ui.js';

export function generarMejorAlineacion() {
    const { jugadoresDisponibles, habilidadPorPosicion } = getState();
    const alineacion = {
        portero: { titular: null, suplentes: [] },
        cierre: { titular: null, suplentes: [] },
        alaIzquierdo: { titular: null, suplentes: [] },
        alaDerecho: { titular: null, suplentes: [] },
        pivot: { titular: null, suplentes: [] }
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
        let mejor = { jugadorId: null, posicion: null, ranking: Infinity };
        for (const id of restantes) {
            for (const pos in habilidadPorPosicion) {
                if (!alineacion[pos].titular) continue;
                const rank = habilidadPorPosicion[pos].indexOf(id);
                if (rank !== -1 && rank < mejor.ranking && !Object.values(alineacion).some(p => p.suplentes.includes(id))) {
                    mejor = { jugadorId: id, posicion: pos, ranking: rank };
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

    setAlineacionActual(alineacion);
    return alineacion;
}

document.addEventListener('DOMContentLoaded', () => {
    initElements();
    const datosIniciales = cargarDatosIniciales();
    inicializarEstado(datosIniciales);
    const { elements, partitSeleccionat } = getState();

    // Event Listeners for Stats
    if (elements.stats.addBtn) {
        elements.stats.addBtn.addEventListener('click', crearNuevoPartido);
    }

    if (elements.stats.editBtn) {
        elements.stats.editBtn.addEventListener('click', () => {
            const { partitSeleccionat } = getState();
            if (partitSeleccionat && partitSeleccionat !== 'global') {
                mostrarEdicionEstadisticasHoja(partitSeleccionat);
            }
        });
    }

    if (elements.stats.selector) {
        elements.stats.selector.addEventListener('change', (e) => {
            setPartitSeleccionat(e.target.value);
        });
    }

    if (elements.stats.backupBtn) {
        elements.stats.backupBtn.addEventListener('click', exportarDatos);
    }

    if (elements.stats.restoreBtn) {
        elements.stats.restoreBtn.addEventListener('click', () => {
            importarDatos(() => {
                const datosIniciales = cargarDatosIniciales();
                inicializarEstado(datosIniciales);
                const { partitSeleccionat } = getState();
                actualizarSelectorPartits(partitSeleccionat);
                actualizarSelectorClips();
                renderizarEstadistiques();
                renderizarClips();
                renderizarCarrusel();
                renderizarAlineacion(generarMejorAlineacion());
                activarTab('estadistiques');
            });
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
    if (elements.nav.btnToggleEquip) {
        elements.nav.btnToggleEquip.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que el clic se propague al main
            elements.sidebars.equip.classList.toggle('visible');
        });
    }

    // Listener para cerrar la sidebar si se clica fuera
    document.querySelector('main').addEventListener('click', () => {
        elements.sidebars.equip.classList.remove('visible');
        elements.sidebars.pissarra.classList.remove('visible');
    });

    if (elements.nav.btnTogglePissarra) {
        elements.nav.btnTogglePissarra.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.sidebars.pissarra.classList.toggle('visible');
        });
    }

    elements.modal.backdrop.addEventListener('click', cerrarModal);

    if (elements.togglePizarraBtn) {
        elements.togglePizarraBtn.addEventListener('click', togglePizarraTactical);
    }

    // Initial render
    renderizarCarrusel();
    renderizarAlineacion(generarMejorAlineacion(), false);
    activarTab('alineacio');
    actualizarSelectorPartits(partitSeleccionat);
    actualizarSelectorClips();
    renderizarEstadistiques();
});
