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

export function exportarDatos() {
    const data = {};
    const keysToExport = ['partits', 'partitSeleccionat'];

    keysToExport.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
            try {
                data[key] = JSON.parse(value);
            } catch (e) {
                data[key] = value;
            }
        }
    });

    try {
        const jsonString = JSON.stringify(data);
        const compressed = pako.deflate(jsonString);
        const blob = new Blob([compressed], { type: 'application/octet-stream' });

        const today = new Date();
        const dateString = today.toISOString().slice(0, 10);
        const fileName = `backup-altats-${dateString}.altats`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error al exportar los datos:', error);
        alert('Error al exportar los datos. Consulta la consola para más detalles.');
    }
}

export function importarDatos(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.altats';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = readerEvent => {
            try {
                const compressedData = new Uint8Array(readerEvent.target.result);
                const jsonString = pako.inflate(compressedData, { to: 'string' });
                const data = JSON.parse(jsonString);

                if (!data || Object.keys(data).length === 0) {
                    alert('El archivo de backup está vacío o corrupto.');
                    return;
                }

                if (confirm('¿Estás seguro de que quieres restaurar esta copia de seguridad? Se sobrescribirán todos los datos actuales.')) {
                    localStorage.removeItem('partits');
                    localStorage.removeItem('partitSeleccionat');

                    for (const key in data) {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                    }

                    alert('Datos restaurados correctamente.');
                    if (callback) callback();
                }
            } catch (error) {
                console.error('Error al importar los datos:', error);
                alert('Error al importar los datos. El archivo puede estar corrupto o no ser un backup válido.');
            }
        };
        reader.readAsArrayBuffer(file);
    };
    input.click();
}
