// js/api.js - VERSIÓN CORREGIDA Y COMPLETA

import { getState } from './state.js';
import { supabase } from './supabaseClient.js';

/**
 * Crea un nuevo equipo y añade a su primer jugador.
 * Esta función es crítica para el flujo de registro inicial.
 * @param {string} idUsuarioEquipo - El ID público que el equipo usará para el login.
 * @param {string} nombreEquipo - El nombre completo del nuevo equipo.
 * @param {string} nombrePrimerJugador - El nombre del jugador que está creando el equipo.
 * @returns {Promise<object|null>} Un objeto con los datos del nuevo equipo y del nuevo jugador, o null si falla.
 */
export async function crearNuevoEquipoConPrimerJugador(idUsuarioEquipo, nombreEquipo, nombrePrimerJugador) {
    try {
        // Paso 1: Crear el equipo
        const { data: nuevoEquipo, error: errorEquipo } = await supabase
            .from('Equips')
            .insert({ id_usuari_equip: idUsuarioEquipo, nom_equip: nombreEquipo })
            .select()
            .single();

        if (errorEquipo) throw new Error(`Error al crear el equipo: ${errorEquipo.message}`);

        // Paso 2: Añadir al primer jugador usando el ID del equipo recién creado
        const { data: nuevoJugador, error: errorJugador } = await supabase
            .from('Jugadors')
            .insert({ id_equip: nuevoEquipo.id, nom_mostrat: nombrePrimerJugador })
            .select()
            .single();

        if (errorJugador) throw new Error(`Error al añadir al primer jugador: ${errorJugador.message}`);

        console.log("Equipo y primer jugador creados con éxito.");
        return { equipo: nuevoEquipo, jugador: nuevoJugador };

    } catch (error) {
        console.error("Error en la función crearNuevoEquipoConPrimerJugador:", error);
        alert("No se pudo completar el registro del nuevo equipo.");
        return null;
    }
}

/**
 * Obtiene la lista de todos los jugadores de un equipo específico.
 * @param {number} team_pk_id - El ID numérico y permanente del equipo.
 * @returns {Promise<Array<object>|null>} Un array con los jugadores del equipo o null si hay un error.
 */
export async function getJugadoresEquipo(team_pk_id) {
    if (!team_pk_id) return null;
    try {
        const { data: jugadores, error } = await supabase
            .from('Jugadors')
            .select('*')
            .eq('id_equip', team_pk_id);

        if (error) throw new Error(error.message);
        return jugadores;

    } catch (error) {
        console.error("Error al obtener los jugadores del equipo:", error);
        return null;
    }
}

/**
 * Verifica en la base de datos si un jugador todavía existe y pertenece a un equipo.
 * Esta es la comprobación de seguridad clave en cada arranque de la aplicación.
 * @param {number} team_pk_id - El ID numérico y permanente del equipo.
 * @param {number} player_pk_id - El ID numérico y permanente del jugador.
 * @returns {Promise<boolean>} Devuelve true si la sesión es válida, false en caso contrario.
 */
export async function validarSesionJugador(team_pk_id, player_pk_id) {
    // Si por alguna razón no tenemos los IDs, la sesión no es válida.
    if (!team_pk_id || !player_pk_id) {
        return false;
    }

    try {
        const { data, error, count } = await supabase
            .from('Jugadors')
            .select('id', { count: 'exact' }) // Solo necesitamos saber si existe, count es muy eficiente.
            .eq('id', player_pk_id)
            .eq('id_equip', team_pk_id);

        if (error) {
            console.error("Error al validar la sesión del jugador:", error.message);
            return false;
        }

        // Si el conteo de filas que coinciden es 1, el jugador es válido. Si es 0, ha sido eliminado.
        return count === 1;

    } catch (error) {
        console.error("Error inesperado en la función validarSesionJugador:", error);
        return false;
    }
}

/**
 * Crea una nueva petición en la tabla 'Peticiones'.
 * Este es el punto de entrada para cualquier acción que requiera votación grupal.
 * @param {number} id_equip - El ID del equipo donde se origina la petición.
 * @param {number|null} id_creador - El ID del jugador que crea la petición (puede ser null si es un nuevo aspirante).
 * @param {string} tipo - El tipo de petición (ej: "añadir_jugador", "eliminar_jugador").
 * @param {object} metadata - Un objeto JSON con los detalles de la petición.
 * @returns {Promise<object|null>} El objeto de la nueva petición creada o null si hubo un error.
 */
export async function crearPeticion(id_equip, id_creador, tipo, metadata) {
    if (!id_equip || !tipo || !metadata) {
        console.error("Error: Faltan datos esenciales para crear la petición (equipo, tipo o metadata).");
        return null;
    }

    try {
        const { data: nuevaPeticion, error } = await supabase
            .from('Peticions')
            .insert([
                {
                    id_equip: id_equip,
                    id_creador: id_creador,
                    tipo: tipo,
                    metadata: metadata,
                    estat: 'pendiente' // Todas las peticiones empiezan como pendientes
                }
            ])
            .select() // Devuelve la fila recién creada
            .single(); // Devuelve un objeto, no un array

        if (error) {
            throw new Error(`Error de Supabase al crear la petición: ${error.message}`);
        }

        console.log(`Petición de tipo '${tipo}' creada con éxito:`, nuevaPeticion);
        return nuevaPeticion;

    } catch (error) {
        console.error("Error en la función crearPeticion:", error);
        alert("No se pudo crear la solicitud. Revisa la consola para más detalles.");
        return null;
    }
}

/**
 * Registra el voto de un jugador para una petición específica en la tabla 'Votos'.
 * @param {number} id_peticion - El ID de la petición sobre la que se está votando.
 * @param {number} id_votante - El ID del jugador que emite el voto.
 * @param {boolean} voto - El voto del jugador (true para 'Aceptar', false para 'Denegar').
 * @returns {Promise<boolean>} Devuelve true si el voto se registró con éxito, false en caso contrario.
 */
export async function registrarVoto(id_peticion, id_votante, voto) {
    if (!id_peticion || !id_votante || typeof voto !== 'boolean') {
        console.error("Error: Faltan datos esenciales para registrar el voto (petición, votante o valor del voto).");
        return false;
    }

    try {
        const { error } = await supabase
            .from('Votos')
            .insert([
                {
                    id_peticion: id_peticion,
                    id_votante: id_votante,
                    voto: voto
                }
            ]);

        if (error) {
            // Un 'duplicate key error' (código 23505) es esperado si el usuario intenta votar de nuevo.
            // Lo manejamos con elegancia en lugar de mostrar un error alarmante.
            if (error.code === '23505') {
                console.warn(`El jugador ${id_votante} ya ha votado en la petición ${id_peticion}.`);
                alert("Ya has emitido un voto para esta solicitud.");
            } else {
                throw new Error(`Error de Supabase al registrar el voto: ${error.message}`);
            }
            return false;
        }

        console.log(`Voto del jugador ${id_votante} registrado con éxito para la petición ${id_peticion}.`);
        return true;

    } catch (error) {
        console.error("Error en la función registrarVoto:", error);
        alert("No se pudo registrar tu voto. Revisa la consola para más detalles.");
        return false;
    }
}

/**
 * Obtiene todas las peticiones pendientes de un equipo en las que un jugador específico aún no ha votado.
 * Esta función es clave para mostrar los modales de votación al iniciar la aplicación.
 * @param {number} id_equip - El ID del equipo.
 * @param {number} id_jugador - El ID del jugador que está usando la aplicación.
 * @returns {Promise<Array<object>|null>} Un array con las peticiones pendientes de voto, o null si hay un error.
 */
export async function obtenerPeticionesPendientes(id_equip, id_jugador) {
    if (!id_equip || !id_jugador) {
        console.error("Error: Se necesita el ID del equipo y del jugador para buscar peticiones pendientes.");
        return null;
    }

    try {
        // Esta es una consulta más avanzada. Hacemos un 'rpc' (Remote Procedure Call)
        // a una función de la base de datos que crearemos para manejar esta lógica compleja.
        // Es más eficiente y seguro que intentar hacer múltiples consultas desde el frontend.
        const { data: peticiones, error } = await supabase.rpc('get_peticiones_para_votar', {
            p_id_equip: id_equip,
            p_id_jugador: id_jugador
        });

        if (error) {
            throw new Error(`Error de Supabase al obtener peticiones pendientes: ${error.message}`);
        }

        if (peticiones && peticiones.length > 0) {
            console.log(`El jugador ${id_jugador} tiene ${peticiones.length} peticion(es) pendiente(s) de voto.`);
        }

        return peticiones || []; // Devolvemos las peticiones encontradas o un array vacío.

    } catch (error) {
        console.error("Error en la función obtenerPeticionesPendientes:", error);
        return null; // Devolvemos null para indicar que la operación falló.
    }
}

/**
 * Comprueba el estado actual de una petición específica en la base de datos.
 * Esencial para el flujo de un nuevo aspirante que espera la aprobación del equipo.
 * @param {number} id_peticion - El ID de la petición cuyo estado se quiere consultar.
 * @returns {Promise<string|null>} El estado de la petición (ej: "pendiente", "aprobada") o null si hay un error.
 */
export async function comprobarEstadoPeticion(id_peticion) {
    if (!id_peticion) {
        console.error("Error: Se necesita un ID de petición para comprobar su estado.");
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('Peticiones')
            .select('estado')
            .eq('id', id_peticion)
            .single();

        if (error) {
            throw new Error(`Error de Supabase al comprobar el estado de la petición: ${error.message}`);
        }

        return data ? data.estado : null;

    } catch (error) {
        console.error("Error en la función comprobarEstadoPeticion:", error);
        return null;
    }
}

/**
 * Llama a una función en la base de datos para procesar el resultado de una petición después de un voto.
 * La función RPC en Supabase se encargará de contar los votos, comprobar el consenso y ejecutar la acción si es necesario.
 * @param {number} id_peticion - El ID de la petición que se debe procesar.
 * @returns {Promise<object|null>} Devuelve un objeto con el resultado del procesamiento o null si hay un error.
 */
export async function ejecutarAccionPostVoto(id_peticion) {
    if (!id_peticion) {
        console.error("Error: Se necesita un ID de petición para procesar el post-voto.");
        return null;
    }

    try {
        const { data: resultado, error } = await supabase.rpc('procesar_peticion_post_voto', {
            p_id_peticion: id_peticion
        });

        if (error) {
            throw new Error(`Error de Supabase al ejecutar la acción post-voto: ${error.message}`);
        }

        console.log(`Resultado del procesamiento de la petición ${id_peticion}:`, resultado);
        return resultado;

    } catch (error) {
        console.error("Error en la función ejecutarAccionPostVoto:", error);
        return null;
    }
}

/**
 * Busca y devuelve un equipo basado en su ID de usuario público (el que no es numérico).
 * VERSIÓN REFACTORIZADA para evitar el error 406.
 * @param {string} idUsuarioEquipo - El ID público del equipo.
 * @returns {Promise<object|null>} El objeto del equipo o null si no se encuentra.
 */
export async function getEquipoPorIdUsuario(idUsuarioEquipo) {
    try {
        // Hacemos la petición sin .single()
        const { data: equipos, error } = await supabase
            .from('Equips')
            .select('*')
            .eq('id_usuari_equip', idUsuarioEquipo);

        // Si hay un error de red o de base de datos, lo lanzamos.
        if (error) {
            throw new Error(error.message);
        }

        // Ahora, manejamos la lógica de "single" en nuestro código.
        // Si la lista tiene exactamente un equipo, lo devolvemos.
        if (equipos && equipos.length === 1) {
            return equipos[0];
        }

        // Si la lista tiene más de uno (no debería pasar si el ID es único) o está vacía,
        // consideramos que no se ha encontrado un resultado válido.
        return null;

    } catch (error) {
        console.error("Error al buscar equipo por ID de usuario:", error);
        return null;
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
