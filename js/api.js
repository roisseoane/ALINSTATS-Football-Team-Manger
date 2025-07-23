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
 * Carga los datos iniciales del equipo desde la base de datos relacional de Supabase.
 * Esta versión está refactorizada para trabajar con tablas separadas.
 */
export async function cargarDatosDelEquipo(teamId) {
    try {
        // PASO 1: Obtener todos los datos en paralelo para mayor eficiencia
        // Usamos Promise.all para que todas las peticiones a Supabase se hagan simultáneamente
        const [
            { data: teamData, error: teamError },
            { data: plantillaData, error: plantillaError },
            { data: partidosData, error: partidosError },
            { data: actuacionesData, error: actuacionesError },
            { data: habilidadesData, error: habilidadesError },
            { data: posicionesData, error: posicionesError }
        ] = await Promise.all([
            supabase.from('Equips').select('*').eq('id', teamId).single(),
            supabase.from('Jugadors').select('*').eq('id_equip', teamId),
            supabase.from('Partits').select('*').eq('id_equip', teamId).order('data_partit', { ascending: true }),
            // Obtenemos todas las actuaciones de los jugadores del equipo
            supabase.rpc('get_actuaciones_por_equipo', { p_id_equip: teamId }),
            supabase.from('HabilitatsJugadorPerPosicio').select('*'),
            supabase.from('Posicions').select('*')
        ]);

        // Manejo de errores: si alguna petición falla, lo notificamos y detenemos la carga
        if (teamError) throw new Error(`Error cargando el equipo: ${teamError.message}`);
        if (plantillaError) throw new Error(`Error cargando la plantilla: ${plantillaError.message}`);
        if (partidosError) throw new Error(`Error cargando los partidos: ${partidosError.message}`);
        if (actuacionesError) throw new Error(`Error cargando las actuaciones: ${actuacionesError.message}`);
        if (habilidadesError) throw new Error(`Error cargando las habilidades: ${habilidadesError.message}`);
        if (posicionesError) throw new Error(`Error cargando las posiciones: ${posicionesError.message}`);

        // PASO 2: "Rehidratar" los datos para que coincidan con la estructura que espera el 'state' de la app

        // Reconstruir el objeto de partidos con sus estadísticas anidadas
        const partidosRehidratados = partidosData.map(partido => {
            const estadistiques = {};
            // Filtramos las actuaciones que pertenecen a este partido en concreto
            const actuacionesDelPartido = actuacionesData.filter(act => act.id_partit === partido.id);
            actuacionesDelPartido.forEach(actuacion => {
                // Asignamos el JSON de 'stats' a cada jugador
                estadistiques[actuacion.id_jugador] = actuacion.stats;
            });
            return {
                ...partido, // Mantenemos los datos del partido (id, nom_oponent, etc.)
                estadistiques: estadistiques // Añadimos el objeto de estadísticas reconstruido
            };
        });

        // Reconstruir el objeto de habilidades por posición
        const habilidadPorPosicion = {};
        habilidadesData.forEach(habilidad => {
            if (!habilidadPorPosicion[habilidad.nom_posicio]) {
                habilidadPorPosicion[habilidad.nom_posicio] = [];
            }
            habilidadPorPosicion[habilidad.nom_posicio].push(habilidad.id_jugador);
        });

        // Reconstruir los objetos para las coordenadas e iniciales de las posiciones
        const inicialesPosicion = {};
        const coordenadasPosiciones = {};
        posicionesData.forEach(posicion => {
            inicialesPosicion[posicion.nom] = posicion.inicials;
            coordenadasPosiciones[posicion.nom] = posicion.coordenades;
        });

        // PASO 3: Devolver el objeto de estado completo y listo para ser usado por la aplicación

        console.log("Datos cargados y rehidratados con éxito desde Supabase.");

        return {
            teamId: teamId,
            nomEquip: teamData.nom_equip,
            plantilla: plantillaData || [],
            partidos: partidosRehidratados || [],
            habilidadPorPosicion: habilidadPorPosicion,
            inicialesPosicion: inicialesPosicion,
            coordenadasPosiciones: coordenadasPosiciones,
            // Estos ya no se cargan de un JSON, pero los mantenemos por si hay lógica que dependa de ellos
            partitSeleccionat: 'global',
            estadisticasJugadores: {}
        };

    } catch (error) {
        console.error("Error fatal durante la carga de datos del equipo:", error);
        alert(`No se pudieron cargar los datos del equipo. Revisa la consola para más detalles.`);
        return null; // Devolvemos null para que la app sepa que la carga ha fallado
    }
}

/**
 * Inserta un nuevo partido en la tabla 'Partits' de la base de datos.
 * @param {string} nom - El nombre del partido (ej: "Jornada 5 vs Rival").
 * @param {string} resultat - El resultado del partido (ej: "3-2").
 * @param {number} teamId - El ID del equipo al que pertenece el partido.
 * @returns {Promise<object|null>} El objeto del nuevo partido creado o null si hubo un error.
 */
export async function crearPartidoEnSupabase(nom, resultat, teamId) {
    if (!teamId) {
        console.error("Error: Se intentó crear un partido sin un ID de equipo.");
        alert("No se pudo crear el partido porque no se encontró el ID del equipo.");
        return null;
    }

    try {
        const { data: nuevoPartido, error } = await supabase
            .from('Partits')
            .insert([
                {
                    nom_oponent: nom,
                    resultat: resultat,
                    id_equip: teamId,
                    data_partit: new Date() // Usamos la fecha actual por defecto
                }
            ])
            .select() // Importante: .select() hace que Supabase devuelva la fila recién creada
            .single(); // .single() para que devuelva un objeto, no un array

        if (error) {
            throw new Error(`Error de Supabase al crear el partido: ${error.message}`);
        }

        console.log("Partido creado con éxito en Supabase:", nuevoPartido);
        return nuevoPartido;

    } catch (error) {
        console.error("Error en la función crearPartidoEnSupabase:", error);
        alert(`No se pudo crear el partido. Revisa la consola para más detalles.`);
        return null;
    }
}

/**
 * Guarda (inserta o actualiza) las estadísticas de todos los jugadores para un partido específico.
 * Utiliza 'upsert' para manejar tanto la creación como la modificación de actuaciones.
 * @param {number} partidoId - El ID del partido para el que se guardan las estadísticas.
 * @param {object} estadisticas - Un objeto donde las claves son los ID de los jugadores y los valores son los JSON de sus stats.
 * @returns {Promise<boolean>} Devuelve true si la operación fue exitosa, false en caso contrario.
 */
export async function guardarEstadisticasPartido(partidoId, estadisticas) {
    // 1. Preparamos los datos para el 'upsert'
    // Convertimos el objeto de estadísticas en un array de filas que Supabase pueda entender.
    const filasParaGuardar = Object.keys(estadisticas).map(jugadorId => ({
        id_partit: partidoId,
        id_jugador: parseInt(jugadorId), // Aseguramos que el ID del jugador sea un número
        stats: estadisticas[jugadorId]  // El JSON con las estadísticas
    }));

    if (filasParaGuardar.length === 0) {
        console.log("No hay estadísticas que guardar para este partido.");
        return true; // No hay nada que hacer, se considera un éxito.
    }

    // 2. Ejecutamos la operación 'upsert' en la base de datos
    try {
        const { error } = await supabase
            .from('ActuacioJugadors')
            .upsert(filasParaGuardar, {
                onConflict: 'id_partit, id_jugador' // Columnas que definen un registro único
            });

        if (error) {
            throw new Error(`Error de Supabase al guardar las estadísticas: ${error.message}`);
        }

        console.log(`Estadísticas del partido ${partidoId} guardadas con éxito.`);
        return true;

    } catch (error) {
        console.error("Error en la función guardarEstadisticasPartido:", error);
        alert("No se pudieron guardar las estadísticas. Revisa la consola para más detalles.");
        return false;
    }
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
