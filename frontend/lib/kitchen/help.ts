// Regla de los textos (Julieth, 2026-10-19): máximo dos frases cortas; el ejemplo, solo si hace falta.
// Ayuda del botón "?" al lado de cada campo (Field help / Eyebrow help).
// Todos los textos aquí para cambiarlos sin buscar por los formularios.

export const HELP = {
  // Receta y lote
  recipeName: "Cómo le dices a esta masa. Ej.: «Masa de chips».",
  recipeYield:
    "Los gramos de masa terminada que salen de una tanda. Ej.: 1.800.",
  recipeItems: "Lo que lleva una tanda, en gramos, mililitros o unidades. Si falta un ingrediente, créalo aquí.",
  recipeColor: "Solo para reconocer la masa de un vistazo en tus listas.",
  lotRecipe: "La masa que vas a preparar y guardar para los próximos días.",
  lotBatches: "Veces que haces la receta: 1, 2 o 0,5 (la mitad).",
  lotDays: "Cuántos días dura en la nevera. Se usa primero la que vence antes.",

  // Producto
  productName: "Como lo llamas. Si lo haces en dos pesos, son dos productos.",
  productMode: "Por lote: preparas masa antes y la vas usando. Sobre pedido: la haces el mismo día.",
  productRecipe: "La masa con que se hace. Si no existe, créala aquí.",
  productGrams: "Cuánto pesa cada unidad antes de hornear. Ej.: 20 g.",
  productExtras: "Lo que lleva además de la masa: rellenos, chips, capacillos. Opcional.",
  productLook: "El dibujo que sale en tus listas: galletas, panes o platos. Solo es para reconocerlo.",

  // Lo que se vende
  saleKind: "Caja: siempre lo mismo. Por unidad: el cliente elige sabores. Por tamaño: tortas y postres.",
  saleName: "El nombre con el que lo ofreces a tus clientes. Ej.: «Caja de 9 galletas».",
  salePrice: "Lo que le cobras al cliente, con el empaque incluido.",
  saleItems: "Lo que va dentro (caja) o los sabores que se pueden escoger.",
  salePack: "En qué lo entregas. Se descuenta al producir.",
  saleSizes: "Cada tamaño con porciones, molde, precio, gramos de masa (opcional) y empaque.",

  // Insumos y proveedores
  supplyName: "Como lo compras. Ej.: «Harina de trigo».",
  supplyCategory: "Ingrediente: va en recetas. Empaque: cajas, bolsas o bases, por unidad.",
  supplyKind: "Como lo compras y lo usas: peso, volumen o unidad (como los huevos).",
  supplyStock: "Lo que hay en tu cocina sin contar esta compra. Lo comprado se suma solo.",
  supplyMin: "Cuando te quede menos de esto, Destello te avisa para que compres.",
  supplySupplier: "A quién se lo compras normalmente. Opcional.",
  supplyPaid: "Lo que pagaste en la última compra. Con eso sale el costo.",
  supplyPaidQty: "Cuánto trajo la compra. Ej.: $12.000 por 3 kg, escribe 3.",
  supplierName: "El nombre del negocio o de la persona que te vende.",
  supplierContact: "Con quién hablas para hacer el pedido. Opcional.",
  supplierPhone: "Para llamarle o escribirle por WhatsApp desde Destello.",
  supplierEmail: "Opcional.",
  supplierAddress: "Dónde queda, si vas a recoger. Opcional.",
  supplierSells: "Lo que le compras. Si no existe, créalo aquí.",
  supplierNotes: "Lo que quieras recordar: días de entrega, pedido mínimo, descuentos.",
  supplierColor: "Solo para reconocer la tarjeta del proveedor.",
  purchaseSupplier: "A quién le compraste.",
  purchaseDate: "El día de la compra.",
  purchaseExpires: "La fecha del empaque. Se usa primero lo que vence antes y te avisa 2 días antes.",
  supplyPerishable: "Para lo que se daña, como mantequilla o huevos: cada compra pide la fecha y se usa primero lo que vence antes.",
  supplyInitialExpires: "La fecha que trae el empaque de lo que tienes ahora. Destello te avisa 2 días antes.",
  purchaseLines: "Cada insumo con su cantidad y lo que pagaste en total.",

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
  businessCutoff: "Lo que llegue después pasa al siguiente día que abras.",
  businessMargin: "La ganancia que buscas sobre el precio. Con ella se sugieren precios.",
  businessClosed: "Días sin producir ni entregar. Los pedidos pasan al siguiente día abierto.",
  brebKey: "La que inscribiste en tu banco: celular, correo, cédula o código.",
  brebBank: "El banco o billetera de la llave. Opcional.",
  accountBank: "El banco de la cuenta. Ej.: Bancolombia.",
  accountType: "Ahorros o corriente.",
  accountNumber: "El número de la cuenta, sin espacios.",
  accountOwner: "A nombre de quién está la cuenta o la llave.",
  courierName: "Igual que en tu WhatsApp, para reconocerlo.",
  courierPhone: "El número de WhatsApp del repartidor.",

  supplyQuickPrice: "Lo que te costó la última vez. Las compras lo van ajustando.",

  staffTeam: "Cada uno entra con su enlace y su PIN, desde cualquier navegador. Si ves un aparato que no reconoces, desconéctalo y cambia el enlace.",
  staffName: "Como le dicen en el restaurante. Así sale en sus mesas.",
  staffKitchen: "Un nombre para reconocer la tablet. Ej.: «Cocina» o «Barra».",

  businessTables: "Sí: se encienden las mesas y los meseros. Pedidos, domicilios y recetas los tienen todos.",

  tables: "Los meseros las ven en su celular para abrirlas y enviar comandas. Las abiertas salen en verde.",
  tableName: "Como la llaman en el salón. Ej.: «Terraza 2» o «Barra».",

  kitchenNormal: "Lo que suele tardar un plato. Pasado este tiempo, la comanda se marca en la cocina y al mesero.",
  kitchenMax: "Pasado este tiempo, Destello le sugiere al mesero acercarse a la mesa y avisar la demora.",

  // Lo que explica cómo funciona cada sección: va en el "?" junto al título (PageHead help), no en el subtítulo.
  pageOrders: "Te llegan por WhatsApp; aquí los anotas hasta entregarlos.",
  pageProduction: "Sale de los pedidos hasta la hora de corte. Primero se usa la masa de los lotes.",
  pageProducts: "Producto: lo que horneas, con sus gramos. Se vende en caja, por unidad o por tamaño, y el precio incluye el empaque.",
  pageRecipes: "Cada receta rinde una tanda en gramos. Las galletas van por lote; rollos y panes, sobre pedido.",
  pageSupplies: "Se mide por peso, volumen o unidad. El costo es el promedio de lo que has pagado.",
  pagePurchases: "Cada compra sube lo que tienes del insumo y actualiza su costo promedio.",
  pageSubscription: "Pagas con Wompi: tarjeta, PSE, Nequi o Bancolombia.",
  pageSetup: "Todo lo que pongas aquí lo puedes cambiar después en Configuración.",
  pageAccounts: "Cuenta bancaria o llave Bre-B: celular, correo, cédula o el código del banco.",
  businessTax: "Va incluido en tus precios; Destello calcula tu ganancia sin él. Si no sabes cuál te toca, pregúntale a tu contador.",
  pageCashier: "Ves las mesas abiertas y cobras cualquiera. Un mesero también puede ser encargado de caja, en Tu equipo.",
  staffCashier: "Cobra cualquier mesa, no solo las suyas. Úsalo para quien maneja la caja.",
  tableTip: "Es voluntaria: pregúntale al cliente si la incluye. Si dice que no, quítala.",
  ticketStuck: "Si la cocina olvidó tocar Listo, marca que ya salió y se cobra. Si no se hizo, anúlala: no se cobra.",
  ticketCancelReason: "Queda guardado con quién la anuló. La dueña lo revisa en Caja.",
  cancelledTickets: "Lo anulado no se cobró ni se descontó del inventario. Revisa cada una y fíjate si alguien anula mucho.",
  reportFrom: "El primer día que entra en el Excel.",
  reportTo: "El último día que entra. Máximo un año a la vez.",
  cashOpening: "El efectivo con el que empiezas para dar vueltas. Puede ser 0.",
  cashMove: "Efectivo que no es una venta: lo que trae el repartidor de los domicilios, o un pago a un proveedor.",
  cashReceipt: "Tómale foto a la factura o al recibo. Queda guardada para que la dueña la vea.",
  cashCount: "Cuenta los billetes y las monedas del cajón, base incluida. No verás cuánto debería haber hasta contar.",
  cashShifts: "Cada turno con su base, lo que debía haber y lo contado. Revisa los que no cuadraron.",
  tablePay: "Si pagan entre varios o de dos formas, divide el pago. Por transferencia, muéstrale las llaves del negocio.",
} as const
