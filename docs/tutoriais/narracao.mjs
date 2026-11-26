// Lista o texto que a VOZ GRAVADA fala em cada passo dos tutoriais (o mesmo textoGravado() de assets/tutoriais.js) e o nome do MP3.
// Uso: node docs/tutoriais/narracao.mjs [--falta]   → JSON em /tmp/narr.json; --falta = só os que não estão em assets/tutoriais/narracao.js
import fs from "fs";
const src = fs.readFileSync("assets/tutoriais.js", "utf8");
const TUT = eval("[" + src.match(/var TUT = \[([\s\S]*?)\n  \];/)[1] + "]");
const LIGA = eval(src.match(/var LIGA = (\[[^\]]*\]);/)[1]);
const bloco = src.slice(src.indexOf("/*NARRA-INI*/"), src.indexOf("/*NARRA-FIM*/"));
const f = new Function("LIGA", bloco + "; return {textoGravado, h8};")(LIGA);
let feitos = {};
try { const m = fs.readFileSync("assets/tutoriais/narracao.js", "utf8"); feitos = JSON.parse(m.slice(m.indexOf("{"), m.lastIndexOf("}") + 1)); } catch (e) {}
const out = [];
for (const t of TUT) t.passos.forEach((p, i) => { const txt = f.textoGravado(t, i), h = f.h8(txt), chave = t.id + "-" + i;
  if (process.argv.includes("--falta") && feitos[chave] === h) return;
  out.push({chave, h, nome: chave + "-" + h + ".mp3", txt}); });
fs.writeFileSync("/tmp/narr.json", JSON.stringify(out, null, 1));
console.log(out.length, "passos,", out.reduce((a, o) => a + o.txt.length, 0), "caracteres");
