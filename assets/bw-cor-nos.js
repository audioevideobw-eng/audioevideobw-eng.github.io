/* COR AVANÇADA — nós de cor ligados, no jeito dos programas de colorista (23/11/2026, pedido do dono).
   Cada NÓ faz UMA coisa (entrada LOG, balanço de branco, contraste/pivô, rodas, curvas, saturação, nitidez, LUT) e a imagem passa
   pelos nós na ordem das ligações, de ENTRADA até SAÍDA. Tudo é feito NESTE APARELHO, na placa de vídeo (WebGL):
   nenhuma imagem, LUT ou ajuste sai daqui. As LUTs que a pessoa importa (.cube) ficam só no IndexedDB do aparelho (regra 178).
   Dados no take: c.nos = { nos: [{id, tipo, x, y, p:{…}, k:0–100, off}], lig: [[de, para]…] } — "in" e "out" são as pontas fixas.
   Sem WebGL a cor avançada não é aplicada (a tela avisa); a COR simples do editor continua valendo. */
(function () {
  "use strict";
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function uid() { return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }

  /* ───────── perfis LOG (fórmulas publicadas pelos fabricantes; a COR da gama é aproximada — a LUT oficial da marca dá a cor exata) ───────── */
  var LOGS = [
    ["slog3", "Sony S-Log3", 1.25], ["logc3", "ARRI LogC3", 1.3], ["vlog", "Panasonic V-Log", 1.3], ["clog3", "Canon Log 3", 1.15], ["clog", "Canon Log (C-Log)", 1.1],
    ["flog", "Fujifilm F-Log", 1.25], ["apple", "Apple Log (iPhone)", 1.3], ["dlog", "DJI D-Log", 1.25], ["generico", "Outro perfil flat (D-Log M, N-Log, HLG… aproximado)", 1.15]
  ];

  /* ───────── tipos de nó: [chave, rótulo, mínimo, máximo, padrão] ───────── */
  var TIPOS = {
    log: {nome: "Entrada LOG", ic: "🎞", cor: "#8E7CFF", dica: "Converte o vídeo LOG (cinza, sem contraste) para Rec.709. Ponha como PRIMEIRO nó.",
      p: {perfil: "slog3", expo: 0, cor: 100, altas: 50}, campos: [["expo", "Exposição (antes da conversão)", -100, 100, 0], ["altas", "Guardar as altas luzes", 0, 100, 50], ["cor", "Cor da gama da câmera", 0, 200, 100]]},
    wb: {nome: "Balanço de branco", ic: "⚪", cor: "#5FD4FF", dica: "Toque em 🎯 e depois em algo que deveria ser BRANCO ou cinza na imagem.",
      p: {temp: 0, matiz: 0, gr: 1, gg: 1, gb: 1}, campos: [["temp", "Temperatura (frio ↔ quente)", -100, 100, 0], ["matiz", "Matiz (verde ↔ magenta)", -100, 100, 0]]},
    cont: {nome: "Exposição e contraste", ic: "◐", cor: "#FFD166", dica: "O pivô é o ponto de luz que fica parado enquanto o contraste abre.",
      p: {expo: 0, cont: 0, pivo: 43}, campos: [["expo", "Exposição", -100, 100, 0], ["cont", "Contraste", -100, 100, 0], ["pivo", "Pivô", 10, 90, 43]]},
    prim: {nome: "Rodas primárias", ic: "◎", cor: "#FF8A5B", dica: "Lift = sombras · Gamma = meios-tons · Gain = altas luzes · Offset = a imagem toda. Arraste o ponto para dar cor; a barra é a luz. Dois toques zera.",
      p: {lift: [0, 0, 0], gamma: [0, 0, 0], gain: [0, 0, 0], off: [0, 0, 0]}, rodas: [["lift", "LIFT"], ["gamma", "GAMMA"], ["gain", "GAIN"], ["off", "OFFSET"]]},
    logw: {nome: "Rodas Log", ic: "◍", cor: "#FF6FB5", dica: "Mais separadas e suaves que as primárias: cada roda pega só a sua faixa de luz.",
      p: {sombra: [0, 0, 0], meio: [0, 0, 0], alta: [0, 0, 0], baixo: 33, alto: 66}, rodas: [["sombra", "SOMBRAS"], ["meio", "MEIOS"], ["alta", "ALTAS"]], campos: [["baixo", "Onde acabam as sombras", 10, 50, 33], ["alto", "Onde começam as altas", 50, 90, 66]]},
    curv: {nome: "Curvas", ic: "〰", cor: "#7CF0B0", dica: "Toque na linha para criar um ponto e arraste. Dois toques no ponto apaga.",
      p: {y: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]]}},
    sat: {nome: "Saturação", ic: "🎨", cor: "#C77DFF", dica: "Vibração mexe mais nas cores apagadas e protege a pele.",
      p: {sat: 0, vib: 0, tom: 0}, campos: [["sat", "Saturação", -100, 100, 0], ["vib", "Vibração", -100, 100, 0], ["tom", "Girar as cores (matiz)", -180, 180, 0]]},
    nit: {nome: "Nitidez", ic: "◈", cor: "#B8C4D6", dica: "Para a direita deixa mais nítido; para a esquerda suaviza.",
      p: {forca: 30, raio: 1}, campos: [["forca", "Força", -100, 100, 30], ["raio", "Raio (px)", 1, 6, 1]]},
    lut: {nome: "LUT", ic: "▦", cor: "#F2B200", dica: "Tabela de cor pronta (.cube). Use as suas ou as LUTs oficiais da câmera.",
      p: {lut: "", nome: ""}}
  };
  function novo(tipo, x, y) { var t = TIPOS[tipo]; return {id: uid(), tipo: tipo, x: x || 0, y: y || 0, p: copia(t.p), k: 100}; }
  function vazio() { return {nos: [], lig: [["in", "out"]]}; }

  /* ordem da imagem: segue as ligações de ENTRADA até SAÍDA (uma entrada e uma saída por nó) */
  function cadeia(g) {
    if (!g || !g.nos) return []; var prox = {}; (g.lig || []).forEach(function (l) { prox[l[0]] = l[1]; });
    var mapa = {}; g.nos.forEach(function (n) { mapa[n.id] = n; }); var out = [], at = prox["in"], visto = {};
    while (at && at !== "out" && mapa[at] && !visto[at]) { visto[at] = 1; out.push(mapa[at]); at = prox[at]; }
    return at === "out" ? out : [];
  }
  function fechada(g) { if (!g || !g.nos) return false; var prox = {}; (g.lig || []).forEach(function (l) { prox[l[0]] = l[1]; }); var at = prox["in"], n = 0; while (at && at !== "out" && n++ < 99) at = prox[at]; return at === "out"; }
  function neutro(n) {
    var p = n.p || {}, z = function (a) { return !a || (!a[0] && !a[1] && !a[2]); }, reta = function (c) { return !c || (c.length === 2 && c[0][0] === 0 && c[0][1] === 0 && c[1][0] === 1 && c[1][1] === 1); };
    if (n.off || n.k === 0) return true;
    switch (n.tipo) {
      case "log": return false;
      case "wb": return !p.temp && !p.matiz && Math.abs((p.gr || 1) - 1) < 0.002 && Math.abs((p.gg || 1) - 1) < 0.002 && Math.abs((p.gb || 1) - 1) < 0.002;
      case "cont": return !p.expo && !p.cont;
      case "prim": return z(p.lift) && z(p.gamma) && z(p.gain) && z(p.off);
      case "logw": return z(p.sombra) && z(p.meio) && z(p.alta);
      case "curv": return reta(p.y) && reta(p.r) && reta(p.g) && reta(p.b);
      case "sat": return !p.sat && !p.vib && !p.tom;
      case "nit": return !p.forca;
      case "lut": return !p.lut || !LUTS[p.lut];
    }
    return true;
  }
  function ativo(g) { return cadeia(g).some(function (n) { return !neutro(n); }); }

  /* roda de cor: [x, y, luz] (−1…1) → cor somada em R, G, B */
  function rodaRGB(a, f) { a = a || [0, 0, 0]; var x = a[0], y = a[1], m = Math.sqrt(x * x + y * y), an = Math.atan2(-y, x); if (m < 0.004) return [0, 0, 0]; return [Math.cos(an) * m * f, Math.cos(an - 2.0943951) * m * f, Math.cos(an + 2.0943951) * m * f]; }

  /* curva suave que não "volta" (monótona): pontos [[x,y]…] → 256 valores */
  function curva256(pts) {
    pts = (pts || [[0, 0], [1, 1]]).slice().sort(function (a, b) { return a[0] - b[0]; }); var n = pts.length, o = new Float32Array(256), i;
    if (n < 2) { for (i = 0; i < 256; i++) o[i] = i / 255; return o; }
    var d = [], m = []; for (i = 0; i < n - 1; i++) d[i] = (pts[i + 1][1] - pts[i][1]) / Math.max(1e-6, pts[i + 1][0] - pts[i][0]);
    m[0] = d[0]; m[n - 1] = d[n - 2]; for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; } else { var a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { var t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } } }
    for (i = 0; i < 256; i++) { var x = i / 255, k = 0; if (x <= pts[0][0]) { o[i] = pts[0][1]; continue; } if (x >= pts[n - 1][0]) { o[i] = pts[n - 1][1]; continue; }
      while (k < n - 2 && x > pts[k + 1][0]) k++; var h = pts[k + 1][0] - pts[k][0], u = (x - pts[k][0]) / h, u2 = u * u, u3 = u2 * u;
      o[i] = lim((2 * u3 - 3 * u2 + 1) * pts[k][1] + (u3 - 2 * u2 + u) * h * m[k] + (-2 * u3 + 3 * u2) * pts[k + 1][1] + (u3 - u2) * h * m[k + 1], 0, 1); }
    return o;
  }
  function curvaTex(p) { var y = curva256(p.y), r = curva256(p.r), g = curva256(p.g), b = curva256(p.b), o = new Uint8Array(1024), em = function (c, v) { return c[Math.round(lim(v, 0, 1) * 255)]; };
    for (var i = 0; i < 256; i++) { var v = y[i]; o[i * 4] = Math.round(em(r, v) * 255); o[i * 4 + 1] = Math.round(em(g, v) * 255); o[i * 4 + 2] = Math.round(em(b, v) * 255); o[i * 4 + 3] = 255; } return o; }

  /* ───────── LUTs (.cube) — só no aparelho ───────── */
  var LUTS = {}, LUTLISTA = null, BD = null;
  function bd() { if (BD) return BD; BD = new Promise(function (ok, no) { try { var r = indexedDB.open("bw_luts", 1); r.onupgradeneeded = function () { r.result.createObjectStore("luts", {keyPath: "id"}); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; } catch (e) { no(e); } }); return BD; }
  function tx(modo, fn) { return bd().then(function (d) { return new Promise(function (ok, no) { var t = d.transaction("luts", modo), s = t.objectStore("luts"), r = fn(s); t.oncomplete = function () { ok(r && r.result); }; t.onerror = function () { no(t.error); }; }); }); }
  function lutsCarregar() { if (LUTLISTA) return Promise.resolve(LUTLISTA); return tx("readonly", function (s) { return s.getAll(); }).then(function (l) { LUTLISTA = (l || []).map(function (x) { LUTS[x.id] = {id: x.id, nome: x.nome, n: x.n, dados: new Uint8Array(x.dados), v: 1}; return LUTS[x.id]; }); try { window.dispatchEvent(new Event("bw-cor-lut")); } catch (e) {} return LUTLISTA; }).catch(function () { LUTLISTA = []; return LUTLISTA; }); }
  function lutGuardar(nome, n, dados) { var id = "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), o = {id: id, nome: String(nome || "LUT").slice(0, 60), n: n, dados: dados, v: 1}; LUTS[id] = o; (LUTLISTA = LUTLISTA || []).push(o);
    return tx("readwrite", function (s) { return s.put({id: id, nome: o.nome, n: n, dados: dados.buffer}); }).then(function () { return o; }, function () { return o; }); }
  function lutApagar(id) { delete LUTS[id]; LUTLISTA = (LUTLISTA || []).filter(function (x) { return x.id !== id; }); return tx("readwrite", function (s) { return s.delete(id); }).catch(function () {}); }
  /* .cube → faixa RGBA de N·N × N (x = r + b·N, y = g). Só LUT 3D; domínio diferente de 0–1 é trazido para 0–1. */
  function lerCube(txt) {
    var linhas = String(txt).split(/\r?\n/), n = 0, mn = [0, 0, 0], mx = [1, 1, 1], v = [], um = false, i, l;
    for (i = 0; i < linhas.length; i++) { l = linhas[i].trim(); if (!l || l[0] === "#") continue;
      if (/^TITLE/i.test(l)) continue; if (/^LUT_1D_SIZE/i.test(l)) { um = true; continue; }
      if (/^LUT_3D_SIZE/i.test(l)) { n = parseInt(l.split(/\s+/)[1], 10) || 0; continue; }
      if (/^DOMAIN_MIN/i.test(l)) { mn = l.split(/\s+/).slice(1, 4).map(Number); continue; } if (/^DOMAIN_MAX/i.test(l)) { mx = l.split(/\s+/).slice(1, 4).map(Number); continue; }
      if (/^[A-Z_]+/i.test(l) && !/^[-+.\d]/.test(l)) continue;
      var q = l.split(/\s+/); if (q.length >= 3) v.push(+q[0], +q[1], +q[2]); }
    if (um && !n) throw new Error("LUT 1D: aqui entram só LUTs 3D (.cube com LUT_3D_SIZE).");
    if (n < 2 || n > 65) throw new Error("Não achei o tamanho da LUT (LUT_3D_SIZE de 2 a 65).");
    if (v.length < n * n * n * 3) throw new Error("O arquivo está incompleto: faltam valores da tabela.");
    var d = new Uint8Array(n * n * n * 4), k = 0, r, g, b;
    for (b = 0; b < n; b++) for (g = 0; g < n; g++) for (r = 0; r < n; r++) { var o = (g * n * n + b * n + r) * 4; for (i = 0; i < 3; i++) { var x = v[k++]; d[o + i] = Math.round(lim((x - mn[i]) / Math.max(1e-6, mx[i] - mn[i]), 0, 1) * 255); } d[o + 3] = 255; }
    return {n: n, dados: d};
  }
  function identidade(n) { var d = new Uint8Array(n * n * n * 4); for (var b = 0; b < n; b++) for (var g = 0; g < n; g++) for (var r = 0; r < n; r++) { var o = (g * n * n + b * n + r) * 4; d[o] = Math.round(r / (n - 1) * 255); d[o + 1] = Math.round(g / (n - 1) * 255); d[o + 2] = Math.round(b / (n - 1) * 255); d[o + 3] = 255; } return d; }
  function escreverCube(nome, n, d) { var s = ['TITLE "' + String(nome).replace(/"/g, "") + '"', "# Criada na Brightway (COR AVANCADA)", "LUT_3D_SIZE " + n, "DOMAIN_MIN 0.0 0.0 0.0", "DOMAIN_MAX 1.0 1.0 1.0", ""];
    for (var b = 0; b < n; b++) for (var g = 0; g < n; g++) for (var r = 0; r < n; r++) { var o = (g * n * n + b * n + r) * 4; s.push((d[o] / 255).toFixed(6) + " " + (d[o + 1] / 255).toFixed(6) + " " + (d[o + 2] / 255).toFixed(6)); } return s.join("\n") + "\n"; }

  /* ───────── motor (WebGL): um passe por nó, com textura de 16 bits quando a placa deixa ───────── */
  var VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
  var CAB = "precision highp float;varying vec2 v;uniform sampler2D t;uniform float k;const vec3 LW=vec3(.2126,.7152,.0722);\n#define FIM(r) gl_FragColor=vec4(mix(c.rgb,r,k),c.a)\n";
  var FS = {
    copia: "void main(){gl_FragColor=texture2D(t,v);}",
    log: "uniform float cu,ex,gs,wp;\n" +
      "vec3 dec(vec3 x){\n" +
      " if(cu<.5){vec3 a=exp2((x*1023.-420.)/261.5*3.321928)*.19-.01;vec3 b=(x*1023.-95.)*.01125/(171.2102946929-95.);return mix(b,a,step(171.2102946929/1023.,x));}\n" +
      " else if(cu<1.5){vec3 a=(exp2((x-.385537)/.247190*3.321928)-.052272)/5.555556;vec3 b=(x-.092809)/5.367655;return mix(b,a,step(5.367655*.010591+.092809,x));}\n" +
      " else if(cu<2.5){vec3 a=exp2((x-.598206)/.241514*3.321928)-.00873;vec3 b=(x-.125)/5.6;return mix(b,a,step(.181,x));}\n" +
      " else if(cu<3.5){vec3 a=(exp2((x-.12240537)/.36726845*3.321928)-1.)/14.98325;vec3 b=(x-.12512219)/1.9754798;vec3 n=-(exp2((.12783901-x)/.36726845*3.321928)-1.)/14.98325;vec3 r=mix(b,a,step(.15277891,x));return mix(n,r,step(.097465473,x))*.9;}\n" +
      " else if(cu<4.5){return (exp2((x-.0730597)/.529136*3.321928)-1.)/10.1596*.9;}\n" +
      " else if(cu<5.5){vec3 a=exp2((x-.790453)/.344676*3.321928)/.555556-.009468/.555556;vec3 b=(x-.092864)/8.735631;return mix(b,a,step(.100537775223865,x));}\n" +
      " else if(cu<6.5){float R0=-.05641088;float Pt=47.28711236*(.01-R0)*(.01-R0);vec3 a=exp2((x-.69336945)/.08550479)-.00964052;vec3 b=sqrt(max(x,0.)/47.28711236)+R0;vec3 r=mix(b,a,step(Pt,x));return mix(vec3(R0),r,step(0.,x));}\n" +
      " else if(cu<7.5){vec3 a=(exp2((3.89616*x-2.27752)*3.321928)-.0108)/.9892;vec3 b=(x-.0929)/6.025;return mix(b,a,step(.14,x));}\n" +
      " return .18*exp2((x-.45)*8.)-.004;}\n" +
      "void main(){vec4 c=texture2D(t,v);vec3 l=max(dec(clamp(c.rgb,0.,1.)),0.)*ex;vec3 m=l*(1.+l/(wp*wp))/(1.+l);vec3 r=pow(max(m,0.),vec3(1./2.4));float L=dot(r,LW);r=mix(vec3(L),r,gs);FIM(r);}",
    wb: "uniform vec3 g;void main(){vec4 c=texture2D(t,v);vec3 r=c.rgb*g;FIM(r);}",
    cont: "uniform float ex,ct,pv;void main(){vec4 c=texture2D(t,v);vec3 r=c.rgb*ex;r=(r-pv)*ct+pv;FIM(r);}",
    prim: "uniform vec3 li,ga,gn,of;void main(){vec4 c=texture2D(t,v);vec3 r=c.rgb*gn+of;r=r+li*(1.-r);r=pow(max(r,0.),1./ga);FIM(r);}",
    logw: "uniform vec3 sh,mi,hi;uniform float lo,hp;void main(){vec4 c=texture2D(t,v);float L=clamp(dot(c.rgb,LW),0.,1.);float ws=1.-smoothstep(lo*.5,lo*1.5,L);float wh=smoothstep(hp-(1.-hp)*.5,hp+(1.-hp)*.5,L);float wm=max(0.,1.-ws-wh);vec3 r=c.rgb+sh*ws+mi*wm+hi*wh;FIM(r);}",
    curv: "uniform sampler2D a;void main(){vec4 c=texture2D(t,v);vec3 q=(clamp(c.rgb,0.,1.)*255.+.5)/256.;vec3 r=vec3(texture2D(a,vec2(q.r,.5)).r,texture2D(a,vec2(q.g,.5)).g,texture2D(a,vec2(q.b,.5)).b);FIM(r);}",
    sat: "uniform float sa,vi,hu;void main(){vec4 c=texture2D(t,v);vec3 r=c.rgb;vec3 ax=vec3(.57735);float co=cos(hu),si=sin(hu);r=r*co+cross(ax,r)*si+ax*dot(ax,r)*(1.-co);float L=dot(r,LW);float s=max(r.r,max(r.g,r.b))-min(r.r,min(r.g,r.b));r=mix(vec3(L),r,1.+vi*(1.-clamp(s,0.,1.)));r=mix(vec3(L),r,sa);FIM(r);}",
    nit: "uniform vec2 px;uniform float am,ra;void main(){vec4 c=texture2D(t,v);vec2 d=px*ra;vec3 b=(texture2D(t,v+vec2(d.x,0.)).rgb+texture2D(t,v-vec2(d.x,0.)).rgb+texture2D(t,v+vec2(0.,d.y)).rgb+texture2D(t,v-vec2(0.,d.y)).rgb+texture2D(t,v+d).rgb+texture2D(t,v-d).rgb+texture2D(t,v+vec2(d.x,-d.y)).rgb+texture2D(t,v+vec2(-d.x,d.y)).rgb)/8.;vec3 r=c.rgb+(c.rgb-b)*am;FIM(r);}",
    lut: "uniform sampler2D a;uniform float n;void main(){vec4 c=texture2D(t,v);vec3 q=clamp(c.rgb,0.,1.)*(n-1.);float b0=floor(q.b);float b1=min(b0+1.,n-1.);float f=q.b-b0;vec2 u0=vec2((b0*n+q.r+.5)/(n*n),(q.g+.5)/n);vec2 u1=vec2((b1*n+q.r+.5)/(n*n),(q.g+.5)/n);vec3 r=mix(texture2D(a,u0).rgb,texture2D(a,u1).rgb,f);FIM(r);}"
  };
  function medida(fw, fh, mx) { var k = Math.min(1, mx / Math.max(fw, fh)); return [Math.max(2, Math.round(fw * k)), Math.max(2, Math.round(fh * k))]; }

  function Motor() {
    var CV = null, GL = null, FALHOU = false, PR = {}, FB = [], W = 0, H = 0, TS = null, TA = {}, MEIO = false, GL2 = false;
    function iniciar() {
      if (GL) return true; if (FALHOU) return false;
      try {
        CV = document.createElement("canvas"); var op = {premultipliedAlpha: false, alpha: true, antialias: false, depth: false, preserveDrawingBuffer: true};
        GL = CV.getContext("webgl2", op); GL2 = !!GL; if (!GL) GL = CV.getContext("webgl", op) || CV.getContext("experimental-webgl", op);
        if (!GL) { FALHOU = true; return false; }
        MEIO = GL2 && !!GL.getExtension("EXT_color_buffer_float");
        var b = GL.createBuffer(); GL.bindBuffer(GL.ARRAY_BUFFER, b); GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), GL.STATIC_DRAW);
        TS = tex(); CV.addEventListener("webglcontextlost", function (e) { e.preventDefault(); GL = null; FALHOU = true; });
        return true;
      } catch (e) { GL = null; FALHOU = true; return false; }
    }
    function tex(linear) { var t = GL.createTexture(); GL.bindTexture(GL.TEXTURE_2D, t); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE); return t; }
    function prog(nome) {
      if (PR[nome]) return PR[nome];
      var sh = function (tipo, src) { var s = GL.createShader(tipo); GL.shaderSource(s, src); GL.compileShader(s); if (!GL.getShaderParameter(s, GL.COMPILE_STATUS)) throw new Error("shader " + nome + ": " + GL.getShaderInfoLog(s)); return s; };
      var p = GL.createProgram(); GL.attachShader(p, sh(GL.VERTEX_SHADER, VS)); GL.attachShader(p, sh(GL.FRAGMENT_SHADER, (nome === "copia" ? "precision highp float;varying vec2 v;uniform sampler2D t;" : CAB) + FS[nome])); GL.bindAttribLocation(p, 0, "p"); GL.linkProgram(p);
      if (!GL.getProgramParameter(p, GL.LINK_STATUS)) throw new Error("programa " + nome);
      var u = {}; return (PR[nome] = {p: p, u: function (k) { return k in u ? u[k] : (u[k] = GL.getUniformLocation(p, k)); }});
    }
    function alvos(w, h) {
      if (W === w && H === h && FB.length) return; W = w; H = h; CV.width = w; CV.height = h;
      FB.forEach(function (f) { GL.deleteFramebuffer(f.f); GL.deleteTexture(f.t); }); FB = [];
      for (var i = 0; i < 2; i++) { var t = tex(), f = GL.createFramebuffer(), feito = false;
        if (MEIO) { GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA16F, w, h, 0, GL.RGBA, GL.HALF_FLOAT, null); GL.bindFramebuffer(GL.FRAMEBUFFER, f); GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, t, 0); feito = GL.checkFramebufferStatus(GL.FRAMEBUFFER) === GL.FRAMEBUFFER_COMPLETE; if (!feito) MEIO = false; }
        if (!feito) { GL.bindTexture(GL.TEXTURE_2D, t); GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, w, h, 0, GL.RGBA, GL.UNSIGNED_BYTE, null); GL.bindFramebuffer(GL.FRAMEBUFFER, f); GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, t, 0); }
        FB.push({f: f, t: t}); }
      GL.bindFramebuffer(GL.FRAMEBUFFER, null);
    }
    function aux(chave, versao, w, h, dados) { var a = TA[chave]; if (a && a.v === versao) return a.t; if (!a) a = TA[chave] = {t: tex()}; a.v = versao; GL.bindTexture(GL.TEXTURE_2D, a.t); GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, false); GL.pixelStorei(GL.UNPACK_ALIGNMENT, 1); GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, w, h, 0, GL.RGBA, GL.UNSIGNED_BYTE, dados); return a.t; }
    function uniformes(n, P, w, h) {
      var p = n.p || {}, G = GL, f = function (k, v) { G.uniform1f(P.u(k), v); }, v3 = function (k, a) { G.uniform3f(P.u(k), a[0], a[1], a[2]); }, a, i;
      f("k", lim((n.k == null ? 100 : n.k) / 100, 0, 1));
      switch (n.tipo) {
        case "log": i = 0; for (var j = 0; j < LOGS.length; j++) if (LOGS[j][0] === p.perfil) i = j; f("cu", i); f("ex", Math.pow(2, (+p.expo || 0) / 33.3)); f("gs", 1 + (LOGS[i][2] - 1) * (p.cor == null ? 100 : +p.cor) / 100); f("wp", 2 + (p.altas == null ? 50 : +p.altas) / 100 * 14); break;
        case "wb": var t = (+p.temp || 0) / 100, m = (+p.matiz || 0) / 100, g = [(p.gr || 1) * (1 + 0.3 * t), (p.gg || 1) * (1 - 0.25 * m), (p.gb || 1) * (1 - 0.3 * t)], L = 0.2126 * g[0] + 0.7152 * g[1] + 0.0722 * g[2]; v3("g", [g[0] / L, g[1] / L, g[2] / L]); break;
        case "cont": f("ex", Math.pow(2, (+p.expo || 0) / 50)); f("ct", Math.pow(2, (+p.cont || 0) / 100)); f("pv", (p.pivo == null ? 43 : +p.pivo) / 100); break;
        case "prim": var li = rodaRGB(p.lift, 0.2), ga = rodaRGB(p.gamma, 0.5), gn = rodaRGB(p.gain, 0.5), of = rodaRGB(p.off, 0.15), ml = (p.lift || [])[2] || 0, mg = (p.gamma || [])[2] || 0, mn = (p.gain || [])[2] || 0, mo = (p.off || [])[2] || 0;
          v3("li", [li[0] + ml * 0.3, li[1] + ml * 0.3, li[2] + ml * 0.3]); v3("ga", [Math.pow(2, ga[0] + mg), Math.pow(2, ga[1] + mg), Math.pow(2, ga[2] + mg)]); v3("gn", [Math.pow(2, mn) * (1 + gn[0]), Math.pow(2, mn) * (1 + gn[1]), Math.pow(2, mn) * (1 + gn[2])]); v3("of", [of[0] + mo * 0.2, of[1] + mo * 0.2, of[2] + mo * 0.2]); break;
        case "logw": ["sombra:sh", "meio:mi", "alta:hi"].forEach(function (q) { q = q.split(":"); var c = rodaRGB(p[q[0]], 0.25), l = (p[q[0]] || [])[2] || 0; v3(q[1], [c[0] + l * 0.25, c[1] + l * 0.25, c[2] + l * 0.25]); }); f("lo", (p.baixo || 33) / 100); f("hp", (p.alto || 66) / 100); break;
        case "curv": var vc = JSON.stringify([p.y, p.r, p.g, p.b]), tc = TA["c" + n.id]; a = tc && tc.v === vc ? tc.t : aux("c" + n.id, vc, 256, 1, curvaTex(p));
          G.activeTexture(G.TEXTURE1); G.bindTexture(G.TEXTURE_2D, a); G.activeTexture(G.TEXTURE0); G.uniform1i(P.u("a"), 1); break;
        case "sat": f("sa", 1 + (+p.sat || 0) / 100); f("vi", (+p.vib || 0) / 100); f("hu", (+p.tom || 0) * Math.PI / 180); break;
        case "nit": G.uniform2f(P.u("px"), 1 / w, 1 / h); f("am", (+p.forca || 0) / (p.forca < 0 ? 100 : 40)); f("ra", lim(+p.raio || 1, 1, 6)); break;
        case "lut": var l = LUTS[p.lut]; a = aux("l" + l.id, l.v, l.n * l.n, l.n, l.dados); G.activeTexture(G.TEXTURE1); G.bindTexture(G.TEXTURE_2D, a); G.activeTexture(G.TEXTURE0); G.uniform1i(P.u("a"), 1); f("n", l.n); break;
      }
    }
    function passe(nome, n, origem, destino, w, h) { var P = prog(nome); GL.useProgram(P.p); GL.bindFramebuffer(GL.FRAMEBUFFER, destino); GL.viewport(0, 0, w, h); if (n) uniformes(n, P, w, h); GL.activeTexture(GL.TEXTURE0); GL.bindTexture(GL.TEXTURE_2D, origem); GL.uniform1i(P.u("t"), 0); GL.enableVertexAttribArray(0); GL.vertexAttribPointer(0, 2, GL.FLOAT, false, 0, 0); GL.drawArrays(GL.TRIANGLE_STRIP, 0, 4); }
    /* op: {max, ate: id (para ANTES desse nó), semEspacial, exato (não reduz), sempre (devolve mesmo sem nó ativo)} */
    function aplicar(fonte, fw, fh, g, op) {
      op = op || {}; if (!fonte || !fw || !fh) return null;
      var lista = cadeia(g); if (op.ate) { var ix = lista.map(function (n) { return n.id; }).indexOf(op.ate); if (ix >= 0) lista = lista.slice(0, ix); }
      lista = lista.filter(function (n) { return !neutro(n) && !(op.semEspacial && n.tipo === "nit"); });
      if (!lista.length && !op.sempre) return null; if (!iniciar()) return null;
      try {
        var d = op.exato ? [fw, fh] : medida(fw, fh, op.max || 2560), w = d[0], h = d[1]; alvos(w, h); GL.disable(GL.BLEND);
        GL.bindTexture(GL.TEXTURE_2D, TS); GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true); GL.pixelStorei(GL.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, fonte);
        var origem = TS; if (!lista.length) passe("copia", null, origem, null, w, h);
        for (var i = 0; i < lista.length; i++) { var ult = i === lista.length - 1; passe(lista[i].tipo, lista[i], origem, ult ? null : FB[i % 2].f, w, h); origem = FB[i % 2].t; }
        return CV;
      } catch (e) { try { console.warn("[cor avançada]", e && e.message); } catch (x) {} GL = null; FALHOU = true; return null; }
    }
    function ler(x, y, w, h) { var o = new Uint8Array(w * h * 4); GL.bindFramebuffer(GL.FRAMEBUFFER, null); GL.readPixels(x, y, w, h, GL.RGBA, GL.UNSIGNED_BYTE, o); return o; }
    return {aplicar: aplicar, ler: ler, ok: function () { return iniciar(); }, bits: function () { return MEIO ? 16 : 8; }, tela: function () { return CV; }};
  }
  var M1 = Motor(), M2 = null;
  function motor2() { return M2 || (M2 = Motor()); }

  /* cozinha os nós (menos nitidez, que não é cor) numa LUT 3D: passa uma tabela neutra pelos mesmos nós */
  function gerarLut(g, n) { n = n || 33; var id = identidade(n), c = document.createElement("canvas"); c.width = n * n; c.height = n; var x = c.getContext("2d"), im = x.createImageData(n * n, n); im.data.set(id); x.putImageData(im, 0, 0);
    var m = motor2(), r = m.aplicar(c, n * n, n, g, {exato: true, semEspacial: true, sempre: true}); if (!r) return null; var lido = m.ler(0, 0, n * n, n), o = new Uint8Array(lido.length);
    for (var y = 0; y < n; y++) o.set(lido.subarray((n - 1 - y) * n * n * 4, (n - y) * n * n * 4), y * n * n * 4);   /* readPixels vem de baixo para cima */
    return {n: n, dados: o}; }

  /* ───────── presets de fábrica (criação própria) ───────── */
  function linha(lista) { var g = {nos: [], lig: []}, ant = "in"; lista.forEach(function (q, i) { var n = novo(q[0], 150 + i * 188, 60 + (i % 2) * 46); Object.keys(q[1] || {}).forEach(function (k) { n.p[k] = q[1][k]; }); if (q[2] != null) n.k = q[2]; g.nos.push(n); g.lig.push([ant, n.id]); ant = n.id; }); g.lig.push([ant, "out"]); return g; }
  var S = [[0, 0], [0.25, 0.2], [0.75, 0.8], [1, 1]], SF = [[0, 0.03], [0.22, 0.16], [0.78, 0.84], [1, 0.97]];
  var PRESETS = [
    ["Correção básica", "Branco, contraste e cor — o começo de todo take", function () { return linha([["wb"], ["cont", {cont: 12}], ["sat", {vib: 15}]]); }],
    ["LOG → Rec.709", "Tira o cinza do vídeo LOG (escolha a câmera no 1º nó)", function () { return linha([["log", {perfil: "slog3"}], ["wb"], ["cont", {cont: 8}], ["sat", {sat: 6}]]); }],
    ["iPhone Apple Log", "Apple Log para Rec.709 com contraste leve", function () { return linha([["log", {perfil: "apple"}], ["cont", {cont: 10}], ["sat", {vib: 10}]]); }],
    ["Cinema azul e laranja", "Sombras frias e pele quente", function () { return linha([["cont", {cont: 14}], ["logw", {sombra: [-0.32, 0.1, -0.04], alta: [0.3, -0.16, 0.02]}], ["sat", {vib: 12}]]); }],
    ["Filme quente", "Curva em S, pretos levantados e luz dourada", function () { return linha([["curv", {y: SF}], ["prim", {gain: [0.16, -0.08, 0], lift: [-0.1, 0.06, 0]}], ["sat", {sat: -8}]]); }],
    ["Preto e branco forte", "Sem cor, com contraste de revista", function () { return linha([["sat", {sat: -100}], ["curv", {y: S}], ["nit", {forca: 25, raio: 1}]]); }],
    ["Pele natural", "Aquece um pouco e protege o tom de pele", function () { return linha([["wb", {temp: 8}], ["cont", {cont: 6}], ["sat", {vib: 18, sat: -4}]]); }],
    ["Palco e show", "Segura as luzes fortes e dá vida às cores", function () { return linha([["cont", {expo: -8, cont: 16, pivo: 38}], ["prim", {lift: [-0.14, 0.12, 0]}], ["sat", {vib: 25}], ["nit", {forca: 20, raio: 1}]]); }],
    ["Evento corporativo", "Limpo, neutro e nítido", function () { return linha([["wb"], ["cont", {cont: 10}], ["sat", {vib: 8}], ["nit", {forca: 22, raio: 1}]]); }]
  ];
  function meus() { try { return JSON.parse(localStorage.getItem("ui_cor_nos_predef") || "[]"); } catch (e) { return []; } }
  function meusGravar(l) { try { localStorage.setItem("ui_cor_nos_predef", JSON.stringify(l.slice(0, 40))); } catch (e) {} }

  /* ───────── ESCOPOS (lidos da própria imagem do visor, no aparelho) ───────── */
  function escopos(fonte, cvW, cvP, cvV) {
    var w = 192, h = 108, t = escopos.t || (escopos.t = document.createElement("canvas")); t.width = w; t.height = h; var x = t.getContext("2d", {willReadFrequently: true}); x.drawImage(fonte, 0, 0, w, h); var d = x.getImageData(0, 0, w, h).data, i, px, py;
    function tela(cv) { var c = cv.getContext("2d"); c.fillStyle = "#06080f"; c.fillRect(0, 0, cv.width, cv.height); return c; }
    function grade(c, W, H) { c.strokeStyle = "rgba(255,255,255,.10)"; c.lineWidth = 1; c.beginPath(); for (var q = 0; q <= 4; q++) { var yy = Math.round(H * q / 4) + 0.5; c.moveTo(0, yy); c.lineTo(W, yy); } c.stroke(); }
    if (cvW) { var W1 = cvW.width, H1 = cvW.height, c1 = tela(cvW), im1 = c1.getImageData(0, 0, W1, H1), o1 = im1.data;
      for (py = 0; py < h; py++) for (px = 0; px < w; px++) { i = (py * w + px) * 4; var L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2], X = Math.floor(px / w * W1), Y = H1 - 1 - Math.round(L / 255 * (H1 - 1)), o = (Y * W1 + X) * 4; o1[o] = Math.min(255, o1[o] + 26); o1[o + 1] = Math.min(255, o1[o + 1] + 34); o1[o + 2] = Math.min(255, o1[o + 2] + 26); }
      c1.putImageData(im1, 0, 0); grade(c1, W1, H1); }
    if (cvP) { var W2 = cvP.width, H2 = cvP.height, c2 = tela(cvP), im2 = c2.getImageData(0, 0, W2, H2), o2 = im2.data, terco = Math.floor(W2 / 3);
      for (py = 0; py < h; py++) for (px = 0; px < w; px++) { i = (py * w + px) * 4; for (var ch = 0; ch < 3; ch++) { var X2 = ch * terco + Math.floor(px / w * (terco - 3)), Y2 = H2 - 1 - Math.round(d[i + ch] / 255 * (H2 - 1)), oo = (Y2 * W2 + X2) * 4; o2[oo + ch] = Math.min(255, o2[oo + ch] + 48); o2[oo + (ch + 1) % 3] = Math.min(110, o2[oo + (ch + 1) % 3] + 6); o2[oo + (ch + 2) % 3] = Math.min(110, o2[oo + (ch + 2) % 3] + 6); } }
      c2.putImageData(im2, 0, 0); grade(c2, W2, H2); }
    if (cvV) { var W3 = cvV.width, H3 = cvV.height, c3 = tela(cvV), im3 = c3.getImageData(0, 0, W3, H3), o3 = im3.data, R = Math.min(W3, H3) / 2 - 4, cx = W3 / 2, cy = H3 / 2;
      for (i = 0; i < d.length; i += 8) { var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, Yl = 0.2126 * r + 0.7152 * g + 0.0722 * b, cb = (b - Yl) / 1.8556, cr = (r - Yl) / 1.5748, X3 = Math.round(cx + cb * 2 * R), Y3 = Math.round(cy - cr * 2 * R); if (X3 < 0 || Y3 < 0 || X3 >= W3 || Y3 >= H3) continue; var o4 = (Y3 * W3 + X3) * 4; o3[o4] = Math.min(255, o3[o4] + 30 + r * 50); o3[o4 + 1] = Math.min(255, o3[o4 + 1] + 30 + g * 50); o3[o4 + 2] = Math.min(255, o3[o4 + 2] + 30 + b * 50); }
      c3.putImageData(im3, 0, 0); c3.strokeStyle = "rgba(255,255,255,.16)"; c3.beginPath(); c3.arc(cx, cy, R, 0, 6.2832); c3.moveTo(cx - R, cy + 0.5); c3.lineTo(cx + R, cy + 0.5); c3.moveTo(cx + 0.5, cy - R); c3.lineTo(cx + 0.5, cy + R); c3.stroke();
      c3.strokeStyle = "rgba(255,190,140,.55)"; c3.beginPath(); c3.moveTo(cx, cy); c3.lineTo(cx - Math.cos(1.012) * R * 0.52, cy - Math.sin(1.012) * R); c3.stroke(); }   /* linha do tom de pele */
  }

  /* ───────── TELA (área própria, em tela cheia, como o Quadro de História) ───────── */
  var CSS = "" +
    ".cn{position:fixed;inset:0;z-index:8900;background:#070a13;color:#E8EDF7;display:grid;grid-template-rows:auto minmax(0,1fr);font:500 13px/1.35 Inter,system-ui,sans-serif;touch-action:manipulation;overscroll-behavior:none}" +
    ".cn *{box-sizing:border-box}.cn button,.cn select,.cn input{font:inherit}" +
    ".cn-topo{display:flex;align-items:center;gap:6px;padding:8px 10px;padding-top:calc(8px + env(safe-area-inset-top));border-bottom:1px solid rgba(255,255,255,.08);background:#0b0f1c;overflow-x:auto;scrollbar-width:none}.cn-topo::-webkit-scrollbar{display:none}" +
    ".cn-topo h2{margin:0 6px 0 2px;font:900 13px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;white-space:nowrap}.cn-topo .sp{flex:1}" +
    ".cn-b{flex:none;height:30px;padding:0 11px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(#1b2233,#131929);color:#E8EDF7;font-weight:800;font-size:11px;letter-spacing:.05em;cursor:pointer;white-space:nowrap}" +
    ".cn-b:hover{border-color:rgba(255,255,255,.3)}.cn-b.on{background:#7C5CFF;border-color:#7C5CFF;color:#fff}.cn-b.pri{color:#FFC94D}.cn-b:disabled{opacity:.4;cursor:default}" +
    ".cn-corpo{display:grid;grid-template-columns:minmax(0,1fr) 330px;grid-template-rows:minmax(0,1.15fr) minmax(0,1fr);min-height:0}" +
    ".cn-visor{position:relative;display:flex;align-items:center;justify-content:center;background:#000;min-height:0;min-width:0;overflow:hidden}.cn-visor canvas{max-width:100%;max-height:100%;display:block}.cn-visor.gota canvas{cursor:crosshair}" +
    ".cn-selo{position:absolute;left:8px;top:8px;padding:3px 8px;border-radius:99px;background:rgba(3,6,16,.6);font:800 9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.08em;pointer-events:none}" +
    ".cn-tempo{position:absolute;left:8px;right:8px;bottom:6px;display:flex;gap:8px;align-items:center}.cn-tempo input{flex:1;min-width:0;accent-color:#7C5CFF}" +
    ".cn-lado{grid-row:1/3;grid-column:2;border-left:1px solid rgba(255,255,255,.08);background:#0b0f1c;overflow-y:auto;padding:10px;min-height:0}" +
    ".cn-grafo{position:relative;border-top:1px solid rgba(255,255,255,.08);background:#090d18 radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px) 0 0/22px 22px;overflow:auto;min-height:0;min-width:0;touch-action:none}" +
    ".cn-plano{position:relative;width:1800px;height:520px}.cn-plano svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.cn-plano svg path{fill:none;stroke-width:2.5;pointer-events:stroke;cursor:pointer}" +
    ".cn-no{position:absolute;width:158px;border-radius:12px;background:#141a2b;border:1.5px solid rgba(255,255,255,.14);box-shadow:0 8px 22px rgba(0,0,0,.45);cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none}" +
    ".cn-no.on{border-color:var(--c);box-shadow:0 0 0 2px var(--c),0 10px 26px rgba(0,0,0,.5)}.cn-no.fora{opacity:.45}.cn-no.off .cn-no-t{text-decoration:line-through;opacity:.6}" +
    ".cn-no-c{height:5px;border-radius:10px 10px 0 0;background:var(--c)}.cn-no-t{padding:7px 48px 2px 9px;font-weight:800;font-size:11.5px;line-height:1.2;display:flex;gap:6px;align-items:center}.cn-no-s{padding:0 9px 7px;font-size:10px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".cn-no-a{position:absolute;right:4px;top:8px;display:flex;gap:1px}.cn-no-a button{width:22px;height:22px;border:0;background:none;color:#cfd6e6;cursor:pointer;border-radius:6px;font-size:11px;padding:0}.cn-no-a button:hover{background:rgba(255,255,255,.12)}" +
    ".cn-no.fixo{width:92px;text-align:center;cursor:default}.cn-no.fixo .cn-no-t{justify-content:center;padding:12px 6px;white-space:nowrap}" +
    ".cn-porta{position:absolute;top:50%;width:18px;height:18px;margin-top:-9px;border-radius:50%;background:#0b0f1c;border:2.5px solid var(--c,#9aa6bd);cursor:crosshair;touch-action:none}.cn-porta.e{left:-10px}.cn-porta.s{right:-10px}.cn-porta.s:hover,.cn-porta.alvo{background:var(--c,#9aa6bd)}" +
    ".cn-h{margin:12px 0 6px;font:900 10px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;opacity:.7;text-transform:uppercase}.cn-h:first-child{margin-top:0}" +
    ".cn-dica{margin:0 0 8px;font-size:11.5px;opacity:.7;line-height:1.45}" +
    ".cn-f{display:grid;grid-template-columns:1fr 46px;gap:2px 8px;align-items:center;margin:0 0 7px}.cn-f label{grid-column:1/3;font-size:11px;opacity:.85}.cn-f input[type=range]{width:100%;accent-color:#7C5CFF;height:22px}.cn-f output{font-size:11px;text-align:right;font-variant-numeric:tabular-nums}" +
    ".cn-sel{width:100%;height:36px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#141a2b;color:#E8EDF7;padding:0 8px;font-size:16px}" +
    ".cn-rodas{display:grid;grid-template-columns:1fr 1fr;gap:10px 8px;margin-bottom:8px}.cn-roda{text-align:center}.cn-roda b{display:block;font:900 9.5px/1 Inter,system-ui,sans-serif;letter-spacing:.12em;margin-bottom:5px;opacity:.8}" +
    ".cn-disco{position:relative;width:104px;height:104px;margin:0 auto;border-radius:50%;background:radial-gradient(circle,#2a3145 0,rgba(42,49,69,.86) 38%,rgba(42,49,69,0) 74%),conic-gradient(from 90deg,#f33,#f3f,#33f,#3ff,#3f3,#ff3,#f33);border:2px solid #0b0f1c;box-shadow:0 0 0 1px rgba(255,255,255,.16);touch-action:none;cursor:crosshair}" +
    ".cn-disco i{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:2px solid #fff;background:rgba(0,0,0,.4);pointer-events:none}.cn-disco:after{content:'';position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:rgba(255,255,255,.35)}" +
    ".cn-roda input{width:100%;accent-color:#cfd6e6;height:20px;margin-top:4px}" +
    ".cn-curva{position:relative;width:100%;aspect-ratio:1;background:#06080f;border:1px solid rgba(255,255,255,.14);border-radius:8px;touch-action:none;cursor:crosshair}.cn-curva svg{position:absolute;inset:0;width:100%;height:100%}" +
    ".cn-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}.cn-lista{display:grid;gap:5px}.cn-item{display:flex;gap:6px;align-items:center}.cn-item .cn-b{flex:1;justify-content:flex-start;text-align:left;height:auto;min-height:34px;padding:5px 10px;white-space:normal;line-height:1.25}.cn-item small{display:block;font-weight:500;opacity:.6;letter-spacing:0;text-transform:none}" +
    ".cn-esc{display:grid;gap:6px}.cn-esc canvas{width:100%;display:block;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#06080f}.cn-esc p{margin:0;font:900 9px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;opacity:.6}" +
    ".cn-imp{position:relative;overflow:hidden;display:inline-flex;align-items:center}.cn-imp input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0}" +
    ".cn-abas{display:none}" +
    "@media (max-width:900px){.cn-corpo{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(150px,34vh) auto minmax(0,1fr)}.cn-lado,.cn-grafo{grid-row:3;grid-column:1;border-left:0}.cn-abas{display:flex;gap:5px;padding:6px 8px;background:#0b0f1c;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)}.cn-abas .cn-b{flex:1}.cn[data-aba=nos] .cn-lado,.cn[data-aba=ajustes] .cn-grafo,.cn[data-aba=escopos] .cn-grafo{display:none}.cn[data-aba=ajustes] .cn-so-esc,.cn[data-aba=escopos] .cn-so-aj{display:none}.cn-plano{width:1500px;height:420px}.cn-topo h2{display:none}.cn-rodas{grid-template-columns:repeat(2,minmax(0,1fr))}}";

  var A = null;   /* a tela aberta */
  function fechar() { if (!A) return; cancelAnimationFrame(A.raf); document.removeEventListener("keydown", A.tecla, true); A.el.remove(); document.documentElement.classList.remove("cn-aberta"); var cfg = A.cfg; A = null; try { cfg.aoFechar && cfg.aoFechar(); } catch (e) {} }

  function abrir(cfg) {
    if (A) fechar();
    if (!document.getElementById("cnCss")) { var st = document.createElement("style"); st.id = "cnCss"; st.textContent = CSS; document.head.appendChild(st); }
    var c = cfg.clip; if (!c.nos || !c.nos.nos) c.nos = vazio();
    var el = document.createElement("div"); el.className = "cn"; el.id = "cnTela"; el.setAttribute("data-aba", "nos");
    el.innerHTML = '<div class="cn-topo"><button class="cn-b" data-a="voltar" aria-label="Voltar ao editor">‹ VOLTAR</button><h2>COR AVANÇADA</h2>' +
      '<button class="cn-b pri" data-a="mais">＋ NÓ</button><button class="cn-b" data-a="presets">★ PRESETS</button><button class="cn-b" data-a="luts">▦ LUTS</button><button class="cn-b" data-a="antes">ANTES</button>' +
      '<span class="sp"></span><button class="cn-b" data-a="desfazer">↶</button><button class="cn-b" data-a="todos">⇉ EM TODOS</button><button class="cn-b" data-a="limpar">LIMPAR</button></div>' +
      '<div class="cn-corpo"><div class="cn-visor" id="cnVisor"><canvas id="cnCv" width="640" height="360"></canvas><span class="cn-selo" id="cnSelo"></span><div class="cn-tempo"><button class="cn-b" data-a="tocar" id="cnPlay">▶</button><input type="range" id="cnTempo" min="0" max="1000" value="0" aria-label="Tempo do take"></div></div>' +
      '<div class="cn-abas"><button class="cn-b on" data-aba="nos">NÓS</button><button class="cn-b" data-aba="ajustes">AJUSTES</button><button class="cn-b" data-aba="escopos">ESCOPOS</button></div>' +
      '<div class="cn-lado" id="cnLado"></div><div class="cn-grafo" id="cnGrafo"><div class="cn-plano" id="cnPlano"></div></div></div>';
    document.body.appendChild(el); document.documentElement.classList.add("cn-aberta");
    A = {cfg: cfg, el: el, c: c, sel: null, painel: "no", antes: false, gota: false, sujo: true, ultT: -1, hist: [], canal: "y", raf: 0, liga: null};
    var q = function (s) { return el.querySelector(s); }, G = function () { return c.nos; };
    function aviso(t, e) { if (cfg.aviso) cfg.aviso(t, e); }
    function mudou(leve) { A.sujo = true; if (cfg.mudou) cfg.mudou(leve); }
    function passo() { A.hist.push(JSON.stringify(c.nos)); if (A.hist.length > 40) A.hist.shift(); if (cfg.passo) cfg.passo(); }
    function noSel() { return G().nos.filter(function (n) { return n.id === A.sel; })[0] || null; }

    /* visor: o quadro do take passando pelos nós (independente da montagem) */
    var cv = q("#cnCv"), cx = cv.getContext("2d"), ultEsc = 0;
    function desenhar() {
      var f = cfg.quadro && cfg.quadro(); if (!f || !f.el || !f.w) { q("#cnSelo").textContent = "Ponha a agulha em cima deste take"; return; }
      var d = medida(f.w, f.h, 960); if (cv.width !== d[0] || cv.height !== d[1]) { cv.width = d[0]; cv.height = d[1]; }
      var m = motor2(), r = A.antes ? null : m.aplicar(f.el, f.w, f.h, G(), {max: 960});
      try { cx.clearRect(0, 0, cv.width, cv.height); cx.drawImage(r || f.el, 0, 0, cv.width, cv.height); } catch (e) { return; }
      q("#cnSelo").textContent = A.antes ? "ANTES (original)" : !m.ok() ? "Este navegador não tem WebGL: a cor avançada não é aplicada" : A.gota ? "🎯 Toque em algo que deveria ser BRANCO ou cinza" : cadeia(G()).length ? cadeia(G()).length + " nó(s) no fluxo · " + m.bits() + " bits" : fechada(G()) ? "Sem nós — toque em ＋ NÓ" : "Fluxo aberto: ligue até a SAÍDA";
      var ag = performance.now(); if (ag - ultEsc > 140) { ultEsc = ag; var e1 = q("#cnEscW"); if (e1 && e1.getClientRects().length) { try { escopos(cv, e1, q("#cnEscP"), q("#cnEscV")); } catch (e) {} } }
    }
    function laco() { if (!A) return; var t = cfg.tempo ? cfg.tempo() : 0; if (A.sujo || Math.abs(t - A.ultT) > 1e-4 || (cfg.tocando && cfg.tocando())) { A.sujo = false; A.ultT = t; desenhar(); var s = q("#cnTempo"); if (s && document.activeElement !== s) s.value = Math.round(lim((t - c.ini) / Math.max(0.01, c.dur), 0, 1) * 1000); q("#cnPlay").textContent = cfg.tocando && cfg.tocando() ? "⏸" : "▶"; }
      A.raf = requestAnimationFrame(laco); }

    /* ── grafo ── */
    var plano = q("#cnPlano");
    function pos(id) { if (id === "in") return {x: 24, y: 150, w: 92, h: 44}; if (id === "out") return {x: saidaX(), y: 150, w: 92, h: 44}; var n = G().nos.filter(function (x) { return x.id === id; })[0]; var e = plano.querySelector('[data-no="' + id + '"]'); return n ? {x: n.x, y: n.y, w: 158, h: e ? e.offsetHeight : 56} : null; }
    function saidaX() { var mx = 420; G().nos.forEach(function (n) { mx = Math.max(mx, n.x + 190); }); return Math.min(1690, mx); }
    function resumo(n) { var p = n.p; switch (n.tipo) { case "log": return (LOGS.filter(function (l) { return l[0] === p.perfil; })[0] || LOGS[0])[1]; case "lut": return p.lut ? (LUTS[p.lut] ? LUTS[p.lut].nome : "LUT não está neste aparelho") : "escolha uma LUT"; case "wb": return neutro(n) ? "neutro" : "ajustado"; default: return neutro(n) ? "sem ajuste" : (n.k < 100 ? n.k + "% · " : "") + "ajustado"; } }
    function desGrafo() {
      var na = cadeia(G()).map(function (n) { return n.id; }), h = '<svg id="cnFios"></svg><div class="cn-no fixo" data-no="in" style="left:24px;top:150px;--c:#9aa6bd"><div class="cn-no-t">▶ ENTRADA</div><span class="cn-porta s" data-s="in"></span></div>' +
        '<div class="cn-no fixo" data-no="out" style="left:' + saidaX() + 'px;top:150px;--c:#9aa6bd"><span class="cn-porta e" data-e="out"></span><div class="cn-no-t">SAÍDA ■</div></div>';
      G().nos.forEach(function (n) { var t = TIPOS[n.tipo]; h += '<div class="cn-no' + (n.id === A.sel ? " on" : "") + (na.indexOf(n.id) < 0 ? " fora" : "") + (n.off ? " off" : "") + '" data-no="' + n.id + '" style="left:' + n.x + 'px;top:' + n.y + 'px;--c:' + t.cor + '"><div class="cn-no-c"></div><span class="cn-porta e" data-e="' + n.id + '"></span>' +
        '<div class="cn-no-t">' + t.ic + " " + esc(t.nome) + '</div><div class="cn-no-s">' + esc(resumo(n)) + '</div><div class="cn-no-a"><button data-olho="' + n.id + '" title="Ligar/desligar este nó" aria-label="Ligar ou desligar o nó">' + (n.off ? "◌" : "●") + '</button><button data-tira="' + n.id + '" title="Apagar o nó" aria-label="Apagar o nó">✕</button></div><span class="cn-porta s" data-s="' + n.id + '"></span></div>'; });
      plano.innerHTML = h; fios();
    }
    function fio(a, b, cor, id) { var x1 = a.x + a.w + 8, y1 = a.y + a.h / 2, x2 = b.x - 8, y2 = b.y + b.h / 2, dx = Math.max(40, Math.abs(x2 - x1) / 2); return '<path d="M' + x1 + " " + y1 + " C" + (x1 + dx) + " " + y1 + "," + (x2 - dx) + " " + y2 + "," + x2 + " " + y2 + '" stroke="' + cor + '"' + (id != null ? ' data-fio="' + id + '"' : "") + "/>"; }
    function fios(solto) { var s = "", na = cadeia(G()).length || fechada(G()); (G().lig || []).forEach(function (l, i) { var a = pos(l[0]), b = pos(l[1]); if (a && b) { var n = G().nos.filter(function (x) { return x.id === l[0]; })[0]; s += fio(a, b, n ? TIPOS[n.tipo].cor : "#9aa6bd", i); } });
      if (solto) s += '<path d="M' + solto.x1 + " " + solto.y1 + " L" + solto.x2 + " " + solto.y2 + '" stroke="#fff" stroke-dasharray="5 5"/>'; var sv = plano.querySelector("#cnFios"); if (sv) sv.innerHTML = s; }
    function ligar(de, para) { if (de === para || de === "out" || para === "in") return; passo(); var g = G(); g.lig = (g.lig || []).filter(function (l) { return l[0] !== de && l[1] !== para; });
      /* não deixa fechar um laço */ var prox = {}; g.lig.forEach(function (l) { prox[l[0]] = l[1]; }); var at = para, n = 0; while (at && n++ < 99) { if (at === de) { aviso("Essa ligação faria a imagem andar em círculo", true); return; } at = prox[at]; }
      g.lig.push([de, para]); desGrafo(); desLado(); mudou(); }
    function inserir(tipo) { passo(); var g = G(), ult = null; (g.lig || []).forEach(function (l) { if (l[1] === "out") ult = l[0]; }); var ch = cadeia(g), n = novo(tipo, 150 + ch.length * 188, 60 + (ch.length % 2) * 150); if (n.x > 1500) { n.x = 150 + (ch.length % 8) * 188; n.y = 300; }
      g.nos.push(n); if (tipo === "log" && ch.length) { g.lig = g.lig.filter(function (l) { return l[0] !== "in"; }); g.lig.push(["in", n.id], [n.id, ch[0].id]); n.x = 130; n.y = 300; }
      else { g.lig = (g.lig || []).filter(function (l) { return l[1] !== "out"; }); g.lig.push([ult || "in", n.id], [n.id, "out"]); }
      A.sel = n.id; A.painel = "no"; desGrafo(); desLado(); mudou(); var gr = q("#cnGrafo"); gr.scrollLeft = Math.max(0, n.x - gr.clientWidth / 2); if (el.getAttribute("data-aba") === "nos" && window.innerWidth <= 900) aba("ajustes"); return n; }
    function tirar(id) { passo(); var g = G(), ant = null, dep = null; g.lig.forEach(function (l) { if (l[1] === id) ant = l[0]; if (l[0] === id) dep = l[1]; }); g.nos = g.nos.filter(function (n) { return n.id !== id; }); g.lig = g.lig.filter(function (l) { return l[0] !== id && l[1] !== id; }); if (ant && dep) g.lig.push([ant, dep]); if (A.sel === id) A.sel = null; desGrafo(); desLado(); mudou(); }

    /* arrastar nó, puxar fio da porta, tocar no fio para soltar */
    var arr = null;
    plano.addEventListener("pointerdown", function (e) {
      var t = e.target, pl = plano.getBoundingClientRect(), px = e.clientX - pl.left, py = e.clientY - pl.top;
      if (t.closest("[data-olho]")) return; if (t.closest("[data-tira]")) return;
      var s = t.closest("[data-s]"); if (s) { var a = pos(s.dataset.s); arr = {tipo: "fio", de: s.dataset.s, x1: a.x + a.w + 8, y1: a.y + a.h / 2}; plano.setPointerCapture(e.pointerId); e.preventDefault(); return; }
      var f = t.closest("[data-fio]"); if (f) { passo(); G().lig.splice(+f.dataset.fio, 1); desGrafo(); desLado(); mudou(); aviso("Ligação solta"); return; }
      var n = t.closest("[data-no]"); if (n && n.dataset.no !== "in" && n.dataset.no !== "out") { var o = G().nos.filter(function (x) { return x.id === n.dataset.no; })[0]; arr = {tipo: "no", n: o, dx: px - o.x, dy: py - o.y, el: n, andou: false, x0: e.clientX, y0: e.clientY}; plano.setPointerCapture(e.pointerId);
        if (A.sel !== o.id) { A.sel = o.id; A.painel = "no"; plano.querySelectorAll(".cn-no.on").forEach(function (x) { x.classList.remove("on"); }); n.classList.add("on"); desLado(); } e.preventDefault(); }
    });
    plano.addEventListener("pointermove", function (e) { if (!arr) return; var pl = plano.getBoundingClientRect(), px = e.clientX - pl.left, py = e.clientY - pl.top;
      if (arr.tipo === "no") { if (!arr.andou && Math.abs(e.clientX - arr.x0) + Math.abs(e.clientY - arr.y0) < 5) return; if (!arr.andou) { arr.andou = true; passo(); } arr.n.x = Math.round(lim(px - arr.dx, 120, 1640)); arr.n.y = Math.round(lim(py - arr.dy, 6, 440)); arr.el.style.left = arr.n.x + "px"; arr.el.style.top = arr.n.y + "px"; fios(); }
      else { fios({x1: arr.x1, y1: arr.y1, x2: px, y2: py}); plano.querySelectorAll(".cn-porta.alvo").forEach(function (x) { x.classList.remove("alvo"); }); var al = alvoEm(e); if (al) { var pe = plano.querySelector('[data-e="' + al + '"]'); if (pe) pe.classList.add("alvo"); } } });
    function alvoEm(e) { var els = document.elementsFromPoint(e.clientX, e.clientY); for (var i = 0; i < els.length; i++) { var n = els[i].closest && els[i].closest("[data-no]"); if (n && n.dataset.no !== "in") return n.dataset.no; } return null; }
    function soltar(e) { if (!arr) return; var a = arr; arr = null; try { plano.releasePointerCapture(e.pointerId); } catch (x) {}
      if (a.tipo === "fio") { var al = e.type === "pointerup" ? alvoEm(e) : null; if (al && al !== a.de) ligar(a.de, al); else fios(); }
      else if (a.andou) { desGrafo(); mudou(true); } }
    plano.addEventListener("pointerup", soltar); plano.addEventListener("pointercancel", soltar);
    plano.addEventListener("click", function (e) { var o = e.target.closest("[data-olho]"), t = e.target.closest("[data-tira]"); if (o) { passo(); var n = G().nos.filter(function (x) { return x.id === o.dataset.olho; })[0]; n.off = !n.off; if (!n.off) delete n.off; desGrafo(); mudou(); } else if (t) tirar(t.dataset.tira); });

    /* ── painel do lado ── */
    var lado = q("#cnLado");
    function faixa(n, f) { var v = n.p[f[0]]; if (v == null) v = f[4]; return '<div class="cn-f"><label>' + esc(f[1]) + '</label><input type="range" data-p="' + f[0] + '" min="' + f[2] + '" max="' + f[3] + '" step="1" value="' + v + '"><output>' + v + "</output></div>"; }
    function rodaHtml(n, r) { var a = n.p[r[0]] || [0, 0, 0]; return '<div class="cn-roda"><b>' + r[1] + '</b><div class="cn-disco" data-roda="' + r[0] + '"><i style="left:' + (50 + a[0] * 46) + "%;top:" + (50 + a[1] * 46) + '%"></i></div><input type="range" data-luz="' + r[0] + '" min="-100" max="100" value="' + Math.round((a[2] || 0) * 100) + '" aria-label="Luz de ' + r[1] + '"></div>'; }
    function curvaSvg(n) { var p = n.p, cores = {y: "#fff", r: "#ff5c5c", g: "#5fe08a", b: "#6aa8ff"}, s = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 75H100M0 50H100M0 25H100M25 0V100M50 0V100M75 0V100" stroke="rgba(255,255,255,.1)" stroke-width=".5" fill="none" vector-effect="non-scaling-stroke"/><path d="M0 100L100 0" stroke="rgba(255,255,255,.14)" stroke-width=".5" stroke-dasharray="2 2" fill="none" vector-effect="non-scaling-stroke"/>';
      ["r", "g", "b", "y"].forEach(function (k) { if (k !== A.canal && neutro({tipo: "curv", p: {y: k === "y" ? p.y : null, r: k === "r" ? p.r : null, g: k === "g" ? p.g : null, b: k === "b" ? p.b : null}})) return; var c2 = curva256(p[k]), d = ""; for (var i = 0; i < 256; i += 3) d += (i ? "L" : "M") + (i / 255 * 100).toFixed(2) + " " + (100 - c2[i] * 100).toFixed(2); d += "L100 " + (100 - c2[255] * 100).toFixed(2); s += '<path d="' + d + '" stroke="' + cores[k] + '" stroke-width="' + (k === A.canal ? 2 : 1) + '" opacity="' + (k === A.canal ? 1 : 0.45) + '" fill="none" vector-effect="non-scaling-stroke"/>'; });
      (p[A.canal] || []).forEach(function (pt, i) { s += '<circle cx="' + pt[0] * 100 + '" cy="' + (100 - pt[1] * 100) + '" r="2.6" fill="' + cores[A.canal] + '" stroke="#000" stroke-width=".6" data-pt="' + i + '"/>'; }); return s + "</svg>"; }
    function escHtml(cls) { return '<div class="' + cls + '"><p class="cn-h">Escopos</p><div class="cn-esc"><p>WAVEFORM (LUZ)</p><canvas id="cnEscW" width="256" height="110"></canvas><p>PARADE (R · G · B)</p><canvas id="cnEscP" width="258" height="110"></canvas><p>VECTORSCOPE (COR)</p><canvas id="cnEscV" width="256" height="170"></canvas></div><p class="cn-dica" style="margin-top:6px">Waveform: embaixo é preto, em cima é branco — se encostar no topo, estourou. Parade: os três iguais = branco equilibrado. Vectorscope: quanto mais longe do centro, mais cor; a linha clara é o tom de pele.</p></div>'; }
    function desLado() {
      var h = "", n = noSel();
      if (A.painel === "presets") { h += '<p class="cn-h">Presets prontos</p><div class="cn-lista">' + PRESETS.map(function (p, i) { return '<div class="cn-item"><button class="cn-b" data-pre="' + i + '">' + esc(p[0]) + "<small>" + esc(p[1]) + "</small></button></div>"; }).join("") + "</div>";
        var m = meus(); h += '<p class="cn-h">Meus presets</p>' + (m.length ? '<div class="cn-lista">' + m.map(function (p, i) { return '<div class="cn-item"><button class="cn-b" data-meu="' + i + '">★ ' + esc(p.nome) + '<small>' + p.g.nos.length + ' nó(s)</small></button><button class="cn-b" data-meux="' + i + '" aria-label="Apagar o preset">✕</button></div>'; }).join("") + "</div>" : '<p class="cn-dica">Monte os nós do seu jeito e salve aqui para usar em outros takes e projetos.</p>') + '<div class="cn-chips" style="margin-top:8px"><button class="cn-b pri" data-a="salvarPre">★ SALVAR OS NÓS ATUAIS</button></div>'; }
      else if (A.painel === "luts") { var L = LUTLISTA || [];
        h += '<p class="cn-h">Minhas LUTs</p><p class="cn-dica">LUT é uma tabela de cor pronta (.cube). Importe as LUTs oficiais da sua câmera (Sony, Canon, DJI, Apple…) ou as que você comprou: elas ficam só neste aparelho.</p><div class="cn-chips"><label class="cn-b pri cn-imp">⇪ IMPORTAR .CUBE<input type="file" id="cnCube" accept=".cube,.CUBE,text/plain" multiple></label><button class="cn-b" data-a="criarLut">✚ CRIAR LUT DOS NÓS</button></div>' +
          (L.length ? '<div class="cn-lista">' + L.map(function (l) { return '<div class="cn-item"><button class="cn-b" data-lut="' + l.id + '">▦ ' + esc(l.nome) + "<small>" + l.n + "×" + l.n + "×" + l.n + ' · toque para pôr num nó</small></button><button class="cn-b" data-lutb="' + l.id + '" title="Baixar .cube" aria-label="Baixar a LUT">⬇</button><button class="cn-b" data-lutx="' + l.id + '" aria-label="Apagar a LUT">✕</button></div>'; }).join("") + "</div>" : '<p class="cn-dica">Nenhuma LUT guardada ainda.</p>') +
          '<p class="cn-dica" style="margin-top:10px"><b>Criar LUT dos nós</b> transforma a cor que você montou numa LUT (33 pontos) para usar em qualquer take — e para baixar o .cube e levar para a câmera, o monitor ou outro programa. A nitidez não entra (LUT só guarda cor).</p>'; }
      else if (n) { var t = TIPOS[n.tipo]; h += '<p class="cn-h" style="color:' + t.cor + '">' + t.ic + " " + esc(t.nome) + '</p><p class="cn-dica">' + esc(t.dica) + "</p>";
        if (n.tipo === "log") h += '<div class="cn-f"><label>Câmera / perfil de gravação (entrada)</label><select class="cn-sel" data-p="perfil" style="grid-column:1/3">' + LOGS.map(function (l) { return '<option value="' + l[0] + '"' + (n.p.perfil === l[0] ? " selected" : "") + ">" + esc(l[1]) + "</option>"; }).join("") + '</select></div><div class="cn-f"><label>Saída</label><select class="cn-sel" style="grid-column:1/3" disabled><option>Rec.709 (TV, celular e web)</option></select></div>';
        if (n.tipo === "wb") h += '<div class="cn-chips"><button class="cn-b pri' + (A.gota ? " on" : "") + '" data-a="gota">🎯 CLICAR NO BRANCO</button><button class="cn-b" data-a="wbZerar">ZERAR</button></div>';
        if (t.rodas) h += '<div class="cn-rodas">' + t.rodas.map(function (r) { return rodaHtml(n, r); }).join("") + "</div>";
        if (n.tipo === "curv") h += '<div class="cn-chips">' + [["y", "LUZ"], ["r", "R"], ["g", "G"], ["b", "B"]].map(function (k) { return '<button class="cn-b' + (A.canal === k[0] ? " on" : "") + '" data-canal="' + k[0] + '">' + k[1] + "</button>"; }).join("") + '<button class="cn-b" data-a="curvaS">CURVA EM S</button><button class="cn-b" data-a="curvaZ">ZERAR</button></div><div class="cn-curva" id="cnCurva">' + curvaSvg(n) + "</div>";
        if (n.tipo === "lut") { var Ls = LUTLISTA || []; h += '<div class="cn-f"><label>LUT deste nó</label><select class="cn-sel" data-p="lut" style="grid-column:1/3"><option value="">— escolha —</option>' + Ls.map(function (l) { return '<option value="' + l.id + '"' + (n.p.lut === l.id ? " selected" : "") + ">" + esc(l.nome) + "</option>"; }).join("") + (n.p.lut && !LUTS[n.p.lut] ? '<option value="' + esc(n.p.lut) + '" selected>' + esc(n.p.nome || "LUT") + " (não está neste aparelho)</option>" : "") + '</select></div><div class="cn-chips"><button class="cn-b" data-a="luts">▦ ABRIR MINHAS LUTS</button></div>'; }
        (t.campos || []).forEach(function (f) { h += faixa(n, f); });
        h += '<div class="cn-f"><label>Quanto deste nó entra (mistura)</label><input type="range" data-k="1" min="0" max="100" value="' + (n.k == null ? 100 : n.k) + '"><output>' + (n.k == null ? 100 : n.k) + '</output></div><div class="cn-chips"><button class="cn-b" data-a="noZerar">↺ ZERAR O NÓ</button><button class="cn-b" data-a="noDup">⧉ DUPLICAR</button></div>'; }
      else h += '<p class="cn-h">Como funciona</p><p class="cn-dica">A imagem entra em <b>ENTRADA</b>, passa por cada <b>nó</b> na ordem das linhas e sai em <b>SAÍDA</b>. Cada nó cuida de UMA coisa.<br><br>• <b>＋ NÓ</b> cria e já liga no fim do fluxo.<br>• Arraste a bolinha da direita de um nó até outro para ligar; toque na linha para soltar.<br>• Toque no nó para ver os ajustes dele; ● liga/desliga; ✕ apaga.<br>• Ordem de colorista: LOG → branco → exposição/contraste → rodas → curvas → saturação → LUT de look → nitidez.</p><div class="cn-chips"><button class="cn-b pri" data-a="mais">＋ NÓ</button><button class="cn-b" data-a="presets">★ PRESETS</button></div>';
      lado.innerHTML = '<div class="cn-so-aj">' + h + "</div>" + escHtml("cn-so-esc"); A.sujo = true;
    }
    function aba(a) { el.setAttribute("data-aba", a); el.querySelectorAll("[data-aba].cn-b").forEach(function (b) { b.classList.toggle("on", b.dataset.aba === a); }); A.sujo = true; }

    /* controles do painel */
    var pegou = false;
    lado.addEventListener("input", function (e) { var t = e.target, n = noSel(); if (!n) return; if (!pegou) { pegou = true; passo(); }
      if (t.dataset.p && t.type === "range") { n.p[t.dataset.p] = +t.value; t.nextElementSibling.textContent = t.value; }
      else if (t.dataset.k) { n.k = +t.value; t.nextElementSibling.textContent = t.value; }
      else if (t.dataset.luz) { var a = n.p[t.dataset.luz] = n.p[t.dataset.luz] || [0, 0, 0]; a[2] = +t.value / 100; }
      else return; mudou(true); });
    lado.addEventListener("change", function (e) { var t = e.target, n = noSel(); pegou = false;
      if (t.id === "cnCube") { importar(t.files); t.value = ""; return; } if (!n) return;
      if (t.dataset.p && t.tagName === "SELECT") { passo(); n.p[t.dataset.p] = t.value; if (t.dataset.p === "lut") n.p.nome = LUTS[t.value] ? LUTS[t.value].nome : ""; mudou(); }
      desGrafo(); });
    lado.addEventListener("dblclick", function (e) { var t = e.target, n = noSel(); if (!n) return; var d = t.closest("[data-roda]"); if (d) { passo(); n.p[d.dataset.roda] = [0, 0, 0]; desLado(); desGrafo(); mudou(); return; }
      if (t.dataset && t.dataset.pt != null) { var pts = n.p[A.canal]; if (pts.length > 2) { passo(); pts.splice(+t.dataset.pt, 1); desLado(); mudou(); } return; }
      if (t.type === "range" && t.dataset.p) { var cp = (TIPOS[n.tipo].campos || []).filter(function (f) { return f[0] === t.dataset.p; })[0]; if (cp) { passo(); n.p[cp[0]] = cp[4]; desLado(); desGrafo(); mudou(); } } });
    /* rodas e curva: arrastar */
    var arr2 = null;
    lado.addEventListener("pointerdown", function (e) { var n = noSel(); if (!n) return; var d = e.target.closest("[data-roda]"), cu = e.target.closest("#cnCurva");
      if (d) { passo(); arr2 = {tipo: "roda", d: d, k: d.dataset.roda}; d.setPointerCapture(e.pointerId); moverRoda(e); e.preventDefault(); }
      else if (cu) { var r = cu.getBoundingClientRect(), x = lim((e.clientX - r.left) / r.width, 0, 1), y = lim(1 - (e.clientY - r.top) / r.height, 0, 1), pts = n.p[A.canal], ix = -1, perto = 0.06;
        pts.forEach(function (p, i) { var dd = Math.hypot(p[0] - x, p[1] - y); if (dd < perto) { perto = dd; ix = i; } }); passo();
        if (ix < 0) { pts.push([x, y]); pts.sort(function (a, b) { return a[0] - b[0]; }); ix = pts.map(function (p) { return p[0]; }).indexOf(x); }
        arr2 = {tipo: "curva", cu: cu, ix: ix}; cu.setPointerCapture(e.pointerId); moverCurva(e); e.preventDefault(); } });
    function moverRoda(e) { var n = noSel(), r = arr2.d.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width - 0.5) / 0.46, y = ((e.clientY - r.top) / r.height - 0.5) / 0.46, m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } var a = n.p[arr2.k] = n.p[arr2.k] || [0, 0, 0]; a[0] = +x.toFixed(3); a[1] = +y.toFixed(3); var i = arr2.d.querySelector("i"); i.style.left = (50 + x * 46) + "%"; i.style.top = (50 + y * 46) + "%"; mudou(true); }
    function moverCurva(e) { var n = noSel(), r = arr2.cu.getBoundingClientRect(), pts = n.p[A.canal], i = arr2.ix, x = lim((e.clientX - r.left) / r.width, 0, 1), y = lim(1 - (e.clientY - r.top) / r.height, 0, 1);
      if (i === 0) x = 0; else if (i === pts.length - 1) x = 1; else x = lim(x, pts[i - 1][0] + 0.01, pts[i + 1][0] - 0.01); pts[i] = [+x.toFixed(4), +y.toFixed(4)]; arr2.cu.innerHTML = curvaSvg(n); mudou(true); }
    lado.addEventListener("pointermove", function (e) { if (!arr2) return; if (arr2.tipo === "roda") moverRoda(e); else moverCurva(e); });
    function soltar2() { if (!arr2) return; arr2 = null; desGrafo(); mudou(); }
    lado.addEventListener("pointerup", soltar2); lado.addEventListener("pointercancel", soltar2);

    /* conta-gotas do branco: lê a imagem ANTES do nó de balanço e calcula os ganhos que deixam aquele ponto neutro */
    q("#cnVisor").addEventListener("click", function (e) { if (!A.gota || e.target !== cv) return; var n = noSel(); if (!n || n.tipo !== "wb") { A.gota = false; return; }
      var f = cfg.quadro && cfg.quadro(); if (!f) return; var r = cv.getBoundingClientRect(), u = lim((e.clientX - r.left) / r.width, 0, 1), v = lim((e.clientY - r.top) / r.height, 0, 1), m = motor2(), w = 320, h = Math.max(2, Math.round(320 * f.h / f.w));
      var tela = m.aplicar(f.el, f.w, f.h, G(), {max: 320, ate: n.id, sempre: true}); if (!tela) { aviso("Não consegui ler a imagem", true); return; } w = tela.width; h = tela.height;
      var px = Math.round(lim(u * w - 3, 0, w - 7)), py = Math.round(lim((1 - v) * h - 3, 0, h - 7)), d = m.ler(px, py, 7, 7), R = 0, Gn = 0, B = 0; for (var i = 0; i < d.length; i += 4) { R += d[i]; Gn += d[i + 1]; B += d[i + 2]; }
      if (R + Gn + B < 49 * 3 * 12) { aviso("Ponto escuro demais: escolha algo claro", true); return; } if (Math.min(R, Gn, B) > 49 * 250) { aviso("Ponto estourado: escolha um branco com detalhe", true); return; }
      passo(); var md = (R + Gn + B) / 3; n.p.gr = +lim(md / Math.max(1, R), 0.4, 2.5).toFixed(4); n.p.gg = +lim(md / Math.max(1, Gn), 0.4, 2.5).toFixed(4); n.p.gb = +lim(md / Math.max(1, B), 0.4, 2.5).toFixed(4); n.p.temp = 0; n.p.matiz = 0;
      A.gota = false; q("#cnVisor").classList.remove("gota"); desLado(); desGrafo(); mudou(); aviso("⚪ Branco acertado por este ponto"); });

    function importar(arqs) { var lista = [].slice.call(arqs || []), feitos = 0, erro = ""; if (!lista.length) return;
      Promise.all(lista.map(function (a) { return a.text().then(function (txt) { var l = lerCube(txt); return lutGuardar(a.name.replace(/\.cube$/i, ""), l.n, l.dados).then(function (o) { feitos++; return o; }); }).catch(function (e) { erro = (e && e.message) || "não deu para ler"; return null; }); }))
        .then(function (r) { var ult = r.filter(Boolean).pop(); desLado(); if (ult) { var n = noSel(); if (n && n.tipo === "lut" && !n.p.lut) { n.p.lut = ult.id; n.p.nome = ult.nome; desGrafo(); desLado(); mudou(); } aviso("▦ " + feitos + " LUT" + (feitos > 1 ? "s guardadas" : " guardada") + " neste aparelho"); } else aviso("LUT: " + erro, true); }); }
    function baixar(nome, txt) { var b = new Blob([txt], {type: "text/plain"}), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
    function menuNo(bt) { var itens = Object.keys(TIPOS).map(function (k) { return {icone: TIPOS[k].ic, rot: TIPOS[k].nome, fn: function () { inserir(k); }}; }); if (window.BWFerr && BWFerr.menu) { var r = bt.getBoundingClientRect(); BWFerr.menu(r.left, r.bottom + 4, itens, "Qual nó?"); } else { A.sel = null; A.painel = "tipos"; lado.innerHTML = '<p class="cn-h">Qual nó?</p><div class="cn-lista">' + Object.keys(TIPOS).map(function (k) { return '<div class="cn-item"><button class="cn-b" data-novo="' + k + '">' + TIPOS[k].ic + " " + TIPOS[k].nome + "</button></div>"; }).join("") + "</div>"; aba("ajustes"); } }

    el.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || !el.contains(b)) return; var a = b.dataset.a, n = noSel();
      if (b.dataset.aba) { aba(b.dataset.aba); return; }
      if (b.dataset.novo) { inserir(b.dataset.novo); return; }
      if (b.dataset.canal) { A.canal = b.dataset.canal; desLado(); return; }
      if (b.dataset.pre != null) { passo(); c.nos = PRESETS[+b.dataset.pre][2](); A.sel = c.nos.nos[0] ? c.nos.nos[0].id : null; A.painel = "no"; desGrafo(); desLado(); mudou(); aviso("★ " + PRESETS[+b.dataset.pre][0]); return; }
      if (b.dataset.meu != null) { var mm = meus()[+b.dataset.meu]; if (mm) { passo(); c.nos = copia(mm.g); c.nos.nos.forEach(function (x) { x.id = x.id; }); A.sel = null; A.painel = "no"; desGrafo(); desLado(); mudou(); aviso("★ " + mm.nome); } return; }
      if (b.dataset.meux != null) { var lm = meus(); lm.splice(+b.dataset.meux, 1); meusGravar(lm); desLado(); return; }
      if (b.dataset.lut) { var alvo = n && n.tipo === "lut" ? n : inserir("lut"); alvo.p.lut = b.dataset.lut; alvo.p.nome = LUTS[b.dataset.lut].nome; A.sel = alvo.id; A.painel = "no"; desGrafo(); desLado(); mudou(); aviso("▦ " + alvo.p.nome); return; }
      if (b.dataset.lutb) { var lb = LUTS[b.dataset.lutb]; if (lb) baixar(lb.nome.replace(/[^\w\-. À-ú]+/g, "_") + ".cube", escreverCube(lb.nome, lb.n, lb.dados)); return; }
      if (b.dataset.lutx) { if (confirm("Apagar esta LUT deste aparelho?")) lutApagar(b.dataset.lutx).then(function () { desLado(); desGrafo(); mudou(); }); return; }
      switch (a) {
        case "voltar": fechar(); break;
        case "mais": menuNo(b); break;
        case "presets": A.painel = A.painel === "presets" ? "no" : "presets"; desLado(); if (window.innerWidth <= 900) aba("ajustes"); break;
        case "luts": A.painel = A.painel === "luts" ? "no" : "luts"; lutsCarregar().then(desLado); desLado(); if (window.innerWidth <= 900) aba("ajustes"); break;
        case "antes": A.antes = !A.antes; b.classList.toggle("on", A.antes); A.sujo = true; break;
        case "tocar": if (cfg.tocar) cfg.tocar(); A.sujo = true; break;
        case "desfazer": var u = A.hist.pop(); if (u) { c.nos = JSON.parse(u); if (!noSel()) A.sel = null; desGrafo(); desLado(); mudou(); } else aviso("Nada para desfazer aqui"); break;
        case "limpar": if (!G().nos.length) break; passo(); c.nos = vazio(); A.sel = null; desGrafo(); desLado(); mudou(); aviso("Cor avançada limpa"); break;
        case "todos": if (cfg.todos) { var qt = cfg.todos(copia(c.nos)); aviso("⇉ Nós copiados para " + qt + " take" + (qt === 1 ? "" : "s")); } break;
        case "gota": A.gota = !A.gota; q("#cnVisor").classList.toggle("gota", A.gota); b.classList.toggle("on", A.gota); A.sujo = true; if (A.gota && window.innerWidth <= 900) aviso("🎯 Toque no branco da imagem"); break;
        case "wbZerar": if (n) { passo(); n.p = copia(TIPOS.wb.p); desLado(); desGrafo(); mudou(); } break;
        case "noZerar": if (n) { passo(); var lu = n.p.lut, ln = n.p.nome, pf = n.p.perfil; n.p = copia(TIPOS[n.tipo].p); if (n.tipo === "lut") { n.p.lut = lu; n.p.nome = ln; } if (n.tipo === "log") n.p.perfil = pf; n.k = 100; desLado(); desGrafo(); mudou(); } break;
        case "noDup": if (n) { passo(); var d2 = copia(n); d2.id = uid(); d2.x = Math.min(1640, n.x + 30); d2.y = Math.min(440, n.y + 70); G().nos.push(d2); var dep = null; G().lig.forEach(function (l) { if (l[0] === n.id) dep = l; }); if (dep) { var pr = dep[1]; dep[1] = d2.id; G().lig.push([d2.id, pr]); } A.sel = d2.id; desGrafo(); desLado(); mudou(); } break;
        case "curvaS": if (n) { passo(); n.p[A.canal] = copia(S); desLado(); mudou(); } break;
        case "curvaZ": if (n) { passo(); n.p[A.canal] = [[0, 0], [1, 1]]; desLado(); mudou(); } break;
        case "salvarPre": if (!G().nos.length) { aviso("Crie pelo menos um nó antes de salvar", true); break; } var nm = (prompt("Nome do preset:", "Meu look") || "").trim(); if (!nm) break; var l2 = meus(); l2.unshift({nome: nm.slice(0, 40), g: copia(G())}); meusGravar(l2); desLado(); aviso("★ Preset salvo neste aparelho"); break;
        case "criarLut": if (!ativo(G())) { aviso("Monte a cor com os nós antes de criar a LUT", true); break; } var nl = (prompt("Nome da LUT:", "Meu look") || "").trim(); if (!nl) break; var gl = gerarLut(G(), 33); if (!gl) { aviso("Não consegui criar a LUT neste navegador", true); break; } lutGuardar(nl, gl.n, gl.dados).then(function (o) { desLado(); aviso("▦ LUT criada — ⬇ baixa o .cube"); }); break;
      }
    });
    q("#cnTempo").addEventListener("input", function (e) { if (cfg.irPara) cfg.irPara(c.ini + (+e.target.value / 1000) * Math.max(0, c.dur - 0.02)); A.sujo = true; });
    A.tecla = function (e) { if (!A) return; if (document.querySelector(".bwf-menu")) return;   /* menu aberto: o Esc é dele */
      if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); if (A.gota) { A.gota = false; q("#cnVisor").classList.remove("gota"); desLado(); } else fechar(); return; }
      var tg = e.target && e.target.tagName; if (tg === "INPUT" || tg === "SELECT" || tg === "TEXTAREA") { if (!(e.key === " " && e.target.type === "range")) { e.stopPropagation(); return; } }
      if ((e.key === "Delete" || e.key === "Backspace") && A.sel) { e.preventDefault(); tirar(A.sel); } else if (e.key === " ") { e.preventDefault(); if (cfg.tocar) cfg.tocar(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); q('[data-a="desfazer"]').click(); }
      e.stopPropagation(); };
    document.addEventListener("keydown", A.tecla, true);
    window.addEventListener("bw-cor-lut", function () { if (A) { desGrafo(); A.sujo = true; } });
    lutsCarregar().then(function () { if (A) { desGrafo(); desLado(); } });
    A.sel = cadeia(G())[0] ? cadeia(G())[0].id : null; desGrafo(); desLado(); laco();
    A.api = {inserir: inserir, ligar: ligar, tirar: tirar, desenhar: desenhar, sel: function (id) { A.sel = id; A.painel = "no"; desGrafo(); desLado(); }, estado: function () { return A; }};
    return A.api;
  }

  lutsCarregar();
  window.BWCorNos = {
    TIPOS: TIPOS, LOGS: LOGS, PRESETS: PRESETS, LUTS: LUTS, novo: novo, vazio: vazio, cadeia: cadeia, ativo: ativo, neutro: neutro,
    aplicar: function (f, fw, fh, g, op) { return M1.aplicar(f, fw, fh, g, op); }, suporta: function () { return M1.ok(); }, bits: function () { return M1.bits(); },
    lerCube: lerCube, escreverCube: escreverCube, gerarLut: gerarLut, lutGuardar: lutGuardar, lutApagar: lutApagar, lutsCarregar: lutsCarregar, luts: function () { return LUTLISTA || []; },
    curva256: curva256, rodaRGB: rodaRGB, escopos: escopos, abrir: abrir, fechar: fechar, aberta: function () { return !!A; }, tela: function () { return A && A.api; }, linha: linha
  };
})();
