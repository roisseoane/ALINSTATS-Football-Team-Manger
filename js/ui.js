import {
    getState,
    toggleJugadorDisponible,
    setPartitSeleccionat,
    addPartido,
    updatePartido,
    addClipToPartido,
    deleteClipFromPartido,
    setJugadoresDisponibles
} from './state.js';
import { generarMejorAlineacion } from './core.js';
import { mostrarGraficasJugador } from './charts.js';
import { guardarEstadisticasPartido,
         getJugadoresEquipo} from './api.js';
import { crearEquipoYAsignarCreador, solicitarUnionAEquipo } from './api.js';

import { handleLoginRequest, handleVerifyOtpSubmit } from './auth.js';

// Utility Functions

/**
 * Maneja el evento de clic del botón "Cancel·lar Sol·licitud".
 * TODO: Esta función necesitaría una nueva función en api.js para cambiar
 * el estado de la petición a "cancelada" o borrarla. Por ahora, limpia el localStorage.
 * @param {Event} e - El evento del clic.
 */
export function handleCancelRequest(e) {
    if (confirm("Estàs segur que vols cancel·lar la teva sol·licitud per unir-te a l'equip?")) {
        const peticionId = e.target.dataset.peticionId;
        console.log(`Cancelando petición ${peticionId}...`);

        // Borramos la petición pendiente del localStorage para que pueda empezar de nuevo.
        localStorage.removeItem('id_peticion_pendiente');
        
        // TODO: En un futuro, llamar a api.js para actualizar el estado en la base de datos a 'cancelada'.
        
        alert("La teva sol·licitud ha estat cancel·lada.");
        window.location.reload();
    }
}

/**
 * Maneja el evento de clic del botón "Comprovar Estat".
 * Vuelve a ejecutar el flujo de autenticación para obtener el estado más reciente.
 * @param {Event} e - El evento del clic.
 */
export async function handleCheckStatus(e) {
    const peticionId = e.target.dataset.peticionId;
    console.log(`Comprobando estado de la petición ${peticionId}...`);

    // La forma más sencilla y robusta de comprobar es simplemente recargar la aplicación.
    // El 'iniciarFlujoDeAutenticacion' se encargará de todo el trabajo sucio.
    window.location.reload();
}

/**
 * Maneja el envío de un voto desde el modal de votación.
 * Registra el voto y desencadena el procesamiento de la petición.
 * @param {Event} e - El evento del clic del botón.
 */
export async function handleVoteSubmit(e) {
    const button = e.currentTarget;
    const peticionId = button.dataset.peticionId;
    const voto = button.dataset.voto === 'true'; // Convertimos el string 'true'/'false' a booleano
    const { player_pk_id } = getState().currentUser; // Asumimos que el ID del jugador está en el estado

    button.disabled = true; // Deshabilitamos el botón para evitar clics duplicados
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Votant...';

    // 1. Registramos el voto en la base de datos
    const exitoVoto = await registrarVoto(peticionId, player_pk_id, voto);

    if (exitoVoto) {
        // 2. Si el voto se registró, le pedimos al servidor que procese la petición
        // (contar votos, comprobar consenso, ejecutar acción si es necesario)
        const resultadoProceso = await ejecutarAccionPostVoto(peticionId);

        if (resultadoProceso) {
            alert("El teu vot ha estat registrat correctament.");
            // Si la petición fue aprobada y ejecutada, la recarga lo reflejará.
            // Si sigue pendiente, la recarga mostrará la app o la siguiente petición.
            window.location.reload();
        }
    } else {
        alert("Hi ha hagut un error en registrar el teu vot.");
        button.disabled = false; // Reactivamos el botón si hubo un error
        button.innerHTML = voto ? '<i class="fas fa-check"></i> Acceptar' : '<i class="fas fa-times"></i> Denegar';
    }
}

/**
 * Maneja el clic en el botón "Eliminar" de un jugador.
 * Inicia una petición grupal para eliminar al jugador seleccionado.
 * @param {Event} e - El evento del clic.
 */
export async function handleRemovePlayerRequest(e) {
    const button = e.currentTarget;
    const playerIdToRemove = button.dataset.playerId;
    const playerNameToRemove = button.dataset.playerName;

    const confirmacion = confirm(`Estàs segur que vols iniciar una votació per eliminar a ${playerNameToRemove}? Aquesta acció no es pot desfer.`);

    if (confirmacion) {
        const { team_pk_id, currentUser } = getState();

        const metadata = {
            id_jugador_objetivo: playerIdToRemove,
            nombre_jugador_objetivo: playerNameToRemove
        };

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creant...';

        // Llamamos a la función de la API que ya habíamos construido
        const nuevaPeticion = await crearPeticion(team_pk_id, currentUser.player_pk_id, 'eliminar_jugador', metadata);

        if (nuevaPeticion) {
            alert(`S'ha creat la petició per eliminar a ${playerNameToRemove}. La resta de l'equip ha de votar ara.`);
            // Podríamos redirigir o simplemente dejar que el usuario siga navegando.
            // Por ahora, reactivamos el botón.
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-minus"></i> Eliminar';
        } else {
            alert("Hi ha hagut un error en crear la petició.");
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-minus"></i> Eliminar';
        }
    }
}

/**
 * Maneja el envío del formulario para cambiar el ID de usuario del equipo.
 * Inicia una petición grupal para aprobar el cambio.
 * @param {Event} e - El evento del formulario.
 */
export async function handleChangeTeamIdRequest(e) {
    e.preventDefault();
    const newTeamId = document.getElementById('new-team-id').value.trim();
    const { team_pk_id, currentUser, team_id_publico } = getState();

    if (!newTeamId) {
        alert("El nou ID no pot estar buit.");
        return;
    }

    if (newTeamId === team_id_publico) {
        alert("El nou ID ha de ser diferent de l'actual.");
        return;
    }

    const confirmacion = confirm(`Estàs segur que vols iniciar una votació per canviar l'ID de l'equip a "${newTeamId}"? Aquest canvi afectarà a tots els membres.`);

    if (confirmacion) {
        const metadata = { nuevo_id_equip: newTeamId };
        const button = e.currentTarget.querySelector('button[type="submit"]');

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creant...';

        const nuevaPeticion = await crearPeticion(team_pk_id, currentUser.player_pk_id, 'cambiar_id_equip', metadata);

        if (nuevaPeticion) {
            alert("S'ha creat la petició per canviar l'ID de l'equip. La resta de l'equip ha de votar ara.");
        } else {
            alert("Hi ha hagut un error en crear la petició.");
        }

        button.disabled = false;
        button.innerHTML = '<i class="fas fa-shield-alt"></i> Proposar Canvi';
    }
}

/**
 * Muestra una pantalla de bienvenida a los usuarios autenticados que aún no tienen un perfil.
 * VERSIÓN FINAL con formularios y lógica.
 * @param {object} user - El objeto 'user' de Supabase Auth.
 */
export function mostrarPantallaDeBienvenida(user) {
    const { elements } = getState();

    // ... (código para ocultar las secciones principales)

    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-user-astronaut"></i> Benvingut, ${user.email.split('@')[0]}!</h2>
            <p class="modal-subtitle">La teva identitat ha estat verificada. Què vols fer ara?</p>
        </div>
        <div class="onboarding-options">
            <div class="config-card">
                <h3><i class="fas fa-users-cog"></i> Crear un nou equip</h3>
                <p>Crea un nou equip i converteix-te en el seu primer membre.</p>
                <form id="form-create-team">
                    <div class="form-group">
                        <label for="new-team-name">Nom de l'Equip</label>
                        <input type="text" id="new-team-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="new-team-id">ID Públic de l'Equip (secret)</label>
                        <input type="text" id="new-team-id" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="creator-player-name">El teu Nom de Jugador</label>
                        <input type="text" id="creator-player-name" class="form-control" required>
                    </div>
                    <button type="submit" class="btn-primary">Crear i Entrar</button>
                </form>
            </div>
            <div class="config-card">
                <h3><i class="fas fa-search-location"></i> Unir-se a un equip existent</h3>
                <p>Si ja tens un ID d'equip, introdueix-lo aquí per sol·licitar unir-te.</p>
                <form id="form-join-team">
                    <div class="form-group">
                        <label for="join-team-id">ID de l'Equip</label>
                        <input type="text" id="join-team-id" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="join-player-name">El teu Nom de Jugador</label>
                        <input type="text" id="join-player-name" class="form-control" required>
                    </div>
                    <button type="submit" class="btn-secondary">Sol·licitar Unir-se</button>
                </form>
            </div>
        </div>
    `;

    elements.modal.content.innerHTML = modalContent;
    abrirModal();

    // --- LÓGICA DE LOS FORMULARIOS ---

    // Manejador para CREAR EQUIPO
    document.getElementById('form-create-team').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreEquipo = document.getElementById('new-team-name').value.trim();
        const idUsuarioEquipo = document.getElementById('new-team-id').value.trim();
        const nombreJugador = document.getElementById('creator-player-name').value.trim();

        if (nombreEquipo && idUsuarioEquipo && nombreJugador) {
            const nuevoPerfil = await crearEquipoYAsignarCreador(user, nombreEquipo, idUsuarioEquipo, nombreJugador);
            if (nuevoPerfil) {
                alert("Equip creat amb èxit! Benvingut.");
                window.location.reload(); // Recargamos para que el flujo de auth detecte la nueva sesión
            }
        }
    });

    // Manejador para UNIRSE A EQUIPO
    document.getElementById('form-join-team').addEventListener('submit', async (e) => {
        e.preventDefault();
        const idUsuarioEquipo = document.getElementById('join-team-id').value.trim();
        const nombreJugador = document.getElementById('join-player-name').value.trim();

        if (idUsuarioEquipo && nombreJugador) {
            const nuevaPeticion = await solicitarUnionAEquipo(user, idUsuarioEquipo, nombreJugador);
            if (nuevaPeticion) {
                // Lo llevamos a la pantalla de espera
                mostrarPantallaDeEspera(nuevaPeticion);
            }
        }
    });
}

/**
 * Muestra la pantalla de inicio de sesión principal, centrada en la autenticación por correo.
 */
export function mostrarPantallaDeLogin() {
    const { elements } = getState();

    // Ocultamos cualquier sección principal de la app que pudiera estar visible
    document.querySelector('main').classList.remove('visible');
    document.querySelector('.carrusel-container').classList.remove('visible');
    document.querySelector('.button-container').classList.remove('visible');

    // Creamos el HTML para el nuevo modal de login
    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-sign-in-alt"></i> Benvingut a ALINSTATS</h2>
            <p class="modal-subtitle">Introdueix el teu correu electrònic per accedir o registrar-te.</p>
        </div>
        <form id="form-magic-link" class="form-login">
            <div class="form-group">
                <label for="email-input">Correu Electrònic</label>
                <input type="email" id="email-input" class="form-control" required placeholder="el.teu@correu.com">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-magic"></i> Enviar enllaç d'accés
                </button>
            </div>
        </form>
    `;

    // Inyectamos el contenido en el popup y lo hacemos visible
    elements.modal.content.innerHTML = modalContent;
    elements.modal.backdrop.classList.add('visible');
    elements.modal.popup.classList.add('visible');

    // Añadimos el listener para el envío del formulario
    const form = document.getElementById('form-magic-link');
    if (form) {
        form.addEventListener('submit', handleLoginRequest);
    }
}

/**
 * Muestra la pantalla para que el usuario introduzca el código de 6 dígitos
 * que ha recibido en su correo electrónico.
 * @param {string} email - El correo al que se ha enviado el código.
 */
export function mostrarPantallaDeVerificacionDeCodigo(email) {
    const { elements } = getState();

    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-key"></i> Introdueix el teu codi</h2>
            <p class="modal-subtitle">Hem enviat un codi de 6 dígits a <strong>${email}</strong>.</p>
        </div>
        <form id="form-verify-otp" class="form-login">
            <div class="form-group">
                <label for="otp-input">Codi de Verificació</label>
                <input type="text" id="otp-input" class="form-control" required 
                       placeholder="123456" pattern="[0-9]{6}" 
                       title="El codi ha de tenir 6 dígits.">
                <input type="hidden" id="email-for-otp" value="${email}">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-check-circle"></i> Verificar i Entrar
                </button>
            </div>
        </form>
    `;
    elements.modal.content.innerHTML = modalContent;

    // Añadimos el listener para el envío del formulario de verificación
    const form = document.getElementById('form-verify-otp');
    if (form) {
        // Este manejador lo crearemos en el siguiente bloque en auth.js
        form.addEventListener('submit', handleVerifyOtpSubmit);
    }
}

/**
 * Muestra un modal informando que la sesión del usuario es inválida (ha sido expulsado)
 * y limpia las credenciales del localStorage para prevenir bucles de error.
 */
export function mostrarErrorDeSesionYLimpiarStorage() {
    // Primero, limpiamos las credenciales para evitar que el usuario se quede atascado
    localStorage.removeItem('team_pk_id');
    localStorage.removeItem('player_pk_id');
    localStorage.removeItem('id_usuari_equip'); // También limpiamos el ID antiguo por si acaso

    const { elements } = getState();

    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-user-slash"></i> Accés Revocat</h2>
            <p class="modal-subtitle">La teva sessió ja no és vàlida.</p>
        </div>
        <div class="espera-info">
            <p>Ja no ets membre d'aquest equip. Si creus que això és un error, contacta amb els membres de l'equip.</p>
        </div>
        <div class="form-actions">
            <button id="btn-logout-confirm" class="btn-primary">
                <i class="fas fa-check"></i> Entès
            </button>
        </div>
    `;

    elements.modal.content.innerHTML = modalContent;
    abrirModal();

    // Cuando el usuario haga clic en "Entès", recargamos la página.
    // Como el localStorage está limpio, se le mostrará el login de equipo inicial.
    document.getElementById('btn-logout-confirm').addEventListener('click', () => {
        window.location.reload();
    });
}

/**
 * Renderiza el contenido de la pantalla de configuración,
 * empezando por el panel de gestión de jugadores.
 */
function renderizarContenidoConfiguracion() {
    const { plantilla, currentUser } = getState();
    const container = document.getElementById('configuracion-content');

    if (!container) return;

    // Creamos la lista de jugadores con un botón de eliminar para cada uno,
    // excepto para el propio usuario que está viendo la pantalla.
    const listaJugadoresHtml = plantilla.map(jugador => {
        if (jugador.id === currentUser.player_pk_id) {
            return `
                <li class="list-item">
                    <span>${jugador.nom_mostrat} (Tú)</span>
                </li>
            `;
        }
        return `
            <li class="list-item">
                <span>${jugador.nom_mostrat}</span>
                <button class="btn-danger btn-eliminar-jugador" 
                        data-player-id="${jugador.id}" 
                        data-player-name="${jugador.nom_mostrat}">
                    <i class="fas fa-user-minus"></i> Eliminar
                </button>
            </li>
        `;
    }).join('');

    const content = `
        <div class="config-card">
            <h3>Gestió de Jugadors</h3>
            <p class="card-subtitle">Inicia una votació per eliminar un jugador de l'equip.</p>
            <ul class="config-list">
                ${listaJugadoresHtml}
            </ul>
        </div>
    `;

    container.innerHTML = content;

    // Adjuntamos el listener a los nuevos botones de eliminar
    document.querySelectorAll('.btn-eliminar-jugador').forEach(button => {
        button.addEventListener('click', handleRemovePlayerRequest);
    });

    document.getElementById('form-change-team-id').addEventListener('submit', handleChangeTeamIdRequest);
}

/**
 * Muestra un modal de votación para una o más peticiones pendientes.
 * El contenido del modal es dinámico según el tipo de petición.
 * @param {Array<object>} peticiones - Un array con las peticiones pendientes de voto.
 */
export function mostrarModalDeVotacion(peticiones) {
    if (!peticiones || peticiones.length === 0) return;

    // Por ahora, manejamos la primera petición de la lista.
    // En el futuro, se podría crear un carrusel si hay varias.
    const peticion = peticiones[0];

    const { elements } = getState();
    let titulo, descripcion;

    // Generamos el contenido dinámicamente según el tipo de petición
    switch (peticion.tipo) {
        case 'añadir_jugador':
            titulo = `<i class="fas fa-user-plus"></i> Nova Sol·licitud d'Unió`;
            descripcion = `El jugador <strong>${peticion.metadata.nombre_solicitante}</strong> vol unir-se a l'equip. L'acceptes?`;
            break;
        case 'eliminar_jugador':
            titulo = `<i class="fas fa-user-minus"></i> Proposta d'Eliminació`;
            descripcion = `S'ha proposat eliminar el jugador <strong>${peticion.metadata.nombre_jugador_objetivo}</strong> de l'equip. Estàs d'acord?`;
            break;
        case 'cambiar_id_equip':
            titulo = `<i class="fas fa-id-card"></i> Proposta de Canvi d'ID`;
            descripcion = `S'ha proposat canviar l'ID de l'equip a <strong>"${peticion.metadata.nuevo_id_equip}"</strong>. L'acceptes?`;
            break;
        default:
            titulo = 'Nova Petició';
            descripcion = 'Hi ha una nova petició pendent de votació.';
    }

    // Creamos el HTML del modal
    const modalContent = `
        <div class="modal-header">
            <h2>${titulo}</h2>
            <p class="modal-subtitle">${descripcion}</p>
        </div>
        <div class="form-actions">
            <button class="btn-primary btn-vote" data-peticion-id="${peticion.id}" data-voto="true">
                <i class="fas fa-check"></i> Acceptar
            </button>
            <button class="btn-secondary btn-vote" data-peticion-id="${peticion.id}" data-voto="false">
                <i class="fas fa-times"></i> Denegar
            </button>
        </div>
    `;

    elements.modal.content.innerHTML = modalContent;
    abrirModal();

    // Añadimos un único listener para ambos botones de voto
    document.querySelectorAll('.btn-vote').forEach(button => {
        button.addEventListener('click', handleVoteSubmit);
    });
}

/**
 * Muestra una pantalla de espera para los usuarios cuya solicitud de unión está pendiente.
 * @param {object} peticion - El objeto de la petición pendiente.
 */
export function mostrarPantallaDeEspera(peticion) {
    const { elements } = getState();
    const nombreSolicitante = peticion.metadata.nombre_solicitante;

    const modalContent = `
        <div class="modal-header">
            <h2><i class="fas fa-hourglass-half"></i> Sol·licitud Pendent</h2>
            <p class="modal-subtitle">Hola, ${nombreSolicitante}. La teva sol·licitud per unir-te a l'equip està sent votada.</p>
        </div>
        <div class="espera-info">
            <p>Rebràs accés a l'aplicació un cop tots els membres de l'equip hagin acceptat la teva sol·licitud.</p>
            <p>Pots tancar aquesta pàgina de manera segura i tornar més tard.</p>
        </div>
        <div class="form-actions">
            <button id="btn-check-status" class="btn-primary" data-peticion-id="${peticion.id}">
                <i class="fas fa-sync-alt"></i> Comprovar Estat
            </button>
            <button id="btn-cancel-request" class="btn-secondary" data-peticion-id="${peticion.id}">
                <i class="fas fa-times"></i> Cancel·lar Sol·licitud
            </button>
        </div>
    `;

    elements.modal.content.innerHTML = modalContent;
    abrirModal(); // Aseguramos que el modal se muestre

    // Añadimos los listeners a los botones
    document.getElementById('btn-check-status').addEventListener('click', handleCheckStatus);
    document.getElementById('btn-cancel-request').addEventListener('click', handleCancelRequest);
}

export function abrirModal() {
    const { elements } = getState();
    elements.modal.backdrop.classList.add('visible');
    elements.modal.popup.classList.add('visible');
}

export function cerrarModal() {
    const { elements } = getState();
    elements.modal.backdrop.classList.remove('visible');
    elements.modal.popup.classList.remove('visible');
    elements.modal.popup.classList.remove('modal-large');
    elements.modal.content.innerHTML = '';

    // Modificación aquí: en lugar de cambiar el display, quitamos la clase 'visible'
    const teamIdModal = document.getElementById('team-id-modal');
    if (teamIdModal) {
        teamIdModal.classList.remove('visible');
    }
}

export function renderizarCarrusel() {
    const { elements, plantilla, jugadoresDisponibles } = getState();
    elements.carrusel.innerHTML = '';
    plantilla.forEach(j => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-jugador';
        if (jugadoresDisponibles.includes(j.id)) {
            tarjeta.classList.add('seleccionado');
        }
        tarjeta.textContent = j.nombreMostrado;

        tarjeta.addEventListener('click', () => {
            toggleJugadorDisponible(j.id);
        });

        elements.carrusel.appendChild(tarjeta);
    });
}

export function renderizarAlineacion(alin, isPizarraMode = false) {
    const { elements, plantilla, inicialesPosicion, coordenadasPosiciones } = getState();
    if (!isPizarraMode) {
        elements.overlay.innerHTML = '';
    }
    for (const pos in alin) {
        const idTitular = alin[pos].titular;
        if (!idTitular) continue;

        const cont = document.createElement('div');
        cont.className = 'ficha-container';

        const posEl = document.createElement('div');
        posEl.className = 'posicion-nombre';

        const fichaEl = document.createElement('div');
        fichaEl.className = 'ficha-jugador';

        const suplentesEl = document.createElement('div');
        suplentesEl.className = 'info-suplentes';

        const jugadorTitular = plantilla.find(p => p.id === idTitular);
        const inicialesPos = inicialesPosicion[pos];
        const idsSuplentes = alin[pos].suplentes || [];
        const nombresSuplentes = idsSuplentes
            .map(id => plantilla.find(p => p.id === id)?.nombreMostrado)
            .filter(Boolean)
            .join(', ');

        posEl.textContent = inicialesPos;
        fichaEl.textContent = jugadorTitular ? jugadorTitular.nombreMostrado : '';
        if (nombresSuplentes && !isPizarraMode) {
            suplentesEl.textContent = nombresSuplentes;
        }

        cont.appendChild(posEl);
        cont.appendChild(fichaEl);
        if (nombresSuplentes && !isPizarraMode) {
            cont.appendChild(suplentesEl);
        }

        cont.style.top = coordenadasPosiciones[pos].top;
        cont.style.left = coordenadasPosiciones[pos].left;

        elements.overlay.appendChild(cont);
        setTimeout(() => cont.classList.add('visible'), 50);
    }
}

export function activarTab(tab) {
    const { elements } = getState();
    // Ocultar todas las secciones
    elements.sections.alineacio.style.display = 'none';
    elements.sections.estadistiques.style.display = 'none';
    elements.sections.clips.style.display = 'none';
    elements.sections.configuracion.style.display = 'none';

    // Gestionar visibilidad del carrusel
    document.querySelector('.carrusel-container').style.display = tab === 'alineacio' ? 'block' : 'none';

    // Mostrar todos los botones de navegación
    elements.nav.btnEstadistiques.style.display = 'block';
    elements.nav.btnAlineacio.style.display = 'block';
    elements.nav.btnClips.style.display = 'block';

    // Quitar clase active de todos los botones
    elements.nav.btnEstadistiques.classList.remove('active');
    elements.nav.btnAlineacio.classList.remove('active');
    elements.nav.btnClips.classList.remove('active');
    elements.nav.btnConfiguracion.classList.remove('active');

    // Hacer scroll al inicio de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Activar la sección correspondiente
    if (tab === 'alineacio') {
        elements.sections.alineacio.style.display = 'block';
        document.querySelector('footer').style.display = 'block';
        elements.nav.btnAlineacio.classList.add('active');
    } else if (tab === 'estadistiques') {
        elements.sections.estadistiques.style.display = 'block';
        elements.nav.btnEstadistiques.classList.add('active');
        renderizarEstadistiques();
    } else if (tab === 'clips') {
        elements.sections.clips.style.display = 'block';
        elements.nav.btnClips.classList.add('active');
        // Actualizar el selector de clips antes de renderizar
        actualizarSelectorClips();
        renderizarClips();
    } else if (tab === 'configuracion') {
        elements.sections.configuracion.style.display = 'block';
        elements.nav.btnConfiguracion.classList.add('active');
        renderizarContenidoConfiguracion(); 
    }

    // Actualizar el estado de los botones
    elements.nav.btnAlineacio.title = tab === 'alineacio' ? 'Secció actual' : 'Anar a Alineació';
    elements.nav.btnEstadistiques.title = tab === 'estadistiques' ? 'Secció actual' : 'Anar a Estadístiques';
    elements.nav.btnClips.title = tab === 'clips' ? 'Secció actual' : 'Anar a Clips';
}

export function actualizarSelectorPartits(selectedId = 'global') {
    const { elements, partidos } = getState();
    const options = [`<option value="global">Global</option>`];
    partidos.forEach(p => {
        options.push(`<option value="${p.id}" ${p.id == selectedId ? 'selected' : ''}>
            ${p.nom} ${p.resultat ? `(${p.resultat})` : ''}
        </option>`);
    });
    elements.stats.selector.innerHTML = options.join('');
    setPartitSeleccionat(selectedId);
}

export function mostrarEstadisticas(jugadorId) {
    const { plantilla, estadisticasJugadores, partidos } = getState();
    const jugador = plantilla.find(j => j.id === jugadorId);

    // Obtener estadísticas de partidos antiguos
    const statsAntiguos = estadisticasJugadores[jugadorId] || [];
    const totalsAntiguos = statsAntiguos.reduce((acc, curr) => {
        acc.goles += curr.goles || 0;
        acc.asistencias += curr.asistencias || 0;
        acc.chutes += curr.chutes || 0;
        acc.perdidas += curr.perdidas || 0;
        acc.recuperaciones += curr.recuperaciones || 0;
        acc.goles_a_favor += curr.goles || 0; // En los datos antiguos usamos goles como goles a favor
        acc.goles_en_contra += 0; // No teníamos goles en contra en los datos antiguos
        acc.mvp_flow += calcularMvpFlow(curr);
        return acc;
    }, { goles: 0, asistencias: 0, chutes: 0, perdidas: 0, recuperaciones: 0, goles_a_favor: 0, goles_en_contra: 0, mvp_flow: 0 });

    // Obtener estadísticas de partidos nuevos
    const statsNuevos = partidos.map(p => p.estadistiques?.[jugadorId]).filter(Boolean);
    const totalsNuevos = statsNuevos.reduce((acc, curr) => {
        acc.goles += curr.goles || 0;
        acc.asistencias += curr.asistencias || 0;
        acc.chutes += curr.chutes || 0;
        acc.perdidas += curr.perdidas || 0;
        acc.recuperaciones += curr.recuperaciones || 0;
        acc.goles_a_favor += curr.goles_a_favor || 0;
        acc.goles_en_contra += curr.goles_en_contra || 0;
        acc.mvp_flow += calcularMvpFlow(curr);
        return acc;
    }, { goles: 0, asistencias: 0, chutes: 0, perdidas: 0, recuperaciones: 0, goles_a_favor: 0, goles_en_contra: 0, mvp_flow: 0 });

    // Combinar totales
    const totals = {
        goles: totalsAntiguos.goles + totalsNuevos.goles,
        asistencias: totalsAntiguos.asistencias + totalsNuevos.asistencias,
        chutes: totalsAntiguos.chutes + totalsNuevos.chutes,
        perdidas: totalsAntiguos.perdidas + totalsNuevos.perdidas,
        recuperaciones: totalsAntiguos.recuperaciones + totalsNuevos.recuperaciones,
        goles_a_favor: totalsAntiguos.goles_a_favor + totalsNuevos.goles_a_favor,
        goles_en_contra: totalsAntiguos.goles_en_contra + totalsNuevos.goles_en_contra,
        mvp_flow: (totalsAntiguos.mvp_flow + totalsNuevos.mvp_flow) / (statsAntiguos.length + statsNuevos.length || 1)
    };

    const partitsJugats = statsAntiguos.length + statsNuevos.length;
    const { elements } = getState();
    elements.modal.content.innerHTML = `
        <h3>Estadístiques de ${jugador.nombreMostrado}</h3>
        <div class="stats-viewer">
            <div class="stat-item"><span>Partits jugats:</span> <span>${partitsJugats}</span></div><hr>
            <div class="stat-item"><span>GOLES:</span> <span>${totals.goles}</span></div>
            <div class="stat-item"><span>ASSISTÈNCIES:</span> <span>${totals.asistencias}</span></div>
            <div class="stat-item"><span>XUTS:</span> <span>${totals.chutes}</span></div>
            <div class="stat-item"><span>PÈRDUES:</span> <span>${totals.perdidas}</span></div>
            <div class="stat-item"><span>RECUPERACIONS:</span> <span>${totals.recuperaciones}</span></div>
            <div class="stat-item"><span>EQUIP EN RATXA:</span> <span>${totals.goles_a_favor}</span></div>
            <div class="stat-item"><span>EQUIP EN CRISI:</span> <span>${totals.goles_en_contra}</span></div>
        </div>`;
    abrirModal();
}

// Importa la nueva función que hemos creado y también getState
import { crearPartidoEnSupabase } from './api.js';


export function crearNuevoPartido() {
    const { elements } = getState();
    const form = `
        <div class="modal-header">
            <h2><i class="fas fa-plus-circle"></i> Afegir Partit</h2>
            <p class="modal-subtitle">Crea un nou partit per registrar-ne les estadístiques</p>
        </div>
        <div class="stats-form">
            <div class="form-group">
                <label for="nom-partit"><i class="fas fa-futbol"></i>Nom del partit</label>
                <input type="text" id="nom-partit" class="form-control" required placeholder="Ex: Jornada 5 vs Rival">
            </div>
            <div class="form-group">
                <label for="resultat-partit"><i class="fas fa-scoreboard"></i>Resultat</label>
                <input type="text" id="resultat-partit" class="form-control" placeholder="Ex: 3-2">
            </div>
            <div class="form-actions">
                <button id="btn-crear-partit" class="btn-primary">
                    <i class="fas fa-check"></i>Crear i Continuar
                </button>
                <button id="btn-cancelar" class="btn-secondary">
                    <i class="fas fa-times"></i>Cancel·lar
                </button>
            </div>
        </div>
    `;

    elements.modal.content.innerHTML = form;
    abrirModal();

    document.getElementById('btn-crear-partit').onclick = async () => { // Convertimos la función a 'async'
        const nom = document.getElementById('nom-partit').value.trim();
        const resultat = document.getElementById('resultat-partit').value.trim();
        const { teamId } = getState(); // Obtenemos el ID del equipo desde el estado

        if (!nom) {
            alert('Si us plau, introdueix el nom del partit');
            return;
        }
        
        // Llamamos a la nueva función de la API para crear el partido en la base de datos
        const nouPartit = await crearPartidoEnSupabase(nom, resultat, teamId);

        if (nouPartit) {
            // Si el partido se crea con éxito, lo añadimos al estado local de la app
            addPartido(nouPartit);
            cerrarModal();
            // Abrimos la edición de estadísticas para el nuevo partido
            setTimeout(() => mostrarEdicionEstadisticasHoja(nouPartit.id), 100);
        }
    };

    document.getElementById('btn-cancelar').onclick = cerrarModal;
}

export function mostrarEdicionEstadisticasHoja(partidoId) {
    const { partidos, plantilla, elements } = getState();
    const partido = partidos.find(p => p.id == partidoId);
    if (!partido) return;

    // Lista de estadísticas disponibles
    const estadisticasDisponibles = [
        { key: 'goles', nombre: 'Gols' },
        { key: 'asistencias', nombre: 'Assistències' },
        { key: 'chutes', nombre: 'Xuts' },
        { key: 'perdidas', nombre: 'Pèrdues' },
        { key: 'recuperaciones', nombre: 'Recuperacions' },
        { key: 'goles_a_favor', nombre: 'Gols a Favor' },
        { key: 'goles_en_contra', nombre: 'Gols en Contra' }
    ];
    let indiceEstadisticaActual = 0; // Goles por defecto

    // Función para renderizar la tabla de una estadística específica
    const renderizarTablaEstadistica = () => {
        const estadisticaActual = estadisticasDisponibles[indiceEstadisticaActual];

        const tablaHTML = `
            <table class="stats-table-mvp stats-table-edit">
                <thead>
                    <tr>
                        <th>Jugador</th>
                        <th id="stat-header" class="interactive-header"
                            data-stat-key="${estadisticaActual.key}">
                            <span>${estadisticaActual.nombre}</span>
                            <div class="header-icons">
                                <i class="fas fa-chevron-up"></i>
                                <i class="fas fa-chevron-down"></i>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${plantilla.map(jugador => {
            const stats = partido.estadistiques[jugador.id] || {};
            const valor = stats[estadisticaActual.key] || 0;
            return `
                            <tr>
                                <td>${jugador.nombreMostrado}</td>
                                <td>
                                    <input type="number" class="form-control" min="0" value="${valor}"
                                        data-jugador="${jugador.id}"
                                        data-stat="${estadisticaActual.key}">
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;

        const container = elements.modal.content.querySelector('#stats-table-container');
        if (container) {
            container.innerHTML = tablaHTML;
        }
    };

    const form = `
        <div class="modal-header">
            <h2><i class="fas fa-edit"></i> Editar Estadístiques</h2>
            <p class="modal-subtitle">${partido.nom}</p>
        </div>
        <div class="stats-form">
            <div id="stats-table-container" class="stats-table-container">
                <!-- La tabla se renderizará aquí -->
            </div>
            <div class="form-actions">
                <button id="btn-guardar-stats" class="btn-primary">
                    <i class="fas fa-save"></i> Guardar
                </button>
                <button id="btn-cancelar-stats" class="btn-secondary">
                    <i class="fas fa-times"></i> Tancar
                </button>
            </div>
        </div>
    `;

    elements.modal.content.innerHTML = form;
    renderizarTablaEstadistica();
    abrirModal();

    // --- Lógica para cambiar de estadística ---
    const cambiarEstadistica = (direccion) => {
        // Guardar el valor actual antes de cambiar
        const inputs = elements.modal.content.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            const jugadorId = input.dataset.jugador;
            const statName = input.dataset.stat;
            const value = parseInt(input.value) || 0;
            if (!partido.estadistiques[jugadorId]) partido.estadistiques[jugadorId] = {};
            partido.estadistiques[jugadorId][statName] = value;
        });

        // Cambiar al siguiente índice de estadística
        indiceEstadisticaActual = (indiceEstadisticaActual + direccion + estadisticasDisponibles.length) % estadisticasDisponibles.length;

        // Volver a renderizar la tabla con la nueva estadística
        renderizarTablaEstadistica();
        configurarListenersEstadisticas(); // Re-configurar listeners para la nueva tabla
    };

    const configurarListenersEstadisticas = () => {
        const header = document.getElementById('stat-header');
        if (!header) return;

        // Listener para Clic
        header.onclick = () => cambiarEstadistica(1); // Avanza a la siguiente

        // Listeners para Swipe (gestos táctiles)
        let touchStartY = 0;
        let touchEndY = 0;

        header.addEventListener('touchstart', e => {
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        header.addEventListener('touchend', e => {
            touchEndY = e.changedTouches[0].screenY;
            if (touchStartY - touchEndY > 50) { // Swipe hacia arriba
                cambiarEstadistica(1);
            } else if (touchEndY - touchStartY > 50) { // Swipe hacia abajo
                cambiarEstadistica(-1);
            }
        }, { passive: true });
    };

    configurarListenersEstadisticas();

    // Event listener para guardar los cambios
document.getElementById('btn-guardar-stats').onclick = async () => { // Convertimos la función a 'async'
    const inputs = elements.modal.content.querySelectorAll('input[type="number"]');
    const estadisticasDelPartido = partido.estadistiques || {};

    // 1. Recopilamos todos los datos del formulario en un objeto, como ya hacías.
    inputs.forEach(input => {
        const jugadorId = input.dataset.jugador;
        const statName = input.dataset.stat;
        const value = parseInt(input.value) || 0;

        if (!estadisticasDelPartido[jugadorId]) {
            estadisticasDelPartido[jugadorId] = {};
        }
        estadisticasDelPartido[jugadorId][statName] = value;
    });

    // 2. Llamamos a la nueva función de la API para guardar los datos en Supabase.
    const exito = await guardarEstadisticasPartido(partido.id, estadisticasDelPartido);

    if (exito) {
        // 3. Si se guardó correctamente, actualizamos el estado local de la app.
        partido.estadistiques = estadisticasDelPartido; // Actualizamos el objeto del partido en el estado
        updatePartido(partido); // Esta función ya se encarga de redibujar la tabla de stats
        cerrarModal();
        alert('Estadísticas guardadas con éxito.');
    }
};

document.getElementById('btn-cancelar-stats').onclick = cerrarModal;
}

export const renderizarEstadistiques = () => {
    const { elements, partitSeleccionat, plantilla, estadisticasJugadores, partidos } = getState();
    let html = `<div class="stats-table-container"><table class="stats-table-mvp">
        <thead><tr>
            <th>Jugador</th>
            <th>Gols</th>
            <th>Assistències</th>
            <th>Xuts</th>
            <th>Pèrdues</th>
            <th>Recuperacions</th>
            <th>Gols a Favor</th>
            <th>Gols en Contra</th>
            <th>MVP Flow</th>
            </tr></thead><tbody>`;
    let primerJugadorId = null;
    if (partitSeleccionat === 'global') {
        plantilla.forEach(j => {
            // Obtener estadísticas de los partidos antiguos
            const statsAntiguos = (estadisticasJugadores[j.id] || []).reduce((acc, curr) => {
                acc.goles += curr.goles || 0;
                acc.asistencias += curr.asistencias || 0;
                acc.chutes += curr.chutes || 0;
                acc.perdidas += curr.perdidas || 0;
                acc.recuperaciones += curr.recuperaciones || 0;
                acc.goles_a_favor += curr.goles || 0;
                acc.goles_en_contra += 0;
                return acc;
            }, { goles: 0, asistencias: 0, chutes: 0, perdidas: 0, recuperaciones: 0, goles_a_favor: 0, goles_en_contra: 0 });

            // Obtener estadísticas de los partidos nuevos
            const statsNuevos = partidos.map(p => p.estadistiques?.[j.id] || {});
            const totalsNuevos = statsNuevos.reduce((acc, curr) => {
                acc.goles += curr.goles || 0;
                acc.asistencias += curr.asistencias || 0;
                acc.chutes += curr.chutes || 0;
                acc.perdidas += curr.perdidas || 0;
                acc.recuperaciones += curr.recuperaciones || 0;
                acc.goles_a_favor += curr.goles_a_favor || 0;
                acc.goles_en_contra += curr.goles_en_contra || 0;
                return acc;
            }, { goles: 0, asistencias: 0, chutes: 0, perdidas: 0, recuperaciones: 0, goles_a_favor: 0, goles_en_contra: 0 });

            // Combinar las estadísticas antiguas y nuevas
            const totals = {
                goles: statsAntiguos.goles + totalsNuevos.goles,
                asistencias: statsAntiguos.asistencias + totalsNuevos.asistencias,
                chutes: statsAntiguos.chutes + totalsNuevos.chutes,
                perdidas: statsAntiguos.perdidas + totalsNuevos.perdidas,
                recuperaciones: statsAntiguos.recuperaciones + totalsNuevos.recuperaciones,
                goles_a_favor: statsAntiguos.goles_a_favor + totalsNuevos.goles_a_favor,
                goles_en_contra: statsAntiguos.goles_en_contra + totalsNuevos.goles_en_contra
            };

            const mvp_flow = calcularMvpFlow(totals);

            if (!primerJugadorId) primerJugadorId = j.id;
            html += `<tr class="stat-row" data-jugador-id="${j.id}" style="cursor:pointer">
                <td>${j.nombreMostrado}</td>
                <td>${totals.goles}</td>
                <td>${totals.asistencias}</td>
                <td>${totals.chutes}</td>
                <td>${totals.perdidas}</td>
                <td>${totals.recuperaciones}</td>
                <td>${totals.goles_a_favor}</td>
                <td>${totals.goles_en_contra}</td>
                <td>${mvp_flow.toFixed(1)}</td>
            </tr>`;
        });
    } else {
        // Vista de partido específico
        const partit = partidos.find(p => p.id == partitSeleccionat);
        if (partit) {
            plantilla.forEach(j => {
                const stats = partit.estadistiques[j.id] || {};
                const mvp_flow = calcularMvpFlow(stats);

                if (!primerJugadorId) primerJugadorId = j.id;
                html += `<tr class="stat-row" data-jugador-id="${j.id}" style="cursor:pointer">
                    <td>${j.nombreMostrado}</td>
                    <td>${stats.goles || 0}</td>
                    <td>${stats.asistencias || 0}</td>
                    <td>${stats.chutes || 0}</td>
                    <td>${stats.perdidas || 0}</td>
                    <td>${stats.recuperaciones || 0}</td>
                    <td>${stats.goles_a_favor || 0}</td>
                    <td>${stats.goles_en_contra || 0}</td>
                    <td>${mvp_flow.toFixed(1)}</td>
                </tr>`;
            });
        }
    } html += '</tbody></table></div>';
    elements.stats.lista.innerHTML = html;
    setupEstadisticasListeners(primerJugadorId);
};

// Funciones para gestionar clips
export function mostrarFormularioClip() {
    const { elements } = getState();
    elements.modal.popup.classList.add('modal-large'); elements.modal.content.innerHTML = `
        <div class="modal-header">
            <h2><i class="fas fa-film"></i> Afegir Clip</h2>
            <p class="modal-subtitle">Afegeix un clip de vídeo per a aquest partit</p>
        </div>
        <form id="form-clip" class="form-clip">
            <div class="form-group">
                <label for="clip-url">
                    <i class="fas fa-link"></i> 
                    URL del vídeo (YouTube o enllaç directe)
                </label>
                <input type="text" id="clip-url" class="form-control" 
                    required placeholder="https://..." 
                    pattern="https?://.+" 
                    title="Ha de ser una URL vàlida començant per http:// o https://">
                <small class="form-help">Copia l'enllaç del vídeo de YouTube o qualsevol altre servei de vídeo</small>
            </div>
            <div class="form-group">
                <label for="clip-descripcio">
                    <i class="fas fa-align-left"></i>
                    Descripció
                </label>
                <textarea id="clip-descripcio" class="form-control" 
                    required placeholder="Descriu l'acció o jugada..."
                    rows="4"></textarea>
                <small class="form-help">Descriu breument què passa en aquesta jugada</small>
            </div>
            <div class="form-group">
                <label for="clip-minut">
                    <i class="fas fa-clock"></i>
                    Minut de joc
                </label>
                <input type="text" id="clip-minut" class="form-control"
                    required placeholder="Ex: 12:34"
                    pattern="[0-9]{1,2}:[0-9]{2}"
                    title="Format: mm:ss (exemple: 12:34)">
                <small class="form-help">Format: minuts:segons (exemple: 12:34)</small>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-save"></i>
                    Guardar
                </button>
                <button type="button" class="btn-secondary" onclick="cerrarModal()">
                    <i class="fas fa-times"></i>
                    Cancel·lar
                </button>
            </div>
        </form>
    `;

    document.getElementById('form-clip').onsubmit = function (e) {
        e.preventDefault();
        const url = document.getElementById('clip-url').value;
        const descripcio = document.getElementById('clip-descripcio').value;
        const minut = document.getElementById('clip-minut').value;
        const { elements } = getState();
        const partidoId = elements.clips.selector.value;
        const clip = {
            id: Date.now(),
            url: url,
            descripcio: descripcio,
            minut: minut
        };
        addClipToPartido(partidoId, clip);
        cerrarModal();
    };

    abrirModal();
}

export function eliminarClip(partitId, clipId) {
    if (!confirm('Estàs segur que vols eliminar aquest clip?')) return;
    deleteClipFromPartido(partitId, clipId);
}

function getEmbedUrl(url) {
    try {
        // YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.includes('youtu.be')
                ? url.split('/').pop()
                : new URLSearchParams(new URL(url).search).get('v');
            return `https://www.youtube.com/embed/${videoId}`;
        }
        // Otros tipos de vídeo
        return url;
    } catch (e) {
        return url;
    }
}

export function renderizarClips() {
    const { elements, partidos } = getState();
    const partitId = elements.clips.selector.value;
    const partit = partidos.find(p => p.id == partitId);
    const container = elements.clips.lista;

    // Si no hay partido seleccionado o es global, mostrar mensaje
    if (!partit || partitId === 'global') {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-film"></i>
                <p>Selecciona un partit per veure els clips</p>
                <p class="empty-state-sub">Escull un partit del menú desplegable</p>
            </div>`;
        elements.clips.addBtn.style.display = 'none';
        return;
    }

    // Mostrar el botón de añadir clip solo si hay un partido seleccionado
    elements.clips.addBtn.style.display = 'block';

    // Si el partido no tiene clips o está vacío
    if (!partit.clips || partit.clips.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <p>No hi ha clips per a aquest partit</p>
                <p class="empty-state-sub">Fes clic al botó "Afegeix Clip" per començar</p>
            </div>`;
        return;
    }

    // Renderizar los clips existentes
    const html = partit.clips.map(clip => `
        <div class="clip-card">
            <div class="clip-video">
                <iframe 
                    src="${getEmbedUrl(clip.url)}"
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            </div>
            <div class="clip-info">
                <div>
                    <div class="clip-minut">Minut ${clip.minut}</div>
                    <div class="clip-descripcio">${clip.descripcio}</div>
                </div>
                <button class="btn-delete" onclick="eliminarClip(${partit.id}, ${clip.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

export function actualizarSelectorClips(selectedId = 'global') {
    const { elements, partidos } = getState();
    const options = [`<option value="global">Selecciona un partit</option>`];
    partidos.forEach(p => {
        options.push(`<option value="${p.id}" ${p.id == selectedId ? 'selected' : ''}>
            ${p.nom} ${p.resultat ? `(${p.resultat})` : ''}
        </option>`);
    });
    elements.clips.selector.innerHTML = options.join('');
}

// Función helper para establecer los event listeners de la tabla de estadísticas
export function setupEstadisticasListeners(primerJugadorId) {
    const { elements } = getState();
    const analyticsContainer = document.getElementById('analytics-container');
    if (analyticsContainer) {
        analyticsContainer.innerHTML = `
            <div id="analisi-rendiment" class="analisi-rendiment-container">
                <h2>Selecciona un jugador per veure l'anàlisi</h2>
            </div>
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h3>Evolució MVP Flow</h3>
                    <canvas id="chart-rendimiento"></canvas>
                </div>
                <div class="analytics-card">
                    <h3>Rendiment per Estadístiques</h3>
                    <canvas id="chart-mvp"></canvas>
                </div>
            </div>
        `;
    }

    const filas = elements.stats.lista.querySelectorAll('.stat-row');
    filas.forEach(fila => {
        fila.addEventListener('click', () => {
            filas.forEach(f => f.classList.remove('selected'));
            fila.classList.add('selected');
            const jugadorId = parseInt(fila.dataset.jugadorId);
            mostrarGraficasJugador(jugadorId);
        });
    });

    // Seleccionar el primer jugador por defecto
    if (primerJugadorId) {
        const primeraFila = elements.stats.lista.querySelector(`[data-jugador-id="${primerJugadorId}"]`);
        if (primeraFila) {
            primeraFila.click(); // Esto activará el evento click que mostrará los gráficos
        }
    }
}

// Función para resetear los datos de la aplicación
export function resetearAplicacion() {
    if (confirm('Estàs segur que vols esborrar totes les dades? Aquesta acció no es pot desfer.')) {
        // Limpiar datos
        setPartidos([]);
        setPartitSeleccionat('global');
        setJugadoresDisponibles([]);

        // Limpiar localStorage
        localStorage.removeItem('partits');
        localStorage.removeItem('partitSeleccionat');

        // Resetear la interfaz
        actualizarSelectorPartits();
        actualizarSelectorClips();
        renderizarEstadistiques();
        renderizarClips();
        renderizarCarrusel();
        renderizarAlineacion(generarMejorAlineacion());

        alert('S\'han esborrat totes les dades correctament');
    }
}

export function calcularMvpFlow(stats) {
    let puntos = 0;
    puntos += Math.min(stats.goles || 0, 3) * 2;
    puntos += Math.min(stats.asistencias || 0, 3) * 1.5;
    puntos += Math.min(stats.chutes || 0, 6) * 0.5;
    if ((stats.goles || 0) === 0 && (stats.chutes || 0) >= 5) puntos -= 1;
    puntos -= Math.min(stats.perdidas || 0, 6) * 0.5;
    puntos += Math.min(stats.recuperaciones || 0, 6) * 0.5;
    puntos += Math.min(stats.goles_a_favor || 0, 8) * 0.25;
    puntos -= Math.min(stats.goles_en_contra || 0, 8) * 0.25;
    return Math.max(1.0, Math.min(puntos, 10.0));
}

function makeDraggable(element, container) {
    let isDragging = false;
    let offsetX, offsetY;

    const onPointerDown = (e) => {
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = 11;
        element.classList.add('dragging'); // Feedback visual
        e.preventDefault();
        element.setPointerCapture(e.pointerId);

        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // La magia: calcular el offset relativo al contenedor, no a la ventana
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
    };

    const onPointerMove = (e) => {
        if (!isDragging) return;

        const containerRect = container.getBoundingClientRect();
        // La posición del ratón relativa al contenedor
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        // Nueva posición del elemento es la del ratón menos el offset inicial
        let x = mouseX - offsetX;
        let y = mouseY - offsetY;

        const elementWidth = element.offsetWidth;
        const elementHeight = element.offsetHeight;

        // Asegurarse que la pieza no salga del contenedor
        x = Math.max(0, Math.min(x, containerRect.width - elementWidth));
        y = Math.max(0, Math.min(y, containerRect.height - elementHeight));

        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    };

    const onPointerUp = (e) => {
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = 10;
        element.releasePointerCapture(e.pointerId);
    };

    element.addEventListener('pointerdown', onPointerDown, { passive: false });
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
}

function renderizarPizarra() {
    const { elements } = getState();
    elements.overlay.innerHTML = '';
    elements.overlay.style.pointerEvents = 'auto';

    const crearElemento = (id, className, text, left, top) => {
        const el = document.createElement('div');
        el.id = id;
        el.className = className;
        if (text) el.textContent = text;
        el.style.left = left;
        el.style.top = top;
        elements.overlay.appendChild(el);
        makeDraggable(el, elements.campo);
        return el;
    };

    const formacionLocal = [
        { left: '50%', top: '85%' }, { left: '25%', top: '70%' },
        { left: '75%', top: '70%' }, { left: '50%', top: '55%' }
    ];
    const formacionRival = [
        { left: '50%', top: '15%' }, { left: '25%', top: '30%' },
        { left: '75%', top: '30%' }, { left: '50%', top: '45%' }
    ];

    crearElemento('local-p', 'pizarra-jugador-local', '', '50%', '95%');
    formacionLocal.forEach((pos, i) => {
        crearElemento(`local-${i + 1}`, 'pizarra-jugador-local', '', pos.left, pos.top);
    });

    crearElemento('rival-p', 'pizarra-jugador-rival', '', '50%', '5%');
    formacionRival.forEach((pos, i) => {
        crearElemento(`rival-${i + 1}`, 'pizarra-jugador-rival', '', pos.left, pos.top);
    });

    crearElemento('pelota', 'pizarra-pelota', '', '50%', '50%');
}

function reiniciarPosiciones() {
    renderizarPizarra();
}

let isRecording = false;
let jugadaActual = [];
let timeoutsAnimacion = [];

function setupPizarraEventListeners() {
    const { elements } = getState();

    document.getElementById('reiniciar-posiciones-btn').addEventListener('click', reiniciarPosiciones);
    document.getElementById('iniciar-grabacion-btn').addEventListener('click', iniciarGrabacion);
    document.getElementById('anadir-paso-btn').addEventListener('click', anadirPaso);
    document.getElementById('finalizar-jugada-btn').addEventListener('click', finalizarGrabacion);
}

function iniciarGrabacion() {
    isRecording = true;
    jugadaActual = [];
    document.getElementById('iniciar-grabacion-btn').disabled = true;
    document.getElementById('anadir-paso-btn').disabled = false;
    document.getElementById('finalizar-jugada-btn').disabled = false;
    getState().elements.campo.classList.add('recording');
    anadirPaso(); // Guardar el estado inicial
}

function anadirPaso() {
    if (!isRecording) return;
    const { elements } = getState();
    const paso = [];
    const fichas = elements.overlay.querySelectorAll('.pizarra-jugador-local, .pizarra-jugador-rival, .pizarra-pelota');
    fichas.forEach((ficha, index) => {
        paso.push({
            id: ficha.id || `ficha-${index}`, // Asegurar que cada ficha tenga un ID
            left: ficha.style.left,
            top: ficha.style.top
        });
    });
    jugadaActual.push(paso);

    const anadirPasoBtn = document.getElementById('anadir-paso-btn');
    anadirPasoBtn.classList.add('feedback');
    setTimeout(() => anadirPasoBtn.classList.remove('feedback'), 300);
}

function finalizarGrabacion() {
    isRecording = false;
    getState().elements.campo.classList.remove('recording');
    document.getElementById('iniciar-grabacion-btn').disabled = false;
    document.getElementById('anadir-paso-btn').disabled = true;
    document.getElementById('finalizar-jugada-btn').disabled = true;

    if (jugadaActual.length > 1) {
        const nombreJugada = prompt("Introdueix un nom per a la jugada:", "Nova Jugada");
        if (nombreJugada) {
            guardarJugada(nombreJugada, jugadaActual);
            renderizarJugadasGuardadas();
        }
    }
    jugadaActual = [];
}

function guardarJugada(nombre, jugada) {
    const jugadasGuardadas = JSON.parse(localStorage.getItem('jugadasPizarra') || '[]');
    jugadasGuardadas.push({ id: Date.now(), nombre, jugada });
    localStorage.setItem('jugadasPizarra', JSON.stringify(jugadasGuardadas));
}

function renderizarJugadasGuardadas() {
    const panel = document.getElementById('jugadas-guardadas-panel');
    const jugadasGuardadas = JSON.parse(localStorage.getItem('jugadasPizarra') || '[]');

    let html = '<h3>Jugadas Guardadas</h3>';
    if (jugadasGuardadas.length === 0) {
        html += '<p>No hi ha jugades guardades.</p>';
    } else {
        html += '<ul>';
        jugadasGuardadas.forEach(jugada => {
            html += `
                <li>
                    <span>${jugada.nombre}</span>
                    <div>
                        <button class="btn-reproducir" data-id="${jugada.id}"><i class="fas fa-play"></i></button>
                        <button class="btn-eliminar" data-id="${jugada.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </li>`;
        });
        html += '</ul>';
    }
    panel.innerHTML = html;

    panel.querySelectorAll('.btn-reproducir').forEach(btn => {
        btn.addEventListener('click', () => reproducirJugada(btn.dataset.id));
    });
    panel.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => eliminarJugada(btn.dataset.id));
    });
}

function reproducirJugada(id) {
    const jugadasGuardadas = JSON.parse(localStorage.getItem('jugadasPizarra') || '[]');
    const jugadaData = jugadasGuardadas.find(j => j.id == id);
    if (!jugadaData) return;

    const { elements } = getState();
    const fichas = elements.overlay.querySelectorAll('.pizarra-jugador-local, .pizarra-jugador-rival, .pizarra-pelota');

    // Limpiar animaciones anteriores
    timeoutsAnimacion.forEach(timeout => clearTimeout(timeout));
    timeoutsAnimacion = [];

    let pasoIndex = 0;
    function animarPaso() {
        if (pasoIndex >= jugadaData.jugada.length) {
            // Restaurar la interactividad
            fichas.forEach(ficha => ficha.style.pointerEvents = 'auto');
            return;
        }

        const pasoActual = jugadaData.jugada[pasoIndex];
        pasoActual.forEach(pos => {
            const ficha = document.getElementById(pos.id);
            if (ficha) {
                ficha.style.transition = 'left 0.5s ease-in-out, top 0.5s ease-in-out';
                ficha.style.left = pos.left;
                ficha.style.top = pos.top;
                ficha.style.pointerEvents = 'none'; // Desactivar drag durante la animación
            }
        });

        pasoIndex++;
        timeoutsAnimacion.push(setTimeout(animarPaso, 1500)); // 1.5s entre pasos
    }

    animarPaso();
}

function eliminarJugada(id) {
    if (!confirm('Estàs segur que vols eliminar aquesta jugada?')) return;
    let jugadasGuardadas = JSON.parse(localStorage.getItem('jugadasPizarra') || '[]');
    jugadasGuardadas = jugadasGuardadas.filter(j => j.id != id);
    localStorage.setItem('jugadasPizarra', JSON.stringify(jugadasGuardadas));
    renderizarJugadasGuardadas();
}

export function togglePizarraTactical() {
    const { elements } = getState();
    const state = getState();
    state.isPizarraTacticalMode = !state.isPizarraTacticalMode;
    elements.campo.classList.toggle('pizarra-activa', state.isPizarraTacticalMode);
    elements.togglePizarraBtn.textContent = state.isPizarraTacticalMode ? 'Modo Pizarra: ON' : 'Pizarra Táctica';

    const carruselContainer = document.querySelector('.carrusel-container');
    if (carruselContainer) {
        carruselContainer.style.display = state.isPizarraTacticalMode ? 'none' : 'block';
    }

    const pizarraControls = document.getElementById('pizarra-controls-container');
    if (pizarraControls) {
        pizarraControls.style.display = state.isPizarraTacticalMode ? 'block' : 'none';
    }

    if (state.isPizarraTacticalMode) {
        renderizarPizarra();
        setupPizarraEventListeners();
        renderizarJugadasGuardadas();
    } else {
        elements.overlay.style.pointerEvents = 'none';
        renderizarAlineacion(state.alineacionActual, false);
        elements.campo.classList.remove('recording');
    }
}
