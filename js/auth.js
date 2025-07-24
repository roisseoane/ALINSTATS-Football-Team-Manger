// js/auth.js - VERSIÓN CORREGIDA
import {
    validarSesionJugador,
    obtenerPeticionesPendientes,
    comprobarEstadoPeticion,
    cargarDatosDelEquipo,
    getEquipoPorIdUsuario,
    crearPeticion,
    registrarVoto,
    ejecutarAccionPostVoto } from './api.js';

import {
    // Estas funciones de UI aún no existen, las crearemos en el siguiente paso
    mostrarLoginDeEquipo,
    mostrarLoginDeJugador,
    mostrarPantallaDeEspera,
    mostrarModalDeVotacion,
    mostrarErrorDeSesionYLimpiarStorage,
    cerrarModal } from './ui.js';

import { inicializarEstado,
         getState } from './state.js';
import { inicializarUIPrincipal } from './main.js';

// --- FUNCIONES ---

/**
 * Maneja el envío del formulario para cambiar el ID de usuario del equipo.
 * Inicia una petición grupal para aprobar el cambio.
 * @param {Event} e - El evento del formulario.
 */
export async function handleChangeTeamIdRequest(e) {
    e.preventDefault();
    const newTeamId = document.getElementById('new-team-id').value.trim();
    const { team_pk_id, currentUser, team_id_publico } = getState();

    if (!newTeamId) {
        alert("El nou ID no pot estar buit.");
        return;
    }

    if (newTeamId === team_id_publico) {
        alert("El nou ID ha de ser diferent de l'actual.");
        return;
    }

    const confirmacion = confirm(`Estàs segur que vols iniciar una votació per canviar l'ID de l'equip a "${newTeamId}"? Aquest canvi afectarà a tots els membres.`);

    if (confirmacion) {
        const metadata = { nuevo_id_equip: newTeamId };
        const button = e.currentTarget.querySelector('button[type="submit"]');

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creant...';

        const nuevaPeticion = await crearPeticion(team_pk_id, currentUser.player_pk_id, 'cambiar_id_equip', metadata);

        if (nuevaPeticion) {
            alert("S'ha creat la petició per canviar l'ID de l'equip. La resta de l'equip ha de votar ara.");
        } else {
            alert("Hi ha hagut un error en crear la petició.");
        }

        button.disabled = false;
        button.innerHTML = '<i class="fas fa-shield-alt"></i> Proposar Canvi';
    }
}

/**
 * Maneja el clic en el botón "Eliminar" de un jugador.
 * Inicia una petición grupal para eliminar al jugador seleccionado.
 * @param {Event} e - El evento del clic.
 */
export async function handleRemovePlayerRequest(e) {
    const button = e.currentTarget;
    const playerIdToRemove = button.dataset.playerId;
    const playerNameToRemove = button.dataset.playerName;

    const confirmacion = confirm(`Estàs segur que vols iniciar una votació per eliminar a ${playerNameToRemove}? Aquesta acció no es pot desfer.`);

    if (confirmacion) {
        const { team_pk_id, currentUser } = getState();

        const metadata = {
            id_jugador_objetivo: playerIdToRemove,
            nombre_jugador_objetivo: playerNameToRemove
        };

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creant...';

        // Llamamos a la función de la API que ya habíamos construido
        const nuevaPeticion = await crearPeticion(team_pk_id, currentUser.player_pk_id, 'eliminar_jugador', metadata);

        if (nuevaPeticion) {
            alert(`S'ha creat la petició per eliminar a ${playerNameToRemove}. La resta de l'equip ha de votar ara.`);
            // Podríamos redirigir o simplemente dejar que el usuario siga navegando.
            // Por ahora, reactivamos el botón.
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-minus"></i> Eliminar';
        } else {
            alert("Hi ha hagut un error en crear la petició.");
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-minus"></i> Eliminar';
        }
    }
}

/**
 * Maneja el envío de un voto desde el modal de votación.
 * Registra el voto y desencadena el procesamiento de la petición.
 * @param {Event} e - El evento del clic del botón.
 */
export async function handleVoteSubmit(e) {
    const button = e.currentTarget;
    const peticionId = button.dataset.peticionId;
    const voto = button.dataset.voto === 'true'; // Convertimos el string 'true'/'false' a booleano
    const { player_pk_id } = getState().currentUser; // Asumimos que el ID del jugador está en el estado

    button.disabled = true; // Deshabilitamos el botón para evitar clics duplicados
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Votant...';

    // 1. Registramos el voto en la base de datos
    const exitoVoto = await registrarVoto(peticionId, player_pk_id, voto);

    if (exitoVoto) {
        // 2. Si el voto se registró, le pedimos al servidor que procese la petición
        // (contar votos, comprobar consenso, ejecutar acción si es necesario)
        const resultadoProceso = await ejecutarAccionPostVoto(peticionId);

        if (resultadoProceso) {
            alert("El teu vot ha estat registrat correctament.");
            // Si la petición fue aprobada y ejecutada, la recarga lo reflejará.
            // Si sigue pendiente, la recarga mostrará la app o la siguiente petición.
            window.location.reload();
        }
    } else {
        alert("Hi ha hagut un error en registrar el teu vot.");
        button.disabled = false; // Reactivamos el botón si hubo un error
        button.innerHTML = voto ? '<i class="fas fa-check"></i> Acceptar' : '<i class="fas fa-times"></i> Denegar';
    }
}

/**
 * Maneja el evento de clic del botón "Comprovar Estat".
 * Vuelve a ejecutar el flujo de autenticación para obtener el estado más reciente.
 * @param {Event} e - El evento del clic.
 */
export async function handleCheckStatus(e) {
    const peticionId = e.target.dataset.peticionId;
    console.log(`Comprobando estado de la petición ${peticionId}...`);

    // La forma más sencilla y robusta de comprobar es simplemente recargar la aplicación.
    // El 'iniciarFlujoDeAutenticacion' se encargará de todo el trabajo sucio.
    window.location.reload();
}

/**
 * Maneja el evento de clic del botón "Cancel·lar Sol·licitud".
 * TODO: Esta función necesitaría una nueva función en api.js para cambiar
 * el estado de la petición a "cancelada" o borrarla. Por ahora, limpia el localStorage.
 * @param {Event} e - El evento del clic.
 */
export function handleCancelRequest(e) {
    if (confirm("Estàs segur que vols cancel·lar la teva sol·licitud per unir-te a l'equip?")) {
        const peticionId = e.target.dataset.peticionId;
        console.log(`Cancelando petición ${peticionId}...`);

        // Borramos la petición pendiente del localStorage para que pueda empezar de nuevo.
        localStorage.removeItem('id_peticion_pendiente');
        
        // TODO: En un futuro, llamar a api.js para actualizar el estado en la base de datos a 'cancelada'.
        
        alert("La teva sol·licitud ha estat cancel·lada.");
        window.location.reload();
    }
}

/**
 * Maneja la selección de un jugador existente de la lista.
 * Guarda las credenciales en localStorage y reinicia el flujo de autenticación.
 * @param {number} team_pk_id - El ID permanente del equipo.
 * @param {number} player_pk_id - El ID permanente del jugador seleccionado.
 */
export function handlePlayerSelection(team_pk_id, player_pk_id) {
    console.log(`Jugador seleccionat: ${player_pk_id}`);
    localStorage.setItem('team_pk_id', team_pk_id);
    localStorage.setItem('player_pk_id', player_pk_id);

    // Reiniciamos el flujo. Ahora la app detectará los nuevos IDs y validará la sesión.
    window.location.reload();
}

/**
 * Maneja la solicitud de un nuevo jugador para unirse al equipo.
 * Crea una petición de tipo "añadir_jugador" y guarda el ID de la petición en localStorage.
 * @param {number} team_pk_id - El ID del equipo al que se quiere unir.
 * @param {string} newName - El nombre del nuevo aspirante.
 */
export async function handleNewPlayerSubmit(team_pk_id, newName) {
    console.log(`Nou jugador "${newName}" sol·licita unir-se a l'equip ${team_pk_id}`);

    // Creamos la petición grupal para añadir al jugador
    const metadata = { nombre_solicitante: newName };
    const nuevaPeticion = await crearPeticion(team_pk_id, null, 'añadir_jugador', metadata);

    if (nuevaPeticion) {
        // Guardamos el ID de la petición para poder comprobar su estado más tarde
        localStorage.setItem('id_peticion_pendiente', nuevaPeticion.id);
        
        // Mostramos la pantalla de espera
        mostrarPantallaDeEspera(nuevaPeticion);
    } else {
        alert("Hi ha hagut un error en enviar la teva sol·licitud.");
    }
}

/**
 * Maneja el envío del formulario de login de equipo.
 * Valida el ID del equipo y, si es correcto, avanza al siguiente paso (login de jugador).
 * @param {Event} e - El evento del formulario.
 */
export async function handleTeamLoginSubmit(e) {
    e.preventDefault(); // Prevenimos que la página se recargue
    const teamIdInput = document.getElementById('team-id-input');
    const idUsuarioEquipo = teamIdInput.value.trim();

    if (!idUsuarioEquipo) {
        alert("Si us plau, introdueix l'ID de l'equip.");
        return;
    }

    // Llamamos a la API para obtener el equipo con ese ID público
    const equipo = await getEquipoPorIdUsuario(idUsuarioEquipo);

    if (equipo) {
        // ¡Equipo encontrado! Guardamos su ID permanente y avanzamos
        localStorage.setItem('team_pk_id', equipo.id);
        localStorage.setItem('id_usuari_equip', equipo.id_usuari_equip); // Guardamos también el público por si es útil

        // Pasamos al siguiente modal: pedir el nombre del jugador
        mostrarLoginDeJugador(equipo);

    } else {
        // El equipo no existe. Podríamos ofrecer crearlo aquí.
        const crear = confirm(`L'equip amb l'ID "${idUsuarioEquipo}" no existeix. Vols crear-lo?`);
        if (crear) {
            // Aquí iría la lógica para crear un nuevo equipo,
            // que también es una petición grupal si ya hay gente...
            // Por ahora, lo dejamos simple.
            console.log("TODO: Implementar flujo de creación de equipo.");
        }
    }
}

/**
 * El punto de entrada principal de la aplicación.
 * Orquesta el flujo de autenticación y decide qué se muestra al usuario.
 */

async function iniciarFlujoDeAutenticacion() {
    // 1. Leemos los IDs permanentes del localStorage
    const team_pk_id = localStorage.getItem('team_pk_id');
    const player_pk_id = localStorage.getItem('player_pk_id');
    const id_peticion_pendiente = localStorage.getItem('id_peticion_pendiente');

    console.log("Iniciando flujo de autenticación...", { team_pk_id, player_pk_id, id_peticion_pendiente });

    // CASO 1: El usuario tiene una petición de unión pendiente
    if (id_peticion_pendiente) {
        console.log("Se detectó una petición pendiente. Comprobando estado...");
        const estado = await comprobarEstadoPeticion(id_peticion_pendiente);

        if (estado === 'aprobada') {
            // ¡Felicidades! La petición fue aprobada.
            // Aquí deberíamos ejecutar la lógica para finalizar el alta del jugador,
            // obtener su nuevo player_pk_id, guardarlo y limpiar la petición pendiente.
            // Por ahora, lo dejamos pendiente para implementarlo junto con la UI.
            console.log("¡Tu solicitud fue aprobada! Implementar lógica de login final.");
            // TODO: Llamar a una función que finalice el alta, actualice localStorage y recargue la app.

        } else if (estado === 'rechazada') {
            alert("Tu solicitud para unirte al equipo ha sido rechazada.");
            localStorage.removeItem('id_peticion_pendiente');
            mostrarLoginDeEquipo(); // Vuelve al inicio
        } else {
            // Sigue pendiente
            mostrarPantallaDeEspera(id_peticion_pendiente);
        }
        return; // Detenemos el flujo aquí
    }

    // CASO 2: El usuario tiene credenciales de sesión guardadas
    if (team_pk_id && player_pk_id) {
        console.log("Se detectaron credenciales de sesión. Validando...");
        const esValido = await validarSesionJugador(team_pk_id, player_pk_id);

        if (esValido) {
            console.log("Sesión válida.");
            // La sesión es correcta, ahora comprobamos si tiene que votar
            const peticiones = await obtenerPeticionesPendientes(team_pk_id, player_pk_id);

            if (peticiones && peticiones.length > 0) {
                // Si hay peticiones, las mostramos antes de cargar la app
                console.log(`Mostrando ${peticiones.length} modales de votación.`);
                mostrarModalDeVotacion(peticiones); // Esta función de UI deberá gestionar múltiples peticiones
            } else {
                // Si no hay nada que votar, cargamos la aplicación principal
                console.log("No hay peticiones pendientes. Cargando UI principal.");
                const datosIniciales = await cargarDatosDelEquipo(team_pk_id); // Asumimos que cargarDatosDelEquipo usa el pk_id
                inicializarEstado(datosIniciales);
                inicializarUIPrincipal();
            }
        } else {
            // La sesión no es válida (el jugador fue eliminado)
            console.warn("Sesión inválida detectada. Limpiando localStorage.");
            mostrarErrorDeSesionYLimpiarStorage();
        }
        return; // Detenemos el flujo aquí
    }

    // CASO 3: El usuario no tiene ninguna credencial guardada
    console.log("No se encontraron credenciales. Mostrando login de equipo.");
    mostrarLoginDeEquipo();
}


// --- PUNTO DE ENTRADA PRINCIPAL ---

// Espera a que todo el HTML esté cargado antes de ejecutar cualquier script
document.addEventListener('DOMContentLoaded', () => {
    // La única línea que se ejecuta al inicio. Todo lo demás es una consecuencia de esta llamada.
    iniciarFlujoDeAutenticacion();
});
