// Efectos sonoros originales generados con Web Audio API.
// No se utilizan canciones, grabaciones ni archivos de audio externos.
(function () {
  'use strict';
  let audio = null;
  let temporizadorMusica = null;
  let indiceMusica = 0;
  let musicaActiva = false;
  let silenciado = false;
  try { silenciado = localStorage.getItem('the-box-sonidos-silenciados') === '1'; } catch (e) {}

  function contexto() {
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return null;
    if (!audio) audio = new Constructor();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    return audio;
  }

  // Cada nota se produce con un oscilador propio y una envolvente de volumen corta.
  function nota(frecuencia, inicio, duracion, tipo = 'sine', volumen = 0.04, finFrecuencia = null) {
    if (silenciado) return;
    try {
      const ctx = contexto();
      if (!ctx) return;
      const tiempo = ctx.currentTime + inicio;
      const oscilador = ctx.createOscillator();
      const ganancia = ctx.createGain();
      oscilador.type = tipo;
      oscilador.frequency.setValueAtTime(frecuencia, tiempo);
      if (finFrecuencia) oscilador.frequency.exponentialRampToValueAtTime(finFrecuencia, tiempo + duracion);
      ganancia.gain.setValueAtTime(0.0001, tiempo);
      ganancia.gain.exponentialRampToValueAtTime(Math.max(0.0001, volumen), tiempo + 0.012);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, tiempo + duracion);
      oscilador.connect(ganancia);
      ganancia.connect(ctx.destination);
      oscilador.start(tiempo);
      oscilador.stop(tiempo + duracion + 0.025);
    } catch (e) { /* El juego continúa si el navegador no permite audio. */ }
  }

  // Música de fondo original generada con osciladores. No se utilizan pistas externas.
  // La secuencia es suave para que no interfiera con los efectos del juego.
  const notasFondo = [220, 0, 261.63, 329.63, 0, 293.66, 261.63, 0,
                      196, 0, 246.94, 293.66, 0, 261.63, 220, 0];
  function pasoMusical() {
    if (!musicaActiva || silenciado) return;
    const frecuencia = notasFondo[indiceMusica % notasFondo.length];
    indiceMusica++;
    if (frecuencia) nota(frecuencia, 0, 0.29, 'sine', 0.008);
  }
  function detenerMusica() {
    musicaActiva = false;
    if (temporizadorMusica !== null) {
      clearInterval(temporizadorMusica);
      temporizadorMusica = null;
    }
  }
  function iniciarMusica() {
    if (musicaActiva || silenciado) return;
    musicaActiva = true;
    pasoMusical();
    temporizadorMusica = setInterval(pasoMusical, 340);
  }

  // Los sonidos se crean en el navegador, sin utilizar recursos de terceros.
  window.sonidosTheBox = {
    activar() { if (!silenciado) contexto(); },
    estaSilenciado() { return silenciado; },
    alternar() {
      silenciado = !silenciado;
      if (silenciado) detenerMusica();
      try { localStorage.setItem('the-box-sonidos-silenciados', silenciado ? '1' : '0'); } catch (e) {}
      if (!silenciado) { contexto(); this.boton(); }
      return silenciado;
    },
    musicaSegunPartida(activa) {
      if (activa && !silenciado) iniciarMusica();
      else detenerMusica();
    },
    detenerMusica,
    boton() { nota(600, 0, 0.065, 'sine', 0.023, 780); },
    punto() { nota(740, 0, 0.065, 'sine', 0.027, 990); },
    nivel() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frecuencia, i) => nota(frecuencia, i * 0.11, 0.21, 'triangle', 0.035));
    },
    derrota() {
      detenerMusica();
      nota(390, 0, 0.20, 'triangle', 0.042, 300);
      nota(290, 0.18, 0.28, 'triangle', 0.038, 160);
    }
  };
})();
