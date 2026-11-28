/* BW VÍDEO DO IPHONE (28/11/2026, pedido do dono: "faça para takes de vídeo realizados de iPhone, todos os formatos").
   O iPhone grava em formatos que só o Safari abre sozinho: HEVC/H.265 (o padrão "Alta eficiência"), HDR em HLG e Dolby Vision,
   4K 60p, câmera lenta (120/240 q/s), modo Cinema, vídeo ESPACIAL (MV-HEVC, dois olhos) e ProRes / ProRes Log.
   Este módulo transforma o take num MP4 H.264 com AAC (abre em qualquer lugar) mantendo tamanho, quadros, giro (vertical)
   e o som. Dois caminhos:
     1) NO APARELHO (navegador, celular Android, app BW): lê o índice do MOV, decodifica com o VideoDecoder do próprio aparelho
        (peça de vídeo do celular / placa do PC) e comprime em H.264 com o VideoEncoder. Nada sai do aparelho.
     2) NO APP BW DO PC (quando o aparelho não decodifica, e para ProRes): manda o arquivo para o próprio PC, o FFmpeg converte
        (NVIDIA quando há) e devolve. Também não sai do computador.
   BWVideoIphone.info(blob) → o que é o take · converter(blob, {nome, aoProgredir, curto, cancelar}) → {blob, nome, w, h, via, ...}
   converterSePreciso(blob, nome, aoProgredir) → null quando o navegador já abre o take; senão o MP4 convertido. */
(function () {
  "use strict";
  function dorme(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function par(v) { v = Math.max(2, Math.round(v)); return v - v % 2; }
  async function lerBytes(blob, a, b) { return new Uint8Array(await blob.slice(a, b).arrayBuffer()); }
  function u16(b, o) { return (b[o] << 8) | b[o + 1]; }
  function u32(b, o) { return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]; }
  function i32(b, o) { return u32(b, o) | 0; }
  function u64(b, o) { return u32(b, o) * 4294967296 + u32(b, o + 4); }
  function tipo4(b, o) { return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]); }
  function filhos(b, ini, fim) { var r = []; for (var o = ini; o + 8 <= fim;) { var t = u32(b, o), n = tipo4(b, o + 4), h = 8; if (t === 1) { t = u64(b, o + 8); h = 16; } else if (t === 0) t = fim - o; if (t < h || o + t > fim) break; r.push({ t: n, ini: o + h, fim: o + t }); o += t; } return r; }
  function acha(b, caixa, nome) { if (!caixa) return null; var f = filhos(b, caixa.ini, caixa.fim); for (var i = 0; i < f.length; i++) if (f[i].t === nome) return f[i]; return null; }
  async function lerMoov(blob) {
    var o = 0, N = blob.size;
    while (o + 8 <= N) { var h = await lerBytes(blob, o, Math.min(N, o + 16)), t = u32(h, 0), n = tipo4(h, 4); if (t === 1) t = u64(h, 8); else if (t === 0) t = N - o; if (t < 8) return null;
      if (n === "moov") { if (t > 300e6) return null; var b = await lerBytes(blob, o, o + t); return { b: b, raiz: { ini: 8, fim: t } }; } o += t; }
    return null;
  }

  var PRORES = { apco: "ProRes 422 Proxy", apcs: "ProRes 422 LT", apcn: "ProRes 422", apch: "ProRes 422 HQ", ap4h: "ProRes 4444", ap4x: "ProRes 4444 XQ", aprn: "ProRes RAW", aprh: "ProRes RAW HQ" };
  function bitsInvertidos(v) { var r = 0; for (var i = 0; i < 32; i++) { r = (r << 1) | (v & 1); v >>>= 1; } return r >>> 0; }
  function codecHevc(pref, c) {   /* "hvc1.2.4.L153.B0" a partir do hvcC (ISO/IEC 14496-15, anexo E) */
    var p = c[1], esp = ["", "A", "B", "C"][p >> 6], tier = (p >> 5) & 1, perfil = p & 31, compat = bitsInvertidos(u32(c, 2)).toString(16), nivel = c[12], lim = [];
    for (var i = 6; i < 12; i++) lim.push(c[i]); while (lim.length && !lim[lim.length - 1]) lim.pop();
    return pref + "." + esp + perfil + "." + compat + "." + (tier ? "H" : "L") + nivel + lim.map(function (x) { return "." + x.toString(16).toUpperCase(); }).join("");
  }
  function hex2(x) { return (x < 16 ? "0" : "") + x.toString(16); }

  /* ---------- o que é o take ---------- */
  async function info(blob) {
    var mv = await lerMoov(blob); if (!mv) return { ok: false, motivo: "o arquivo não tem o índice (moov) — talvez não seja um vídeo do iPhone ou esteja incompleto" };
    var b = mv.b, traks = filhos(b, mv.raiz.ini, mv.raiz.fim).filter(function (x) { return x.t === "trak"; }), r = { ok: false, temSom: false, trilhas: traks.length };
    var mvhd = acha(b, mv.raiz, "mvhd"); if (mvhd) { var v1 = b[mvhd.ini] === 1, esc = u32(b, mvhd.ini + (v1 ? 20 : 12)), du = v1 ? u64(b, mvhd.ini + 24) : u32(b, mvhd.ini + 16); if (esc) r.dur = du / esc; }
    traks.forEach(function (tk) {
      var mdia = acha(b, tk, "mdia"), hdlr = acha(b, mdia, "hdlr"); if (!hdlr) return; var tipo = tipo4(b, hdlr.ini + 8);
      if (tipo === "soun") { r.temSom = true; return; }
      if (tipo !== "vide" || r.ok) return;
      var stbl = acha(b, acha(b, mdia, "minf"), "stbl"), stsd = acha(b, stbl, "stsd"); if (!stsd) return;
      var e0 = stsd.ini + 8, fmt = tipo4(b, e0 + 4), W = u16(b, e0 + 32), H = u16(b, e0 + 34), sub = filhos(b, e0 + 86, e0 + u32(b, e0));
      var mdhd = acha(b, mdia, "mdhd"), escala = mdhd ? (b[mdhd.ini] === 1 ? u32(b, mdhd.ini + 20) : u32(b, mdhd.ini + 12)) : 600;
      /* giro do vídeo vertical: a matriz do tkhd (o iPhone grava deitado e manda girar na hora de mostrar) */
      var tkhd = acha(b, tk, "tkhd"), rot = 0; if (tkhd) { var m = tkhd.ini + (b[tkhd.ini] === 1 ? 52 : 40), a = i32(b, m), bb = i32(b, m + 4); rot = ((Math.round(Math.atan2(bb, a) * 180 / Math.PI) % 360) + 360) % 360; rot = Math.round(rot / 90) * 90 % 360; }
      r.ok = true; r.fmt = fmt; r.w = W; r.h = H; r.rot = rot; r.escala = escala;
      r.codec = /^(hvc1|hev1|dvh1|dvhe)$/.test(fmt) ? "hevc" : /^(avc1|avc3|dva1|dvav)$/.test(fmt) ? "h264" : PRORES[fmt] ? "prores" : fmt === "av01" ? "av1" : fmt;
      r.nomeCodec = r.codec === "hevc" ? "HEVC (H.265)" : r.codec === "h264" ? "H.264" : r.codec === "prores" ? PRORES[fmt] : r.codec === "av1" ? "AV1" : fmt;
      sub.forEach(function (x) {
        if (x.t === "hvcC" || x.t === "avcC" || x.t === "av1C") { r.cfg = b.slice(x.ini, x.fim); r.cfgTipo = x.t; }
        if (x.t === "dvcC" || x.t === "dvvC") r.dolby = true;
        if (x.t === "lhvC" || x.t === "vexu") r.espacial = true;
        if (x.t === "colr" && /^ncl[xc]$/.test(tipo4(b, x.ini))) { var tr = u16(b, x.ini + 6); r.cor = { prim: u16(b, x.ini + 4), trans: tr, mat: u16(b, x.ini + 8) }; r.hdr = tr === 18 ? "HLG" : tr === 16 ? "PQ" : ""; }
      });
      if (/^dv/.test(fmt)) r.dolby = true;
      if (r.cfgTipo === "hvcC") r.codecStr = codecHevc(fmt === "hev1" || fmt === "dvhe" ? "hev1" : "hvc1", r.cfg);
      else if (r.cfgTipo === "avcC") r.codecStr = "avc1." + hex2(r.cfg[1]) + hex2(r.cfg[2]) + hex2(r.cfg[3]);
      /* índice das amostras: decodificação (stts), apresentação (ctts), quadros-chave (stss), tamanhos e lugares */
      var stts = acha(b, stbl, "stts"), ctts = acha(b, stbl, "ctts"), stss = acha(b, stbl, "stss"), stsz = acha(b, stbl, "stsz"), stsc = acha(b, stbl, "stsc"), stco = acha(b, stbl, "stco") || acha(b, stbl, "co64");
      if (!stts || !stsz || !stsc || !stco) { r.ok = false; r.motivo = "índice de vídeo incompleto"; return; }
      var nAm = u32(b, stsz.ini + 8), fixo = u32(b, stsz.ini + 4), am = new Array(nAm), dts = 0, k = 0;
      for (var i = 0, n = u32(b, stts.ini + 4); i < n; i++) { var c = u32(b, stts.ini + 8 + 8 * i), d = u32(b, stts.ini + 12 + 8 * i); for (var j = 0; j < c && k < nAm; j++, k++) { am[k] = { dts: dts, pts: dts, tam: fixo || u32(b, stsz.ini + 12 + 4 * k), chave: !stss }; dts += d; } }
      for (; k < nAm; k++) am[k] = { dts: dts, pts: dts, tam: fixo || u32(b, stsz.ini + 12 + 4 * k), chave: !stss };
      if (ctts) { k = 0; for (var i2 = 0, n2 = u32(b, ctts.ini + 4); i2 < n2; i2++) { var c2 = u32(b, ctts.ini + 8 + 8 * i2), off = i32(b, ctts.ini + 12 + 8 * i2); for (var j2 = 0; j2 < c2 && k < nAm; j2++, k++) am[k].pts = am[k].dts + off; } }
      if (stss) for (var s = 0, ns = u32(b, stss.ini + 4); s < ns; s++) { var q = u32(b, stss.ini + 8 + 4 * s) - 1; if (am[q]) am[q].chave = true; }
      var co64 = stco.t === "co64", nCh = u32(b, stco.ini + 4), nSc = u32(b, stsc.ini + 4), regras = [];
      for (var x = 0; x < nSc; x++) regras.push([u32(b, stsc.ini + 8 + 12 * x), u32(b, stsc.ini + 12 + 12 * x)]);
      k = 0; for (var ch = 0, ri = 0; ch < nCh && k < nAm; ch++) { while (ri + 1 < regras.length && ch + 1 >= regras[ri + 1][0]) ri++; var p0 = co64 ? u64(b, stco.ini + 8 + 8 * ch) : u32(b, stco.ini + 8 + 4 * ch); for (var y = 0; y < regras[ri][1] && k < nAm; y++, k++) { am[k].pos = p0; p0 += am[k].tam; } }
      /* lista de edição: começo do take (o iPhone às vezes manda pular os primeiros quadros) */
      var edts = acha(b, tk, "edts"), elst = edts && acha(b, edts, "elst"), mt = 0; if (elst && u32(b, elst.ini + 4) > 0) { mt = b[elst.ini] === 1 ? u64(b, elst.ini + 16) : i32(b, elst.ini + 12); if (mt < 0) mt = 0; }
      var pmin = Infinity; am.forEach(function (a) { a.pts -= mt; if (a.pts < pmin) pmin = a.pts; }); if (pmin < 0) am.forEach(function (a) { a.pts -= pmin; });
      r.amostras = am.filter(function (a) { return a.pos != null; }); r.quadros = r.amostras.length;
      var durV = dts / escala; if (durV > 0) { r.durV = durV; r.fps = Math.round(r.quadros / durV * 100) / 100; if (!r.dur) r.dur = durV; }
    });
    if (!r.ok && !r.motivo) r.motivo = "o arquivo não tem faixa de vídeo";
    return r;
  }
  function descricao(i) {   /* "HEVC · HDR (HLG) · 4K · 60 q/s · vertical" para o aviso */
    if (!i || !i.ok) return "vídeo"; var p = [i.nomeCodec];
    if (i.dolby) p.push("Dolby Vision"); else if (i.hdr) p.push("HDR (" + i.hdr + ")");
    if (i.espacial) p.push("espacial"); var lado = Math.max(i.w, i.h); p.push(lado >= 3800 ? "4K" : lado >= 1900 ? "Full HD" : lado >= 1270 ? "HD" : i.w + "×" + i.h);
    if (i.fps) p.push((i.fps > 100 ? "câmera lenta " : "") + Math.round(i.fps) + " q/s"); return p.join(" · ");
  }

  /* ---------- 1) no aparelho: VideoDecoder → canvas (giro + tamanho) → VideoEncoder H.264 ---------- */
  async function decoderPara(i) {
    if (!window.VideoDecoder || !window.VideoEncoder || !i.codecStr || !i.cfg) return null;
    var tent = [i.codecStr]; if (i.codec === "hevc") tent.push(i.codecStr.replace(/^hev1/, "hvc1").replace(/^hvc1/, "hev1"), "hvc1.2.4.L153.B0", "hvc1.1.6.L153.B0");
    for (var t = 0; t < tent.length; t++) for (var hw = 0; hw < 2; hw++) {
      var c = { codec: tent[t], codedWidth: i.w, codedHeight: i.h, description: i.cfg, hardwareAcceleration: hw ? "prefer-software" : "no-preference" };
      try { if ((await VideoDecoder.isConfigSupported(c)).supported) return c; } catch (e) { /* tenta o próximo */ }
    }
    return null;
  }
  async function podeNoAparelho(i) { return !!(i && i.ok && window.BWReelsCelular && BWReelsCelular._mp4 && await decoderPara(i)); }
  var CEL = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

  async function noAparelho(blob, i, op) {
    var prog = op.aoProgredir || function () {}, cancelar = op.cancelar || function () { return false; };
    var cfgD = await decoderPara(i); if (!cfgD) throw new Error("este aparelho não decodifica " + i.nomeCodec);
    var gira = i.rot === 90 || i.rot === 270, W0 = gira ? i.h : i.w, H0 = gira ? i.w : i.h, curto = op.curto || (CEL ? 1080 : 2160);
    var k = Math.min(1, curto / Math.min(W0, H0)), ow = par(W0 * k), oh = par(H0 * k), fps = Math.min(240, i.fps || 30);
    var cfgE = await BWReelsCelular.configVideo(ow, oh, Math.min(fps, 60)); if (!cfgE) { k = Math.min(k, 1080 / Math.min(W0, H0)); ow = par(W0 * k); oh = par(H0 * k); cfgE = await BWReelsCelular.configVideo(ow, oh, Math.min(fps, 60)); }
    if (!cfgE) throw new Error("este aparelho não comprime vídeo em " + ow + "×" + oh);
    cfgE.bitrate = Math.round(Math.max(4e6, Math.min(CEL ? 16e6 : 45e6, ow * oh * Math.min(fps, 60) * 0.16)));
    var cv = document.createElement("canvas"); cv.width = ow; cv.height = oh; var cx = cv.getContext("2d"), t0 = performance.now(), dur = i.durV || i.dur || 1;
    var am = [], avcC = null, erro = null, feitos = 0, ultChave = -1e9;
    var enc = new VideoEncoder({ output: function (c, meta) { if (meta && meta.decoderConfig && meta.decoderConfig.description) avcC = meta.decoderConfig.description; var d = new Uint8Array(c.byteLength); c.copyTo(d); am.push({ dados: d, ts: c.timestamp, chave: c.type === "key" }); }, error: function (e) { erro = e; } });
    enc.configure(cfgE);
    var dec = new VideoDecoder({ output: function (f) {
      try {
        cx.save(); if (i.rot === 90) { cx.translate(ow, 0); cx.rotate(Math.PI / 2); } else if (i.rot === 180) { cx.translate(ow, oh); cx.rotate(Math.PI); } else if (i.rot === 270) { cx.translate(0, oh); cx.rotate(-Math.PI / 2); }
        cx.drawImage(f, 0, 0, gira ? oh : ow, gira ? ow : oh); cx.restore();
        var ts = f.timestamp, kf = ts - ultChave >= 1e6; if (kf) ultChave = ts;   /* quadro-chave a cada 1 s: a linha do tempo pula rápido */
        var vf = new VideoFrame(cv, { timestamp: ts, duration: f.duration || undefined }); enc.encode(vf, { keyFrame: kf }); vf.close(); feitos++;
      } catch (e) { erro = e; } finally { f.close(); }
    }, error: function (e) { erro = e; } });
    dec.configure(cfgD);
    var L = i.amostras, esc = i.escala, ini = 0; while (ini < L.length && !L[ini].chave) ini++;   /* começa num quadro-chave */
    for (var a = ini; a < L.length;) {
      if (cancelar()) throw new Error("cancelado"); if (erro) throw erro;
      var b0 = L[a].pos, b1 = b0 + L[a].tam, z = a + 1; while (z < L.length && L[z].pos >= b1 && L[z].pos - b1 < 256e3 && L[z].pos + L[z].tam - b0 < 16e6) { b1 = L[z].pos + L[z].tam; z++; }
      var bloco = await lerBytes(blob, b0, b1);
      for (var q = a; q < z; q++) { var s = L[q], prox = q + 1 < L.length ? L[q + 1] : null;
        dec.decode(new EncodedVideoChunk({ type: s.chave ? "key" : "delta", timestamp: Math.round(s.pts / esc * 1e6), duration: prox ? Math.max(1, Math.round((prox.dts - s.dts) / esc * 1e6)) : undefined, data: bloco.subarray(s.pos - b0, s.pos - b0 + s.tam) }));
        while (dec.decodeQueueSize > 10 || enc.encodeQueueSize > 10) { if (erro) throw erro; await dorme(2); } }
      a = z; var pct = Math.min(96, feitos / Math.max(1, L.length) * 96), gasto = (performance.now() - t0) / 1000;
      prog({ etapa: "Convertendo os quadros", pct: pct, falta: pct > 2 ? gasto * (100 - pct) / pct : null, w: ow, h: oh });
    }
    await dec.flush(); dec.close(); await enc.flush(); enc.close(); if (erro) throw erro; if (!avcC || !am.length) throw new Error("o aparelho não entregou o vídeo comprimido");
    prog({ etapa: "Juntando o som", pct: 97, w: ow, h: oh });
    am.sort(function (x, y) { return x.ts - y.ts; }); var t00 = am[0].ts;
    am.forEach(function (x, n) { var pr = n + 1 < am.length ? am[n + 1].ts : x.ts + 1e6 / fps; x.dur = Math.max(1, Math.round((pr - x.ts) * 90000 / 1e6)); x.ts -= t00; });
    var trilhas = [{ tipo: "v", escala: 90000, w: ow, h: oh, amostras: am, stsd: BWReelsCelular._stsdVideo(ow, oh, avcC) }], comSom = false;
    if (i.temSom && window.BWProxy && BWProxy._lerSom && BWProxy._somAac) try { var som = await BWProxy._lerSom(blob, {}); var ta = som && await BWProxy._somAac(som, 192); if (ta) { trilhas.push(ta); comSom = true; } } catch (e) { console.warn("som do take", e); }
    var saida = BWReelsCelular._mp4(trilhas, Math.round(dur * 1000));
    prog({ etapa: "Pronto", pct: 100, w: ow, h: oh });
    return { blob: saida, w: ow, h: oh, via: "aparelho", comSom: comSom, quadros: feitos, segundos: (performance.now() - t0) / 1000 };
  }

  /* ---------- 2) no app BW do PC: o FFmpeg do computador converte (ProRes, e quando o aparelho não decodifica) ---------- */
  function ponte() { return window.BW_APP && (window.bwNode || window.BWNode); }
  function b64(u8) { var s = "", P = 0x8000; for (var o = 0; o < u8.length; o += P) s += String.fromCharCode.apply(null, u8.subarray(o, o + P)); return btoa(s); }
  function deB64(s) { var t = atob(s), u = new Uint8Array(t.length); for (var o = 0; o < t.length; o++) u[o] = t.charCodeAt(o); return u; }
  async function chama(acao, d) { var r = await ponte()(acao, d); if (!r || !r.ok) throw new Error((r && r.erro) || "o app BW não respondeu"); return r.valor; }
  async function noApp(blob, i, op) {
    var prog = op.aoProgredir || function () {}, cancelar = op.cancelar || function () { return false; }, PED = 6 << 20, t0 = performance.now();
    var ini = await chama("videoConvIni", { nome: op.nome || "take.mov", bytes: blob.size }), id = ini.id;
    try {
      for (var o = 0; o < blob.size; o += PED) { if (cancelar()) throw new Error("cancelado"); await chama("videoConvPedaco", { id: id, b64: b64(await lerBytes(blob, o, Math.min(blob.size, o + PED))) }); prog({ etapa: "Levando o take para o PC", pct: Math.min(30, o / blob.size * 30) }); }
      window.bwConv = function (p) { if (p && p.id === id) prog({ etapa: "Convertendo no PC" + (p.placa ? " (" + p.placa + ")" : ""), pct: 30 + Math.min(60, (p.pct || 0) * 0.6), falta: p.falta }); };
      var r = await chama("videoConvFazer", { id: id, curto: op.curto || 2160 });
      var partes = []; for (var o2 = 0; o2 < r.bytes; o2 += PED) { partes.push(deB64(await chama("videoConvLer", { id: id, de: o2, ate: Math.min(r.bytes, o2 + PED) }))); prog({ etapa: "Trazendo o take convertido", pct: 90 + Math.min(9, o2 / r.bytes * 9) }); }
      prog({ etapa: "Pronto", pct: 100 });
      return { blob: new Blob(partes, { type: "video/mp4" }), w: r.w, h: r.h, via: "pc", placa: r.placa, comSom: r.comSom, segundos: (performance.now() - t0) / 1000 };
    } finally { window.bwConv = null; try { await chama("videoConvFim", { id: id }); } catch (e) { } }
  }
  async function appConverte() { if (!ponte()) return false; try { var r = await ponte()("videoConvPode", {}); return !!(r && r.ok && r.valor && r.valor.ffmpeg); } catch (e) { return false; } }

  /* ---------- juntando ---------- */
  function nomeMp4(n) { return String(n || "take").replace(/\.(mov|mp4|m4v|hevc|qt)$/i, "") + ".mp4"; }
  async function converter(blob, op) {
    op = op || {}; var i = op.info || await info(blob); if (!i.ok) throw new Error(i.motivo || "não consegui ler o take");
    var erros = [];
    if (i.codec !== "prores") try { if (await podeNoAparelho(i)) { var r1 = await noAparelho(blob, i, op); r1.nome = nomeMp4(op.nome); r1.info = i; return r1; } } catch (e) { if (/cancelado/.test(e.message)) throw e; erros.push(e.message); console.warn("conversão no aparelho", e); }
    if (await appConverte()) { var r2 = await noApp(blob, i, op); r2.nome = nomeMp4(op.nome); r2.info = i; return r2; }
    var x = new Error(ponte() ? "o app BW não achou o FFmpeg neste PC (rode o 2 - INSTALAR da pasta do BW)" : i.codec === "prores" ? i.nomeCodec + " só converte no app BW do computador" : "este aparelho não decodifica " + i.nomeCodec + (erros.length ? " (" + erros[0] + ")" : "") + " — converta no app BW do computador");
    x.semCaminho = true; x.semFfmpeg = !!ponte(); x.info = i; throw x;
  }
  /* o navegador abre? (metadados + tamanho do quadro em até 8 s) */
  function abre(blob) { return new Promise(function (ok) { var v = document.createElement("video"), u = URL.createObjectURL(blob), f = false;
    function fim(r) { if (f) return; f = true; clearTimeout(tm); try { v.removeAttribute("src"); v.load(); } catch (e) { } URL.revokeObjectURL(u); ok(r); }
    var tm = setTimeout(function () { fim(false); }, 8000); v.muted = true; v.playsInline = true; v.preload = "metadata";
    v.onloadedmetadata = function () { fim(!!v.videoWidth && isFinite(v.duration) && v.duration > 0); }; v.onerror = function () { fim(false); }; v.src = u; }); }
  async function converterSePreciso(blob, nome, aoProgredir) {
    var i = await info(blob); if (!i.ok || i.codec === "h264") return null;
    if (await abre(blob)) return null;
    return converter(blob, { nome: nome, info: i, aoProgredir: aoProgredir });
  }

  window.BWVideoIphone = { info: info, descricao: descricao, converter: converter, converterSePreciso: converterSePreciso, podeNoAparelho: podeNoAparelho, appConverte: appConverte, nomeMp4: nomeMp4, _codecHevc: codecHevc };
})();
