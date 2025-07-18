document.addEventListener('DOMContentLoaded', () => {
    const pissarraContainer = document.getElementById('section-pissarra-autonoma');
    if (!pissarraContainer) return;

    const elementsContainer = document.getElementById('pissarra-autonoma-elements');
    const controlsContainer = document.querySelector('.pissarra-autonoma-controls');

    const estat = {
        jugadors: [],
        rivals: [],
        pilota: null
    };

    function initPissarra() {
        dibuixarCamp();
        posicionarElements();
    }

    function dibuixarCamp() {
        // El campo ya está en el HTML, aquí se podrían añadir más detalles si fuera necesario
    }

    function posicionarElements() {
        elementsContainer.innerHTML = '';
        estat.jugadors = [];
        estat.rivals = [];

        const posicionsLocals = [
            { top: '85%', left: '50%' }, // Portero
            { top: '65%', left: '50%' }, // Cierre
            { top: '50%', left: '25%' }, // Ala Izquierdo
            { top: '50%', left: '75%' }, // Ala Derecho
            { top: '35%', left: '50%' }  // Pivot
        ];

        const posicionsRivals = [
            { top: '15%', left: '50%' }, // Portero
            { top: '35%', left: '30%' },
            { top: '35%', left: '70%' },
            { top: '50%', left: '30%' },
            { top: '50%', left: '70%' }
        ];

        posicionsLocals.forEach((pos, i) => {
            const jugador = crearElement('jugador', 'local', `local-${i}`, pos);
            estat.jugadors.push(jugador);
        });

        posicionsRivals.forEach((pos, i) => {
            const rival = crearElement('jugador', 'rival', `rival-${i}`, pos);
            estat.rivals.push(rival);
        });

        const pilota = crearElement('pilota', 'pilota', 'pilota', { top: '50%', left: '50%' });
        estat.pilota = pilota;
    }

    function crearElement(tipus, classe, id, pos) {
        const el = document.createElement('div');
        el.className = `${tipus} ${classe}`;
        el.id = id;
        el.style.top = pos.top;
        el.style.left = pos.left;
        el.style.transform = 'translate(-50%, -50%)';
        elementsContainer.appendChild(el);
        return el;
    }

    function startDrag(e) {
        if (e.target.classList.contains('jugador') || e.target.classList.contains('pilota')) {
            const activeElement = e.target;
            const campRect = elementsContainer.getBoundingClientRect();

            function drag(moveEvent) {
                let x = moveEvent.clientX - campRect.left;
                let y = moveEvent.clientY - campRect.top;

                x = Math.max(activeElement.offsetWidth / 2, Math.min(x, campRect.width - activeElement.offsetWidth / 2));
                y = Math.max(activeElement.offsetHeight / 2, Math.min(y, campRect.height - activeElement.offsetHeight / 2));

                activeElement.style.left = `${x}px`;
                activeElement.style.top = `${y}px`;
            }

            function endDrag() {
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', endDrag);
            }

            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', endDrag);
        }
    }

    elementsContainer.addEventListener('mousedown', startDrag);

    const btnReiniciar = document.createElement('button');
    btnReiniciar.textContent = 'Reiniciar Posicions';
    btnReiniciar.className = 'nav-btn';
    btnReiniciar.addEventListener('click', posicionarElements);
    controlsContainer.appendChild(btnReiniciar);

    const panelCreacio = document.createElement('div');
    panelCreacio.className = 'pissarra-panell';
    panelCreacio.innerHTML = `
        <h3>Crear Jugada</h3>
        <button id="btn-iniciar-grabacion" class="nav-btn"><i class="fas fa-play-circle"></i> Iniciar</button>
        <button id="btn-afegir-pas" class="nav-btn"><i class="fas fa-plus"></i> Afegir Pas</button>
        <button id="btn-desfer-pas" class="nav-btn"><i class="fas fa-undo"></i> Desfer</button>
        <button id="btn-finalitzar-jugada" class="nav-btn"><i class="fas fa-save"></i> Guardar</button>
    `;
    controlsContainer.appendChild(panelCreacio);

    let gravant = false;
    let jugadaActual = [];

    document.getElementById('btn-iniciar-grabacion').addEventListener('click', () => {
        gravant = true;
        jugadaActual = [];
        alert('Gravació iniciada.');
    });

    document.getElementById('btn-afegir-pas').addEventListener('click', () => {
        if (!gravant) {
            alert('Has d\'iniciar la gravació primer.');
            return;
        }
        const snapshot = {
            jugadors: estat.jugadors.map(j => ({ id: j.id, top: j.style.top, left: j.style.left })),
            rivals: estat.rivals.map(r => ({ id: r.id, top: r.style.top, left: r.style.left })),
            pilota: { id: estat.pilota.id, top: estat.pilota.style.top, left: estat.pilota.style.left }
        };
        jugadaActual.push(snapshot);
        alert(`Pas ${jugadaActual.length} afegit.`);
    });

    document.getElementById('btn-desfer-pas').addEventListener('click', () => {
        if (jugadaActual.length > 0) {
            jugadaActual.pop();
            alert(`Últim pas desfet. Passos restants: ${jugadaActual.length}`);
        }
    });

    document.getElementById('btn-finalitzar-jugada').addEventListener('click', () => {
        if (jugadaActual.length > 0) {
            const nom = prompt('Nom de la jugada:');
            if (nom) {
                const jugadesGuardades = JSON.parse(localStorage.getItem('pissarra_jugades') || '[]');
                jugadesGuardades.push({ nom, moviments: jugadaActual });
                localStorage.setItem('pissarra_jugades', JSON.stringify(jugadesGuardades));
                alert('Jugada guardada.');
                gravant = false;
                jugadaActual = [];
                renderitzarGaleria();
            }
        }
    });

    function renderitzarGaleria() {
        const galeria = document.createElement('div');
        galeria.className = 'pissarra-panell';
        const jugadesGuardades = JSON.parse(localStorage.getItem('pissarra_jugades') || '[]');

        let html = '<h3>Jugades Guardades</h3>';
        jugadesGuardades.forEach((jugada, index) => {
            html += `
                <div class="jugada-guardada">
                    <span>${jugada.nom}</span>
                    <button class="btn-reproduir" data-index="${index}"><i class="fas fa-play"></i></button>
                    <button class="btn-eliminar" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
            `;
        });
        galeria.innerHTML = html;

        const oldGaleria = controlsContainer.querySelector('.pissarra-panell:last-child');
        if (oldGaleria && oldGaleria.querySelector('h3')?.textContent === 'Jugades Guardades') {
            controlsContainer.replaceChild(galeria, oldGaleria);
        } else {
            controlsContainer.appendChild(galeria);
        }


        galeria.querySelectorAll('.btn-reproduir').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                reproduirJugada(jugadesGuardades[index]);
            });
        });

        galeria.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                eliminarJugada(index);
            });
        });
    }

    function reproduirJugada(jugada) {
        let pasIndex = 0;
        const interval = setInterval(() => {
            if (pasIndex < jugada.moviments.length) {
                const pas = jugada.moviments[pasIndex];
                pas.jugadors.forEach(j => {
                    const el = document.getElementById(j.id);
                    if (el) {
                        el.style.transition = 'top 0.5s ease, left 0.5s ease';
                        el.style.top = j.top;
                        el.style.left = j.left;
                    }
                });
                pas.rivals.forEach(r => {
                    const el = document.getElementById(r.id);
                    if (el) {
                        el.style.transition = 'top 0.5s ease, left 0.5s ease';
                        el.style.top = r.top;
                        el.style.left = r.left;
                    }
                });
                const pilotaEl = document.getElementById(pas.pilota.id);
                if (pilotaEl) {
                    pilotaEl.style.transition = 'top 0.5s ease, left 0.5s ease';
                    pilotaEl.style.top = pas.pilota.top;
                    pilotaEl.style.left = pas.pilota.left;
                }
                pasIndex++;
            } else {
                clearInterval(interval);
            }
        }, 1500);
    }

    function eliminarJugada(index) {
        let jugadesGuardades = JSON.parse(localStorage.getItem('pissarra_jugades') || '[]');
        jugadesGuardades.splice(index, 1);
        localStorage.setItem('pissarra_jugades', JSON.stringify(jugadesGuardades));
        renderitzarGaleria();
    }

    renderitzarGaleria();

    if (pissarraContainer.style.display !== 'none') {
        initPissarra();
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'style') {
                if (pissarraContainer.style.display !== 'none') {
                    initPissarra();
                }
            }
        }
    });

    observer.observe(pissarraContainer, { attributes: true });
});
