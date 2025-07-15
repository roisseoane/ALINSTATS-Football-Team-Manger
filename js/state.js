// Datos de estadísticas de jugadores
export const estadisticasJugadores = {
    "1": [], "2": [], "3": [], "4": [],
    "5": [], "6": [], "7": [], "8": [],
    "9": [], "10": []
};

// Datos de la plantilla
export const plantilla = [
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
];

// Configuración de posiciones y habilidades
export const habilidadPorPosicion = {
    portero: [2,5],
    cierre: [7,1,6],
    alaIzquierdo: [8,3,6,5],
    alaDerecho: [6,10,8,5],
    pivot: [9,4,5,8,2]
};

export const inicialesPosicion = {
    portero: 'POR',
    cierre: 'CIE',
    alaIzquierdo: 'AE',
    alaDerecho: 'AD',
    pivot: 'PIV'
};

export const coordenadasPosiciones = {
    portero: {top: '90%', left: '50%'},
    cierre: {top: '65%', left: '50%'},
    alaIzquierdo: {top: '45%', left: '20%'},
    alaDerecho: {top: '45%', left: '80%'},
    pivot: {top: '20%', left: '50%'}
};

// Global variables
export let jugadoresDisponibles = [];
export let alineacionActual = {};
export let partits = [];
export let partitSeleccionat = 'global';

export function setJugadoresDisponibles(value) {
    jugadoresDisponibles = value;
}

export function setAlineacionActual(value) {
    alineacionActual = value;
}

export function setPartits(value) {
    partits = value;
}

export function setPartitSeleccionat(value) {
    partitSeleccionat = value;
}

export const elements = {
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

export function initElements() {
    elements.overlay = document.getElementById('overlay-fichas');
    elements.carrusel = document.getElementById('carrusel-convocatoria');
    elements.modal.backdrop = document.getElementById('modal-backdrop');
    elements.modal.popup = document.getElementById('modal-popup');
    elements.modal.content = document.getElementById('modal-content');
    elements.modal.closeBtn = document.getElementById('modal-close-btn');
    elements.sections.alineacio = document.getElementById('section-alineacio');
    elements.sections.estadistiques = document.getElementById('section-estadistiques');
    elements.sections.clips = document.getElementById('section-clips');
    elements.stats.selector = document.getElementById('partit-selector');
    elements.stats.lista = document.getElementById('estadistiques-lista');
    elements.stats.addBtn = document.getElementById('add-match-btn');
    elements.stats.editBtn = document.getElementById('edit-match-btn');
    elements.clips.selector = document.getElementById('partit-selector-clips');
    elements.clips.lista = document.getElementById('clips-lista');
    elements.clips.addBtn = document.getElementById('add-clip-btn-main');
    elements.nav.btnEstadistiques = document.getElementById('btn-estadistiques');
    elements.nav.btnAlineacio = document.getElementById('btn-alineacio');
    elements.nav.btnClips = document.getElementById('btn-clips');
}
