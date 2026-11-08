// ============================================================
// plataforma.js - THE BOX
// Este archivo crea el mapa de cada nivel y distribuye los puntos y enemigos
// en posiciones válidas, dejando espacio para el jugador.
// ============================================================

// Se define el tamaño del laberinto y se genera el mapa según la dificultad.
function Plataforma(puntosRequeridos = 10, enemigosRequeridos = 1) {
  this.filas = 12;
  this.columnas = 20;
  
  // GENERAR MAPA DINÁMICAMENTE SEGÚN LA DIFICULTAD
  this.platform = this.generarMapa(puntosRequeridos, enemigosRequeridos);
}

// Se crea el mapa base y se colocan puntos y enemigos en casillas libres.
Plataforma.prototype.generarMapa = function(puntosRequeridos, enemigosRequeridos) {
  // Mapa base
  let mapa = [
    ['*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*'],
    ['*',' ',' ',' ',' ',' ',' ',' ',' ','*',' ',' ',' ',' ',' ',' ',' ',' ',' ','*'],
    ['*',' ','*','*',' ','*','*',' ',' ','*',' ',' ','*','*',' ','*','*',' ',' ','*'],
    ['*',' ','*',' ',' ',' ',' ',' ',' ',' ',' ','*',' ',' ',' ','*',' ',' ',' ','*'],
    ['*',' ','*',' ','*','*',' ','*','*','*',' ','*',' ','*','*','*',' ','*',' ','*'],
    ['*',' ',' ',' ',' ',' ',' ',' ',' ','*',' ',' ',' ',' ',' ',' ',' ','*',' ','*'],
    ['*',' ','*','*','*',' ','*','*',' ','*',' ','*','*','*',' ','*','*','*',' ','*'],
    ['*',' ',' ',' ',' ',' ',' ','*',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ','*'],
    ['*',' ','*','*',' ','*','*','*','*','*','*','*','*',' ','*','*',' ','*',' ','*'],
    ['*',' ',' ',' ',' ',' ',' ',' ',' ','*',' ',' ',' ',' ',' ',' ',' ',' ',' ','*'],
    ['*',' ',' ',' ',' ',' ',' ','p',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ','*'],
    ['*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*','*']
  ];

  // AGREGAR PUNTOS ALEATORIAMENTE (MÍNIMO 10)
  let puntosAgregados = 0;
  let intentos = 0;
  let maxIntentos = 1000;
  
  while (puntosAgregados < puntosRequeridos && intentos < maxIntentos) {
    let fila = floor(random(1, this.filas - 1));
    let columna = floor(random(1, this.columnas - 1));
    
    if (mapa[fila][columna] === ' ') {
      mapa[fila][columna] = 'o';
      puntosAgregados++;
    }
    intentos++;
  }
  
  console.log("Puntos colocados:", puntosAgregados + "/" + puntosRequeridos);

  // AGREGAR ENEMIGOS ALEATORIAMENTE
  let enemigosAgregados = 0;
  intentos = 0;
  
  while (enemigosAgregados < enemigosRequeridos && intentos < maxIntentos) {
    let fila = floor(random(1, this.filas - 1));
    let columna = floor(random(1, this.columnas - 1));
    
    // Verificar que esté lejos del jugador y sea espacio vacío
    if (mapa[fila][columna] === ' ' && 
        !this.estaCercaDelJugador(fila, columna, mapa)) {
      mapa[fila][columna] = 'e';
      enemigosAgregados++;
    }
    intentos++;
  }
  
  console.log("Enemigos colocados:", enemigosAgregados + "/" + enemigosRequeridos);
  
  return mapa;
};

// Se evita colocar enemigos demasiado cerca de la posición inicial del jugador.
Plataforma.prototype.estaCercaDelJugador = function(fila, columna, mapa) {
  // Buscar posición del jugador
  for (let i = 0; i < this.filas; i++) {
    for (let j = 0; j < this.columnas; j++) {
      if (mapa[i][j] === 'p') {
        // Calcular distancia Manhattan
        let distancia = abs(i - fila) + abs(j - columna);
        return distancia < 4; // Mínimo 4 casillas de distancia
      }
    }
  }
  return false;
};