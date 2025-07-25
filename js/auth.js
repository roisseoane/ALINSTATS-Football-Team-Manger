// js/auth.js - NUEVA VERSIÓN CON SUPABASE AUTH

import { supabase } from './supabaseClient.js';
import { mostrarPantallaDeLogin, mostrarMensajeRevisaTuCorreo, cerrarModal } from './ui.js';
import { cargarYRenderizarApp } from './main.js'; // Asumimos que esta función existirá en main.js
import { getState, initElements } from './state.js';

/**
 * Una función auxiliar para ejecutar código solo cuando el DOM esté listo.
 * Si ya está listo, lo ejecuta inmediatamente.
 * @param {function} fn - La función a ejecutar.
 */
function onDOMLoaded(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
}

// --- MANEJADOR DE LOGIN (SIN CAMBIOS) ---
export async function handleLoginRequest(e) {
    e.preventDefault();
    const emailInput = document.getElementById('email-input');
    const email = emailInput.value.trim();
    const button = e.target.querySelector('button[type="submit"]');

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviant...';

    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: 'https://alinstats-football-team-manger.vercel.app',
            },
        });
        if (error) throw error;
        mostrarMensajeRevisaTuCorreo(email);
    } catch (error) {
        console.error("Error en l'enviament del Magic Link:", error);
        alert(`Hi ha hagut un error: ${error.message}`);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-magic"></i> Enviar enllaç d\'accés';
    }
}

// --- PUNTO DE ENTRADA Y LÓGICA DE ARRANQUE ---

// 1. Inicializamos los elementos del DOM en cuanto sea posible.
onDOMLoaded(initElements);

// 2. NOS SUSCRIBIMOS INMEDIATAMENTE a los cambios de autenticación.
// Esto se ejecuta en cuanto el script se carga, asegurando que no perdemos el evento de redirección.
supabase.auth.onAuthStateChange((event, session) => {
    console.log("Canvi d'estat d'autenticació:", event, session);

    // Las acciones que manipulan el DOM deben esperar a que esté listo.
    onDOMLoaded(() => {
        const { elements } = getState();
        if (elements.modal.popup.classList.contains('visible')) {
            cerrarModal();
        }

        if (session && session.user) {
            // Si hay una sesión, cargamos la aplicación principal.
            cargarYRenderizarApp(session.user);
        } else {
            // Si no hay sesión, mostramos la pantalla de login.
            mostrarPantallaDeLogin();
        }
    });
});
