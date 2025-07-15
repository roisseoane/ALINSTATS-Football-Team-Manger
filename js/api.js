import { getState } from './state.js';
import { data as defaultData } from './data.js';

// Función para guardar partidos y estadísticas en localStorage
export function guardarDatos() {
    const { partidos, partitSeleccionat } = getState();
    localStorage.setItem('partits', JSON.stringify(partidos));
    localStorage.setItem('partitSeleccionat', partitSeleccionat);
}

// Función para cargar los datos iniciales
export function cargarDatosIniciales() {
    const savedPartits = localStorage.getItem('partits');
    const savedPartitSel = localStorage.getItem('partitSeleccionat');

    if (savedPartits) {
        return {
            ...defaultData,
            partidos: JSON.parse(savedPartits),
            partitSeleccionat: savedPartitSel || 'global'
        };
    } else {
        return {
            ...defaultData,
            partidos: [],
            partitSeleccionat: 'global'
        };
    }
}
