document.addEventListener('DOMContentLoaded', () => {
    const pissarraContainer = document.querySelector('.pissarra-container');
    const pissarraElements = document.getElementById('pissarra-elements');
    const camp = document.querySelector('.pissarra-camp');

    if (!pissarraContainer || !pissarraElements || !camp) {
        return;
    }

    const elements = [];
    let activeElement = null;

    function initPissarra() {
        pissarraElements.innerHTML = '';
        elements.length = 0;

        // Crear jugadores locales
        for (let i = 0; i < 5; i++) {
            createPlayer('local', i + 1, 100 + i * 70, 600);
        }

        // Crear jugadores visitantes
        for (let i = 0; i < 5; i++) {
            createPlayer('visitant', i + 1, 100 + i * 70, 200);
        }

        // Crear pilota
        createPilota(235, 390);
    }

    function createPlayer(team, number, left, top) {
        const player = document.createElement('div');
        player.className = `jugador ${team}`;
        player.textContent = number;
        player.style.left = `${left}px`;
        player.style.top = `${top}px`;
        pissarraElements.appendChild(player);
        elements.push(player);
    }

    function createPilota(left, top) {
        const pilota = document.createElement('div');
        pilota.className = 'pilota';
        pilota.style.left = `${left}px`;
        pilota.style.top = `${top}px`;
        pissarraElements.appendChild(pilota);
        elements.push(pilota);
    }

    function startDrag(e) {
        if (e.target.classList.contains('jugador') || e.target.classList.contains('pilota')) {
            activeElement = e.target;
        }
    }

    function drag(e) {
        if (!activeElement) return;
        e.preventDefault();

        const rect = camp.getBoundingClientRect();
        let x = e.clientX - rect.left - (activeElement.offsetWidth / 2);
        let y = e.clientY - rect.top - (activeElement.offsetHeight / 2);

        // Limitar al campo
        x = Math.max(0, Math.min(x, rect.width - activeElement.offsetWidth));
        y = Math.max(0, Math.min(y, rect.height - activeElement.offsetHeight));

        activeElement.style.left = `${x}px`;
        activeElement.style.top = `${y}px`;
    }

    function endDrag() {
        activeElement = null;
    }

    pissarraElements.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    pissarraElements.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
    document.addEventListener('touchmove', (e) => drag(e.touches[0]));
    document.addEventListener('touchend', endDrag);

    const btnReiniciar = document.getElementById('btn-reiniciar-pissarra');
    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', initPissarra);
    }

    const btnAfegirMoviment = document.getElementById('btn-afegir-moviment');
    const btnDesferMoviment = document.getElementById('btn-desfer-moviment');
    const btnFinalitzarJugada = document.getElementById('btn-finalitzar-jugada');

    let jugadaActual = [];

    if (btnAfegirMoviment) {
        btnAfegirMoviment.addEventListener('click', () => {
            const pas = elements.map(el => ({
                left: el.style.left,
                top: el.style.top
            }));
            jugadaActual.push(pas);
            alert(`Moviment ${jugadaActual.length} afegit.`);
        });
    }

    if (btnDesferMoviment) {
        btnDesferMoviment.addEventListener('click', () => {
            if (jugadaActual.length > 0) {
                jugadaActual.pop();
                alert(`Últim moviment desfet. Moviments restants: ${jugadaActual.length}`);
            } else {
                alert('No hi ha moviments per desfer.');
            }
        });
    }

    if (btnFinalitzarJugada) {
        btnFinalitzarJugada.addEventListener('click', () => {
            if (jugadaActual.length > 0) {
                const nomJugada = prompt("Introdueix el nom de la jugada:");
                if (nomJugada) {
                    const jugadaGuardada = {
                        nom: nomJugada,
                        descripcio: "", // Añadir campo para descripción si se desea
                        moviments: jugadaActual
                    };
                    localStorage.setItem(`jugada_${nomJugada}`, JSON.stringify(jugadaGuardada));
                    exportarJugada(jugadaGuardada);
                    alert(`Jugada "${nomJugada}" guardada correctament.`);
                    jugadaActual = [];
                }
            } else {
                alert('No hi ha cap jugada per finalitzar.');
            }
        });
    }

    function exportarJugada(jugada) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jugada));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", jugada.nom + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    const btnCarregarJugada = document.getElementById('btn-carregar-jugada');
    const btnReproduirJugada = document.getElementById('btn-reproduir-jugada');
    const inputCarregarJugada = document.getElementById('input-carregar-jugada');
    const btnPasAnterior = document.getElementById('btn-pas-anterior');
    const btnPasSeguent = document.getElementById('btn-pas-seguent');
    let jugadaCarregada = null;
    let pasActual = 0;

    if (btnCarregarJugada) {
        btnCarregarJugada.addEventListener('click', () => {
            const nomJugada = prompt("Introdueix el nom de la jugada a carregar:");
            if (nomJugada) {
                const jugadaGuardada = localStorage.getItem(`jugada_${nomJugada}`);
                if (jugadaGuardada) {
                    jugadaCarregada = JSON.parse(jugadaGuardada);
                    alert(`Jugada "${nomJugada}" carregada.`);
                    visualitzarPas(0);
                } else {
                    alert(`No s'ha trobat la jugada "${nomJugada}".`);
                }
            }
        });
    }

    if (btnReproduirJugada) {
        btnReproduirJugada.addEventListener('click', () => {
            if (jugadaCarregada) {
                reproduirJugada();
            } else {
                alert("No hi ha cap jugada carregada.");
            }
        });
    }

    function visualitzarPas(index) {
        if (jugadaCarregada && jugadaCarregada.moviments[index]) {
            pasActual = index;
            const pas = jugadaCarregada.moviments[index];
            elements.forEach((el, i) => {
                el.style.left = pas[i].left;
                el.style.top = pas[i].top;
            });
        }
    }

    if (btnPasAnterior) {
        btnPasAnterior.addEventListener('click', () => {
            if (jugadaCarregada && pasActual > 0) {
                visualitzarPas(pasActual - 1);
            }
        });
    }

    if (btnPasSeguent) {
        btnPasSeguent.addEventListener('click', () => {
            if (jugadaCarregada && pasActual < jugadaCarregada.moviments.length - 1) {
                visualitzarPas(pasActual + 1);
            }
        });
    }

    function reproduirJugada() {
        let index = 0;
        const interval = setInterval(() => {
            if (index < jugadaCarregada.moviments.length) {
                visualitzarPas(index);
                index++;
            } else {
                clearInterval(interval);
                alert("Reproducció finalitzada.");
            }
        }, 1000); // 1 segundo por paso
    }

    initPissarra();
});
