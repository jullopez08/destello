// Ayuda del botón "?" al lado de cada campo (Field help / Eyebrow help).
// Todos los textos aquí para cambiarlos sin buscar por los formularios.

export const HELP = {
  // Receta y lote
  recipeName: "Cómo le dices a esta masa en tu cocina. Ej.: «Masa de chips de chocolate». La usan los productos que se hacen con ella.",
  recipeYield:
    "Cuántos gramos de masa salen al preparar la receta una vez con estos ingredientes. Pesa la masa terminada (no los ingredientes sueltos). Ej.: si con 1 kg de harina, mantequilla y azúcar te salen 1.800 g de masa, escribe 1800. Con eso Destello calcula cuántas tandas necesitas y cuánto cuesta cada gramo.",
  recipeItems: "Lo que lleva la receta completa una vez (una tanda), con su cantidad en gramos, mililitros o unidades. Si un ingrediente no está, créalo aquí mismo.",
  recipeColor: "Solo para reconocer la masa de un vistazo en tus listas.",
  lotRecipe: "La masa que vas a preparar y guardar para los próximos días.",
  lotBatches: "Cuántas veces haces la receta completa. 1 = una vez; 2 = el doble; 0,5 = la mitad.",
  lotDays: "Cuántos días se conserva la masa en la nevera. Destello usa primero la masa que vence antes y te avisa en Recetas cuando está por vencer.",

  // Producto
  productName: "Lo que horneas, tal como lo llamas. Si una galleta se hace en dos pesos (pequeña y rellena), son dos productos.",
  productMode: "Con lote de masa: preparas masa por adelantado y la vas usando. Solo sobre pedido: preparas la masa el mismo día, solo con lo que te pidieron.",
  productRecipe: "La receta de masa con la que se hace. Si no existe todavía, escríbela y créala desde aquí.",
  productGrams: "Cuánta masa pesa cada unidad antes de hornear. Ej.: 20 g para una galleta pequeña. Con esto sale cuánta masa preparar y el costo.",
  productExtras: "Lo que se le pone a cada unidad además de la masa: rellenos, chips, capacillos. Opcional.",
  productLook: "El dibujo de galleta que sale en tus listas. Solo es para reconocerlo.",

  // Lo que se vende
  saleKind: "Caja armada: siempre trae lo mismo. Por unidad: el cliente elige sabores y paga cada una. Sabor y tamaño: tortas y postres por tamaño.",
  saleName: "El nombre con el que lo ofreces a tus clientes. Ej.: «Caja de 9 galletas».",
  salePrice: "Lo que le cobras al cliente, con el empaque incluido.",
  saleItems: "Los productos que van dentro (caja) o los sabores que el cliente puede escoger.",
  salePack: "La caja, bolsa o base en que lo entregas. Se descuenta de tus insumos al producir.",
  saleSizes: "Cada tamaño con sus porciones, molde, precio, gramos de masa (si no lo sabes, déjalo vacío) y empaque.",

  // Insumos y proveedores
  supplyName: "El nombre del ingrediente o empaque, como lo compras. Ej.: «Harina de trigo».",
  supplyCategory: "Ingrediente: va en las recetas. Empaque: cajas, bolsas, bases o stickers; siempre se cuentan por unidad.",
  supplyKind: "Por peso (g / kg), por volumen (ml / L) o por unidad, como los huevos: como lo compras y lo usas en la receta.",
  supplyStock: "Cuánto tienes hoy en tu cocina. Si no tienes nada, déjalo en 0.",
  supplyMin: "Cuando te quede menos de esto, Destello te avisa para que compres.",
  supplySupplier: "A quién se lo compras normalmente. Opcional.",
  supplyPaid: "Lo que pagaste por la última compra de este insumo. Con eso Destello saca el costo por gramo o por unidad.",
  supplyPaidQty: "Cuánto trajo esa compra. Ej.: si pagaste $12.000 por 3 kg, escribe 3.",
  supplierName: "El nombre del negocio o de la persona que te vende.",
  supplierContact: "Con quién hablas para hacer el pedido. Opcional.",
  supplierPhone: "Para llamarle o escribirle por WhatsApp desde Destello.",
  supplierEmail: "Opcional.",
  supplierAddress: "Dónde queda, si vas a recoger. Opcional.",
  supplierSells: "Los insumos que le compras. Si uno no existe, escríbelo y créalo aquí mismo.",
  supplierNotes: "Lo que quieras recordar: días de entrega, pedido mínimo, descuentos.",
  supplierColor: "Solo para reconocer la tarjeta del proveedor.",
  purchaseSupplier: "A quién le compraste.",
  purchaseDate: "El día de la compra.",
  purchaseLines: "Cada insumo con la cantidad y lo que pagaste en total por él. Destello suma a lo que tienes y actualiza el costo.",

  // Pedidos
  orderCustomer: "El nombre de quien pide, para reconocer el pedido.",
  orderPhone: "El WhatsApp del cliente, para escribirle o llamarle. Opcional.",
  orderLines: "Lo que pidió: cada cosa con su cantidad, sabor y tamaño si aplica.",
  orderDelivery: "Domicilio: lo lleva un repartidor. Recoge en cocina: el cliente pasa por él.",
  orderPayment: "Cómo te va a pagar el cliente.",
  orderAddress: "A dónde se lleva el pedido.",
  orderFee: "Lo que le cobras por el domicilio. Se suma al total del pedido.",

  // Ediciones especiales
  editionName: "El nombre de la temporada o fecha especial. Ej.: «Día de la madre».",
  editionDescription: "Qué trae y por qué es especial. Opcional.",
  editionDates: "Entre estas fechas se puede vender lo de la edición.",
  editionSells: "Lo que solo se vende durante esta edición.",

  // Configuración
  businessName: "El nombre de tu negocio. Sale arriba en tu panel.",
  businessWhatsapp: "El número de WhatsApp donde tus clientes te hacen los pedidos.",
  businessCutoff: "Hasta esta hora recibes pedidos para producir hoy. Lo que llegue después pasa al siguiente día que abras.",
  businessMargin: "Qué parte del precio quieres que te quede de ganancia. Destello lo usa para sugerirte precios. Ej.: 50 %.",
  businessClosed: "Los días que no produces ni entregas. Los pedidos se pasan al siguiente día abierto.",
  brebKey: "La llave que inscribiste en tu banco para recibir transferencias: tu celular, correo, cédula o el código que te dio el banco.",
  brebBank: "El banco o billetera de la llave. Opcional.",
  accountBank: "El banco de la cuenta. Ej.: Bancolombia.",
  accountType: "Ahorros o corriente.",
  accountNumber: "El número de la cuenta, sin espacios.",
  accountOwner: "A nombre de quién está la cuenta o la llave.",
  courierName: "Escríbelo igual a como lo tienes guardado en tu WhatsApp, para que lo reconozcas cuando le escribas.",
  courierPhone: "El número de WhatsApp del repartidor.",
} as const
