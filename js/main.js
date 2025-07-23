// js/main.js - VERSIÓN CORREGIDA

import { getState, setPartitSeleccionat } from './state.js';
import { initElements } from './state.js';
import { exportarDatos, importarDatos } from './api.js';
import {
    activarTab,
    crearNuevoPartido,
    mostrarEdicionEstadisticasHoja,
    renderizarClips,
    mostrarFormularioClip,
    cerrarModal,
    togglePizarraTactical,
    renderizarCarrusel,
    renderizarAlineacion
} from './ui.js';


export function inicializarUIPrincipal() {
    // Hace visibles los elementos principales de la UI
    document.querySelector('main').classList.add('visible');
    document.querySelector('.carrusel-container').classList.add('visible');
    document.querySelector('.button-container').classList.add('visible');

    // Inicializa las referencias a los elementos del DOM
    initElements();
    const { elements } = getState();

    // Configura todos los event listeners de la aplicación
    // Stats
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
                window.location.reload();
            });
        });
    }

    // Clips
    if (elements.clips.selector) {
        elements.clips.selector.addEventListener('change', () => {
            renderizarClips();
        });
    }
    if (elements.clips.addBtn) {
        elements.clips.addBtn.addEventListener('click', mostrarFormularioClip);
    }

    // Navegación principal
    elements.nav.btnEstadistiques.addEventListener('click', () => activarTab('estadistiques'));
    elements.nav.btnAlineacio.addEventListener('click', () => activarTab('alineacio'));
    elements.nav.btnClips.addEventListener('click', () => activarTab('clips'));
    elements.modal.backdrop.addEventListener('click', cerrarModal);

    if (elements.togglePizarraBtn) {
        elements.togglePizarraBtn.addEventListener('click', togglePizarraTactical);
    }

    // Renderizado inicial de la UI
    renderizarCarrusel();
    renderizarAlineacion();
}
