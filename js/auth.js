// js/auth.js - NUEVA VERSIÓN CON SUPABASE AUTH

import { supabase } from './supabaseClient.js';
import { mostrarPantallaDeLogin, mostrarMensajeRevisaTuCorreo, cerrarModal } from './ui.js';
import { cargarYRenderizarApp } from './main.js'; // Asumimos que esta función existirá en main.js
import { getState } from './state.js';

/**
 * Maneja el envío del formulario de login. Llama a Supabase para enviar el Magic Link.
 * @param {Event} e - El evento del formulario.
 */
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
                // Opcional: a dónde redirigir al usuario después de hacer clic en el enlace.
                // Debe ser una URL de tu sitio desplegado en Vercel.
                emailRedirectTo: 'https://alinstats-football-team-manger.vercel.app'
            },
        });

        if (error) {
            throw error;
        }

        // Si todo va bien, mostramos el mensaje de éxito.
        mostrarMensajeRevisaTuCorreo(email);

    } catch (error) {
        console.error("Error en l'enviament del Magic Link:", error);
        alert(`Hi ha hagut un error: ${error.message}`);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-magic"></i> Enviar enllaç d\'accés';
    }
}

// Hacemos la función accesible globalmente para el listener del formulario
// (una forma sencilla de conectar UI y lógica sin importaciones circulares complejas)
window.handleLoginRequest = handleLoginRequest;


// --- EL NUEVO CORAZÓN DE LA APLICACIÓN ---
// Este listener es el nuevo punto de entrada. Se ejecuta cada vez que el estado
// de autenticación del usuario cambia (inicia sesión, cierra sesión, etc.).
// Esperamos a que todo el HTML esté cargado antes de ejecutar cualquier script.
document.addEventListener('DOMContentLoaded', () => {

    // 1. INICIALIZAMOS LOS ELEMENTOS PRIMERO
    // Con esto, nos aseguramos de que el estado conoce todos los elementos del DOM
    // desde el primer momento, antes de que cualquier otra lógica se ejecute.
    initElements();

    // 2. AHORA CONFIGURAMOS EL LISTENER DE AUTENTICACIÓN
    // Este listener es el nuevo corazón de la aplicación.
    supabase.auth.onAuthStateChange((event, session) => {
        console.log("Canvi d'estat d'autenticació:", event, session);
        
        const { elements } = getState();
        // Esta comprobación ahora es segura porque initElements() ya se ha ejecutado.
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
