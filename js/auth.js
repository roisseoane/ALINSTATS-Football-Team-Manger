import { supabase } from './supabaseClient.js';
import { inicializarEstado } from './state.js';
import { renderizarCarrusel, renderizarAlineacion, activarTab, actualizarSelectorPartits, renderizarEstadistiques, actualizarSelectorClips, cerrarModal, mostrarModalID } from './ui.js';
import { generarMejorAlineacion } from './main.js';
import { cargarDatosDelEquipo } from './api.js';

async function checkTeamId() {
    const teamId = localStorage.getItem('id_usuari_equip');
    if (teamId) {
        const { data, error } = await supabase
            .from('Equips')
            .select('*')
            .eq('id_usuari_equip', teamId);

        if (error) {
            console.error('Error fetching team:', error);
            mostrarModalID();
            return;
        }

        if (data && data.length > 0) {
            const datosIniciales = await cargarDatosDelEquipo(data[0].id);
            inicializarEstado(datosIniciales);
            renderizarApp();
        } else {
            localStorage.removeItem('id_usuari_equip');
            mostrarModalID();
        }
    } else {
        mostrarModalID();
    }
}

function renderizarApp() {
    const { partitSeleccionat } = getState();
    renderizarCarrusel();
    renderizarAlineacion(generarMejorAlineacion(), false);
    activarTab('alineacio');
    actualizarSelectorPartits(partitSeleccionat);
    actualizarSelectorClips();
    renderizarEstadistiques();
    cerrarModal();
}

export async function handleTeamIdSubmit(event) {
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
        return;
    }

    if (data && data.length > 0) {
        localStorage.setItem('id_usuari_equip', teamId);
        const datosIniciales = await cargarDatosDelEquipo(data[0].id);
        inicializarEstado(datosIniciales);
        renderizarApp();
    } else {
        const teamName = prompt('Este ID de equipo no existe. Introduce el nombre de tu equipo para crear uno nuevo:');
        if (teamName) {
            const { data: newTeam, error: newTeamError } = await supabase
                .from('Equips')
                .insert([{ id_usuari_equip: teamId, nom_equip: teamName }])
                .select();

            if (newTeamError) {
                console.error('Error creating new team:', newTeamError);
                return;
            }

            if (newTeam && newTeam.length > 0) {
                localStorage.setItem('id_usuari_equip', teamId);
                const datosIniciales = await cargarDatosDelEquipo(newTeam[0].id);
                inicializarEstado(datosIniciales);
                renderizarApp();
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', checkTeamId);
