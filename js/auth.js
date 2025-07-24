// js/auth.js - VERSIÓN CORREGIDA
import {
    validarSesionJugador,
    obtenerPeticionesPendientes,
    comprobarEstadoPeticion,
    cargarDatosDelEquipo,
    getEquipoPorIdUsuario} from './api.js';

import {
    // Estas funciones de UI aún no existen, las crearemos en el siguiente paso
    mostrarLoginDeEquipo,
    mostrarLoginDeJugador,
    mostrarPantallaDeEspera,
    mostrarModalDeVotacion,
    mostrarErrorDeSesionYLimpiarStorage,
    cerrarModal } from './ui.js';

import { inicializarEstado } from './state.js';
import { inicializarUIPrincipal } from './main.js';

// --- FUNCIONES ---

// js/auth.js

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
