// js/auth.js - NUEVA VERSIÓN CON SUPABASE AUTH

import { supabase } from './supabaseClient.js';
import { mostrarPantallaDeLogin, mostrarPantallaDeVerificacionDeCodigo, cerrarModal } from './ui.js';
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
        mostrarPantallaDeVerificacionDeCodigo(email);
    } catch (error) {
        console.error("Error en l'enviament del codi:", error);
        alert(`Hi ha hagut un error: ${error.message}`);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-magic"></i> Enviar enllaç d\'accés';
    }
}

/**
 * Maneja el envío del formulario de verificación de código (OTP).
 * @param {Event} e - El evento del formulario.
 */
export async function handleVerifyOtpSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('email-for-otp').value;
    const otp = document.getElementById('otp-input').value.trim();
    const button = e.target.querySelector('button[type="submit"]');

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificant...';

    try {
        // Esta es la llamada clave a Supabase para verificar el código
        const { data, error } = await supabase.auth.verifyOtp({
            email: email,
            token: otp,
            type: 'email', // Especificamos que es un OTP de tipo email
        });

        if (error) {
            throw error;
        }

        // Si la verificación es exitosa, data contendrá la sesión del usuario.
        // El listener onAuthStateChange se disparará automáticamente y cargará la app.
        console.log("Codi verificat amb èxit!", data);

    } catch (error) {
        console.error("Error en la verificació del codi:", error);
        alert("El codi introduït no és correcte. Si us plau, torna-ho a provar.");
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-check-circle"></i> Verificar i Entrar';
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

// --- LA MAGIA PARA LA MISMA PESTAÑA ---
// 3. NOS SUSCRIBIMOS INMEDIATAMENTE a los cambios en el localStorage.
window.addEventListener('storage', (event) => {
    // Escuchamos específicamente por la clave que usa Supabase para guardar la sesión.
    if (event.key && event.key.includes('sb-') && event.key.endsWith('-auth-token')) {
        console.log('¡Cambio de sesión detectado desde otra pestaña!');
        
        // Si se ha establecido una nueva sesión en otra pestaña...
        if (event.newValue) {
            // ...forzamos al cliente de Supabase en ESTA pestaña a recargar la sesión desde el storage.
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session && session.user) {
                    console.log('Sesión recargada con éxito. Renderizando la aplicación.');
                    // Llamamos a la misma función que si el login hubiera ocurrido aquí.
                    onDOMLoaded(() => cargarYRenderizarApp(session.user));
                }
            });
        }
    }
});
