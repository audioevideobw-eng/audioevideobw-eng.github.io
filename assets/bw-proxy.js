/* BW PROXY (22/11/2026, pedido do dono: "FAZER PROXY… a barra se enchendo, como uma passagem de arquivo").
   Faz, no próprio aparelho, uma cópia LEVE de um take (720p por padrão, H.264 com quadro-chave a cada 0,5 s) para editar sem pesar.
   O original continua guardado e é ele que vai para a exportação. Nada sai do aparelho: sem fetch, sem conta, sem servidor.
   Como funciona: o take toca escondido e sem som (mais rápido que o normal quando a máquina aguenta), cada quadro é desenhado
   menor num canvas e comprimido pelo codificador do próprio navegador (WebCodecs); o som do original é lido inteiro
   (decodeAudioData) e comprimido em AAC. O arquivo final é montado pelo mesmo montador de MP4 do BW Reels (BWReelsCelular._mp4).
   fazer(blob, {curto: 720, aoProgredir, cancelar}) → {blob, w, h, comSom, segundos} */
(function () {
  "use strict";
  function dorme(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function par(v) { v = Math.max(2, Math.round(v)); return v - v % 2; }

  function suporta() {
    return !!(window.VideoEncoder && window.VideoFrame && window.HTMLVideoElement && "requestVideoFrameCallback" in HTMLVideoElement.prototype && window.BWReelsCelular && BWReelsCelular._mp4);
  }

  /* som do original em 48 kHz estéreo (null = sem som ou arquivo grande demais para ler de uma vez) */
  async function lerSom(blob) {
    if (blob.size > 1.5e9) return null;
    var C = window.AudioContext || window.webkitAudioContext, O = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!C) return null;
    var ac = null;
    try {
      var buf = await blob.arrayBuffer(); ac = new C();
      var ab = await new Promise(function (ok, erro) { var p = ac.decodeAudioData(buf, ok, erro); if (p && p.then) p.then(ok, erro); });
      if (ab.sampleRate !== 48000 && O) { var oc = new O(2, Math.ceil(ab.duration * 48000), 48000), s = oc.createBufferSource(); s.buffer = ab; s.connect(oc.destination); s.start(); ab = await oc.startRendering(); }
      var L = ab.getChannelData(0), R = ab.numberOfChannels > 1 ? ab.getChannelData(1) : L;
      return { L: L, R: R, sr: ab.sampleRate };
    } catch (e) { return null; } finally { try { if (ac) ac.close(); } catch (e) {} }
  }

  async function somAac(som) {
    if (!som || !window.AudioEncoder || !window.AudioData) return null;
    var SR = som.sr, cfg = { codec: "mp4a.40.2", sampleRate: SR, numberOfChannels: 2, bitrate: 160000, aac: { format: "aac" } }, opus = false;
    try { if (!(await AudioEncoder.isConfigSupported(cfg)).supported) { cfg = { codec: "opus", sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }; opus = true; if (SR !== 48000 || !(await AudioEncoder.isConfigSupported(cfg)).supported) return null; } } catch (e) { return null; }   /* sem AAC (Chromium aberto): Opus dentro do MP4 */
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
      var som = await lerSom(blob); if (cancelar()) throw new Error("cancelado");
      var cfgV = await BWReelsCelular.configVideo(ow, oh, 30); if (!cfgV) throw new Error("este aparelho não comprime vídeo em " + ow + "×" + oh);
      cfgV.bitrate = Math.round(Math.max(1.5e6, Math.min(8e6, 4e6 * (ow * oh) / (1280 * 720))));
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
          if (ts > ult + 1e-4) {
            ult = ts; ultQ = performance.now(); cx.drawImage(v, 0, 0, ow, oh);
            var kf = chave < 0 || ts - chave >= 0.5; if (kf) chave = ts;
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
      am.forEach(function (a, i) { var prox = i + 1 < am.length ? am[i + 1].ts : a.ts + 1e6 / 30; a.dur = Math.max(1, Math.round((prox - a.ts) * 90000 / 1e6)); });
      if (am[0].ts > 0) am[0].dur += Math.round(am[0].ts * 90000 / 1e6);   // o 1º quadro cobre o comecinho do take
      var trilhas = [{ tipo: "v", escala: 90000, w: ow, h: oh, amostras: am, stsd: BWReelsCelular._stsdVideo(ow, oh, avcC) }];
      var ta = await somAac(som); if (ta) trilhas.push(ta);
      var saida = BWReelsCelular._mp4(trilhas, Math.round(dur * 1000));
      prog({ etapa: "Pronto", pct: 100, ow: ow, oh: oh, dur: dur });
      return { blob: saida, w: ow, h: oh, comSom: !!ta, segundos: (performance.now() - t0) / 1000, quadros: quadros, curto: curto };
    } finally { soltar(); }
  }

  window.BWProxy = { suporta: suporta, fazer: fazer, _lerSom: lerSom };
})();
