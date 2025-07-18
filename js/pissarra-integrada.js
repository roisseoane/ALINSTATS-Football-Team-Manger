import { abrirModal, cerrarModal } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnIniciarGrabacion = document.getElementById('btn-iniciar-grabacion');
    const btnAfegirMoviment = document.getElementById('btn-afegir-moviment');
    const btnDesferMoviment = document.getElementById('btn-desfer-moviment');
    const btnFinalitzarJugada = document.getElementById('btn-finalitzar-jugada');
    const llistaJugades = document.getElementById('llista-jugades');
    const overlay = document.getElementById('overlay-fichas');

    let gravant = false;
    let jugadaActual = [];
    let jugadesGuardades = JSON.parse(localStorage.getItem('jugades')) || [];

    function initPissarraIntegrada() {
        renderitzarGaleria();
        btnIniciarGrabacion.addEventListener('click', iniciarGrabacion);
        btnAfegirMoviment.addEventListener('click', afegirMoviment);
        btnDesferMoviment.addEventListener('click', desferMoviment);
        btnFinalitzarJugada.addEventListener('click', finalitzarJugada);
    }

    function iniciarGrabacion() {
        gravant = true;
        jugadaActual = [];
        alert('Gravació iniciada.');
    }

    function afegirMoviment() {
        if (!gravant) {
            alert('Has d\'iniciar la gravació primer.');
            return;
        }
        const elements = Array.from(overlay.children).map(el => ({
            id: el.id,
            transform: el.style.transform
        }));
        jugadaActual.push(elements);
        alert(`Moviment ${jugadaActual.length} afegit.`);
    }

    function desferMoviment() {
        if (jugadaActual.length > 0) {
            jugadaActual.pop();
            alert(`Últim moviment desfet. Moviments restants: ${jugadaActual.length}`);
        }
    }

    function finalitzarJugada() {
        if (jugadaActual.length > 0) {
            abrirModalGuardar();
        } else {
            alert('No hi ha cap jugada per guardar.');
        }
        gravant = false;
    }

    function abrirModalGuardar() {
        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = `
            <h2>Guardar Jugada</h2>
            <input type="text" id="nom-jugada" placeholder="Nom de la jugada">
            <button id="btn-guardar-jugada">Guardar</button>
        `;
        document.getElementById('btn-guardar-jugada').addEventListener('click', () => {
            const nom = document.getElementById('nom-jugada').value;
            if (nom) {
                const novaJugada = {
                    nom,
                    moviments: jugadaActual
                };
                jugadesGuardades.push(novaJugada);
                localStorage.setItem('jugades', JSON.stringify(jugadesGuardades));
                renderitzarGaleria();
                cerrarModal();
            }
        });
        abrirModal();
    }

    function renderitzarGaleria() {
        llistaJugades.innerHTML = '';
        jugadesGuardades.forEach((jugada, index) => {
            const jugadaEl = document.createElement('div');
            jugadaEl.className = 'jugada-guardada';
            jugadaEl.innerHTML = `
                <span>${jugada.nom}</span>
                <button class="btn-reproduir-jugada" data-index="${index}">
                    <i class="fas fa-play"></i>
                </button>
            `;
            llistaJugades.appendChild(jugadaEl);
        });

        document.querySelectorAll('.btn-reproduir-jugada').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                reproduirJugada(jugadesGuardades[index]);
            });
        });
    }

    function reproduirJugada(jugada) {
        let pasIndex = 0;
        const interval = setInterval(() => {
            if (pasIndex < jugada.moviments.length) {
                const pas = jugada.moviments[pasIndex];
                pas.forEach(elementPos => {
                    const el = document.getElementById(elementPos.id);
                    if (el) {
                        el.style.transition = 'transform 0.5s ease';
                        el.style.transform = elementPos.transform;
                    }
                });
                pasIndex++;
            } else {
                clearInterval(interval);
            }
        }, 1000);
    }

    initPissarraIntegrada();
});
