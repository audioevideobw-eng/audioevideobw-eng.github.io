/* BW CHROMA KEY (21/11/2026) — tira o fundo de cor lisa (verde, azul…) de um vídeo ou imagem, NO APARELHO.
   Nada sai do aparelho: este arquivo não fala com a internet nem com a conta.
   Uso: BWChroma.aplicar(fonte, largura, altura, {ckCor, ckInt, ckSuave, ckLimpa, ckSombra}) → canvas com transparência (ou null).
        BWChroma.detectar(fonte, largura, altura) → "#rrggbb" da cor de fundo (pelas bordas) · BWChroma.motor() → "webgl" | "2d".
   Método (igual no WebGL e no plano B em 2D): distância da cor do pixel até a cor escolhida no plano de croma (Cb/Cr) →
   INTENSIDADE = até onde some; SUAVIZAR BORDA = largura da passagem; LIMPAR BORDA = tira o reflexo da cor na pessoa;
   SOMBRA = o que é mais escuro que o fundo fica como sombra escura meio transparente. */
(function () {
  "use strict";
  var MAX = 1280, CV = null, GL = null, PROG = null, TEX = null, U = {}, FALHOU = false, CV2 = null, PEQ = null;
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rgb(hex) { var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "")); var n = parseInt(m ? m[1] : "00d000", 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function hex(r, g, b) { return "#" + [r, g, b].map(function (v) { v = lim(Math.round(v), 0, 255).toString(16); return v.length < 2 ? "0" + v : v; }).join(""); }
  function par(o) { o = o || {}; var n = function (v, p) { return lim((v == null || isNaN(+v) ? p : +v) / 100, 0, 1); };
    return {cor: rgb(o.ckCor), tol: 0.04 + 0.34 * n(o.ckInt, 35), suave: 0.015 + 0.25 * n(o.ckSuave, 20), limpa: n(o.ckLimpa, 60), sombra: n(o.ckSombra, 0)}; }
  function medida(fw, fh) { var k = Math.min(1, MAX / Math.max(fw, fh)); return [Math.max(2, Math.round(fw * k)), Math.max(2, Math.round(fh * k))]; }

  var FS = "precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec3 cor;uniform float tol,suave,limpa,sombra;" +
    "vec2 cc(vec3 c){return vec2(-0.168736*c.r-0.331264*c.g+0.5*c.b,0.5*c.r-0.418688*c.g-0.081312*c.b);}" +
    "float lu(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}" +
    "void main(){vec4 p=texture2D(t,v);vec3 c=p.rgb;float d=distance(cc(c),cc(cor));float a=smoothstep(tol,tol+suave,d);" +
    "float m=max(cor.r,max(cor.g,cor.b));vec3 l=c;" +
    "if(cor.g>=m-0.001){l.g=min(c.g,max(c.r,c.b));}else if(cor.b>=m-0.001){l.b=min(c.b,max(c.r,c.g));}else{l.r=min(c.r,max(c.g,c.b));}" +
    "c=mix(c,l,limpa);float lk=max(lu(cor),0.05);float s=sombra*clamp(1.0-lu(p.rgb)/lk,0.0,1.0)*(1.0-a);" +
    "float af=(a+s*(1.0-a))*p.a;vec3 f=af>0.0?(c*a)/max(a+s*(1.0-a),0.0001):vec3(0.0);gl_FragColor=vec4(f*af,af);}";
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
      ["cor", "tol", "suave", "limpa", "sombra"].forEach(function (k) { U[k] = GL.getUniformLocation(PROG, k); });
      CV.addEventListener("webglcontextlost", function (e) { e.preventDefault(); GL = null; FALHOU = true; });
      return true;
    } catch (e) { GL = null; FALHOU = true; return false; }
  }
  function porGL(fonte, w, h, p) {
    if (CV.width !== w || CV.height !== h) { CV.width = w; CV.height = h; } GL.viewport(0, 0, w, h);
    GL.bindTexture(GL.TEXTURE_2D, TEX); GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, fonte);
    GL.uniform3f(U.cor, p.cor[0], p.cor[1], p.cor[2]); GL.uniform1f(U.tol, p.tol); GL.uniform1f(U.suave, p.suave); GL.uniform1f(U.limpa, p.limpa); GL.uniform1f(U.sombra, p.sombra);
    GL.clearColor(0, 0, 0, 0); GL.clear(GL.COLOR_BUFFER_BIT); GL.drawArrays(GL.TRIANGLE_STRIP, 0, 4); return CV;
  }
  function por2D(fonte, w, h, p) {
    if (!CV2) CV2 = document.createElement("canvas"); if (CV2.width !== w || CV2.height !== h) { CV2.width = w; CV2.height = h; }
    var x = CV2.getContext("2d", {willReadFrequently: true}); x.globalCompositeOperation = "copy"; x.drawImage(fonte, 0, 0, w, h);
    var im = x.getImageData(0, 0, w, h), d = im.data, K = p.cor, kb = -0.168736 * K[0] - 0.331264 * K[1] + 0.5 * K[2], kr = 0.5 * K[0] - 0.418688 * K[1] - 0.081312 * K[2];
    var m = Math.max(K[0], K[1], K[2]), canal = K[1] >= m - 0.001 ? 1 : K[2] >= m - 0.001 ? 2 : 0, lk = Math.max(0.299 * K[0] + 0.587 * K[1] + 0.114 * K[2], 0.05);
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, cb = -0.168736 * r - 0.331264 * g + 0.5 * b, cr = 0.5 * r - 0.418688 * g - 0.081312 * b;
      var dist = Math.sqrt((cb - kb) * (cb - kb) + (cr - kr) * (cr - kr)), q = lim((dist - p.tol) / p.suave, 0, 1), a = q * q * (3 - 2 * q);
      if (a >= 1 && !p.limpa) continue;
      var lr = r, lg = g, lb = b; if (canal === 1) lg = Math.min(g, Math.max(r, b)); else if (canal === 2) lb = Math.min(b, Math.max(r, g)); else lr = Math.min(r, Math.max(g, b));
      r += (lr - r) * p.limpa; g += (lg - g) * p.limpa; b += (lb - b) * p.limpa;
      var s = p.sombra * lim(1 - (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255 / lk, 0, 1) * (1 - a), cob = a + s * (1 - a), k = cob > 0 ? a / cob : 0;
      d[i] = r * k * 255; d[i + 1] = g * k * 255; d[i + 2] = b * k * 255; d[i + 3] = cob * d[i + 3];
    }
    x.putImageData(im, 0, 0); return CV2;
  }
  function aplicar(fonte, fw, fh, o) {
    if (!fonte || !fw || !fh) return null; var md = medida(fw, fh), p = par(o);
    try { if (iniciar()) return porGL(fonte, md[0], md[1], p); } catch (e) { GL = null; FALHOU = true; }
    try { return por2D(fonte, md[0], md[1], p); } catch (e2) { return null; }
  }
  /* cor do fundo pelas BORDAS da imagem: a média dos pixels de borda onde verde ou azul manda de verdade */
  function detectar(fonte, fw, fh) {
    try {
      if (!PEQ) PEQ = document.createElement("canvas"); PEQ.width = PEQ.height = 48; var x = PEQ.getContext("2d", {willReadFrequently: true}); x.drawImage(fonte, 0, 0, 48, 48);
      var d = x.getImageData(0, 0, 48, 48).data, sv = [0, 0, 0, 0], sa = [0, 0, 0, 0];
      for (var y = 0; y < 48; y++) for (var c = 0; c < 48; c++) { if (y > 5 && y < 42 && c > 5 && c < 42) continue; var i = (y * 48 + c) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
        if (g - Math.max(r, b) > 35) { sv[0] += r; sv[1] += g; sv[2] += b; sv[3]++; } else if (b - Math.max(r, g) > 35) { sa[0] += r; sa[1] += g; sa[2] += b; sa[3]++; } }
      var s = sv[3] >= sa[3] ? sv : sa; if (s[3] < 20) return null; return hex(s[0] / s[3], s[1] / s[3], s[2] / s[3]);
    } catch (e) { return null; }
  }
  window.BWChroma = {aplicar: aplicar, detectar: detectar, motor: function () { return iniciar() ? "webgl" : "2d"; }, _2d: function (f, w, h, o) { var md = medida(w, h); return por2D(f, md[0], md[1], par(o)); }};
})();
