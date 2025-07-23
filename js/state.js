// js/state.js - VERSIÓN CORREGIDA

import { renderizarCarrusel, renderizarAlineacion, renderizarEstadistiques, renderizarClips, actualizarSelectorPartits, actualizarSelectorClips } from './ui.js';
import { guardarDatosEnSupabase } from './api.js';
import { generarMejorAlineacion } from './core.js'; // <-- CAMBIO CLAVE: Importa desde core.js

const state = {
    teamId: null,
    partidos: [],
    jugadoresDisponibles: [],
    partitSeleccionat: 'global',
    alineacionActual: {},
    isPizarraTacticalMode: false,
    plantilla: [],
    habilidadPorPosicion: {},
    estadisticasJugadores: {},
    inicialesPosicion: {},
    coordenadasPosiciones: {},
    elements: {
        overlay: null,
        carrusel: null,
        campo: null,
        togglePizarraBtn: null,
        modal: {
            backdrop: null,
            popup: null,
            content: null,
            closeBtn: null,
            teamIdModal: null,
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
            editBtn: null,
            backupBtn: null,
            restoreBtn: null
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
        },
        pizarra: {
            controlsContainer: null,
            creacionJugadaPanel: null,
            jugadasGuardadasPanel: null,
            reiniciarPosicionesBtn: null,
            iniciarGrabacionBtn: null,
            anadirPasoBtn: null,
            finalizarJugadaBtn: null
        }
    }
};

export const getState = () => state;

export function inicializarEstado(datos) {
    state.teamId = datos.teamId;
    state.plantilla = datos.plantilla;
    state.habilidadPorPosicion = datos.habilidadPorPosicion;
    state.estadisticasJugadores = datos.estadisticasJugadores;
    state.inicialesPosicion = datos.inicialesPosicion;
    state.coordenadasPosiciones = datos.coordenadasPosiciones;
    state.partidos = datos.partidos || [];
    state.partitSeleccionat = datos.partitSeleccionat || 'global';
    state.jugadoresDisponibles = state.plantilla.map(j => j.id); // Seleccionar todos por defecto
}

// MUTATOR FUNCTIONS
export function setPartidos(partidos) {
    state.partidos = partidos;
    guardarDatosEnSupabase();
    actualizarSelectorPartits();
    actualizarSelectorClips();
    renderizarEstadistiques();
}

export function addPartido(partido) {
    state.partidos.push(partido);
    guardarDatosEnSupabase();
    actualizarSelectorPartits(partido.id);
}

export function updatePartido(partidoToUpdate) {
    const index = state.partidos.findIndex(p => p.id === partidoToUpdate.id);
    if (index !== -1) {
        state.partidos[index] = partidoToUpdate;
        guardarDatosEnSupabase();
        renderizarEstadistiques();
    }
}

export function setJugadoresDisponibles(jugadores) {
    state.jugadoresDisponibles = jugadores;
    renderizarAlineacion();
    renderizarCarrusel();
}

export function toggleJugadorDisponible(jugadorId) {
    const jugadores = state.jugadoresDisponibles;
    const index = jugadores.indexOf(jugadorId);
    if (index > -1) {
        jugadores.splice(index, 1);
    } else {
        jugadores.push(jugadorId);
    }
    renderizarCarrusel();
    renderizarAlineacion();
}

export function setPartitSeleccionat(partidoId) {
    state.partitSeleccionat = partidoId;
    guardarDatosEnSupabase();
    renderizarEstadistiques();
    if (state.elements.stats.editBtn) {
        const selectedPartit = state.partidos.find(p => p.id == partidoId);
        state.elements.stats.editBtn.style.display = selectedPartit && partidoId !== 'global' ? 'flex' : 'none';
    }
}

export function setAlineacionActual(alineacion) {
    state.alineacionActual = alineacion;
}

export function addClipToPartido(partidoId, clip) {
    const partido = state.partidos.find(p => p.id == partidoId);
    if (partido) {
        if (!partido.clips) {
            partido.clips = [];
        }
        partido.clips.push(clip);
        guardarDatosEnSupabase();
        renderizarClips();
    }
}

export function deleteClipFromPartido(partidoId, clipId) {
    const partido = state.partidos.find(p => p.id == partidoId);
    if (partido && partido.clips) {
        partido.clips = partido.clips.filter(c => c.id !== clipId);
        guardarDatosEnSupabase();
        renderizarClips();
    }
}

export function initElements() {
    state.elements.overlay = document.getElementById('overlay-fichas');
    state.elements.carrusel = document.getElementById('carrusel-convocatoria');
    state.elements.campo = document.getElementById('campo-juego');
    state.elements.togglePizarraBtn = document.getElementById('toggle-pizarra-btn');
    state.elements.modal.backdrop = document.getElementById('modal-backdrop');
    state.elements.modal.popup = document.getElementById('modal-popup');
    state.elements.modal.content = document.getElementById('modal-content');
    state.elements.modal.closeBtn = document.getElementById('modal-close-btn');
    state.elements.modal.teamIdModal = document.getElementById('team-id-modal');
    state.elements.sections.alineacio = document.getElementById('section-alineacio');
    state.elements.sections.estadistiques = document.getElementById('section-estadistiques');
    state.elements.sections.clips = document.getElementById('section-clips');
    state.elements.stats.selector = document.getElementById('partit-selector');
    state.elements.stats.lista = document.getElementById('estadistiques-lista');
    state.elements.stats.addBtn = document.getElementById('add-match-btn');
    state.elements.stats.editBtn = document.getElementById('edit-match-btn');
    state.elements.stats.backupBtn = document.getElementById('backup-btn');
    state.elements.stats.restoreBtn = document.getElementById('restore-btn');
    state.elements.clips.selector = document.getElementById('partit-selector-clips');
    state.elements.clips.lista = document.getElementById('clips-lista');
    state.elements.clips.addBtn = document.getElementById('add-clip-btn-main');
    state.elements.nav.btnEstadistiques = document.getElementById('btn-estadistiques');
    state.elements.nav.btnAlineacio = document.getElementById('btn-alineacio');
    state.elements.nav.btnClips = document.getElementById('btn-clips');
    state.elements.pizarra.controlsContainer = document.getElementById('pizarra-controls-container');
    state.elements.pizarra.creacionJugadaPanel = document.getElementById('creacion-jugada-panel');
    state.elements.pizarra.jugadasGuardadasPanel = document.getElementById('jugadas-guardadas-panel');
    state.elements.pizarra.reiniciarPosicionesBtn = document.getElementById('reiniciar-posiciones-btn');
    state.elements.pizarra.iniciarGrabacionBtn = document.getElementById('iniciar-grabacion-btn');
    state.elements.pizarra.anadirPasoBtn = document.getElementById('anadir-paso-btn');
    state.elements.pizarra.finalizarJugadaBtn = document.getElementById('finalizar-jugada-btn');
}
