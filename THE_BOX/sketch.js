// ============================================================
// sketch.js - THE BOX
// Este archivo contiene la lógica general del juego: niveles, puntuación, colisiones, pausa,
// efectos y comunicación con el diagrama de estados del jugador.
// ============================================================

// ====================== VARIABLES GLOBALES ======================
var rocas = [];
var puntos = [];
var enemigos = [];
var player = null;
var plat;
var tileSize = 50;
var score = 0; // Puntuación acumulada de toda la partida (Top 3)
var gameOver = false;
var instanteDerrota = null; // Momento de la captura para mostrar primero la transición y su sonido.
var win = false;
var collectedParticles = [];

// SISTEMA DE NIVELES
var nivelActual = 1;
var totalNiveles = 5;
var temporizadorSiguienteNivel = null;
var totalPuntosNivel = 0;
var puntosRecolectados = 0;
var enemigosBase = 1;
var velocidadEnemigoBase = 2;

// SISTEMA DE PAUSA
var juegoPausado = false;
var botonPausa = {
  x: 0,
  y: 0,
  width: 40,
  height: 40,
  hover: false
};

// DIAGRAMA DE ESTADOS EN TIEMPO REAL
var diagramaEstados = {
  historial: [],
  maxHistorial: 8
};

// ====================== SETUP ======================
// Se prepara el lienzo del juego, se configura el botón de pausa y se carga el primer nivel.
function setup() {
  console.log("Iniciando juego - Nivel", nivelActual);
  
  let canvas = createCanvas(1000, 600);
  canvas.parent('contenedor');
  
  // CONFIGURAR BOTÓN DE PAUSA
  botonPausa.x = width - botonPausa.width - 20;
  botonPausa.y = 80;
  
  iniciarNivel();
  juegoPausado = true; // pantalla inicial: no comienza hasta elegir Iniciar
}

// Se restablecen los datos del nivel y se generan el mapa, los puntos, los enemigos y el jugador.
function iniciarNivel() {
  if (temporizadorSiguienteNivel !== null) {
    clearTimeout(temporizadorSiguienteNivel);
    temporizadorSiguienteNivel = null;
  }
  // Resetear variables del nivel
  rocas = [];
  puntos = [];
  enemigos = [];
  puntosRecolectados = 0;
  gameOver = false;
  instanteDerrota = null;
  win = false;
  juegoPausado = false;
  collectedParticles = [];
  diagramaEstados.historial = [];
  
  
  // Configuración de dificultad por nivel
  let puntosPorNivel = max(10, nivelActual * 3);
  let enemigosPorNivel = enemigosBase + floor(nivelActual / 2);
  let velocidadEnemigo = velocidadEnemigoBase + (nivelActual * 0.3);
  
  console.log("Configuración nivel", nivelActual + ":");
  console.log("- Puntos requeridos:", puntosPorNivel);
  console.log("- Enemigos:", enemigosPorNivel);
  console.log("- Velocidad enemigos:", velocidadEnemigo.toFixed(1));
  
  plat = new Plataforma(puntosPorNivel, enemigosPorNivel);
  console.log("Plataforma creada para nivel", nivelActual);

  // Generar rocas
  for (let i = 0; i < plat.filas; i++) {
    for (let j = 0; j < plat.columnas; j++) {
      if (plat.platform[i][j] === '*') {
        rocas.push(new Roca(j * tileSize, i * tileSize));
      }
    }
  }

  // Generar puntos
  for (let i = 0; i < plat.filas; i++) {
    for (let j = 0; j < plat.columnas; j++) {
      if (plat.platform[i][j] === 'o') {
        puntos.push(new Punto(j * tileSize, i * tileSize));
      }
    }
  }
  totalPuntosNivel = puntos.length;
  console.log("Puntos generados:", totalPuntosNivel + "/" + puntosPorNivel);

  // Generar enemigos con velocidad progresiva
  let enemigosCreados = 0;
  for (let i = 0; i < plat.filas; i++) {
    for (let j = 0; j < plat.columnas; j++) {
      if (plat.platform[i][j] === 'e' && enemigosCreados < enemigosPorNivel) {
        let enemigo = new Enemigo(j * tileSize, i * tileSize);
        enemigo.velocidad = velocidadEnemigo;
        enemigos.push(enemigo);
        enemigosCreados++;
      }
    }
  }
  console.log("Enemigos generados:", enemigos.length);

  // Crear jugador
  for (let i = 0; i < plat.filas; i++) {
    for (let j = 0; j < plat.columnas; j++) {
      if (plat.platform[i][j] === 'p') {
        player = new Jugador(j * tileSize, i * tileSize);
        console.log("Jugador creado en:", player.x, player.y);
        break;
      }
    }
  }

  if (typeof actualizarHUDArcade === "function") actualizarHUDArcade();
  if (typeof reiniciarDiagramaJugador === 'function') reiniciarDiagramaJugador();
  console.log("Nivel", nivelActual, "listo!");
}

// Se centraliza la derrota para que ambas formas de colisión produzcan
// el mismo resultado: sonido, transición del AFD y ventana posterior.
function registrarDerrotaJugador() {
  if (gameOver || win) return;
  gameOver = true;
  instanteDerrota = millis();
  if (typeof transicionarJugador === 'function') {
    transicionarJugador('DERROTA', 'El enemigo capturó al jugador');
  }
  if (window.sonidosTheBox && typeof window.sonidosTheBox.derrota === 'function') {
    window.sonidosTheBox.derrota();
  }
  createGameOverEffect();
  console.log('Game Over en nivel', nivelActual);
}

// ====================== DRAW ======================
// Se actualiza y dibuja el juego en cada fotograma, respetando la pausa y el fin de partida.
function draw() {
  background(7, 15, 34); // Fondo arcade nocturno
  dibujarReticulaArcade();

  // Mostrar todos los elementos
  for (let r of rocas) r.show();
  for (let p of puntos) p.show();
  for (let e of enemigos) e.show();

  // ACTUALIZAR Y MOSTRAR JUGADOR (SOLO SI NO ESTÁ PAUSADO O TERMINADO)
  if (player && !gameOver && !win && !juegoPausado) {
    player.mover();
    player.show();
  } else if (player) {
    player.show();
  }

  // ACTUALIZAR ENEMIGOS (SOLO SI NO ESTÁ PAUSADO O TERMINADO)
  for (let e of enemigos) {
    if (!gameOver && !win && !juegoPausado) {
      e.mover();
    }
    e.show();
  }

  // Actualizar partículas
  updateParticles();

  // Mostrar UI
  if (frameCount % 6 === 0 && typeof actualizarHUDArcade === "function") actualizarHUDArcade();
  drawScore();
  drawNivelInfo();
  drawBotonPausa();
  
  
  checkGameState();
  // Seguridad: se completa el registro si alguna otra rutina activa gameOver.
  if (gameOver && instanteDerrota === null) {
    instanteDerrota = millis();
    if (typeof transicionarJugador === 'function') {
      transicionarJugador('DERROTA', 'El enemigo capturó al jugador');
    }
    if (window.sonidosTheBox && typeof window.sonidosTheBox.derrota === 'function') {
      window.sonidosTheBox.derrota();
    }
  }
  // Se mantiene visible DERROTA durante unos segundos antes de abrir la ventana.
  if (gameOver && instanteDerrota !== null && millis() - instanteDerrota >= 2800 && typeof mostrarDerrotaTheBox === 'function') {
    mostrarDerrotaTheBox();
  }
  // Se reproduce música de fondo solamente mientras el juego está activo.
  if (window.sonidosTheBox && typeof window.sonidosTheBox.musicaSegunPartida === 'function') {
    const partidaActiva = typeof partidaTheBoxActiva === 'function' && partidaTheBoxActiva();
    window.sonidosTheBox.musicaSegunPartida(partidaActiva && !gameOver && !win && !juegoPausado);
  }
  // Registrar solo una vez el resultado final, sin modificar la lógica del enemigo.
  if ((gameOver || (win && nivelActual >= totalNiveles)) && typeof registrarResultadoTheBox === 'function') {
    registrarResultadoTheBox();
  }
  drawGameMessages();
  
  // MOSTRAR MENSAJE DE PAUSA
  if (juegoPausado) {
    drawMenuPausa();
  }
}

// ====================== FUNCIONES DEL JUEGO ======================
// Se mueven y desvanecen las partículas que aparecen al recoger puntos, ganar o perder.
function updateParticles() {
  for (let i = collectedParticles.length - 1; i >= 0; i--) {
    let p = collectedParticles[i];
    p.x += p.speedX;
    p.y += p.speedY;
    p.alpha -= 8;
    
    if (p.color) {
      fill(red(p.color), green(p.color), blue(p.color), p.alpha);
    } else {
      fill(255, 200, 0, p.alpha);
    }
    
    noStroke();
    ellipse(p.x, p.y, p.size, p.size);
    
    if (p.alpha <= 0) {
      collectedParticles.splice(i, 1);
    }
  }
}

// Se dibuja la cuadrícula decorativa del fondo del laberinto.
function dibujarReticulaArcade() {
  push();
  stroke(23, 64, 91, 45); strokeWeight(1);
  for (let x = 0; x <= width; x += tileSize) line(x, 0, x, height);
  for (let y = 0; y <= height; y += tileSize) line(0, y, width, y);
  pop();
}

// Se muestra la cantidad de puntos recogidos respecto al total requerido del nivel.
function drawScore() {
  fill(255);
  noStroke();
  textSize(20);
  textAlign(LEFT, TOP);
  text("Puntos: " + puntosRecolectados + "/" + totalPuntosNivel, 20, 20);
  
  document.getElementById('score-display').textContent = puntosRecolectados;
}

// Se muestra el nivel actual y la barra de progreso dentro del lienzo.
function drawNivelInfo() {
  fill(200, 200, 255);
  noStroke();
  textSize(18);
  textAlign(RIGHT, TOP);
  text("Nivel: " + nivelActual + "/" + totalNiveles, width - 20, 20);
  
  // Barra de progreso del nivel
  if (totalPuntosNivel > 0) {
    let progreso = puntosRecolectados / totalPuntosNivel;
    let barWidth = 200;
    let barHeight = 8;
    let barX = width - barWidth - 20;
    let barY = 50;
    
    fill(50, 50, 50, 150);
    rect(barX, barY, barWidth, barHeight, 4);
    
    fill(50, 200, 100);
    rect(barX, barY, barWidth * progreso, barHeight, 4);
    
    fill(200, 200, 200);
    textSize(12);
    textAlign(CENTER, TOP);
    text("Progreso: " + floor(progreso * 100) + "%", barX + barWidth/2, barY + 12);
  }
}

// FUNCIÓN PARA DIBUJAR BOTÓN DE PAUSA
// Se dibuja el botón de pausa y se comprueba si el cursor está encima.
function drawBotonPausa() {
  // Actualizar estado de hover
  botonPausa.hover = (
    mouseX >= botonPausa.x && 
    mouseX <= botonPausa.x + botonPausa.width &&
    mouseY >= botonPausa.y && 
    mouseY <= botonPausa.y + botonPausa.height
  );
  
  // Fondo del botón
  if (botonPausa.hover) {
    fill(80, 80, 120, 200);
  } else {
    fill(60, 60, 90, 150);
  }
  stroke(100, 100, 150);
  strokeWeight(2);
  rect(botonPausa.x, botonPausa.y, botonPausa.width, botonPausa.height, 8);
  
  // Icono de pausa/play
  noStroke();
  if (juegoPausado) {
    // Icono de play (triángulo)
    fill(200, 255, 200);
    triangle(
      botonPausa.x + 12, botonPausa.y + 10,
      botonPausa.x + 12, botonPausa.y + 30,
      botonPausa.x + 30, botonPausa.y + 20
    );
    
    // Texto "PLAY"
    fill(200, 255, 200);
    textSize(10);
    textAlign(CENTER, TOP);
    text("PLAY", botonPausa.x + botonPausa.width/2, botonPausa.y + 32);
  } else {
    // Icono de pausa (dos barras)
    fill(255, 200, 200);
    rect(botonPausa.x + 10, botonPausa.y + 10, 6, 20, 2);
    rect(botonPausa.x + 24, botonPausa.y + 10, 6, 20, 2);
    
    // Texto "PAUSA"
    fill(255, 200, 200);
    textSize(10);
    textAlign(CENTER, TOP);
    text("PAUSA", botonPausa.x + botonPausa.width/2, botonPausa.y + 32);
  }
  
  // Tooltip al hacer hover
  if (botonPausa.hover) {
    fill(0, 0, 0, 200);
    rect(mouseX + 10, mouseY - 30, 120, 25, 5);
    
    fill(255, 255, 255);
    textSize(12);
    textAlign(LEFT, CENTER);
    if (juegoPausado) {
      text("Clic para reanudar", mouseX + 15, mouseY - 18);
    } else {
      text("Clic para pausar", mouseX + 15, mouseY - 18);
    }
  }
}

// FUNCIÓN PARA DIBUJAR MENÚ DE PAUSA
// Se muestra el mensaje de pausa y los controles cuando la partida está detenida.
function drawMenuPausa() {
  // Fondo semitransparente
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  
  // Panel de pausa
  fill(40, 40, 60, 220);
  stroke(80, 80, 120);
  strokeWeight(3);
  rect(width/2 - 150, height/2 - 120, 300, 240, 20);
  
  // Título
  fill(255, 255, 255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("PAUSA", width/2, height/2 - 80);
  
  // Información del juego
  fill(200, 200, 255);
  textSize(18);
  text("Nivel: " + nivelActual + "/" + totalNiveles, width/2, height/2 - 40);
  text("Puntos: " + puntosRecolectados + "/" + totalPuntosNivel, width/2, height/2 - 15);
  
  // Instrucciones
  fill(150, 200, 255);
  textSize(14);
  text("Presiona ESC o haz clic en PLAY", width/2, height/2 + 20);
  text("para continuar", width/2, height/2 + 40);
  
  // Controles
  fill(200, 200, 200);
  textSize(12);
  text("Controles: Flechas para mover", width/2, height/2 + 70);
  text("P o ESC para pausar/reanudar", width/2, height/2 + 90);
}

// Se comprueba si se recogieron todos los puntos; se marca el nivel como completado y se avanza al siguiente.
function checkGameState() {
  // Verificar victoria del nivel (solo si no está pausado)
  if (!juegoPausado && puntosRecolectados >= totalPuntosNivel && !win && !gameOver) {
    win = true;
    if (window.sonidosTheBox) window.sonidosTheBox.nivel();
    if (typeof transicionarJugador === 'function') transicionarJugador('NIVEL_COMPLETADO', 'Recogió todos los puntos del nivel ' + nivelActual);
    console.log("¡Nivel", nivelActual, "completado!");
    createVictoryEffect();
    
    temporizadorSiguienteNivel = setTimeout(() => {
      if (typeof partidaTheBoxActiva === 'function' && !partidaTheBoxActiva()) return;
      if (nivelActual < totalNiveles) {
        nivelActual++;
        console.log("Avanzando al nivel", nivelActual);
        iniciarNivel();
      } else {
        console.log("¡Juego completado! Todos los niveles superados");
      }
    }, 2000);
  }
}

// Se muestran los mensajes de nivel completado, victoria final o derrota.
function drawGameMessages() {
  if (juegoPausado) return; // No mostrar otros mensajes durante pausa
  
  textAlign(CENTER, CENTER);
  
  if (win) {
    fill(0, 0, 0, 180);
    rect(width/2 - 250, height/2 - 60, 500, 120, 20);
    
    fill(255, 215, 0);
    textSize(32);
    
    if (nivelActual >= totalNiveles) {
      text("¡VICTORIA FINAL!", width/2, height/2 - 20);
      fill(255, 255, 255);
      textSize(18);
      text("Completaste todos los niveles", width/2, height/2 + 15);
    } else {
      text("¡NIVEL " + nivelActual + " COMPLETADO!", width/2, height/2 - 20);
      fill(255, 255, 255);
      textSize(18);
      text("Avanzando al nivel " + (nivelActual + 1) + "...", width/2, height/2 + 15);
    }
  }
  
  if (gameOver) {
    fill(0, 0, 0, 180);
    rect(width/2 - 200, height/2 - 80, 400, 160, 20);
    
    fill(255, 50, 50);
    textSize(32);
    text("GAME OVER", width/2, height/2 - 30);
    
    fill(255, 255, 255);
    textSize(20);
    text("Nivel: " + nivelActual, width/2, height/2);
    text("Puntos: " + puntosRecolectados + "/" + totalPuntosNivel, width/2, height/2 + 25);
    
    fill(200, 200, 200);
    textSize(16);
    text("Reintenta desde el nivel 1 o vuelve al menú", width/2, height/2 + 50);
  }
}

// FUNCIÓN PARA ALTERNAR PAUSA
// Se alterna entre pausa y continuación cuando la partida lo permite.
function alternarPausa() {
  if (!gameOver && !win) {
    juegoPausado = !juegoPausado;
    console.log(juegoPausado ? "Juego pausado" : "Juego reanudado");
  }
}

// DETECCIÓN DE CLIC EN BOTÓN DE PAUSA
// Se detecta si se hizo clic en el botón de pausa del juego.
function mousePressed() {
  if (
    mouseX >= botonPausa.x && 
    mouseX <= botonPausa.x + botonPausa.width &&
    mouseY >= botonPausa.y && 
    mouseY <= botonPausa.y + botonPausa.height
  ) {
    alternarPausa();
  }
}

// DETECCIÓN DE TECLADO PARA PAUSA
// Se utilizan P o ESC para pausar sin interferir con la escritura del nombre.
function keyPressed() {
  // Si alguien está escribiendo (por ejemplo el nombre), no interceptar las teclas.
  const activo = document.activeElement;
  if (activo && (activo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(activo.tagName))) {
    return;
  }

  // Los atajos de juego solo deben funcionar durante una partida activa,
  // nunca mientras el menú principal o la pantalla de derrota estén visibles.
  if (typeof partidaTheBoxActiva !== 'function' || !partidaTheBoxActiva() || gameOver || win) {
    return;
  }

  if (key === 'p' || key === 'P' || keyCode === ESCAPE) {
    alternarPausa();
    return false;
  }
}

// Se generan las partículas que aparecen al completar un nivel.
function createVictoryEffect() {
  for (let i = 0; i < 40; i++) {
    let colorNivel;
    switch(nivelActual) {
      case 1: colorNivel = color(255, 200, 0); break;
      case 2: colorNivel = color(100, 200, 255); break;
      case 3: colorNivel = color(150, 255, 150); break;
      case 4: colorNivel = color(255, 150, 255); break;
      case 5: colorNivel = color(255, 255, 100); break;
      default: colorNivel = color(255, 200, 0);
    }
    
    collectedParticles.push({
      x: player.x + player.width/2,
      y: player.y + player.height/2,
      size: random(6, 15),
      speedX: random(-5, 5),
      speedY: random(-5, 5),
      alpha: 255,
      color: colorNivel
    });
  }
}

// Se genera el efecto de partículas al recoger un punto.
function createCollectionEffect(x, y) {
  for (let i = 0; i < 6; i++) {
    collectedParticles.push({
      x: x + 25,
      y: y + 25,
      size: random(3, 6),
      speedX: random(-2, 2),
      speedY: random(-3, -1),
      alpha: 200,
      color: color(255, 200, 0)
    });
  }
}

// Se genera un efecto visual cuando el jugador es atrapado.
function createGameOverEffect() {
  for (let i = 0; i < 20; i++) {
    collectedParticles.push({
      x: player.x + player.width/2,
      y: player.y + player.height/2,
      size: random(4, 8),
      speedX: random(-3, 3),
      speedY: random(-3, 3),
      alpha: 200,
      color: color(255, 50, 50)
    });
  }
}

// Se comprueba si dos objetos rectangulares se están tocando.
function colisionRect(a, b) {
  if (!a || !b) return false;
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// El registro interno de las transiciones de los enemigos permanece activo.
// Solo se muestra el diagrama y el historial del JUGADOR.

// FUNCIÓN PARA REGISTRAR CAMBIO DE ESTADO
// Se guardan internamente los cambios de estado de los enemigos para consulta y depuración.
function registrarCambioEstado(enemigo, estadoAnterior, estadoNuevo) {
  try {
    let condicion = obtenerCondicionTransicion(estadoAnterior, estadoNuevo);
    
    diagramaEstados.historial.unshift({
      desde: estadoAnterior,
      hacia: estadoNuevo,
      condicion: condicion,
      tiempo: frameCount
    });
    
    // Mantener máximo de items en historial
    if (diagramaEstados.historial.length > diagramaEstados.maxHistorial) {
      diagramaEstados.historial.pop();
    }
    
    console.log("Diagrama: " + estadoAnterior + " → " + estadoNuevo + " (" + condicion + ")");
    
  } catch (error) {
    console.error("Error en registrarCambioEstado:", error);
    // Continuar el juego aunque falle el diagrama
  }
}

// FUNCIÓN PARA OBTENER CONDICIÓN DE TRANSICIÓN
// Se obtiene una descripción del evento que provocó el cambio de estado del enemigo.
function obtenerCondicionTransicion(desde, hacia) {
  const transiciones = {
    "PATRULLAR-ALERTA": "Jugador entra en visión",
    "ALERTA-PATRULLAR": "Jugador desaparece",
    "ALERTA-PERSEGUIR": "Tiempo de alerta completado",
    "PERSEGUIR-REGRESAR": "Jugador escapa o muy lejos",
    "REGRESAR-PATRULLAR": "Llega a posición inicial",
    "REGRESAR-ALERTA": "Jugador reaparece"
  };
  return transiciones[`${desde}-${hacia}`] || "Cambio de estado"; // Corregido: hacia en lugar de haya
}