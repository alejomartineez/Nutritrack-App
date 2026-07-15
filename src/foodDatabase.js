// ---------------------------------------------------------------------------
// BASE LOCAL DE ALIMENTOS COMUNES
//
// ~200 alimentos con porciones habituales y macros por porción (no por 100g),
// pensados para registro rápido sin tipear. Valores redondeados y verificados
// para que kcal ≈ proteína×4 + carbohidratos×4 + grasa×9 (las bebidas con
// alcohol son la excepción: el alcohol aporta 7 kcal/g fuera de los macros).
// ---------------------------------------------------------------------------

export const FOOD_DB = [
  // ----- Frutas -----
  { id: 'db1', name: 'Manzana (1 mediana)', kcal: 95, p: 0.5, c: 25, f: 0.3 },
  { id: 'db2', name: 'Banana (1 mediana)', kcal: 105, p: 1.3, c: 27, f: 0.4 },
  { id: 'db3', name: 'Naranja (1 mediana)', kcal: 62, p: 1.2, c: 15, f: 0.2 },
  { id: 'db4', name: 'Mandarina (1 unidad)', kcal: 47, p: 0.7, c: 12, f: 0.3 },
  { id: 'db5', name: 'Pera (1 mediana)', kcal: 100, p: 0.6, c: 27, f: 0.2 },
  { id: 'db6', name: 'Durazno (1 unidad)', kcal: 60, p: 1.4, c: 14, f: 0.4 },
  { id: 'db7', name: 'Kiwi (1 unidad)', kcal: 42, p: 0.8, c: 10, f: 0.4 },
  { id: 'db8', name: 'Frutillas (1 taza, 150g)', kcal: 48, p: 1, c: 11.5, f: 0.5 },
  { id: 'db9', name: 'Uvas (1 taza, 150g)', kcal: 104, p: 1, c: 27, f: 0.2 },
  { id: 'db10', name: 'Sandía (1 taza, 150g)', kcal: 46, p: 0.9, c: 11.5, f: 0.2 },
  { id: 'db11', name: 'Melón (1 taza, 160g)', kcal: 54, p: 1.3, c: 13, f: 0.3 },
  { id: 'db12', name: 'Ananá (1 taza, 165g)', kcal: 82, p: 0.9, c: 22, f: 0.2 },
  { id: 'db13', name: 'Mango (1/2 unidad, 100g)', kcal: 60, p: 0.8, c: 15, f: 0.4 },
  { id: 'db14', name: 'Palta (1/2 unidad, 100g)', kcal: 160, p: 2, c: 8.5, f: 15 },
  { id: 'db15', name: 'Ciruela (1 unidad)', kcal: 30, p: 0.5, c: 8, f: 0.2 },
  { id: 'db16', name: 'Cerezas (1 taza, 140g)', kcal: 87, p: 1.5, c: 22, f: 0.3 },
  { id: 'db17', name: 'Arándanos (1/2 taza, 75g)', kcal: 42, p: 0.5, c: 11, f: 0.2 },
  { id: 'db18', name: 'Pomelo (1/2 unidad)', kcal: 52, p: 1, c: 13, f: 0.2 },
  { id: 'db19', name: 'Higos (2 unidades)', kcal: 74, p: 0.8, c: 19, f: 0.3 },
  { id: 'db20', name: 'Ensalada de frutas (1 taza)', kcal: 90, p: 1, c: 22, f: 0.3 },

  // ----- Verduras -----
  { id: 'db21', name: 'Ensalada verde mixta (1 plato)', kcal: 25, p: 2, c: 4, f: 0.3 },
  { id: 'db22', name: 'Tomate (1 mediano)', kcal: 22, p: 1.1, c: 4.8, f: 0.2 },
  { id: 'db23', name: 'Lechuga (2 tazas)', kcal: 10, p: 1, c: 2, f: 0.2 },
  { id: 'db24', name: 'Zanahoria (1 mediana)', kcal: 25, p: 0.6, c: 6, f: 0.1 },
  { id: 'db25', name: 'Papa hervida (1 mediana, 150g)', kcal: 130, p: 3, c: 30, f: 0.2 },
  { id: 'db26', name: 'Papa al horno (1 mediana, 150g)', kcal: 145, p: 3, c: 33, f: 0.2 },
  { id: 'db27', name: 'Batata hervida (1 mediana, 150g)', kcal: 130, p: 2.4, c: 30, f: 0.2 },
  { id: 'db28', name: 'Puré de papa (1 taza)', kcal: 210, p: 4, c: 35, f: 6 },
  { id: 'db29', name: 'Puré de calabaza (1 taza)', kcal: 80, p: 2, c: 18, f: 0.5 },
  { id: 'db30', name: 'Brócoli al vapor (1 taza)', kcal: 55, p: 4, c: 11, f: 0.5 },
  { id: 'db31', name: 'Coliflor (1 taza)', kcal: 29, p: 2, c: 5, f: 0.3 },
  { id: 'db32', name: 'Espinaca cocida (1 taza)', kcal: 41, p: 5, c: 7, f: 0.5 },
  { id: 'db33', name: 'Acelga cocida (1 taza)', kcal: 35, p: 3, c: 7, f: 0.2 },
  { id: 'db34', name: 'Zapallito salteado (1 taza)', kcal: 40, p: 2, c: 6, f: 1.5 },
  { id: 'db35', name: 'Berenjena asada (1 taza)', kcal: 35, p: 1, c: 8.5, f: 0.2 },
  { id: 'db36', name: 'Morrón (1 unidad)', kcal: 30, p: 1, c: 7, f: 0.3 },
  { id: 'db37', name: 'Cebolla (1 mediana)', kcal: 44, p: 1.2, c: 10, f: 0.1 },
  { id: 'db38', name: 'Choclo (1 unidad)', kcal: 100, p: 3.5, c: 22, f: 1.5 },
  { id: 'db39', name: 'Champiñones salteados (1 taza)', kcal: 44, p: 3.5, c: 6.5, f: 1 },
  { id: 'db40', name: 'Pepino (1 unidad)', kcal: 30, p: 1.5, c: 7, f: 0.2 },
  { id: 'db41', name: 'Remolacha hervida (1 taza)', kcal: 60, p: 2.2, c: 13, f: 0.2 },

  // ----- Carnes y aves -----
  { id: 'db42', name: 'Pechuga de pollo grillada (150g)', kcal: 240, p: 45, c: 0, f: 6 },
  { id: 'db43', name: 'Muslo de pollo sin piel (150g)', kcal: 260, p: 40, c: 0, f: 11 },
  { id: 'db44', name: 'Pollo al horno con piel (150g)', kcal: 330, p: 38, c: 0, f: 19 },
  { id: 'db45', name: 'Milanesa de pollo al horno (1 unidad)', kcal: 320, p: 30, c: 18, f: 14 },
  { id: 'db46', name: 'Bife de cuadril magro (150g)', kcal: 270, p: 40, c: 0, f: 12 },
  { id: 'db47', name: 'Carne picada magra cocida (100g)', kcal: 215, p: 26, c: 0, f: 12 },
  { id: 'db48', name: 'Milanesa de carne al horno (1 unidad)', kcal: 350, p: 30, c: 20, f: 16 },
  { id: 'db49', name: 'Asado de tira (150g)', kcal: 400, p: 32, c: 0, f: 30 },
  { id: 'db50', name: 'Vacío (150g)', kcal: 340, p: 36, c: 0, f: 21 },
  { id: 'db51', name: 'Matambre a la pizza (150g)', kcal: 420, p: 35, c: 6, f: 28 },
  { id: 'db52', name: 'Bondiola de cerdo (150g)', kcal: 350, p: 32, c: 0, f: 24 },
  { id: 'db53', name: 'Lomo de cerdo magro (150g)', kcal: 240, p: 36, c: 0, f: 10 },
  { id: 'db54', name: 'Hamburguesa casera de carne (120g)', kcal: 280, p: 26, c: 2, f: 18 },
  { id: 'db55', name: 'Carré de cerdo (150g)', kcal: 250, p: 37, c: 0, f: 11 },

  // ----- Pescados y mariscos -----
  { id: 'db56', name: 'Merluza al horno (150g)', kcal: 130, p: 27, c: 0, f: 2 },
  { id: 'db57', name: 'Salmón a la plancha (150g)', kcal: 310, p: 33, c: 0, f: 19 },
  { id: 'db58', name: 'Atún al natural (1 lata, 120g)', kcal: 130, p: 29, c: 0, f: 1 },
  { id: 'db59', name: 'Atún en aceite escurrido (1 lata)', kcal: 190, p: 27, c: 0, f: 9 },
  { id: 'db60', name: 'Caballa en lata (100g)', kcal: 190, p: 24, c: 0, f: 10 },
  { id: 'db61', name: 'Camarones (100g)', kcal: 100, p: 21, c: 1, f: 1 },
  { id: 'db62', name: 'Filet de pescado empanado al horno (150g)', kcal: 290, p: 22, c: 22, f: 12 },

  // ----- Huevos y lácteos -----
  { id: 'db63', name: 'Huevo entero (1 unidad)', kcal: 72, p: 6.3, c: 0.4, f: 4.8 },
  { id: 'db64', name: 'Huevo frito (1 unidad)', kcal: 95, p: 6.3, c: 0.4, f: 7.5 },
  { id: 'db65', name: 'Claras de huevo (2 unidades)', kcal: 34, p: 7.2, c: 0.5, f: 0.1 },
  { id: 'db66', name: 'Huevos revueltos (2 unidades)', kcal: 150, p: 13, c: 1, f: 10 },
  { id: 'db67', name: 'Omelette de 2 huevos con queso', kcal: 260, p: 18, c: 2, f: 20 },
  { id: 'db68', name: 'Leche descremada (1 taza, 250ml)', kcal: 85, p: 8.5, c: 12, f: 0.5 },
  { id: 'db69', name: 'Leche entera (1 taza, 250ml)', kcal: 150, p: 8, c: 12, f: 8 },
  { id: 'db70', name: 'Yogur descremado (1 pote, 190g)', kcal: 90, p: 9, c: 12, f: 1 },
  { id: 'db71', name: 'Yogur griego natural (1 pote, 150g)', kcal: 140, p: 12, c: 6, f: 7.5 },
  { id: 'db72', name: 'Yogur bebible entero (1 vaso, 200ml)', kcal: 150, p: 6, c: 22, f: 4 },
  { id: 'db73', name: 'Yogur con frutas y granola (1 bowl)', kcal: 250, p: 12, c: 38, f: 6 },
  { id: 'db74', name: 'Queso port salut light (30g)', kcal: 70, p: 8, c: 1, f: 4 },
  { id: 'db75', name: 'Queso cremoso (30g)', kcal: 100, p: 6, c: 1, f: 8 },
  { id: 'db76', name: 'Queso rallado (1 cda, 10g)', kcal: 40, p: 3.5, c: 0.3, f: 2.8 },
  { id: 'db77', name: 'Queso untable light (2 cdas, 30g)', kcal: 50, p: 3, c: 2, f: 3.5 },
  { id: 'db78', name: 'Ricota descremada (100g)', kcal: 130, p: 11, c: 4, f: 8 },
  { id: 'db79', name: 'Mozzarella (30g)', kcal: 85, p: 6.5, c: 1, f: 6.3 },

  // ----- Cereales, granos y pastas -----
  { id: 'db80', name: 'Arroz blanco cocido (1 taza, 160g)', kcal: 205, p: 4.2, c: 45, f: 0.4 },
  { id: 'db81', name: 'Arroz integral cocido (1 taza, 160g)', kcal: 215, p: 5, c: 45, f: 1.7 },
  { id: 'db82', name: 'Fideos cocidos (1 plato, 200g)', kcal: 310, p: 11, c: 62, f: 1.8 },
  { id: 'db83', name: 'Fideos integrales cocidos (1 plato, 200g)', kcal: 290, p: 12, c: 56, f: 2.2 },
  { id: 'db84', name: 'Ñoquis de papa (1 plato, 250g)', kcal: 370, p: 9, c: 78, f: 2.5 },
  { id: 'db85', name: 'Polenta cocida (1 taza)', kcal: 145, p: 3, c: 31, f: 0.6 },
  { id: 'db86', name: 'Quinoa cocida (1 taza, 185g)', kcal: 220, p: 8, c: 39, f: 3.6 },
  { id: 'db87', name: 'Avena arrollada (1/2 taza, 40g)', kcal: 150, p: 5.5, c: 27, f: 2.6 },
  { id: 'db88', name: 'Granola (1/4 taza, 30g)', kcal: 135, p: 3, c: 18, f: 6 },
  { id: 'db89', name: 'Cuscús cocido (1 taza)', kcal: 175, p: 6, c: 36, f: 0.3 },
  { id: 'db90', name: 'Trigo burgol cocido (1 taza)', kcal: 155, p: 5.5, c: 33, f: 0.4 },
  { id: 'db91', name: 'Copos de maíz (1 taza, 30g)', kcal: 110, p: 2, c: 25, f: 0.3 },

  // ----- Legumbres y proteína vegetal -----
  { id: 'db92', name: 'Lentejas cocidas (1 taza, 200g)', kcal: 230, p: 18, c: 40, f: 0.8 },
  { id: 'db93', name: 'Garbanzos cocidos (1 taza, 165g)', kcal: 270, p: 14.5, c: 45, f: 4.2 },
  { id: 'db94', name: 'Porotos negros cocidos (1 taza)', kcal: 225, p: 15, c: 40, f: 0.9 },
  { id: 'db95', name: 'Arvejas (1 taza)', kcal: 125, p: 8, c: 21, f: 0.6 },
  { id: 'db96', name: 'Hummus (2 cdas, 30g)', kcal: 70, p: 2, c: 6, f: 4.3 },
  { id: 'db97', name: 'Guiso de lentejas (1 plato)', kcal: 380, p: 20, c: 55, f: 9 },
  { id: 'db98', name: 'Tofu firme (100g)', kcal: 145, p: 15, c: 3, f: 8.7 },
  { id: 'db99', name: 'Soja texturizada hidratada (1 taza)', kcal: 160, p: 24, c: 12, f: 1 },
  { id: 'db100', name: 'Milanesa de soja (1 unidad)', kcal: 180, p: 10, c: 20, f: 7 },

  // ----- Panificados -----
  { id: 'db101', name: 'Pan francés (1 mignon, 50g)', kcal: 145, p: 4.5, c: 28, f: 1.2 },
  { id: 'db102', name: 'Pan integral (2 rebanadas, 60g)', kcal: 150, p: 7, c: 26, f: 2.4 },
  { id: 'db103', name: 'Pan lactal blanco (2 rebanadas)', kcal: 160, p: 5, c: 29, f: 2.5 },
  { id: 'db104', name: 'Galletas de arroz (2 unidades)', kcal: 70, p: 1.5, c: 15, f: 0.4 },
  { id: 'db105', name: 'Medialuna (1 unidad)', kcal: 190, p: 3.5, c: 23, f: 9.5 },
  { id: 'db106', name: 'Factura con dulce (1 unidad)', kcal: 250, p: 4, c: 32, f: 11.5 },
  { id: 'db107', name: 'Tortilla rapidita (1 unidad)', kcal: 140, p: 4, c: 23, f: 3.5 },
  { id: 'db108', name: 'Pan árabe (1 unidad)', kcal: 165, p: 5.5, c: 33, f: 1 },
  { id: 'db109', name: 'Bizcochitos de grasa (3 unidades)', kcal: 200, p: 3, c: 21, f: 11.5 },
  { id: 'db110', name: 'Vainillas (3 unidades)', kcal: 105, p: 2, c: 21, f: 1.3 },
  { id: 'db111', name: 'Galletitas de agua (5 unidades)', kcal: 130, p: 3, c: 21, f: 3.7 },
  { id: 'db112', name: 'Galletitas dulces simples (3 unidades)', kcal: 140, p: 2, c: 20, f: 5.7 },
  { id: 'db113', name: 'Chipá (3 unidades chicas)', kcal: 210, p: 6, c: 24, f: 10 },
  { id: 'db114', name: 'Tostada con manteca (1 unidad)', kcal: 110, p: 2, c: 14, f: 5 },
  { id: 'db115', name: 'Tostada con palta (1 unidad)', kcal: 160, p: 3.5, c: 16, f: 9.5 },
  { id: 'db116', name: 'Tostada con queso y mermelada (1 unidad)', kcal: 140, p: 5, c: 20, f: 4.5 },
  { id: 'db117', name: 'Panqueque simple (1 unidad)', kcal: 90, p: 3, c: 11, f: 3.7 },
  { id: 'db118', name: 'Waffle (1 unidad)', kcal: 200, p: 5, c: 25, f: 9 },

  // ----- Comidas preparadas -----
  { id: 'db119', name: 'Empanada de carne (1 unidad)', kcal: 150, p: 6.5, c: 15, f: 7 },
  { id: 'db120', name: 'Empanada de jamón y queso (1 unidad)', kcal: 160, p: 6, c: 16, f: 8 },
  { id: 'db121', name: 'Pizza muzzarella (1 porción)', kcal: 280, p: 11, c: 30, f: 13 },
  { id: 'db122', name: 'Pizza napolitana (1 porción)', kcal: 290, p: 12, c: 31, f: 13 },
  { id: 'db123', name: 'Tarta de verdura (1 porción)', kcal: 280, p: 10, c: 26, f: 15 },
  { id: 'db124', name: 'Tarta de jamón y queso (1 porción)', kcal: 330, p: 13, c: 27, f: 19 },
  { id: 'db125', name: 'Canelones de verdura (2 unidades)', kcal: 380, p: 16, c: 40, f: 17 },
  { id: 'db126', name: 'Ravioles con tuco (1 plato)', kcal: 450, p: 16, c: 70, f: 11.5 },
  { id: 'db127', name: 'Lasaña (1 porción)', kcal: 480, p: 24, c: 42, f: 24 },
  { id: 'db128', name: 'Ñoquis con crema (1 plato)', kcal: 520, p: 11, c: 80, f: 17 },
  { id: 'db129', name: 'Guiso de arroz con pollo (1 plato)', kcal: 420, p: 25, c: 55, f: 11 },
  { id: 'db130', name: 'Choripán (1 unidad)', kcal: 500, p: 20, c: 38, f: 30 },
  { id: 'db131', name: 'Hamburguesa completa con pan (1 unidad)', kcal: 550, p: 28, c: 45, f: 28 },
  { id: 'db132', name: 'Papas fritas (porción mediana, 150g)', kcal: 470, p: 5, c: 55, f: 25 },
  { id: 'db133', name: 'Tortilla de papa (1 porción)', kcal: 320, p: 9, c: 30, f: 18.5 },
  { id: 'db134', name: 'Pastel de papa (1 porción)', kcal: 420, p: 25, c: 32, f: 21 },
  { id: 'db135', name: 'Milanesa napolitana con puré (1 plato)', kcal: 650, p: 40, c: 45, f: 33 },
  { id: 'db136', name: 'Sopa de verduras (1 plato)', kcal: 90, p: 3, c: 15, f: 2 },
  { id: 'db137', name: 'Ensalada César con pollo (1 plato)', kcal: 380, p: 28, c: 15, f: 23 },
  { id: 'db138', name: 'Ensalada de atún completa (1 plato)', kcal: 320, p: 28, c: 18, f: 15 },
  { id: 'db139', name: 'Wok de verduras y pollo (1 plato)', kcal: 350, p: 30, c: 25, f: 14 },
  { id: 'db140', name: 'Sushi (8 piezas variadas)', kcal: 350, p: 14, c: 55, f: 8 },
  { id: 'db141', name: 'Burrito de carne (1 unidad)', kcal: 320, p: 16, c: 32, f: 14 },
  { id: 'db142', name: 'Wrap de pollo y vegetales (1 unidad)', kcal: 350, p: 26, c: 34, f: 12 },
  { id: 'db143', name: 'Sándwich de jamón y queso (1 unidad)', kcal: 300, p: 16, c: 30, f: 12.5 },
  { id: 'db144', name: 'Tostado de jamón y queso (1 unidad)', kcal: 350, p: 18, c: 34, f: 15 },
  { id: 'db145', name: 'Sándwich de milanesa (1/2 unidad)', kcal: 450, p: 25, c: 45, f: 18 },
  { id: 'db146', name: 'Arroz con leche (1 porción)', kcal: 220, p: 7, c: 38, f: 4.5 },

  // ----- Fiambres y embutidos -----
  { id: 'db147', name: 'Jamón cocido (2 fetas, 40g)', kcal: 45, p: 7, c: 1, f: 1.5 },
  { id: 'db148', name: 'Salame (5 rodajas, 30g)', kcal: 125, p: 7, c: 0.5, f: 10.5 },
  { id: 'db149', name: 'Salchichas de viena (2 unidades)', kcal: 180, p: 7, c: 2, f: 16 },
  { id: 'db150', name: 'Pechuga de pavo (2 fetas, 40g)', kcal: 40, p: 7.5, c: 1, f: 0.7 },

  // ----- Snacks y frutos secos -----
  { id: 'db151', name: 'Almendras (un puñado, 25g)', kcal: 145, p: 5.3, c: 5.4, f: 12.5 },
  { id: 'db152', name: 'Nueces (un puñado, 25g)', kcal: 165, p: 3.8, c: 3.4, f: 16.3 },
  { id: 'db153', name: 'Maní tostado (un puñado, 30g)', kcal: 170, p: 7.7, c: 4.8, f: 14 },
  { id: 'db154', name: 'Mix de frutos secos (30g)', kcal: 165, p: 5, c: 6, f: 14 },
  { id: 'db155', name: 'Pasas de uva (2 cdas, 30g)', kcal: 90, p: 0.9, c: 24, f: 0.1 },
  { id: 'db156', name: 'Pasta de maní (1 cda, 16g)', kcal: 95, p: 4, c: 3.2, f: 8.2 },
  { id: 'db157', name: 'Barrita de cereal (1 unidad)', kcal: 100, p: 1.5, c: 19, f: 2.5 },
  { id: 'db158', name: 'Barrita proteica (1 unidad)', kcal: 180, p: 15, c: 18, f: 6 },
  { id: 'db159', name: 'Papas fritas de paquete (30g)', kcal: 160, p: 2, c: 15, f: 10 },
  { id: 'db160', name: 'Palitos salados (30g)', kcal: 115, p: 3, c: 23, f: 1.3 },
  { id: 'db161', name: 'Pochoclo casero (2 tazas)', kcal: 90, p: 3, c: 18, f: 1 },

  // ----- Dulces y postres -----
  { id: 'db162', name: 'Chocolate con leche (4 cuadraditos, 25g)', kcal: 135, p: 2, c: 14.5, f: 7.7 },
  { id: 'db163', name: 'Chocolate amargo 70% (4 cuadraditos, 25g)', kcal: 150, p: 2.5, c: 11, f: 10.7 },
  { id: 'db164', name: 'Alfajor de chocolate (1 unidad)', kcal: 250, p: 3.5, c: 35, f: 10.5 },
  { id: 'db165', name: 'Alfajor de maicena (1 unidad)', kcal: 220, p: 3, c: 32, f: 9 },
  { id: 'db166', name: 'Helado (1 bocha, 80g)', kcal: 160, p: 3, c: 20, f: 7.5 },
  { id: 'db167', name: 'Flan casero (1 porción)', kcal: 220, p: 7, c: 33, f: 7 },
  { id: 'db168', name: 'Gelatina light (1 porción)', kcal: 10, p: 2, c: 0.5, f: 0 },
  { id: 'db169', name: 'Dulce de leche (1 cda, 20g)', kcal: 60, p: 1.4, c: 11, f: 1.2 },
  { id: 'db170', name: 'Mermelada (1 cda, 20g)', kcal: 50, p: 0.1, c: 13, f: 0 },
  { id: 'db171', name: 'Mermelada light (1 cda, 20g)', kcal: 25, p: 0.1, c: 6, f: 0 },
  { id: 'db172', name: 'Miel (1 cda, 21g)', kcal: 64, p: 0.1, c: 17, f: 0 },
  { id: 'db173', name: 'Azúcar (1 cdita, 5g)', kcal: 20, p: 0, c: 5, f: 0 },
  { id: 'db174', name: 'Turrón de maní (1 unidad)', kcal: 120, p: 3, c: 14, f: 5.7 },
  { id: 'db175', name: 'Galletitas rellenas de chocolate (3 unidades)', kcal: 160, p: 1.5, c: 24, f: 6.7 },
  { id: 'db176', name: 'Queso y dulce (postre vigilante, 1 porción)', kcal: 280, p: 9, c: 38, f: 10.5 },

  // ----- Bebidas -----
  { id: 'db177', name: 'Café con leche descremada (1 taza)', kcal: 45, p: 4, c: 6, f: 0.3 },
  { id: 'db178', name: 'Café solo o té (sin azúcar)', kcal: 2, p: 0.1, c: 0.3, f: 0 },
  { id: 'db179', name: 'Mate (sin azúcar)', kcal: 5, p: 0.5, c: 1, f: 0 },
  { id: 'db180', name: 'Mate cocido con leche (1 taza)', kcal: 80, p: 4, c: 10, f: 2.5 },
  { id: 'db181', name: 'Jugo de naranja exprimido (1 vaso, 250ml)', kcal: 110, p: 1.8, c: 26, f: 0.5 },
  { id: 'db182', name: 'Gaseosa común (1 vaso, 250ml)', kcal: 105, p: 0, c: 26, f: 0 },
  { id: 'db183', name: 'Gaseosa light/zero (1 vaso)', kcal: 2, p: 0, c: 0.3, f: 0 },
  { id: 'db184', name: 'Cerveza (1 lata, 473ml)', kcal: 205, p: 2, c: 17, f: 0 },
  { id: 'db185', name: 'Vino tinto (1 copa, 150ml)', kcal: 125, p: 0.1, c: 4, f: 0 },
  { id: 'db186', name: 'Fernet con cola (1 vaso)', kcal: 220, p: 0, c: 30, f: 0 },
  { id: 'db187', name: 'Licuado de banana con leche (1 vaso)', kcal: 180, p: 7, c: 32, f: 3 },
  { id: 'db188', name: 'Agua saborizada (1 vaso, 250ml)', kcal: 45, p: 0, c: 11, f: 0 },
  { id: 'db189', name: 'Bebida isotónica (1 vaso, 250ml)', kcal: 60, p: 0, c: 15, f: 0 },
  { id: 'db190', name: 'Batido de proteína (1 scoop en agua)', kcal: 120, p: 24, c: 3, f: 1.5 },
  { id: 'db191', name: 'Smoothie de frutas (1 vaso)', kcal: 150, p: 2, c: 35, f: 1 },

  // ----- Aderezos y grasas -----
  { id: 'db192', name: 'Aceite de oliva (1 cda, 15ml)', kcal: 120, p: 0, c: 0, f: 13.5 },
  { id: 'db193', name: 'Manteca (1 cdita, 10g)', kcal: 72, p: 0.1, c: 0, f: 8 },
  { id: 'db194', name: 'Mayonesa (1 cda, 15g)', kcal: 100, p: 0.2, c: 0.5, f: 11 },
  { id: 'db195', name: 'Mayonesa light (1 cda, 15g)', kcal: 35, p: 0.1, c: 1.5, f: 3.3 },
  { id: 'db196', name: 'Crema de leche (2 cdas, 30ml)', kcal: 100, p: 0.6, c: 1, f: 10.5 },
  { id: 'db197', name: 'Salsa de tomate (1/2 taza)', kcal: 40, p: 1.5, c: 8, f: 0.5 },
  { id: 'db198', name: 'Queso crema entero (2 cdas, 30g)', kcal: 100, p: 2, c: 1.5, f: 9.5 },
  { id: 'db199', name: 'Salsa blanca (1/2 taza)', kcal: 180, p: 5, c: 12, f: 12 },
  { id: 'db200', name: 'Ketchup (1 cda, 17g)', kcal: 20, p: 0.2, c: 4.5, f: 0 },
];

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Búsqueda por subcadenas: todas las palabras de la consulta deben aparecer en el nombre (sin importar tildes ni mayúsculas). */
export const searchFoods = (query, limit = 8) => {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const words = q.split(/\s+/);
  const results = [];
  for (const food of FOOD_DB) {
    const name = normalize(food.name);
    if (words.every((w) => name.includes(w))) {
      results.push(food);
      if (results.length >= limit) break;
    }
  }
  return results;
};
