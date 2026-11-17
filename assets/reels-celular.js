/* BW Reels Pro — gerar o MP4 NESTE APARELHO (celular, tablet ou PC), sem programa instalado.
   Como funciona: o mesmo HTML do motor roda escondido; cada quadro é "fotografado" (SVG foreignObject → canvas),
   comprimido pelo codificador do próprio navegador (WebCodecs, H.264) e guardado num MP4 montado aqui mesmo.
   Nada é enviado para a internet: a única busca é a das fontes do Google, para o texto sair igual à prévia. */
(function () {
  "use strict";
  var te = new TextEncoder();
  function cat(ps) { var n = 0, i; for (i = 0; i < ps.length; i++) n += ps[i].length; var o = new Uint8Array(n), p = 0; for (i = 0; i < ps.length; i++) { o.set(ps[i], p); p += ps[i].length; } return o; }
  function u32(n) { return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); }
  function u16(n) { return new Uint8Array([(n >> 8) & 255, n & 255]); }
  function z(n) { return new Uint8Array(n); }
  function box(tipo) { var c = cat([].slice.call(arguments, 1)); return cat([u32(c.length + 8), te.encode(tipo), c]); }
  function full(tipo, ver, flags) { return box.apply(null, [tipo, new Uint8Array([ver, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255])].concat([].slice.call(arguments, 3))); }
  var MATRIZ = cat([u32(0x10000), z(12), u32(0x10000), z(12), u32(0x40000000)]);

  function trak(t, id, durMs, offs) {
    var s = t.amostras, i, stts = [], ult = -1, n = 0, chaves = [];
    for (i = 0; i < s.length; i++) { if (s[i].dur === ult) n++; else { if (n) stts.push(u32(n), u32(ult)); ult = s[i].dur; n = 1; } if (s[i].chave) chaves.push(u32(i + 1)); }
    if (n) stts.push(u32(n), u32(ult));
    var durT = s.reduce(function (a, x) { return a + x.dur; }, 0), v = t.tipo === "v";
    var stbl = box("stbl", full("stsd", 0, 0, u32(1), t.stsd), full("stts", 0, 0, u32(stts.length / 2), cat(stts)),
      v ? full("stss", 0, 0, u32(chaves.length), cat(chaves)) : z(0), full("stsc", 0, 0, u32(1), u32(1), u32(1), u32(1)),
      full("stsz", 0, 0, u32(0), u32(s.length), cat(s.map(function (x) { return u32(x.dados.length); }))),
      full("stco", 0, 0, u32(s.length), cat(s.map(function (x, k) { return u32(offs ? offs[t.tipo + k] : 0); }))));
    return box("trak",
      full("tkhd", 0, 3, z(8), u32(id), z(4), u32(durMs), z(8), u16(0), u16(0), u16(v ? 0 : 0x100), u16(0), MATRIZ, u32((t.w || 0) << 16), u32((t.h || 0) << 16)),
      box("mdia", full("mdhd", 0, 0, z(8), u32(t.escala), u32(durT), u16(0x55c4), u16(0)),
        full("hdlr", 0, 0, z(4), te.encode(v ? "vide" : "soun"), z(12), te.encode(v ? "Video\0" : "Audio\0")),
        box("minf", v ? full("vmhd", 0, 1, z(8)) : full("smhd", 0, 0, z(4)), box("dinf", full("dref", 0, 0, u32(1), full("url ", 0, 1))), stbl)));
  }
  function mp4(trilhas, durMs) {
    var ftyp = box("ftyp", te.encode("isom"), u32(512), te.encode("isomiso2avc1mp41"));
    function moov(offs) { return box.apply(null, ["moov", full("mvhd", 0, 0, z(8), u32(1000), u32(durMs), u32(0x10000), u16(0x100), z(10), MATRIZ, z(24), u32(trilhas.length + 1))].concat(trilhas.map(function (t, i) { return trak(t, i + 1, durMs, offs); }))); }
    var ordem = [];
    trilhas.forEach(function (t) { var tt = 0; t.amostras.forEach(function (a, k) { ordem.push({ t: tt / t.escala, id: t.tipo + k, d: a.dados }); tt += a.dur; }); });
    ordem.sort(function (a, b) { return a.t - b.t; });
    var pos = ftyp.length + moov(null).length + 8, offs = {};
    ordem.forEach(function (o) { offs[o.id] = pos; pos += o.d.length; });
    var corpo = ordem.map(function (o) { return o.d; });
    return new Blob([ftyp, moov(offs), u32(pos - ftyp.length - moov(null).length), te.encode("mdat")].concat(corpo), { type: "video/mp4" });
  }
  function stsdVideo(w, h, avcC) {
    return box("avc1", z(6), u16(1), z(16), u16(w), u16(h), u32(0x480000), u32(0x480000), z(4), u16(1), z(32), u16(0x18), u16(0xffff), box("avcC", new Uint8Array(avcC)));
  }
  function stsdAudio(codec, sr, desc) {
    var cab = cat([z(6), u16(1), z(8), u16(2), u16(16), z(4), u32(sr << 16 >>> 0)]);
    if (codec === "opus") { var d = desc ? new Uint8Array(desc) : null, pre = d && d.length > 11 ? d[10] | (d[11] << 8) : 312; return box("Opus", cab, box("dOps", new Uint8Array([0, 2]), u16(pre), u32(sr), u16(0), new Uint8Array([0]))); }
    var asc = new Uint8Array(desc), dsi = cat([new Uint8Array([5, asc.length]), asc]);
    var dcd = cat([new Uint8Array([4, 13 + dsi.length, 0x40, 0x15, 0, 0, 0]), u32(128000), u32(128000), dsi]);
    return box("mp4a", cab, full("esds", 0, 0, new Uint8Array([3, 3 + dcd.length + 3, 0, 0, 0]), dcd, new Uint8Array([6, 1, 2])));
  }

  var dorme = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function paraData(blob) { return new Promise(function (ok, erro) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.onerror = erro; f.readAsDataURL(blob); }); }

  async function suporta() {
    if (!window.VideoEncoder || !window.VideoFrame) return false;
    try { return (await VideoEncoder.isConfigSupported({ codec: "avc1.420028", width: 720, height: 1280, bitrate: 4e6, framerate: 30 })).supported; } catch (e) { return false; }
  }

  // Fontes do Google usadas no vídeo, embutidas (só o alfabeto latino) para o texto sair igual dentro da "foto" do quadro.
  async function fontesEmbutidas(doc) {
    var link = doc.querySelector('link[href*="fonts.googleapis"]'); if (!link) return "";
    var usadas = {};
    [].forEach.call(doc.querySelectorAll("body *"), function (el) { var f = (doc.defaultView.getComputedStyle(el).fontFamily || "").split(",")[0].replace(/["']/g, "").trim().toLowerCase(); if (f) usadas[f] = 1; });
    try {
      var css = await (await fetch(link.href)).text(), blocos = css.match(/\/\*\s*[\w-]+\s*\*\/\s*@font-face\s*\{[^}]+\}/g) || [], saida = [];
      for (var i = 0; i < blocos.length; i++) {
        var b = blocos[i], fam = (b.match(/font-family:\s*['"]?([^;'"]+)/) || [])[1], url = (b.match(/url\((https:[^)]+)\)/) || [])[1];
        if (!/^\/\*\s*latin\s*\*\//.test(b) || !fam || !url || !usadas[fam.toLowerCase()]) continue;
        saida.push(b.replace(url, await paraData(await (await fetch(url)).blob())));
      }
      return saida.join("\n");
    } catch (e) { return ""; }
  }
  async function embutirImagens(doc) {
    var els = doc.querySelectorAll('[src^="blob:"],[style*="blob:"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], alvo = el.getAttribute("src") && /^blob:/.test(el.getAttribute("src")) ? "src" : "style", v = el.getAttribute(alvo), m = v.match(/blob:[^"')\s#]+/);
      if (!m) continue;
      try { el.setAttribute(alvo, v.replace(/blob:[^"')\s]+/, await paraData(await (await fetch(m[0])).blob()))); } catch (e) { /* segue sem a imagem */ }
    }
  }

  /* gerar({ html, largura, altura, fps, duracao, som: {L, R} | null, alturaSaida, aoProgredir, cancelar: () => bool }) → { blob, comSom, codecSom } */
  async function gerar(o) {
    if (/<video/i.test(o.html)) throw new Error("este vídeo usa filmagens: gere no computador (RENDERIZAR NO PC)");
    var W = o.largura, H = o.altura, oh = Math.min(o.alturaSaida || 1280, H), ow = Math.round(W * oh / H / 2) * 2; oh = Math.round(oh / 2) * 2;
    var fps = o.fps || 30, total = Math.round(o.duracao * fps), prog = o.aoProgredir || function () {};
    var fr = document.createElement("iframe");
    fr.setAttribute("aria-hidden", "true"); fr.style.cssText = "position:fixed;left:-99999px;top:0;width:" + W + "px;height:" + H + "px;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(fr);
    try {
      await new Promise(function (ok) { fr.onload = ok; fr.srcdoc = o.html; });
      var win = fr.contentWindow, doc = fr.contentDocument;
      for (var e = 0; e < 100 && !win.__seek; e++) await dorme(50);
      if (!win.__seek) throw new Error("o motor não carregou");
      prog({ etapa: "Preparando as letras e imagens", pct: 1 });
      var fontes = await fontesEmbutidas(doc); await embutirImagens(doc);
      [].forEach.call(doc.querySelectorAll("script,link"), function (x) { x.remove(); });
      if (fontes) { var st = doc.createElement("style"); st.textContent = fontes; doc.head.appendChild(st); }

      var trilhas = [], vAm = [], avcC = null, erro = null;
      var enc = new VideoEncoder({ output: function (ch, meta) { if (meta && meta.decoderConfig && meta.decoderConfig.description) avcC = meta.decoderConfig.description; var d = new Uint8Array(ch.byteLength); ch.copyTo(d); vAm.push({ dados: d, dur: Math.round(90000 / fps), chave: ch.type === "key" }); }, error: function (x) { erro = x; } });
      enc.configure({ codec: "avc1.420028", width: ow, height: oh, bitrate: oh > 1300 ? 9e6 : 5e6, framerate: fps, avc: { format: "avc" }, latencyMode: "quality" });
      var cv = document.createElement("canvas"); cv.width = ow; cv.height = oh; var ctx = cv.getContext("2d"), xs = new XMLSerializer();
      for (var f = 0; f < total; f++) {
        if (erro) throw erro; if (o.cancelar && o.cancelar()) throw new Error("cancelado");
        await win.__seek(f / fps);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><foreignObject x="0" y="0" width="100%" height="100%">' + xs.serializeToString(doc.documentElement) + "</foreignObject></svg>";
        var img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
        ctx.drawImage(img, 0, 0, ow, oh);
        var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
        enc.encode(vf, { keyFrame: f % (fps * 2) === 0 }); vf.close();
        while (enc.encodeQueueSize > 6) await dorme(5);
        if (f % 5 === 0) { prog({ etapa: "Desenhando o vídeo", pct: 2 + Math.round(f / total * 90) }); await dorme(0); }
      }
      await enc.flush(); enc.close(); if (erro) throw erro; if (!avcC) throw new Error("o aparelho não entregou o vídeo comprimido");
      trilhas.push({ tipo: "v", escala: 90000, w: ow, h: oh, amostras: vAm, stsd: stsdVideo(ow, oh, avcC) });

      var codecSom = "";
      if (o.som && window.AudioEncoder && window.AudioData) {
        prog({ etapa: "Juntando o som", pct: 94 });
        var SR = 48000, cfg = null, cands = [{ codec: "mp4a.40.2", nome: "aac" }, { codec: "opus", nome: "opus" }];
        for (var c = 0; c < cands.length && !cfg; c++) { try { if ((await AudioEncoder.isConfigSupported({ codec: cands[c].codec, sampleRate: SR, numberOfChannels: 2, bitrate: 128000 })).supported) cfg = cands[c]; } catch (x) { /* tenta o próximo */ } }
        if (cfg) {
          var aAm = [], desc = null, padrao = cfg.nome === "aac" ? 1024 : 960;
          var ae = new AudioEncoder({ output: function (ch, meta) { if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = meta.decoderConfig.description; var d = new Uint8Array(ch.byteLength); ch.copyTo(d); aAm.push({ dados: d, dur: ch.duration ? Math.round(ch.duration * SR / 1e6) : padrao }); }, error: function (x) { erro = x; } });
          ae.configure({ codec: cfg.codec, sampleRate: SR, numberOfChannels: 2, bitrate: 128000 });
          var N = Math.min(o.som.L.length, Math.round(o.duracao * SR)), passo = 4800;
          for (var p = 0; p < N; p += passo) {
            var n = Math.min(passo, N - p), dados = new Float32Array(n * 2); dados.set(o.som.L.subarray(p, p + n), 0); dados.set(o.som.R.subarray(p, p + n), n);
            var ad = new AudioData({ format: "f32-planar", sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(p * 1e6 / SR), data: dados }); ae.encode(ad); ad.close();
          }
          await ae.flush(); ae.close();
          if (!erro && aAm.length && (cfg.nome === "opus" || desc)) { trilhas.push({ tipo: "a", escala: SR, amostras: aAm, stsd: stsdAudio(cfg.nome, SR, desc) }); codecSom = cfg.nome; }
        }
      }
      prog({ etapa: "Fechando o arquivo", pct: 98 });
      var blob = mp4(trilhas, Math.round(total / fps * 1000));
      prog({ etapa: "Pronto", pct: 100 });
      return { blob: blob, comSom: !!codecSom, codecSom: codecSom, largura: ow, altura: oh, quadros: total };
    } finally { fr.remove(); }
  }
  window.BWReelsCelular = { suporta: suporta, gerar: gerar };
})();
