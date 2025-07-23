// js/auth.js - VERSIÓN CORREGIDA

import { supabase } from './supabaseClient.js';
import { inicializarEstado } from './state.js';
import { mostrarModalID, cerrarModal } from './ui.js';
import { inicializarUIPrincipal } from './main.js';
import { cargarDatosDelEquipo } from './api.js';

// --- FUNCIONES ---

// Esta función se encarga de manejar el envío del formulario del modal
async function handleTeamIdSubmit(event) {
    event.preventDefault();
    const teamIdInput = document.getElementById('team-id-input');
    const teamId = teamIdInput.value.trim();

    if (!teamId) {
        alert('Por favor, introduce un ID de equipo.');
        return;
    }

    const { data, error } = await supabase
        .from('Equips')
        .select('*')
        .eq('id_usuari_equip', teamId);

    if (error) {
        console.error('Error fetching team:', error);
        alert('Hubo un error al verificar el equipo.');
        return;
    }

    if (data && data.length > 0) {
        // El equipo existe, guardamos el ID y cargamos la app
        localStorage.setItem('id_usuari_equip', teamId);
        const datosIniciales = await cargarDatosDelEquipo(data[0].id);
        inicializarEstado(datosIniciales);
        inicializarUIPrincipal();
        cerrarModal(); // Cierra el modal de ID
    } else {
        // El equipo no existe, preguntamos si quiere crear uno nuevo
        const teamName = prompt('Este ID de equipo no existe. Introduce el nombre de tu equipo para crear uno nuevo:');
        if (teamName) {
            const { data: newTeam, error: newTeamError } = await supabase
                .from('Equips')
                .insert([{ id_usuari_equip: teamId, nom_equip: teamName }])
                .select();

            if (newTeamError) {
                console.error('Error creating new team:', newTeamError);
                alert('Hubo un error al crear el nuevo equipo.');
                return;
            }

            if (newTeam && newTeam.length > 0) {
                localStorage.setItem('id_usuari_equip', teamId);
                const datosIniciales = await cargarDatosDelEquipo(newTeam[0].id);
                inicializarEstado(datosIniciales);
                inicializarUIPrincipal();
                cerrarModal(); // Cierra el modal de ID
            }
        }
    }
}

// Esta función comprueba si ya existe un ID en localStorage al cargar la página
async function checkTeamIdOnLoad() {
    const teamId = localStorage.getItem('id_usuari_equip');
    console.log("Iniciando verificación. ID de equipo en localStorage:", teamId);

    if (teamId) {
        console.log("ID encontrado. Intentando cargar datos del equipo desde Supabase...");
        const { data, error } = await supabase
            .from('Equips')
            .select('*')
            .eq('id_usuari_equip', teamId);

        if (error || !data || data.length === 0) {
            console.error("Error al verificar el ID o el ID no es válido en Supabase:", error);
            localStorage.removeItem('id_usuari_equip');
            mostrarModalID();
        } else {
            console.log("ID válido. Cargando datos del equipo...");
            const datosIniciales = await cargarDatosDelEquipo(data[0].id);

            if (datosIniciales) {
                console.log("Datos del equipo cargados. Inicializando estado y UI principal.");
                inicializarEstado(datosIniciales);
                inicializarUIPrincipal();
            } else {
                console.error("Fallo al cargar los datos iniciales del equipo. Mostrando modal de ID.");
                mostrarModalID();
            }
        }
    } else {
        console.log("No se encontró ID de equipo. Mostrando modal de ID.");
        mostrarModalID();
    }
}


// --- PUNTO DE ENTRADA PRINCIPAL ---

// Espera a que todo el HTML esté cargado antes de ejecutar cualquier script
document.addEventListener('DOMContentLoaded', () => {
    // 1. Asigna el listener al formulario del modal
    const form = document.getElementById('team-id-form');
    if (form) {
        form.addEventListener('submit', handleTeamIdSubmit);
    }

    // 2. Comprueba si el usuario ya está "logueado"
    checkTeamIdOnLoad();
});
