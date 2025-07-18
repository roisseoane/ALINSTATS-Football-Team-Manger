import { abrirModal, cerrarModal } from './ui.js';

import { abrirModal, cerrarModal } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnIniciarGrabacion = document.getElementById('btn-iniciar-grabacion');
    const btnAfegirMoviment = document.getElementById('btn-afegir-moviment');
    const btnDesferMoviment = document.getElementById('btn-desfer-moviment');
    const btnFinalitzarJugada = document.getElementById('btn-finalitzar-jugada');
    const llistaJugades = document.getElementById('llista-jugades');
    const overlay = document.getElementById('overlay-fichas');
    const camp = document.querySelector('.campo');

    let gravant = false;
    let jugadaActual = [];
    let jugadesGuardades = JSON.parse(localStorage.getItem('jugades')) || [];
    let activeElement = null;
    let offsetX, offsetY;

    function initPissarraIntegrada() {
        renderitzarGaleria();
        if (btnIniciarGrabacion) btnIniciarGrabacion.addEventListener('click', iniciarGrabacion);
        if (btnAfegirMoviment) btnAfegirMoviment.addEventListener('click', afegirMoviment);
        if (btnDesferMoviment) btnDesferMoviment.addEventListener('click', desferMoviment);
        if (btnFinalitzarJugada) btnFinalitzarJugada.addEventListener('click', finalitzarJugada);

        overlay.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
    }

    function startDrag(e) {
        if (e.target.classList.contains('jugador-pissarra') || e.target.classList.contains('pilota-pissarra') || e.target.closest('.ficha-container')) {
            activeElement = e.target.closest('.ficha-container') || e.target;
            const rect = activeElement.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        }
    }

    function drag(e) {
        if (!activeElement) return;
        e.preventDefault();

        const campRect = camp.getBoundingClientRect();
        let x = e.clientX - campRect.left - offsetX;
        let y = e.clientY - campRect.top - offsetY;

        // Limitar al campo
        x = Math.max(0, Math.min(x, campRect.width - activeElement.offsetWidth));
        y = Math.max(0, Math.min(y, campRect.height - activeElement.offsetHeight));

        activeElement.style.left = `${x}px`;
        activeElement.style.top = `${y}px`;
    }

    function endDrag() {
        activeElement = null;
    }

    function reiniciarPosicions() {
        const { alineacionActual } = getState();
        renderizarAlineacionPissarra(alineacionActual);
        const overlay = document.getElementById('overlay-fichas');
        const posicionesRivales = [
            { top: '20%', left: '30%' },
            { top: '20%', left: '70%' },
            { top: '40%', left: '30%' },
            { top: '40%', left: '70%' },
            { top: '10%', left: '50%' } // Portero rival
        ];
        for (let i = 0; i < 5; i++) {
            const rival = document.getElementById(`rival-${i}`);
            if (rival) {
                rival.style.left = posicionesRivales[i].left;
                rival.style.top = posicionesRivales[i].top;
            }
        }
        const pilota = document.getElementById('pilota');
        if (pilota) {
            pilota.style.left = '50%';
            pilota.style.top = '50%';
        }
    }

    const btnReiniciarPosicions = document.getElementById('btn-reiniciar-posicions');
    if (btnReiniciarPosicions) {
        btnReiniciarPosicions.addEventListener('click', reiniciarPosicions);
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
