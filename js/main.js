// js/main.js - VERSIÓN REFACTORIZADA

import { getState, inicializarEstado, initElements } from './state.js';
import { getPerfilJugador, cargarDatosDelEquipo, obtenerPeticionesPendientes } from './api.js';
import {
    activarTab,
    renderizarCarrusel,
    renderizarAlineacion,
    mostrarPantallaDeBienvenida, // Nueva función de UI que crearemos
    mostrarModalDeVotacion      // Función que ya tenemos
} from './ui.js';
import { generarMejorAlineacion } from './core.js';


/**
 * La nueva función principal para usuarios autenticados.
 * Decide si el usuario es nuevo o ya es miembro de un equipo.
 * @param {object} user - El objeto 'user' de Supabase Auth.
 */
export async function cargarYRenderizarApp(user) {
    // 1. Buscamos si el usuario tiene un perfil de jugador en nuestra base de datos.
    const perfilJugador = await getPerfilJugador(user);

    if (perfilJugador) {
        // --- CASO A: El usuario ya es miembro de un equipo ---
        console.log("Perfil de jugador encontrado. Cargando datos del equipo...", perfilJugador);

        // Cargamos todos los datos del equipo al que pertenece
        const datosDelEquipo = await cargarDatosDelEquipo(perfilJugador.id_equip);
        if (!datosDelEquipo) {
            alert("Error crític: No s'han pogut carregar les dades del teu equip.");
            return;
        }

        // Inicializamos el estado de la aplicación con los datos del equipo y del usuario
        inicializarEstado({ ...datosDelEquipo, currentUser: { ...perfilJugador, email: user.email } });

        // Comprobamos si hay peticiones pendientes de voto
        const peticiones = await obtenerPeticionesPendientes(perfilJugador.id_equip, perfilJugador.id);
        if (peticiones && peticiones.length > 0) {
            mostrarModalDeVotacion(peticiones);
        }

        // Finalmente, renderizamos la aplicación principal
        inicializarUIPrincipal();

    } else {
        // --- CASO B: El usuario está autenticado pero es nuevo en la aplicación ---
        console.log("Usuario autenticado sin perfil de jugador. Mostrando pantalla de bienvenida.");
        
        // Lo llevamos a la pantalla de "onboarding" para que cree un equipo o se una a uno.
        mostrarPantallaDeBienvenida(user);
    }
}


/**
 * Esta función ahora se encarga únicamente de inicializar la interfaz
 * principal, una vez que todos los datos están listos.
 */
export function inicializarUIPrincipal() {
    initElements();
    const { elements, jugadoresDisponibles, habilidadPorPosicion } = getState();

    // Hacemos visibles los elementos principales de la UI
    document.querySelector('main').classList.add('visible');
    document.querySelector('.carrusel-container').classList.add('visible');
    document.querySelector('.button-container').classList.add('visible');

    // Configura todos los event listeners de la aplicación
    elements.nav.btnEstadistiques.addEventListener('click', () => activarTab('estadistiques'));
    elements.nav.btnAlineacio.addEventListener('click', () => activarTab('alineacio'));
    elements.nav.btnClips.addEventListener('click', () => activarTab('clips'));
    // ... (añade aquí los listeners de los otros botones que faltan, como el de configuración)

    renderizarCarrusel();
    renderizarAlineacion(generarMejorAlineacion(jugadoresDisponibles, habilidadPorPosicion));
    activarTab('alineacio'); // Activamos la primera pestaña por defecto
}
