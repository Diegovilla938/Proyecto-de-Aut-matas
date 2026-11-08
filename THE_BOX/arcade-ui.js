// ============================================================
// arcade-ui.js - THE BOX
// Este archivo controla la interfaz: menú, instrucciones, cuenta regresiva,
// pantalla completa, récords, pantalla de derrota y el AFD visual del jugador.
// ============================================================

/* Capa de presentación independiente: no modifica las reglas del autómata. */
(function(){
  'use strict';
  const menu = document.getElementById('main-menu');
  const start = document.getElementById('start-game');
  const guideButton = document.getElementById('show-guide');
  const guide = document.getElementById('instructions-overlay');
  const guideBack = document.getElementById('instructions-back');
  const guideCloseX = document.getElementById('instructions-close-x');
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownNumber = document.getElementById('countdown-number');
  const countdownMessage = document.getElementById('countdown-message');
  const countdownFill = document.getElementById('countdown-fill');
  let countdownTimer = null;
  const menuReturn = document.getElementById('menu-return');
  const playerInput = document.getElementById('player-name');
  const topThree = document.getElementById('top-three');
  const fullscreenButton = document.getElementById('toggle-fullscreen');
  const soundButton = document.getElementById('toggle-sound');
  function actualizarBotonSonido() {
    if (!soundButton || !window.sonidosTheBox) return;
    const silenciado = window.sonidosTheBox.estaSilenciado();
    soundButton.textContent = silenciado ? 'SONIDO: SILENCIADO' : 'SONIDO: ACTIVADO';
    soundButton.setAttribute('aria-pressed', String(!silenciado));
  }
  if (soundButton) soundButton.addEventListener('click', () => {
    window.sonidosTheBox.alternar();
    actualizarBotonSonido();
  });
  actualizarBotonSonido();
  const STORAGE_KEY = 'the-box-arcade-top-3-v1'; // Se conservan los récords existentes
  let playerName = 'Jugador';
  let resultSaved = false;
  // Se ordenan los récords primero por nivel, luego por puntos y finalmente por fecha.
  const orderScores = (a, b) => b.level - a.level || b.points - a.points || a.date - b.date;
  // Se leen los récords guardados en este navegador y se conservan los tres mejores.
  const readScores = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.filter(x => x && typeof x.name === 'string' && Number.isFinite(x.points) && Number.isFinite(x.level)).sort(orderScores).slice(0, 3) : [];
    } catch(e) { return []; }
  };
  // Se actualiza la lista de los tres mejores jugadores que aparece en el menú.
  function renderScores() {
    topThree.replaceChildren();
    const data = readScores().slice(0,3);
    if (!data.length) {
      const empty = document.createElement('li');
      empty.className = 'leaderboard-empty';
      empty.textContent = 'Todavía no hay récords. ¡Sé el primero!';
      topThree.appendChild(empty);
      return;
    }
    data.forEach((entry, i) => {
      const item = document.createElement('li');
      const medal = document.createElement('span'); medal.className = 'leaderboard-medal'; medal.textContent = ['🥇','🥈','🥉'][i];
      const name = document.createElement('span'); name.className = 'leaderboard-name'; name.textContent = entry.name;
      const result = document.createElement('span'); result.className = 'leaderboard-score'; result.textContent = 'Nivel ' + entry.level + ' · ' + entry.points + ' pts';
      item.append(medal, name, result);
      topThree.appendChild(item);
    });
  }
  renderScores();
  // Se guarda el resultado de la partida una sola vez y se actualiza el Top 3.
  window.registrarResultadoTheBox = function() {
    if (!started || resultSaved) return;
    resultSaved = true;
    const entry = { name: playerName, points: Math.max(0, Number(score) || 0), level: Number(nivelActual) || 1, date: Date.now() };
    const records = [...readScores(), entry].sort(orderScores).slice(0,3);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
    catch(e) { console.warn('No se pudo guardar el récord en este navegador.', e); }
    renderScores();
  };
  // Se cambia el texto del botón según el estado de la pantalla completa.
  function fullscreenLabel() {
    fullscreenButton.textContent = document.fullscreenElement ? '⛶ SALIR DE PANTALLA COMPLETA' : '⛶ PANTALLA COMPLETA';
  }
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else alert('Este navegador no permite activar la pantalla completa aquí.');
    } catch(e) { alert('No se pudo activar la pantalla completa. Abre el juego en el navegador o en Live Server.'); }
    fullscreenLabel();
  });
  document.addEventListener('fullscreenchange', fullscreenLabel);
  let started = false;
  // Se identifica si hay una partida activa para controlar la navegación y el teclado.
  function setPlayingMode(isPlaying) {
    document.body.classList.toggle('playing', !!isPlaying);
  }
  // Se evita que las flechas desplacen la página durante el movimiento del jugador.
  function blockScrollKeys(ev) {
    const movementKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
    const typing = ev.target && (ev.target.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(ev.target.tagName));
    // Las flechas mueven al personaje, pero no desplazan la página.
    // El ratón, rueda, touchpad y barra de scroll siguen funcionando.
    if (started && menu.hidden && !gameOver && !win && !juegoPausado && !typing && movementKeys.includes(ev.key)) ev.preventDefault();
  }
  window.addEventListener('keydown', blockScrollKeys, { passive:false });
  // setup() de p5 se ejecuta antes de la interacción del menú.
  // Se mantiene el juego pausado y se prepara el marcador mientras aparece el menú.
  function prepare() {
    if (typeof juegoPausado !== 'undefined') juegoPausado = true;
    if (typeof actualizarHUDArcade === 'function') actualizarHUDArcade();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare);
  else prepare();
  setPlayingMode(false);
  // Se cierra la ventana de instrucciones y se regresa al menú.
  function closeInstructions() {
    if (guide.hidden) return;
    guide.hidden = true;
    menu.hidden = false;
    guideButton.focus();
  }
  // Se abre la ventana de instrucciones sin iniciar una partida.
  function openInstructions() {
    menu.hidden = true;
    guide.hidden = false;
    guideBack.focus();
  }
  // Se detiene cualquier cuenta regresiva pendiente.
  function stopCountdown() {
    if (countdownTimer !== null) clearInterval(countdownTimer);
    countdownTimer = null;
    countdownOverlay.hidden = true;
  }
  // Se muestra el conteo previo al inicio y se habilita el juego cuando termina.
  function runCountdown() {
    stopCountdown();
    juegoPausado = true; // Nunca mover el jugador ni los enemigos durante la cuenta regresiva
    started = false;
    countdownOverlay.hidden = false;
    let remaining = 3;
    countdownNumber.textContent = '3';
    countdownNumber.classList.remove('countdown-pop');
    void countdownNumber.offsetWidth;
    countdownNumber.classList.add('countdown-pop');
    countdownMessage.textContent = 'La partida está por comenzar';
    countdownFill.style.width = '0%';
    countdownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        countdownNumber.textContent = String(remaining);
        countdownFill.style.width = ((3 - remaining) / 3 * 100) + '%';
        countdownNumber.classList.remove('countdown-pop');
        void countdownNumber.offsetWidth;
        countdownNumber.classList.add('countdown-pop');
      } else {
        countdownNumber.textContent = '¡YA!';
        countdownMessage.textContent = '¡A jugar!';
        countdownFill.style.width = '100%';
        countdownNumber.classList.remove('countdown-pop');
        void countdownNumber.offsetWidth;
        countdownNumber.classList.add('countdown-pop');
        clearInterval(countdownTimer);
        countdownTimer = setTimeout(() => {
          countdownTimer = null;
          countdownOverlay.hidden = true;
          started = true;
          juegoPausado = false;
        }, 600);
      }
    }, 1000);
  }
  // Se obtiene el nombre del jugador y se restablecen el nivel y la puntuación para una nueva partida.
  function startNewGame() {
    const nombreIngresado = playerInput.value.trim().replace(/\s+/g,' ').slice(0,18);
    if (!nombreIngresado) {
      playerInput.value = '';
      playerInput.setCustomValidity('Escribe tu nombre para comenzar.');
      playerInput.reportValidity();
      playerInput.focus();
      return;
    }
    playerInput.setCustomValidity('');
    if (window.sonidosTheBox) { window.sonidosTheBox.activar(); window.sonidosTheBox.boton(); }
    playerName = nombreIngresado;
    playerInput.value = playerName;
    resultSaved = false;
    defeatOverlay.hidden = true;
    menu.hidden = true;
    nivelActual = 1;
    score = 0;
    setPlayingMode(true);
    iniciarNivel();
    runCountdown();
    playerInput.blur();
    start.textContent = '▶ NUEVA PARTIDA';
  }
  playerInput.addEventListener('input', () => playerInput.setCustomValidity(''));
  start.addEventListener('click', startNewGame);
  window.partidaTheBoxActiva = () => started && menu.hidden;
  // Se detienen la partida y los temporizadores antes de volver al menú principal.
  function returnToMainMenu() {
    stopCountdown();
    if (window.sonidosTheBox) window.sonidosTheBox.detenerMusica();
    guide.hidden = true;
    // Detener la ejecución actual: evita que la derrota reabra su ventana en draw().
    started = false;
    if (typeof temporizadorSiguienteNivel !== 'undefined' && temporizadorSiguienteNivel !== null) {
      clearTimeout(temporizadorSiguienteNivel);
      temporizadorSiguienteNivel = null;
    }
    juegoPausado = true;
    setPlayingMode(false);
    defeatOverlay.hidden = true;
    menu.hidden = false;
    renderScores();
  }
  guideButton.addEventListener('click', () => { if (window.sonidosTheBox) window.sonidosTheBox.boton(); openInstructions(); });
  guideBack.addEventListener('click', closeInstructions);
  guideCloseX.addEventListener('click', closeInstructions);
  document.getElementById('countdown-cancel').addEventListener('click', returnToMainMenu);
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && !guide.hidden) {
      ev.preventDefault();
      ev.stopPropagation();
      closeInstructions();
    }
  }, true);
  menuReturn.addEventListener('click', returnToMainMenu);
  // Diagrama de estados del jugador, independiente del controlador del enemigo.
  const playerNodes = Array.from(document.querySelectorAll('[data-player-node]'));
  const playerEdges = Array.from(document.querySelectorAll('[data-player-edge]'));
  const playerStateEl = document.getElementById('player-state-name');
  const playerInfoEl = document.getElementById('player-state-info');
  const playerTransitionEl = document.getElementById('player-last-transition');
  const playerHistoryEl = document.getElementById('player-transition-history');
  const playerLevelEl = document.getElementById('player-diagram-level');
  const defeatOverlay = document.getElementById('defeat-overlay');
  const defeatSummary = document.getElementById('defeat-summary');
  let currentPlayerState = 'JUGANDO';
  const playerHistory = [];
  // Se muestran los nombres de los estados sin guiones bajos.
  const displayState = state => state.replaceAll('_', ' ');
  // Se resalta el estado y la transición correspondiente en el diagrama del jugador.
  function paintPlayerState(state, edgeId) {
    playerNodes.forEach(n => n.classList.toggle('active', n.dataset.playerNode === state));
    playerEdges.forEach(e => {
      const active = e.dataset.playerEdge === edgeId;
      e.classList.toggle('active', active);
      e.setAttribute('marker-end', active ? 'url(#player-arrow-on)' : 'url(#player-arrow)');
    });
    playerStateEl.textContent = displayState(state);
    playerLevelEl.textContent = 'NIVEL ' + nivelActual + ' / ' + totalNiveles;
    const descriptions = {
      JUGANDO: 'Comienza el nivel y busca los puntos.',
      RECOLECTANDO: 'Está recogiendo puntos en el laberinto.',
      NIVEL_COMPLETADO: nivelActual === totalNiveles ? '¡Aceptación del nivel 5 y victoria final!' : '¡Aceptación! Se iniciará el próximo nivel.',
      DERROTA: 'El jugador fue atrapado por un enemigo.'
    };
    playerInfoEl.textContent = descriptions[state];
  }
  // Se reinicia el diagrama del jugador en JUGANDO al comenzar cada nivel.
  window.reiniciarDiagramaJugador = function() {
    currentPlayerState = 'JUGANDO';
    playerHistory.length = 0;
    playerHistoryEl.replaceChildren();
    const item = document.createElement('div');
    item.className = 'transicion-item';
    item.textContent = 'Inicio del nivel ' + nivelActual + ': JUGANDO';
    playerHistoryEl.append(item);
    playerTransitionEl.textContent = 'Inicio del nivel ' + nivelActual + ' → JUGANDO';
    paintPlayerState('JUGANDO', null);
  };
  // Se registran y muestran los cambios de estado del jugador en el historial.
  window.transicionarJugador = function(next, reason) {
    if (!['JUGANDO','RECOLECTANDO','NIVEL_COMPLETADO','DERROTA'].includes(next)) return;
    if (currentPlayerState === next) return;
    const before = currentPlayerState;
    currentPlayerState = next;
    const edgeId = before + '-' + next;
    paintPlayerState(next, edgeId);
    playerTransitionEl.textContent = displayState(before) + ' → ' + displayState(next) + ' · ' + reason;
    playerHistory.unshift({from:before,to:next,reason});
    playerHistory.length = Math.min(6, playerHistory.length);
    playerHistoryEl.replaceChildren();
    playerHistory.forEach(item => {
      const entry = document.createElement('div');entry.className = 'transicion-item';
      const fromTo = document.createElement('div');fromTo.className = 'transicion-estados';
      fromTo.textContent = displayState(item.from)+' → '+displayState(item.to);
      const detail = document.createElement('div');detail.className = 'transicion-condicion';detail.textContent = item.reason;
      entry.append(fromTo, detail);playerHistoryEl.append(entry);
    });
  };
  // Se abre la ventana de derrota y se muestra el resultado obtenido.
  window.mostrarDerrotaTheBox = function() {
    if (!started || !gameOver || !defeatOverlay.hidden) return;
    if (typeof registrarResultadoTheBox === 'function') registrarResultadoTheBox();
    defeatSummary.textContent = 'Nivel ' + nivelActual + ' de ' + totalNiveles + ' · ' + score + ' puntos acumulados';
    defeatOverlay.hidden = false;
  };
  // Se permite reintentar desde el nivel 1 sin volver al menú.
  function restartFullGame() {
    defeatOverlay.hidden = true;
    resultSaved = false;
    nivelActual = 1;
    score = 0;
    setPlayingMode(true);
    iniciarNivel(); // restablece posiciones, puntos, enemigos y el AFD de jugador
    juegoPausado = false;
    started = true;
  }
  document.getElementById('retry-game').addEventListener('click', restartFullGame);
  document.getElementById('defeat-main-menu').addEventListener('click', returnToMainMenu);
  // Se actualizan los puntos, el nivel, los enemigos y el porcentaje de progreso del marcador.
  window.actualizarHUDArcade = function(){
    if (typeof nivelActual === 'undefined') return;
    const count = typeof puntosRecolectados === 'number' ? puntosRecolectados : 0;
    const total = typeof totalPuntosNivel === 'number' ? totalPuntosNivel : 0;
    const progress = total ? Math.min(100, Math.max(0, Math.floor(100 * count / total))) : 0;
    document.getElementById('score-display').textContent = count;
    document.getElementById('hud-level').textContent = nivelActual + ' / ' + totalNiveles;
    document.getElementById('hud-enemies').textContent = enemigos.length;
    document.getElementById('hud-collected').textContent = count + ' / ' + total + ' puntos';
    document.getElementById('hud-percent').textContent = progress + '%';
    document.getElementById('hud-progress-fill').style.width = progress + '%';
    document.getElementById('hud-progress').setAttribute('aria-valuenow', String(progress));
  };
})();
