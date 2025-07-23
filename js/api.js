// js/api.js - VERSIÓN CORREGIDA Y COMPLETA

import { getState } from './state.js';
import { supabase } from './supabaseClient.js';

/**
 * Guarda el estado actual de los partidos y la selección en la base de datos de Supabase.
 * Esta función es llamada cada vez que hay un cambio en los datos que debe persistir.
 */
export async function guardarDatosEnSupabase() {
    const { teamId, partidos, partitSeleccionat } = getState();

    if (!teamId) {
        console.error("No se puede guardar: teamId no está definido en el estado.");
        return;
    }

    // Crea un objeto con los datos que quieres guardar.
    // Supabase guardará este objeto JSON en la columna 'dades_equip'.
    const datosParaGuardar = {
        partidos: partidos,
        partitSeleccionat: partitSeleccionat,
    };

    const { error } = await supabase
        .from('Equips') // El nombre de tu tabla en Supabase
        .update({ dades_equip: datosParaGuardar }) // La columna donde se guarda el JSON de datos
        .eq('id', teamId); // Asegura que actualizamos solo el registro de nuestro equipo

    if (error) {
        console.error('Error al guardar los datos en Supabase:', error);
    }
}


/**
 * Carga los datos iniciales del equipo desde Supabase.
 * Esto incluye la plantilla y los datos de los partidos guardados.
 */
export async function cargarDatosDelEquipo(teamId) {
    // 1. Cargar los datos base del equipo (que incluye partidos, etc.)
    const { data: teamData, error: teamError } = await supabase
        .from('Equips')
        .select('dades_equip')
        .eq('id', teamId)
        .single();

    if (teamError) {
        console.error("Error cargando datos del equipo:", teamError);
        return null;
    }

    // 2. Cargar la plantilla de jugadores asociada a ese equipo
    const { data: plantillaData, error: plantillaError } = await supabase
        .from('Jugadors')
        .select('*')
        .eq('id_equip', teamId);

    if (plantillaError) {
        console.error("Error cargando la plantilla:", plantillaError);
        return null;
    }

    // Datos por defecto en caso de que el equipo sea nuevo y no tenga datos guardados
    const datosPorDefecto = {
        partidos: [],
        partitSeleccionat: 'global',
        habilidadPorPosicion: {
            portero: [], cierre: [], alaIzquierdo: [], alaDerecho: [], pivot: []
        },
        estadisticasJugadores: {},
        inicialesPosicion: { portero: 'POR', cierre: 'CIE', alaIzquierdo: 'AE', alaDerecho: 'AD', pivot: 'PIV' },
        coordenadasPosiciones: { portero: {top: '90%', left: '50%'}, cierre: {top: '65%', left: '50%'}, alaIzquierdo: {top: '45%', left: '20%'}, alaDerecho: {top: '45%', left: '80%'}, pivot: {top: '20%', left: '50%'} }
    };

    // Combina los datos guardados con los datos por defecto
    const dadesEquip = teamData.dades_equip || {};

    return {
        teamId: teamId,
        plantilla: plantillaData || [],
        partidos: dadesEquip.partidos || datosPorDefecto.partidos,
        partitSeleccionat: dadesEquip.partitSeleccionat || datosPorDefecto.partitSeleccionat,
        habilidadPorPosicion: dadesEquip.habilidadPorPosicion || datosPorDefecto.habilidadPorPosicion,
        estadisticasJugadores: dadesEquip.estadisticasJugadores || datosPorDefecto.estadisticasJugadores,
        inicialesPosicion: datosPorDefecto.inicialesPosicion,
        coordenadasPosiciones: datosPorDefecto.coordenadasPosiciones,
    };
}


/**
 * Exporta los datos actuales a un fichero local (backup).
 * Esta lógica usa localStorage y no interactúa con Supabase.
 */
export function exportarDatos() {
    const { partidos, partitSeleccionat } = getState();
    const data = {
        partits: partidos,
        partitSeleccionat: partitSeleccionat
    };

    try {
        const jsonString = JSON.stringify(data);
        const blob = new Blob([jsonString], { type: 'application/json' });

        const today = new Date();
        const dateString = today.toISOString().slice(0, 10);
        const fileName = `backup-alinstats-${dateString}.json`;

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


/**
 * Importa datos desde un fichero local.
 * Esta lógica usa localStorage y no interactúa con Supabase.
 */
export function importarDatos(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = readerEvent => {
            try {
                const data = JSON.parse(readerEvent.target.result);

                if (!data || Object.keys(data).length === 0) {
                    alert('El archivo de backup está vacío o corrupto.');
                    return;
                }

                if (confirm('¿Estás seguro de que quieres restaurar esta copia de seguridad? Se sobrescribirán todos los datos actuales y se guardarán en la nube.')) {
                    // Actualiza el estado de la aplicación con los datos del fichero
                    const { partidos, partitSeleccionat } = getState();
                    const state = getState();
                    state.partidos = data.partits || partidos;
                    state.partitSeleccionat = data.partitSeleccionat || partitSeleccionat;

                    // Guarda los nuevos datos en Supabase
                    guardarDatosEnSupabase();

                    alert('Datos restaurados y guardados en la nube correctamente.');
                    if (callback) callback();
                }
            } catch (error) {
                console.error('Error al importar los datos:', error);
                alert('Error al importar los datos. El archivo puede estar corrupto o no ser un backup válido.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
