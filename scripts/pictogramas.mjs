// Descarga los pictogramas de ARASAAC para el tablero «Quiero decir».
// Uso:   npm run pictogramas      (necesita internet; se corre una sola vez y se suben las imágenes)
// Busca cada palabra de src/lib/comunicacion.json en ARASAAC, guarda la imagen en public/pictogramas/
// y anota qué pictograma se eligió en scripts/pictogramas-elegidos.json.
// Si alguna palabra no se encuentra o no te gusta el dibujo, pon su número en scripts/pictogramas-ids.json
// (por ejemplo {"agua": 2248}; el número sale de la dirección de arasaac.org/pictograms/es/NUMERO) y corre de nuevo.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("src/lib/comunicacion.json", "utf8"));
const overrides = existsSync("scripts/pictogramas-ids.json")
  ? JSON.parse(readFileSync("scripts/pictogramas-ids.json", "utf8"))
  : {};
mkdirSync("public/pictogramas", { recursive: true });

const chosen = {};
const missing = [];
for (const cat of data.categories) {
  for (const it of cat.items) {
    try {
      let id = overrides[it.key];
      if (!id) {
        const r = await fetch(`https://api.arasaac.org/v1/pictograms/es/bestsearch/${encodeURIComponent(it.query)}`);
        if (!r.ok) throw new Error(`búsqueda ${r.status}`);
        const list = await r.json();
        id = list?.[0]?._id;
      }
      if (!id) throw new Error("sin resultados");
      const img = await fetch(`https://static.arasaac.org/pictograms/${id}/${id}_300.png`);
      if (!img.ok) throw new Error(`imagen ${img.status}`);
      writeFileSync(`public/pictogramas/${it.key}.png`, Buffer.from(await img.arrayBuffer()));
      chosen[it.key] = id;
      console.log(`✓ ${it.label.padEnd(12)} → ${id}`);
    } catch (e) {
      missing.push(it.key);
      console.log(`✗ ${it.label.padEnd(12)} (${e.message}) — se mostrará el emoji`);
    }
  }
}
writeFileSync("scripts/pictogramas-elegidos.json", JSON.stringify(chosen, null, 2) + "\n");
console.log(`\n${Object.keys(chosen).length} pictogramas descargados, ${missing.length} sin imagen.`);
if (missing.length) console.log(`Sin imagen: ${missing.join(", ")}`);
