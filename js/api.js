import { partits, partitSeleccionat, setPartits, setPartitSeleccionat } from './state.js';

// Función para guardar partidos y estadísticas en localStorage
export function guardarDatos() {
    localStorage.setItem('partits', JSON.stringify(partits));
    localStorage.setItem('partitSeleccionat', partitSeleccionat);
}

// Función para cargar partidos y estadísticas de localStorage
export function cargarDatos() {
    const savedPartits = localStorage.getItem('partits');
    if (savedPartits) {
        setPartits(JSON.parse(savedPartits));
    }
    const savedPartitSel = localStorage.getItem('partitSeleccionat');
    if (savedPartitSel) {
        setPartitSeleccionat(savedPartitSel);
    }
}
