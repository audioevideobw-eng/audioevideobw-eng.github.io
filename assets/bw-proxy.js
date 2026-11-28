/* BW PROXY (22/11/2026, pedido do dono: "FAZER PROXY… a barra se enchendo, como uma passagem de arquivo").
   Faz, no próprio aparelho, uma cópia LEVE de um take (720p por padrão, H.264 com quadro-chave a cada 0,5 s) para editar sem pesar.
   O original continua guardado e é ele que vai para a exportação. Nada sai do aparelho: sem fetch, sem conta, sem servidor.
   Como funciona: o take toca escondido e sem som (mais rápido que o normal quando a máquina aguenta), cada quadro é desenhado
   menor num canvas e comprimido pelo codificador do próprio navegador (WebCodecs); o som do original é lido pelo índice
   do MP4/MOV (só os pedaços de som, PCM de câmera ou AAC) e comprimido em AAC. O arquivo final é montado pelo mesmo montador de MP4 do BW Reels (BWReelsCelular._mp4).
   fazer(blob, {curto: 720, aoProgredir, cancelar}) → {blob, w, h, comSom, segundos} */
(function () {
  "use strict";
  function dorme(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function par(v) { v = Math.max(2, Math.round(v)); return v - v % 2; }

  function suporta() {
    return !!(window.VideoEncoder && window.VideoFrame && window.HTMLVideoElement && "requestVideoFrameCallback" in HTMLVideoElement.prototype && window.BWReelsCelular && BWReelsCelular._mp4);
  }

  /* ===== SOM DO TAKE SEM LER O ARQUIVO INTEIRO (22/11, dono: "proxy avisou que não teria áudio porque não conseguiu ler") =====
     Antes o som vinha de decodeAudioData(arquivo inteiro): take acima de 1,5 GB era pulado e takes grandes de câmera (4K 60p, 1–2,5 GB)
     estouravam a memória → proxy SEM SOM. Agora o MP4/MOV é lido pelo ÍNDICE (moov: stsd/stsz/stsc/stco) e só os pedaços de SOM são
     lidos do disco (blob.slice): PCM da câmera (Sony XAVC "twos", MOV "sowt"/"lpcm"/"in24"/"in32"/"fl32", "ipcm") vira número direto;
     AAC ("mp4a") passa pelo AudioDecoder. decodeAudioData fica só de reserva para arquivo pequeno. */
  async function lerBytes(blob, ini, fim) { return new Uint8Array(await blob.slice(ini, fim).arrayBuffer()); }
  function u32(b, o) { return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]; }
  function u64(b, o) { return u32(b, o) * 4294967296 + u32(b, o + 4); }
  function tipo4(b, o) { return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]); }
  function filhos(b, ini, fim) { var r = []; for (var o = ini; o + 8 <= fim;) { var t = u32(b, o), n = tipo4(b, o + 4), h = 8; if (t === 1) { t = u64(b, o + 8); h = 16; } else if (t === 0) t = fim - o; if (t < h || o + t > fim) break; r.push({ t: n, ini: o + h, fim: o + t }); o += t; } return r; }
  function acha(b, caixa, nome) { var f = filhos(b, caixa.ini, caixa.fim); for (var i = 0; i < f.length; i++) if (f[i].t === nome) return f[i]; return null; }
  async function lerMoov(blob) {
    var o = 0, N = blob.size;
    while (o + 8 <= N) { var h = await lerBytes(blob, o, Math.min(N, o + 16)), t = u32(h, 0), n = tipo4(h, 4); if (t === 1) t = u64(h, 8); else if (t === 0) t = N - o; if (t < 8) return null;
      if (n === "moov") { if (t > 200e6) return null; var b = await lerBytes(blob, o, o + t); return { b: b, raiz: { ini: 8, fim: t } }; } o += t; }
    return null;
  }
  function esdsASC(b, ini, fim) {   /* procura o DecoderSpecificInfo (tag 5) dentro do esds */
    for (var o = ini + 4; o < fim - 2; o++) if (b[o] === 5) { var n = 0, k = o + 1, c; do { c = b[k++]; n = (n << 7) | (c & 127); } while ((c & 128) && k < fim); if (n > 0 && n < 64 && k + n <= fim) return b.slice(k, k + n); }
    return null;
  }
  async function somDoIndice(blob, aviso) {
    var mv = await lerMoov(blob); if (!mv) { aviso.motivo = "o arquivo não tem o índice (moov) que o leitor entende"; return null; }
    var b = mv.b, traks = filhos(b, mv.raiz.ini, mv.raiz.fim).filter(function (x) { return x.t === "trak"; });
    for (var ti = 0; ti < traks.length; ti++) {
      var mdia = acha(b, traks[ti], "mdia"); if (!mdia) continue; var hdlr = acha(b, mdia, "hdlr"); if (!hdlr || tipo4(b, hdlr.ini + 8) !== "soun") continue;
      var mdhd = acha(b, mdia, "mdhd"), escala = mdhd ? (b[mdhd.ini] === 1 ? u32(b, mdhd.ini + 20) : u32(b, mdhd.ini + 12)) : 0;
      /* lista de edição (elst): o AAC começa com ~1024 amostras de "aquecimento" que o arquivo manda pular — sem isso o som fica 21 ms atrasado */
      var pular = 0, edts = acha(b, traks[ti], "edts"), elst = edts && acha(b, edts, "elst");
      if (elst && u32(b, elst.ini + 4) > 0 && escala) { var v1 = b[elst.ini] === 1, mt = v1 ? u64(b, elst.ini + 16) : (u32(b, elst.ini + 12) | 0); if (mt > 0 && mt < escala * 10) pular = mt / escala; }
      var stbl = acha(b, acha(b, mdia, "minf") || mdia, "stbl"); if (!stbl) continue;
      var stsd = acha(b, stbl, "stsd"), e0 = stsd.ini + 8, fmt = tipo4(b, e0 + 4), ver = (b[e0 + 16] << 8) | b[e0 + 17];
      var canais = (b[e0 + 24] << 8) | b[e0 + 25], bits = (b[e0 + 26] << 8) | b[e0 + 27], sr = u32(b, e0 + 32) / 65536, fim0 = e0 + u32(b, e0), corpo = e0 + 36, flutua = false, le = false;
      if (ver === 1) corpo += 16;
      else if (ver === 2) { var dv = new DataView(b.buffer, b.byteOffset + e0 + 40, 8); sr = dv.getFloat64(0); canais = u32(b, e0 + 48); bits = u32(b, e0 + 56); var fl = u32(b, e0 + 60); flutua = !!(fl & 1); le = !(fl & 2); corpo += 36; }
      if (!sr || sr < 1000) sr = escala || 48000;
      /* caixas dentro da entrada (esds, enda, pcmC…) */
      var sub = filhos(b, corpo, fim0), esds = null, endaV = false;
      sub.forEach(function (x) { if (x.t === "esds") esds = x; if (x.t === "enda") { le = !!((b[x.ini] << 8 | b[x.ini + 1])); endaV = true; } if (x.t === "pcmC") { le = !!(b[x.ini + 4] & 1); bits = b[x.ini + 5]; endaV = true; } if (x.t === "wave") filhos(b, x.ini, x.fim).forEach(function (y) { if (y.t === "esds") esds = y; if (y.t === "enda") { le = !!((b[y.ini] << 8 | b[y.ini + 1])); endaV = true; } }); });
      var PCM = { twos: [16, 0, 0], sowt: [16, 1, 0], in24: [24, 0, 0], in32: [32, 0, 0], fl32: [32, 0, 1], fl64: [64, 0, 1], lpcm: [0, -1, -1], ipcm: [0, -1, 0], fpcm: [0, -1, 1], raw: [8, 0, 0] }[fmt];
      /* índice de amostras: tamanhos (stsz), amostras por pedaço (stsc), onde fica cada pedaço (stco/co64) */
      var stsz = acha(b, stbl, "stsz"), stsc = acha(b, stbl, "stsc"), stco = acha(b, stbl, "stco") || acha(b, stbl, "co64"); if (!stsz || !stsc || !stco) { aviso.motivo = "índice de som incompleto"; return null; }
      var tamFixo = u32(b, stsz.ini + 4), nAm = u32(b, stsz.ini + 8), tam = function (i) { return tamFixo || u32(b, stsz.ini + 12 + 4 * i); };
      var nCh = u32(b, stco.ini + 4), co64 = stco.t === "co64", pos = function (i) { return co64 ? u64(b, stco.ini + 8 + 8 * i) : u32(b, stco.ini + 8 + 4 * i); };
      var nSc = u32(b, stsc.ini + 4), regras = []; for (var r = 0; r < nSc; r++) regras.push([u32(b, stsc.ini + 8 + 12 * r), u32(b, stsc.ini + 12 + 12 * r)]);
      var pedacos = [], am = 0;
      for (var c = 0, ri = 0; c < nCh && am < nAm; c++) { while (ri + 1 < regras.length && c + 1 >= regras[ri + 1][0]) ri++; var por = regras[ri][1], ini = pos(c), bytes = 0, lista = [];
        for (var k = 0; k < por && am < nAm; k++, am++) { var t = tam(am); lista.push([ini + bytes, t]); bytes += t; } pedacos.push({ ini: ini, bytes: bytes, amostras: lista }); }
      if (PCM) {
        if (PCM[0]) bits = PCM[0]; if (PCM[1] >= 0 && !endaV) le = !!PCM[1];   /* "enda"/"pcmC" no arquivo manda na ordem dos bytes */ if (PCM[2] >= 0) flutua = !!PCM[2]; if (fmt === "sowt") le = true;
        var bps = bits / 8, quadro = bps * canais; if (!canais || !bps || [1, 2, 3, 4, 8].indexOf(bps) < 0) { aviso.motivo = "PCM com formato que o leitor não conhece (" + bits + " bits)"; return null; }
        /* QuickTime antigo: stsz diz "1 byte por amostra" e a amostra é o QUADRO inteiro → bytes do pedaço = quadros × bytes por quadro */
        if (tamFixo && tamFixo < quadro) pedacos.forEach(function (p) { p.bytes = p.amostras.length * quadro; });
        var total = 0; pedacos.forEach(function (p) { total += p.bytes; }); var nQ = Math.floor(total / quadro);
        if (nQ * 8 > 1.2e9) { aviso.motivo = "som longo demais para caber na memória"; return null; }
        var L = new Float32Array(nQ), R = new Float32Array(nQ), q = 0;
        /* lê em blocos de até ~32 MB juntando pedaços vizinhos (menos idas ao disco) */
        for (var pi = 0; pi < pedacos.length;) { var a0 = pedacos[pi].ini, a1 = a0 + pedacos[pi].bytes, pj = pi + 1; while (pj < pedacos.length && pedacos[pj].ini >= a1 && pedacos[pj].ini - a1 < 64e3 && pedacos[pj].ini + pedacos[pj].bytes - a0 < 32e6) { a1 = pedacos[pj].ini + pedacos[pj].bytes; pj++; }
          var bloco = await lerBytes(blob, a0, a1), dv2 = new DataView(bloco.buffer, bloco.byteOffset, bloco.byteLength);
          for (var x = pi; x < pj; x++) { var off = pedacos[x].ini - a0, n = Math.floor(pedacos[x].bytes / quadro);
            for (var f = 0; f < n && q < nQ; f++, q++) { var base = off + f * quadro, v0 = amostra(dv2, base, bps, flutua, le), v1 = canais > 1 ? amostra(dv2, base + bps, bps, flutua, le) : v0; L[q] = v0; R[q] = v1; } }
          pi = pj; await dorme(0); }
        var p0 = Math.min(q, Math.round(pular * sr));
        return { L: L.subarray(p0, q), R: R.subarray(p0, q), sr: sr, de: fmt };
      }
      if (fmt === "mp4a" && window.AudioDecoder && window.EncodedAudioChunk) {
        var asc = esds ? esdsASC(b, esds.ini, esds.fim) : null; if (!asc) { aviso.motivo = "AAC sem a configuração (esds)"; return null; }
        var outL = [], outR = [], erro = null, dec = new AudioDecoder({ output: function (d) { var n = d.numberOfFrames, ch = d.numberOfChannels, l = new Float32Array(n), rr = new Float32Array(n);
          try { d.copyTo(l, { planeIndex: 0, format: "f32-planar" }); if (ch > 1) d.copyTo(rr, { planeIndex: 1, format: "f32-planar" }); else rr.set(l); } catch (e) { erro = e; } sr = d.sampleRate; outL.push(l); outR.push(rr); d.close(); }, error: function (e) { erro = e; } });
        var cfgA = { codec: "mp4a.40.2", sampleRate: Math.round(sr), numberOfChannels: Math.max(1, canais), description: asc };
        try { if (!(await AudioDecoder.isConfigSupported(cfgA)).supported) { aviso.motivo = "este navegador não abre o AAC do take"; return null; } dec.configure(cfgA); } catch (e) { aviso.motivo = "AAC: " + e.message; return null; }
        var ts = 0;
        for (var pi2 = 0; pi2 < pedacos.length;) { var b0 = pedacos[pi2].ini, b1 = b0 + pedacos[pi2].bytes, pj2 = pi2 + 1; while (pj2 < pedacos.length && pedacos[pj2].ini >= b1 && pedacos[pj2].ini - b1 < 64e3 && pedacos[pj2].ini + pedacos[pj2].bytes - b0 < 16e6) { b1 = pedacos[pj2].ini + pedacos[pj2].bytes; pj2++; }
          var bl = await lerBytes(blob, b0, b1);
          for (var y = pi2; y < pj2; y++) pedacos[y].amostras.forEach(function (sa) { var d = bl.subarray(sa[0] - b0, sa[0] - b0 + sa[1]); dec.decode(new EncodedAudioChunk({ type: "key", timestamp: Math.round(ts * 1e6 / sr), data: d })); ts += 1024; });
          pi2 = pj2; if (dec.decodeQueueSize > 200) await dorme(2); }
        await dec.flush(); dec.close(); if (erro || !outL.length) { aviso.motivo = "o AAC do take não decodificou"; return null; }
        var tot = 0; outL.forEach(function (a) { tot += a.length; }); var LL = new Float32Array(tot), RR = new Float32Array(tot), w = 0;
        outL.forEach(function (a, i) { LL.set(a, w); RR.set(outR[i], w); w += a.length; });
        var p1 = Math.min(tot, Math.round(pular * sr));
        return { L: LL.subarray(p1), R: RR.subarray(p1), sr: sr, de: "aac" };
      }
      aviso.motivo = "som em formato " + fmt + " (o leitor lê PCM de câmera e AAC)"; return null;
    }
    aviso.motivo = "o take não tem faixa de som"; aviso.semFaixa = true; return null;
  }
  function amostra(dv, o, bps, flutua, le) {
    if (flutua) return bps === 8 ? dv.getFloat64(o, le) : dv.getFloat32(o, le);
    if (bps === 2) return dv.getInt16(o, le) / 32768;
    if (bps === 3) { var a = dv.getUint8(o), b2 = dv.getUint8(o + 1), c = dv.getUint8(o + 2), v = le ? (c << 16 | b2 << 8 | a) : (a << 16 | b2 << 8 | c); if (v & 0x800000) v -= 0x1000000; return v / 8388608; }
    if (bps === 4) return dv.getInt32(o, le) / 2147483648;
    return (dv.getUint8(o) - 128) / 128;
  }
  async function para48(som) {   /* tudo em 48 kHz estéreo (o AAC do proxy) */
    if (!som || Math.round(som.sr) === 48000) return som;
    var O = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!O) return som;
    var n = som.L.length, oc = new O(2, Math.ceil(n / som.sr * 48000), 48000), bf = oc.createBuffer(2, n, som.sr); bf.copyToChannel(som.L, 0); bf.copyToChannel(som.R, 1);
    var s = oc.createBufferSource(); s.buffer = bf; s.connect(oc.destination); s.start(); var ab = await oc.startRendering();
    return { L: ab.getChannelData(0), R: ab.getChannelData(1), sr: 48000, de: som.de };
  }

  /* som do original em 48 kHz estéreo: 1º pelo índice do MP4/MOV (lê só o som), 2º decodeAudioData (só arquivo pequeno). aviso.motivo diz por que falhou. */
  async function lerSom(blob, aviso) {
    aviso = aviso || {};
    try { var s1 = await somDoIndice(blob, aviso); if (s1) return await para48(s1); if (aviso.semFaixa) return null; } catch (e) { aviso.motivo = "leitor do índice: " + e.message; }
    if (blob.size > 600e6) { aviso.motivo = (aviso.motivo ? aviso.motivo + "; " : "") + "arquivo grande demais para ler inteiro"; return null; }
    var C = window.AudioContext || window.webkitAudioContext, O = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!C) return null;
    var ac = null;
    try {
      var buf = await blob.arrayBuffer(); ac = new C();
      var ab = await new Promise(function (ok, erro) { var p = ac.decodeAudioData(buf, ok, erro); if (p && p.then) p.then(ok, erro); });
      if (ab.sampleRate !== 48000 && O) { var oc = new O(2, Math.ceil(ab.duration * 48000), 48000), s = oc.createBufferSource(); s.buffer = ab; s.connect(oc.destination); s.start(); ab = await oc.startRendering(); }
      var L = ab.getChannelData(0), R = ab.numberOfChannels > 1 ? ab.getChannelData(1) : L;
      aviso.motivo = ""; return { L: L, R: R, sr: ab.sampleRate, de: "navegador" };
    } catch (e) { aviso.motivo = (aviso.motivo ? aviso.motivo + "; " : "") + "o navegador não decodificou o som (" + (e && e.message || e) + ")"; return null; } finally { try { if (ac) ac.close(); } catch (e) {} }
  }

  async function somAac(som, kbps) {
    if (!som || !window.AudioEncoder || !window.AudioData) return null;
    var SR = som.sr, cfg = { codec: "mp4a.40.2", sampleRate: SR, numberOfChannels: 2, bitrate: (kbps || 160) * 1000, aac: { format: "aac" } }, opus = false;
    try { if (!(await AudioEncoder.isConfigSupported(cfg)).supported) { cfg = { codec: "opus", sampleRate: 48000, numberOfChannels: 2, bitrate: (kbps ? Math.max(32, kbps) : 128) * 1000 }; opus = true; if (SR !== 48000 || !(await AudioEncoder.isConfigSupported(cfg)).supported) return null; } } catch (e) { return null; }   /* sem AAC (Chromium aberto): Opus dentro do MP4 */
    var am = [], desc = null, erro = null;
    var ae = new AudioEncoder({ output: function (ch, meta) { if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = meta.decoderConfig.description; var d = new Uint8Array(ch.byteLength); ch.copyTo(d); am.push({ dados: d, dur: opus ? (ch.duration ? Math.round(ch.duration * SR / 1e6) : 960) : 1024 }); }, error: function (x) { erro = x; } });
    ae.configure(cfg);
    var N = som.L.length, passo = 4800;
    for (var p = 0; p < N; p += passo) {
      var n = Math.min(passo, N - p), dados = new Float32Array(n * 2); dados.set(som.L.subarray(p, p + n), 0); dados.set(som.R.subarray(p, p + n), n);
      var ad = new AudioData({ format: "f32-planar", sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(p * 1e6 / SR), data: dados }); ae.encode(ad); ad.close();
      if (ae.encodeQueueSize > 40) await dorme(2);
    }
    await ae.flush(); ae.close(); if (erro || !am.length) return null;
    if (opus) return { tipo: "a", escala: SR, amostras: am, stsd: BWReelsCelular._stsdAudio("opus", SR, desc) };
    var a0 = am[0].dados;
    if (a0[0] === 0xff && (a0[1] & 0xf6) === 0xf0) {   // blocos com cabeçalho ADTS: tira o cabeçalho e monta a descrição a partir dele
      var fi = (a0[2] >> 2) & 15; desc = new Uint8Array([((((a0[2] >> 6) & 3) + 1) << 3) | (fi >> 1), ((fi & 1) << 7) | ((((a0[2] & 1) << 2) | (a0[3] >> 6)) << 3)]).buffer;
      am.forEach(function (x) { x.dados = x.dados.subarray((x.dados[1] & 1) ? 7 : 9); });
    }
    if (!desc) desc = new Uint8Array([SR === 44100 ? 0x12 : 0x11, SR === 44100 ? 0x10 : 0x90]).buffer;
    var d0 = new Uint8Array(desc);
    if (d0[0] === 3) return null;   // descritor inteiro (raro no PC): sem som no proxy em vez de arriscar um arquivo quebrado
    return { tipo: "a", escala: SR, amostras: am, stsd: BWReelsCelular._stsdAudio("aac", SR, desc) };
  }

  async function fazer(blob, op) {
    op = op || {}; var prog = op.aoProgredir || function () {}, cancelar = op.cancelar || function () { return false; };
    if (!suporta()) throw new Error("este navegador não faz proxy (use o Chrome ou o Edge atualizados)");
    var url = URL.createObjectURL(blob), v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    function soltar() { try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) {} URL.revokeObjectURL(url); }
    try {
      await new Promise(function (ok, erro) { var tm = setTimeout(function () { erro(new Error("o arquivo não abriu a tempo")); }, 30000); v.onloadeddata = function () { clearTimeout(tm); ok(); }; v.onerror = function () { clearTimeout(tm); erro(new Error("o navegador não abre este arquivo (HEVC? tente no app BW)")); }; });
      var dur = v.duration; if (!isFinite(dur) || dur <= 0) throw new Error("não consegui ler a duração do take");
      var W0 = v.videoWidth, H0 = v.videoHeight, curto = op.curto || 720, k = Math.min(1, curto / Math.min(W0, H0)), ow = par(W0 * k), oh = par(H0 * k);
      prog({ etapa: "Lendo o som", pct: 0, ow: ow, oh: oh, dur: dur });
      var avisoSom = {}, som = await lerSom(blob, avisoSom); if (cancelar()) throw new Error("cancelado");
      var cfgV = await BWReelsCelular.configVideo(ow, oh, 30); if (!cfgV) throw new Error("este aparelho não comprime vídeo em " + ow + "×" + oh);
      cfgV.bitrate = op.kbps ? op.kbps * 1000 : Math.round(Math.max(2e6, Math.min(11e6, 5.5e6 * (ow * oh) / (1280 * 720))));   /* +~40% para os quadros-chave mais frequentes */
      /* 25/11: op.qps (quadros por segundo no máximo) + op.kbps + op.somKbps = CÓPIA LEVE para a decupagem com IA (bw-decupar.js) */
      var passoQ = op.qps ? 1 / op.qps : 0, ultEnc = -1e9, cadaChave = op.qps ? 2 : 0.2;
      var am = [], avcC = null, erro = null;
      var enc = new VideoEncoder({ output: function (ch, meta) { if (meta && meta.decoderConfig && meta.decoderConfig.description) avcC = meta.decoderConfig.description; var d = new Uint8Array(ch.byteLength); ch.copyTo(d); am.push({ dados: d, ts: ch.timestamp, chave: ch.type === "key" }); }, error: function (x) { erro = x; } });
      enc.configure(cfgV);
      var cv = document.createElement("canvas"); cv.width = ow; cv.height = oh; var cx = cv.getContext("2d");
      var ult = -1, chave = -1, quadros = 0, t0 = performance.now(), rate = op.velocidade || (W0 * H0 > 2.5e6 ? 1.5 : 2), fim = false;
      v.playbackRate = rate;
      await new Promise(function (ok, falhou) {
        var vigia = setInterval(function () {
          if (cancelar()) { fim = true; clearInterval(vigia); falhou(new Error("cancelado")); }
          else if (erro) { fim = true; clearInterval(vigia); falhou(erro); }
          else if (!v.paused && performance.now() - ultQ > 15000) { fim = true; clearInterval(vigia); falhou(new Error("o take parou de tocar no meio")); }
        }, 300), ultQ = performance.now();
        function quadro(agora, meta) {
          if (fim) return;
          var ts = meta && meta.mediaTime != null ? meta.mediaTime : v.currentTime;
          if (ts > ult + 1e-4 && ts - ultEnc < passoQ - 1e-3) { ult = ts; ultQ = performance.now(); }
          else if (ts > ult + 1e-4) {
            ult = ts; ultEnc = ts; ultQ = performance.now(); cx.drawImage(v, 0, 0, ow, oh);
            var kf = chave < 0 || ts - chave >= cadaChave; if (kf) chave = ts;   /* 23/11: quadro-chave a cada 0,2 s (perto do "intra-frame" do ProRes Proxy/DNxHR): pular na linha do tempo decodifica no máx. ~6 quadros */
            var vf = new VideoFrame(cv, { timestamp: Math.round(ts * 1e6) }); enc.encode(vf, { keyFrame: kf }); vf.close(); quadros++;
            var pct = Math.min(99, ts / dur * 100), gasto = (performance.now() - t0) / 1000;
            prog({ etapa: "Copiando os quadros", pct: pct, falta: pct > 1 ? gasto * (100 - pct) / pct : null, ow: ow, oh: oh, dur: dur });
          }
          if (enc.encodeQueueSize > 8 && !v.paused) {   // o codificador ficou para trás: espera ele alcançar
            v.pause(); (function espera() { if (fim) return; if (enc.encodeQueueSize > 2) return setTimeout(espera, 10); v.play().catch(function () {}); })();
          }
          v.requestVideoFrameCallback(quadro);
        }
        v.onended = function () { if (fim) return; fim = true; clearInterval(vigia); ok(); };
        v.requestVideoFrameCallback(quadro);
        v.play().catch(function (e) { fim = true; clearInterval(vigia); falhou(e); });
      });
      await enc.flush(); enc.close(); if (erro) throw erro; if (!avcC || !am.length) throw new Error("o navegador não entregou o vídeo comprimido");
      prog({ etapa: "Juntando o som", pct: 99, ow: ow, oh: oh, dur: dur });
      am.sort(function (a, b) { return a.ts - b.ts; });
      am.forEach(function (a, i) { var prox = i + 1 < am.length ? am[i + 1].ts : a.ts + 1e6 / (op.qps || 30); a.dur = Math.max(1, Math.round((prox - a.ts) * 90000 / 1e6)); });
      if (am[0].ts > 0) am[0].dur += Math.round(am[0].ts * 90000 / 1e6);   // o 1º quadro cobre o comecinho do take
      var trilhas = [{ tipo: "v", escala: 90000, w: ow, h: oh, amostras: am, stsd: BWReelsCelular._stsdVideo(ow, oh, avcC) }];
      var ta = await somAac(som, op.somKbps); if (ta) trilhas.push(ta);
      var saida = BWReelsCelular._mp4(trilhas, Math.round(dur * 1000));
      prog({ etapa: "Pronto", pct: 100, ow: ow, oh: oh, dur: dur });
      return { blob: saida, w: ow, h: oh, comSom: !!ta, motivoSom: ta ? "" : (avisoSom.motivo || (som ? "o codificador de som do navegador falhou" : "")), semFaixa: !!avisoSom.semFaixa, segundos: (performance.now() - t0) / 1000, quadros: quadros, curto: curto };
    } finally { soltar(); }
  }

  window.BWProxy = { suporta: suporta, fazer: fazer, _lerSom: lerSom, _somAac: somAac };
})();
