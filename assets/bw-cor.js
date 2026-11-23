/* BW COR (21/11/2026) — ajuste de cor de um take, NO APARELHO, como o painel "Ajuste › Básico" do CapCut.
   Nada sai do aparelho: este arquivo não fala com a internet nem com a conta e não guarda nada.
   Uso: BWCor.aplicar(fonte, largura, altura, grade) → canvas com a cor ajustada (ou null) · BWCor.ativo(grade) → há algo para fazer?
        BWCor.CAMPOS (nome, faixa e grupo de cada ajuste) · BWCor.LOOKS (pontos de partida prontos) · BWCor.motor() → "webgl" | "2d".
   grade = {expo, cont, realce, sombra, branco, preto, brilho, temp, matiz, sat, vib, nit, fade, vinheta} — todos de −100 a 100 (0 = original).
   A mesma conta roda no WebGL (rápido) e no plano B em 2D (celular sem WebGL): o resultado é igual. */
(function () {
  "use strict";
  var MAX = 1280, MAX2D = 960, CV = null, GL = null, PROG = null, TEX = null, U = {}, FALHOU = false, CV2 = null;
  var CAMPOS = [
    ["LUZ", "expo", "Exposição"], ["LUZ", "cont", "Contraste"], ["LUZ", "realce", "Realces"], ["LUZ", "sombra", "Sombras"],
    ["LUZ", "branco", "Brancos"], ["LUZ", "preto", "Pretos"], ["LUZ", "brilho", "Brilho"],
    ["COR", "temp", "Temperatura"], ["COR", "matiz", "Matiz"], ["COR", "sat", "Saturação"], ["COR", "vib", "Realce de cor"],
    ["ACABAMENTO", "nit", "Nitidez"], ["ACABAMENTO", "fade", "Desbotar"], ["ACABAMENTO", "vinheta", "Vinheta"]];
  var CHAVES = CAMPOS.map(function (c) { return c[1]; });
  /* pontos de partida (o usuário ajusta depois); nomes próprios, sem marca de ninguém */
  var LOOKS = {
    natural: {nome: "Natural+", g: {cont: 12, sat: 8, vib: 12, nit: 15}},
    quente: {nome: "Quente", g: {temp: 30, matiz: 4, sat: 8, cont: 8}},
    frio: {nome: "Frio", g: {temp: -28, sat: 4, cont: 10}},
    cinema: {nome: "Cinema", g: {cont: 22, realce: -20, sombra: 12, preto: -10, sat: -12, temp: 8, vinheta: 25}},
    vivido: {nome: "Vívido", g: {cont: 18, sat: 28, vib: 20, nit: 20}},
    evento: {nome: "Palco", g: {expo: 6, cont: 15, realce: -25, preto: -12, vib: 25}},
    pb: {nome: "Preto e branco", g: {sat: -100, cont: 25, nit: 10}},
    desbotado: {nome: "Desbotado", g: {fade: 45, sat: -18, cont: -10, temp: 6}}};
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(g, k) { var v = g && +g[k]; return isNaN(v) ? 0 : lim(v, -100, 100) / 100; }
  function ativo(g) { if (!g) return false; for (var i = 0; i < CHAVES.length; i++) if (num(g, CHAVES[i])) return true; return false; }
  function medida(fw, fh, mx) { var k = Math.min(1, mx / Math.max(fw, fh)); return [Math.max(2, Math.round(fw * k)), Math.max(2, Math.round(fh * k))]; }

  /* A CONTA (igual nos dois motores): exposição em pontos de luz → temperatura/matiz → realces/sombras/brancos/pretos pela luminância →
     contraste em volta do meio → brilho (gama) → saturação e vibração → desbotar (levanta o preto) → nitidez → vinheta. */
  var FS = "precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 px;" +
    "uniform float expo,cont,realce,sombra,branco,preto,brilho,temp,matiz,sat,vib,nit,fade,vinheta;" +
    "float lu(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}" +
    "void main(){vec4 p=texture2D(t,v);if(p.a<=0.0){gl_FragColor=vec4(0.0);return;}vec3 c=p.rgb;" +
    "if(nit!=0.0){vec3 m=(texture2D(t,v+vec2(px.x,0.0)).rgb+texture2D(t,v-vec2(px.x,0.0)).rgb+texture2D(t,v+vec2(0.0,px.y)).rgb+texture2D(t,v-vec2(0.0,px.y)).rgb)*0.25;c=c+(c-m)*nit*1.6;}" +
    "c=c*pow(2.0,expo*1.5);" +
    "c.r=c.r+temp*0.10+matiz*0.04;c.g=c.g-matiz*0.07;c.b=c.b-temp*0.10+matiz*0.04;" +
    "float L=clamp(lu(c),0.0,1.0);" +
    "c=c+realce*0.30*smoothstep(0.45,1.0,L)+sombra*0.30*(1.0-smoothstep(0.0,0.55,L))+branco*0.18*smoothstep(0.70,1.0,L)+preto*0.18*(1.0-smoothstep(0.0,0.30,L));" +
    "c=(c-0.5)*(cont>0.0?1.0+cont*0.9:1.0+cont*0.6)+0.5;" +
    "c=pow(max(c,vec3(0.0)),vec3(1.0/(1.0+brilho*0.55)));" +
    "L=lu(c);float s=1.0+sat;float cm=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));s=s+vib*(1.0-clamp(cm*2.0,0.0,1.0));c=mix(vec3(L),c,max(s,0.0));" +
    "c=mix(c,c*0.78+0.14,max(fade,0.0));" +
    "float d=distance(v,vec2(0.5))*1.4142;c=c*(1.0-vinheta*0.85*smoothstep(0.35,1.0,d));" +
    "c=clamp(c,0.0,1.0);gl_FragColor=vec4(c*p.a,p.a);}";
  var NOMES = ["expo", "cont", "realce", "sombra", "branco", "preto", "brilho", "temp", "matiz", "sat", "vib", "nit", "fade", "vinheta"];
  function iniciar() {
    if (GL || FALHOU) return !!GL;
    try {
      CV = document.createElement("canvas"); GL = CV.getContext("webgl", {premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true, antialias: false});
      if (!GL) throw new Error("sem webgl");
      var sh = function (tipo, src) { var s = GL.createShader(tipo); GL.shaderSource(s, src); GL.compileShader(s); if (!GL.getShaderParameter(s, GL.COMPILE_STATUS)) throw new Error(GL.getShaderInfoLog(s)); return s; };
      PROG = GL.createProgram(); GL.attachShader(PROG, sh(GL.VERTEX_SHADER, "attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}")); GL.attachShader(PROG, sh(GL.FRAGMENT_SHADER, FS)); GL.linkProgram(PROG);
      if (!GL.getProgramParameter(PROG, GL.LINK_STATUS)) throw new Error("link"); GL.useProgram(PROG);
      var b = GL.createBuffer(); GL.bindBuffer(GL.ARRAY_BUFFER, b); GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), GL.STATIC_DRAW);
      var loc = GL.getAttribLocation(PROG, "p"); GL.enableVertexAttribArray(loc); GL.vertexAttribPointer(loc, 2, GL.FLOAT, false, 0, 0);
      TEX = GL.createTexture(); GL.bindTexture(GL.TEXTURE_2D, TEX);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
      GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
      NOMES.concat(["px"]).forEach(function (k) { U[k] = GL.getUniformLocation(PROG, k); });
      CV.addEventListener("webglcontextlost", function (e) { e.preventDefault(); GL = null; FALHOU = true; });
      return true;
    } catch (e) { GL = null; FALHOU = true; return false; }
  }
  function porGL(fonte, w, h, g) {
    if (CV.width !== w || CV.height !== h) { CV.width = w; CV.height = h; } GL.viewport(0, 0, w, h);
    GL.bindTexture(GL.TEXTURE_2D, TEX); GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, fonte);
    NOMES.forEach(function (k) { GL.uniform1f(U[k], num(g, k)); }); GL.uniform2f(U.px, 1 / w, 1 / h);
    GL.clearColor(0, 0, 0, 0); GL.clear(GL.COLOR_BUFFER_BIT); GL.drawArrays(GL.TRIANGLE_STRIP, 0, 4); return CV;
  }
  function ss(a, b, x) { var t = lim((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function por2D(fonte, w, h, g) {
    if (!CV2) CV2 = document.createElement("canvas"); if (CV2.width !== w || CV2.height !== h) { CV2.width = w; CV2.height = h; }
    var x = CV2.getContext("2d", {willReadFrequently: true}); x.globalCompositeOperation = "copy"; x.drawImage(fonte, 0, 0, w, h);
    var im = x.getImageData(0, 0, w, h), d = im.data, o = g.nit ? new Uint8ClampedArray(d) : null, P = {};
    NOMES.forEach(function (k) { P[k] = num(g, k); });
    var ex = Math.pow(2, P.expo * 1.5), kc = P.cont > 0 ? 1 + P.cont * 0.9 : 1 + P.cont * 0.6, gam = 1 / (1 + P.brilho * 0.55);
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      var i = (yy * w + xx) * 4; if (!d[i + 3]) continue;   /* getImageData já vem sem pré-multiplicar */
      var r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
      if (o) { var sr = 0, sg = 0, sb = 0, n = 0, viz = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var q = 0; q < 4; q++) { var vx = lim(xx + viz[q][0], 0, w - 1), vy = lim(yy + viz[q][1], 0, h - 1), j = (vy * w + vx) * 4; sr += o[j] / 255; sg += o[j + 1] / 255; sb += o[j + 2] / 255; n++; }
        r += (r - sr / n) * P.nit * 1.6; gg += (gg - sg / n) * P.nit * 1.6; b += (b - sb / n) * P.nit * 1.6; }
      r *= ex; gg *= ex; b *= ex;
      r += P.temp * 0.10 + P.matiz * 0.04; gg -= P.matiz * 0.07; b += -P.temp * 0.10 + P.matiz * 0.04;
      var L = lim(0.2126 * r + 0.7152 * gg + 0.0722 * b, 0, 1), ad = P.realce * 0.30 * ss(0.45, 1, L) + P.sombra * 0.30 * (1 - ss(0, 0.55, L)) + P.branco * 0.18 * ss(0.7, 1, L) + P.preto * 0.18 * (1 - ss(0, 0.3, L));
      r += ad; gg += ad; b += ad;
      r = (r - 0.5) * kc + 0.5; gg = (gg - 0.5) * kc + 0.5; b = (b - 0.5) * kc + 0.5;
      r = Math.pow(Math.max(r, 0), gam); gg = Math.pow(Math.max(gg, 0), gam); b = Math.pow(Math.max(b, 0), gam);
      L = 0.2126 * r + 0.7152 * gg + 0.0722 * b; var cm = Math.max(r, gg, b) - Math.min(r, gg, b), s = Math.max(1 + P.sat + P.vib * (1 - lim(cm * 2, 0, 1)), 0);
      r = L + (r - L) * s; gg = L + (gg - L) * s; b = L + (b - L) * s;
      if (P.fade > 0) { r += (r * 0.78 + 0.14 - r) * P.fade; gg += (gg * 0.78 + 0.14 - gg) * P.fade; b += (b * 0.78 + 0.14 - b) * P.fade; }
      if (P.vinheta) { var dx = (xx + 0.5) / w - 0.5, dy = (yy + 0.5) / h - 0.5, dd = Math.sqrt(dx * dx + dy * dy) * 1.4142, kv = 1 - P.vinheta * 0.85 * ss(0.35, 1, dd); r *= kv; gg *= kv; b *= kv; }
      d[i] = lim(r, 0, 1) * 255; d[i + 1] = lim(gg, 0, 1) * 255; d[i + 2] = lim(b, 0, 1) * 255;
    }
    x.putImageData(im, 0, 0); return CV2;
  }
  function aplicar(fonte, fw, fh, g, so2d) {
    if (!fonte || !fw || !fh || !ativo(g)) return null;
    try { if (!so2d && iniciar()) { var md = medida(fw, fh, MAX); return porGL(fonte, md[0], md[1], g); } } catch (e) { GL = null; FALHOU = true; }
    try { var m2 = medida(fw, fh, MAX2D); return por2D(fonte, m2[0], m2[1], g); } catch (e2) { return null; }
  }
  /* 23/11/2026 (dono: "um sistema de cor parecido com o DaVinci, mais fácil: clicou, mudou, mas com profissionalismo, nada com cara de filtro"):
     CORREÇÃO AUTOMÁTICA = lê o quadro (cópia de 96 px, no aparelho) e devolve só CORREÇÕES, na ordem do colorista: balanço de branco (média dos
     tons neutros de luz média → temperatura/matiz), exposição (mediana da luz para ~0,45, só se estiver fora de 0,36–0,58) e pontos de preto e de
     branco (1% e 99% da luz). Usa as MESMAS constantes da conta acima; nunca mexe em saturação, estilo ou vinheta. null = não deu para ler. */
  function auto(fonte, fw, fh) {
    try { var k = Math.min(1, 96 / Math.max(fw, fh)), w = Math.max(2, Math.round(fw * k)), h = Math.max(2, Math.round(fh * k)), cvA = document.createElement("canvas"); cvA.width = w; cvA.height = h;
      var cxA = cvA.getContext("2d", {willReadFrequently: true}); cxA.drawImage(fonte, 0, 0, w, h); var d = cxA.getImageData(0, 0, w, h).data, n = w * h, Ls = [], sr = 0, sg = 0, sb = 0, nn = 0, ar = 0, ag = 0, ab = 0, na = 0;
      for (var i = 0; i < n; i++) { var r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255; if (d[i * 4 + 3] < 8) continue; var L = 0.2126 * r + 0.7152 * g + 0.0722 * b; Ls.push(L);
        if (L > 0.2 && L < 0.85) { ar += r; ag += g; ab += b; na++; var mx = Math.max(r, g, b); if ((mx - Math.min(r, g, b)) / (mx + 0.001) < 0.45) { sr += r; sg += g; sb += b; nn++; } } }   /* neutro = pouca cor EM RELAÇÃO à luz (uma dominante forte ainda conta como neutro tingido) */
      if (Ls.length < 50) return null; Ls.sort(function (a, b2) { return a - b2; }); var q = function (f) { return Ls[Math.min(Ls.length - 1, Math.floor(Ls.length * f))]; };
      var G = {}, forca = 0.85; if (nn < Ls.length * 0.05) { sr = ar; sg = ag; sb = ab; nn = na; forca = 0.4; }   /* poucos tons neutros: corrige com metade da força */
      var med = q(0.5), ganho = 1; if (med > 0.005 && (med < 0.36 || med > 0.58)) { G.expo = lim(Math.log(0.45 / med) / Math.LN2 / 1.5 * 0.8, -0.6, 0.6); ganho = Math.pow(2, G.expo * 1.5); }
      if (nn > 20) { sr = sr / nn * ganho; sg = sg / nn * ganho; sb = sb / nn * ganho; var m = (sr + sg + sb) / 3, dr = m - sr, dg = m - sg, db = m - sb; G.temp = lim((dr - db) / 0.2 * forca, -0.7, 0.7); G.matiz = lim(-dg / 0.07 * forca, -0.6, 0.6); }   /* a exposição vem antes na conta: a dominante cresce com o ganho */
      var p1 = lim(q(0.01) * ganho, 0, 1), p99 = lim(q(0.99) * ganho, 0, 1);
      if (p1 > 0.06) G.preto = lim(-(p1 - 0.03) / 0.18, -0.8, 0); if (p99 < 0.9) G.branco = lim((0.94 - p99) / 0.18, 0, 0.8);
      if (p99 - p1 < 0.5) G.cont = 0.12;
      var o = {}, tem = false; Object.keys(G).forEach(function (kk) { var v = Math.round(G[kk] * 100); if (Math.abs(v) >= 3) { o[kk] = v; tem = true; } }); return tem ? o : {};
    } catch (e) { return null; }
  }
  /* REALCE DE COR (o "Color Boost"): níveis prontos da barra de realce — aviva o que está apagado e poupa pele e cores já fortes. Só mexe em vib. */
  var REALCE = [["Desligado", 0], ["Leve", 22], ["Médio", 42], ["Forte", 64]];
  window.BWCor = {auto: auto, REALCE: REALCE, CORRECAO: ["temp", "matiz", "expo", "preto", "branco", "cont"], CAMPOS: CAMPOS, CHAVES: CHAVES, LOOKS: LOOKS, ativo: ativo, aplicar: aplicar, motor: function () { return iniciar() ? "webgl" : "2d"; }, _2d: function (f, w, h, g) { return aplicar(f, w, h, g, true); }};
})();
