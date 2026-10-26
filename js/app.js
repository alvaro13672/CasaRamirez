// Casa Ramírez · demo sin backend. Los datos se guardan en localStorage (funciona sin internet).
const $ = id => document.getElementById(id);
const money = n => n.toLocaleString("es-AR", {style:"currency", currency:"ARS"});
const KEY = "casaRamirez.v1";

const inicial = {
  productos: [
    {cod:"7790001", nom:"Detergente 750 ml", rubro:"Limpieza", tipo:"unidad", precio:2100, stock:40, min:10},
    {cod:"7790002", nom:"Lavandina 1 L", rubro:"Limpieza", tipo:"unidad", precio:1200, stock:8, min:10},
    {cod:"7790003", nom:"Cuaderno tapa dura", rubro:"Librería", tipo:"unidad", precio:3500, stock:25, min:5},
    {cod:"7790004", nom:"Lapicera azul", rubro:"Librería", tipo:"unidad", precio:600, stock:100, min:20},
    {cod:"7790005", nom:"Martillo 500 g", rubro:"Ferretería", tipo:"unidad", precio:9800, stock:6, min:2},
    {cod:"C001", nom:"Cable unipolar 2,5 mm", rubro:"Ferretería", tipo:"metro", precio:850, stock:120, min:30},
    {cod:"C002", nom:"Cinta de embalar", rubro:"Librería", tipo:"metro", precio:90, stock:300, min:50},
    {cod:"T001", nom:"Tornillo 6x40 suelto", rubro:"Ferretería", tipo:"kg", precio:5200, stock:12.5, min:3}
  ],
  clientes: [{id:1, nom:"Consumidor final", saldo:0}, {id:2, nom:"Doña Elba", saldo:0}, {id:3, nom:"Taller Medina", saldo:0}],
  ventas: [], nro: 1
};

let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || structuredClone(inicial); }
catch { db = structuredClone(inicial); }
const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };

let carrito = [];   // {cod, cant}
let seleccion = -1;

function aviso(txt) {
  const a = $("aviso"); a.textContent = txt; a.classList.add("ver");
  setTimeout(() => a.classList.remove("ver"), 2500);
}
const buscarProd = txt => {
  const t = txt.trim().toLowerCase();
  return db.productos.find(p => p.cod.toLowerCase() === t) ||
         db.productos.find(p => p.nom.toLowerCase().includes(t));
};

function pintarCarrito() {
  $("carrito").innerHTML = carrito.map((l, i) => {
    const p = db.productos.find(x => x.cod === l.cod);
    const paso = p.tipo === "unidad" ? 1 : 0.01;
    return `<tr data-i="${i}" class="${i === seleccion ? "sel" : ""}">
      <td>${p.cod}</td><td>${p.nom}</td>
      <td><input type="number" min="${paso}" step="${paso}" value="${l.cant}" data-i="${i}" aria-label="Cantidad de ${p.nom}"></td>
      <td>${p.tipo}</td><td>${money(p.precio)}</td><td>${money(p.precio * l.cant)}</td></tr>`;
  }).join("");
  const total = carrito.reduce((s, l) => s + l.cant * db.productos.find(x => x.cod === l.cod).precio, 0);
  $("total").textContent = money(total);
  return total;
}

function agregar() {
  const p = buscarProd($("buscar").value);
  const cant = parseFloat($("cant").value);
  if (!p) return aviso("No encontramos ese producto. Revisá el nombre o el código.");
  if (!(cant > 0) || (p.tipo === "unidad" && !Number.isInteger(cant)))
    return aviso(p.tipo === "unidad" ? "Este producto se vende por unidad entera." : "Ingresá una cantidad mayor a 0.");
  const l = carrito.find(x => x.cod === p.cod);
  l ? l.cant = +(l.cant + cant).toFixed(2) : carrito.push({cod: p.cod, cant});
  $("buscar").value = ""; $("cant").value = 1; $("buscar").focus();
  pintarCarrito();
}

function vender() {
  if (!carrito.length) return aviso("Agregá al menos un producto para vender.");
  for (const l of carrito) {
    const p = db.productos.find(x => x.cod === l.cod);
    if (l.cant > p.stock) return aviso(`Stock insuficiente de ${p.nom}: quedan ${p.stock}.`);
  }
  const total = pintarCarrito();
  const medio = $("medio").value, cli = +$("cliente").value;
  if (medio === "Fiado" && cli === 1) return aviso("Elegí un cliente para registrar el fiado.");
  carrito.forEach(l => { db.productos.find(x => x.cod === l.cod).stock = +(db.productos.find(x => x.cod === l.cod).stock - l.cant).toFixed(2); });
  if (medio === "Fiado") db.clientes.find(c => c.id === cli).saldo += total;
  db.ventas.push({nro: db.nro, fecha: new Date().toISOString(), medio, total, cliente: cli, items: carrito});
  aviso(`Venta N° ${db.nro} registrada: ${money(total)}`);
  db.nro++; carrito = []; seleccion = -1;
  guardar(); pintarCarrito(); nuevaVenta(); pintarTodo();
}

function nuevaVenta() {
  $("nroVenta").textContent = "Venta N° " + String(db.nro).padStart(3, "0");
  $("fecha").textContent = new Date().toLocaleString("es-AR");
}

const hoy = () => db.ventas.filter(v => v.fecha.slice(0, 10) === new Date().toISOString().slice(0, 10));

function pintarTodo() {
  $("tbInv").innerHTML = db.productos.map(p =>
    `<tr><td>${p.cod}</td><td>${p.nom}</td><td>${p.rubro}</td><td>${p.tipo}</td><td>${money(p.precio)}</td>
     <td class="${p.stock <= p.min ? "bajo" : ""}">${p.stock}${p.stock <= p.min ? " · stock bajo" : ""}</td></tr>`).join("");
  $("tbCli").innerHTML = db.clientes.filter(c => c.id !== 1).map(c =>
    `<tr><td>${c.nom}</td><td>${money(c.saldo)}</td>
     <td><button class="sec" data-cobrar="${c.id}" ${c.saldo ? "" : "disabled"}>Registrar cobro total</button></td></tr>`).join("");
  $("cliente").innerHTML = db.clientes.map(c => `<option value="${c.id}">${c.nom}</option>`).join("");
  $("lista").innerHTML = db.productos.map(p => `<option value="${p.nom}">${p.cod}</option>`).join("");
  const v = hoy(), tot = v.reduce((s, x) => s + x.total, 0);
  $("resumen").innerHTML = `<div>Ventas de hoy<b>${v.length}</b></div><div>Total vendido<b>${money(tot)}</b></div>
    <div>Productos con stock bajo<b>${db.productos.filter(p => p.stock <= p.min).length}</b></div>
    <div>Deuda de clientes<b>${money(db.clientes.reduce((s, c) => s + c.saldo, 0))}</b></div>`;
  const porMedio = {}; v.forEach(x => porMedio[x.medio] = (porMedio[x.medio] || 0) + x.total);
  $("cierreDatos").innerHTML = Object.keys(porMedio).length
    ? Object.entries(porMedio).map(([m, t]) => `<div>${m}<b>${money(t)}</b></div>`).join("") + `<div>Total del día<b>${money(tot)}</b></div>`
    : "<p>Todavía no hay ventas hoy.</p>";
}

$("menu").addEventListener("click", e => {
  const v = e.target.dataset.view; if (!v) return;
  document.querySelectorAll(".vista").forEach(s => s.hidden = s.id !== v);
  document.querySelectorAll("#menu button").forEach(b => b.classList.toggle("activo", b === e.target));
});
$("agregar").onclick = agregar;
$("buscar").addEventListener("keydown", e => { if (e.key === "Enter") agregar(); });
$("quitar").onclick = () => { carrito.splice(seleccion >= 0 ? seleccion : carrito.length - 1, 1); seleccion = -1; pintarCarrito(); };
$("limpiar").onclick = () => { carrito = []; seleccion = -1; pintarCarrito(); };
$("vender").onclick = vender;
$("medio").onchange = () => $("lblCliente").hidden = $("medio").value !== "Fiado";
$("carrito").addEventListener("click", e => { const tr = e.target.closest("tr"); if (tr) { seleccion = +tr.dataset.i; pintarCarrito(); } });
$("carrito").addEventListener("change", e => {
  if (e.target.matches("input")) { const v = parseFloat(e.target.value); if (v > 0) carrito[+e.target.dataset.i].cant = v; pintarCarrito(); }
});
$("tbCli").addEventListener("click", e => {
  const id = +e.target.dataset.cobrar; if (!id) return;
  db.clientes.find(c => c.id === id).saldo = 0; guardar(); pintarTodo(); aviso("Cobro registrado.");
});
const conexion = () => $("estado").textContent = navigator.onLine ? "En línea" : "Sin internet · se guarda en este equipo";
addEventListener("online", conexion); addEventListener("offline", conexion);

conexion(); nuevaVenta(); pintarCarrito(); pintarTodo();
