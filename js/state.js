// state.js

// Imports for rendering, will be properly organized later
import { renderizarCarrusel, renderizarAlineacion, renderizarEstadistiques, renderizarClips, actualizarSelectorPartits, actualizarSelectorClips } from './ui.js';
import { generarMejorAlineacion } from './main.js';
import { guardarDatos } from './api.js';


const state = {
    partidos: [],
    jugadoresDisponibles: [],
    partitSeleccionat: 'global',
    alineacionActual: {},
    plantilla: [
        { id: 1, nombreMostrado: 'DON' },
        { id: 2, nombreMostrado: 'MEDINA' },
        { id: 3, nombreMostrado: 'LLUC' },
        { id: 4, nombreMostrado: 'ARON' },
        { id: 5, nombreMostrado: 'JORDI' },
        { id: 6, nombreMostrado: 'LOPA' },
        { id: 7, nombreMostrado: 'MIRÓ' },
        { id: 8, nombreMostrado: 'ARNAU' },
        { id: 9, nombreMostrado: 'MARC' },
        { id: 10, nombreMostrado: '400'}
    ],
    habilidadPorPosicion: {
        portero: [2,5],
        cierre: [7,1,6],
        alaIzquierdo: [8,3,6,5],
        alaDerecho: [6,10,8,5],
        pivot: [9,4,5,8,2]
    },
    estadisticasJugadores: {
        "1": [], "2": [], "3": [], "4": [],
        "5": [], "6": [], "7": [], "8": [],
        "9": [], "10": []
    },
    inicialesPosicion: {
        portero: 'POR',
        cierre: 'CIE',
        alaIzquierdo: 'AE',
        alaDerecho: 'AD',
        pivot: 'PIV'
    },
    coordenadasPosiciones: {
        portero: {top: '90%', left: '50%'},
        cierre: {top: '65%', left: '50%'},
        alaIzquierdo: {top: '45%', left: '20%'},
        alaDerecho: {top: '45%', left: '80%'},
        pivot: {top: '20%', left: '50%'}
    },
    elements: {
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
    }
};

// Export the state object for read-only access
export const getState = () => state;

// MUTATOR FUNCTIONS
export function setPartidos(partidos) {
    state.partidos = partidos;
    guardarDatos();
    actualizarSelectorPartits();
    actualizarSelectorClips();
    renderizarEstadistiques();
}

export function addPartido(partido) {
    state.partidos.push(partido);
    guardarDatos();
    actualizarSelectorPartits(partido.id);
    // Maybe trigger render functions
}

export function updatePartido(partidoToUpdate) {
    const index = state.partidos.findIndex(p => p.id === partidoToUpdate.id);
    if (index !== -1) {
        state.partidos[index] = partidoToUpdate;
        guardarDatos();
        renderizarEstadistiques();
    }
}


export function setJugadoresDisponibles(jugadores) {
    state.jugadoresDisponibles = jugadores;
    const alineacion = generarMejorAlineacion();
    setAlineacionActual(alineacion);
    renderizarCarrusel();
    renderizarAlineacion(alineacion);
}

export function toggleJugadorDisponible(jugadorId) {
    const jugadores = state.jugadoresDisponibles;
    const index = jugadores.indexOf(jugadorId);
    if (index > -1) {
        jugadores.splice(index, 1);
    } else {
        jugadores.push(jugadorId);
    }
    const alineacion = generarMejorAlineacion();
    setAlineacionActual(alineacion);
    renderizarCarrusel();
    renderizarAlineacion(alineacion);
}

export function setPartitSeleccionat(partidoId) {
    state.partitSeleccionat = partidoId;
    guardarDatos();
    renderizarEstadistiques();
    const selectedPartit = state.partidos.find(p => p.id == partidoId);
    state.elements.stats.editBtn.style.display = selectedPartit && partidoId !== 'global' ? 'block' : 'none';

}

export function setAlineacionActual(alineacion) {
    state.alineacionActual = alineacion;
    renderizarAlineacion(alineacion);
}

export function addClipToPartido(partidoId, clip) {
    const partido = state.partidos.find(p => p.id == partidoId);
    if (partido) {
        if (!partido.clips) {
            partido.clips = [];
        }
        partido.clips.push(clip);
        guardarDatos();
        renderizarClips();
    }
}

export function deleteClipFromPartido(partidoId, clipId) {
    const partido = state.partidos.find(p => p.id == partidoId);
    if (partido && partido.clips) {
        partido.clips = partido.clips.filter(c => c.id !== clipId);
        guardarDatos();
        renderizarClips();
    }
}


export function initElements() {
    state.elements.overlay = document.getElementById('overlay-fichas');
    state.elements.carrusel = document.getElementById('carrusel-convocatoria');
    state.elements.modal.backdrop = document.getElementById('modal-backdrop');
    state.elements.modal.popup = document.getElementById('modal-popup');
    state.elements.modal.content = document.getElementById('modal-content');
    state.elements.modal.closeBtn = document.getElementById('modal-close-btn');
    state.elements.sections.alineacio = document.getElementById('section-alineacio');
    state.elements.sections.estadistiques = document.getElementById('section-estadistiques');
    state.elements.sections.clips = document.getElementById('section-clips');
    state.elements.stats.selector = document.getElementById('partit-selector');
    state.elements.stats.lista = document.getElementById('estadistiques-lista');
    state.elements.stats.addBtn = document.getElementById('add-match-btn');
    state.elements.stats.editBtn = document.getElementById('edit-match-btn');
    state.elements.clips.selector = document.getElementById('partit-selector-clips');
    state.elements.clips.lista = document.getElementById('clips-lista');
    state.elements.clips.addBtn = document.getElementById('add-clip-btn-main');
    state.elements.nav.btnEstadistiques = document.getElementById('btn-estadistiques');
    state.elements.nav.btnAlineacio = document.getElementById('btn-alineacio');
    state.elements.nav.btnClips = document.getElementById('btn-clips');
}
