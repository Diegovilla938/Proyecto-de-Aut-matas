// ============================================================
// muro.js - THE BOX
// Este archivo dibuja los muros del laberinto, que también se utilizan para las colisiones.
// ============================================================

// Se crea un muro con su posición y dimensiones.
function Roca(x, y) {
  this.x = x;
  this.y = y;
  this.width = 50;
  this.height = 50;

  // Se dibujan los muros azules con borde turquesa y una textura sencilla.
  this.show = function() {
    // Paredes azul pizarra con contornos turquesa
    fill(39, 72, 105);
    stroke(47, 161, 187);
    strokeWeight(2);
    
    // Rectángulo con bordes redondeados
    rect(this.x, this.y, this.width, this.height, 5);
    
    // Textura simple
    stroke(31, 109, 145);
    strokeWeight(1);
    line(this.x + 15, this.y + 10, this.x + 15, this.y + 40);
    line(this.x + 10, this.y + 25, this.x + 40, this.y + 25);
    
    noStroke();
  };
}