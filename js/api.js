import { getState, setPartidos, setPartitSeleccionat } from './state.js';

// Función para guardar partidos y estadísticas en localStorage
export function guardarDatos() {
    const { partidos, partitSeleccionat } = getState();
    localStorage.setItem('partits', JSON.stringify(partidos));
    localStorage.setItem('partitSeleccionat', partitSeleccionat);
}

// Función para cargar partidos y estadísticas de localStorage
export function cargarDatos() {
    const savedPartits = localStorage.getItem('partits');
    if (savedPartits) {
        setPartidos(JSON.parse(savedPartits));
    }
    const savedPartitSel = localStorage.getItem('partitSeleccionat');
    if (savedPartitSel) {
        setPartitSeleccionat(savedPartitSel);
    }
}
