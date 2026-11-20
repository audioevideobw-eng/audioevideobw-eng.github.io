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

  /* ---- Som pelo GRAVADOR do aparelho (iPhone): toca a trilha num fio interno, grava em AAC e tira as amostras do MP4 gravado ---- */
  function extrairAac(u) {
    var dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
    function filhos(ini, fim) { var l = [], p = ini; while (p + 8 <= fim) { var t = dv.getUint32(p), c = 8; if (t === 1) { t = dv.getUint32(p + 8) * 4294967296 + dv.getUint32(p + 12); c = 16; } else if (t === 0) t = fim - p; if (t < 8 || p + t > fim) break; l.push({ tipo: String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]), ini: p, corpo: p + c, fim: p + t }); p += t; } return l; }
    function um(b, tipo) { return filhos(b.corpo, b.fim).filter(function (x) { return x.tipo === tipo; })[0]; }
    var topo = filhos(0, u.length), moov = topo.filter(function (x) { return x.tipo === "moov"; })[0]; if (!moov) return null;
    var trak = filhos(moov.corpo, moov.fim).filter(function (x) { if (x.tipo !== "trak") return false; var h = um(um(x, "mdia") || x, "hdlr"); return h && String.fromCharCode(u[h.corpo + 8], u[h.corpo + 9], u[h.corpo + 10], u[h.corpo + 11]) === "soun"; })[0]; if (!trak) return null;
    var mdia = um(trak, "mdia"), mdhd = um(mdia, "mdhd"), sr = dv.getUint32(mdhd.corpo + (u[mdhd.corpo] === 1 ? 20 : 12)), stbl = um(um(mdia, "minf"), "stbl"), stsd = um(stbl, "stsd");
    var asc = null, i, e;
    for (i = stsd.corpo; i < stsd.fim - 12 && !asc; i++) if (u[i] === 0x65 && u[i + 1] === 0x73 && u[i + 2] === 0x64 && u[i + 3] === 0x73) {
      var p = i + 8, lerTam = function () { var n = 0, b; do { b = u[p++]; n = (n << 7) | (b & 127); } while (b & 128); return n; };
      if (u[p++] !== 3) break; lerTam(); p += 2; var fl = u[p++]; if (fl & 0x80) p += 2; if (fl & 0x40) p += u[p] + 1; if (fl & 0x20) p += 2;
      if (u[p++] !== 4) break; lerTam(); p += 13; if (u[p++] !== 5) break; var n = lerTam(); asc = u.slice(p, p + n);
    }
    if (!asc) return null;
    var am = [], stsz = um(stbl, "stsz"), nAm = stsz ? dv.getUint32(stsz.corpo + 8) : 0;
    if (nAm) {   // MP4 comum (tabelas no moov)
      var tamFixo = dv.getUint32(stsz.corpo + 4), stts = um(stbl, "stts"), stsc = um(stbl, "stsc"), stco = um(stbl, "stco"), co64 = um(stbl, "co64"), durs = [], k, j;
      for (k = 0, e = dv.getUint32(stts.corpo + 4); k < e; k++) for (j = 0; j < dv.getUint32(stts.corpo + 8 + k * 8); j++) durs.push(dv.getUint32(stts.corpo + 12 + k * 8));
      var nCh = dv.getUint32((stco || co64).corpo + 4), nSc = dv.getUint32(stsc.corpo + 4), idx = 0;
      for (k = 0; k < nCh && idx < nAm; k++) {
        var porCh = 1; for (j = 0; j < nSc; j++) if (dv.getUint32(stsc.corpo + 8 + j * 12) <= k + 1) porCh = dv.getUint32(stsc.corpo + 12 + j * 12);
        var off = stco ? dv.getUint32(stco.corpo + 8 + k * 4) : dv.getUint32(co64.corpo + 8 + k * 8) * 4294967296 + dv.getUint32(co64.corpo + 12 + k * 8);
        for (j = 0; j < porCh && idx < nAm; j++, idx++) { var tz = tamFixo || dv.getUint32(stsz.corpo + 12 + idx * 4); am.push({ dados: u.slice(off, off + tz), dur: durs[idx] || 1024 }); off += tz; }
      }
    } else {     // MP4 em pedaços (moof + mdat), como o gravador do Safari escreve
      var mvex = um(moov, "mvex"), trex = mvex && um(mvex, "trex"), dDur = trex ? dv.getUint32(trex.corpo + 12) : 1024, dTam = trex ? dv.getUint32(trex.corpo + 16) : 0;
      topo.filter(function (x) { return x.tipo === "moof"; }).forEach(function (moof) {
        filhos(moof.corpo, moof.fim).filter(function (x) { return x.tipo === "traf"; }).forEach(function (traf) {
          var tfhd = um(traf, "tfhd"), f = dv.getUint32(tfhd.corpo) & 0xffffff, q = tfhd.corpo + 8, base = moof.ini, du = dDur, ta = dTam;
          if (f & 1) { base = dv.getUint32(q) * 4294967296 + dv.getUint32(q + 4); q += 8; } if (f & 2) q += 4; if (f & 8) { du = dv.getUint32(q); q += 4; } if (f & 16) { ta = dv.getUint32(q); q += 4; }
          var pos = null;
          filhos(traf.corpo, traf.fim).filter(function (x) { return x.tipo === "trun"; }).forEach(function (trun) {
            var g = dv.getUint32(trun.corpo) & 0xffffff, cnt = dv.getUint32(trun.corpo + 4), r = trun.corpo + 8;
            if (g & 1) { pos = base + dv.getInt32(r); r += 4; } else if (pos === null) pos = base; if (g & 4) r += 4;
            for (var c = 0; c < cnt; c++) { var d2 = du, t2 = ta; if (g & 0x100) { d2 = dv.getUint32(r); r += 4; } if (g & 0x200) { t2 = dv.getUint32(r); r += 4; } if (g & 0x400) r += 4; if (g & 0x800) r += 4; am.push({ dados: u.slice(pos, pos + t2), dur: d2 }); pos += t2; }
          });
        });
      });
    }
    am = am.filter(function (x) { return x.dados.length; });
    return am.length ? { asc: asc, sr: sr, amostras: am } : null;
  }
  function tipoGravador() { if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return ""; var t = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4"]; for (var i = 0; i < t.length; i++) if (MediaRecorder.isTypeSupported(t[i])) return t[i]; return ""; }
  async function aacPeloGravador(som, duracao, ctx) {
    var tipo = tipoGravador(); if (!tipo || !ctx) return null;
    try { await ctx.resume(); } catch (e) { /* segue */ }
    var N = Math.min(som.L.length, Math.round(duracao * 48000)), buf = ctx.createBuffer(2, N, 48000); buf.getChannelData(0).set(som.L.subarray(0, N)); buf.getChannelData(1).set(som.R.subarray(0, N));
    var dest = ctx.createMediaStreamDestination(), src = ctx.createBufferSource(); src.buffer = buf; src.connect(dest);
    var rec = new MediaRecorder(dest.stream, { mimeType: tipo, audioBitsPerSecond: 128000 }), partes = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
    var parou = new Promise(function (r) { rec.onstop = r; rec.onerror = r; });
    rec.start(); src.start();
    await Promise.race([new Promise(function (r) { src.onended = r; }), dorme(duracao * 1000 + 4000)]); await dorme(300);
    if (rec.state !== "inactive") rec.stop(); await parou;
    return extrairAac(new Uint8Array(await new Blob(partes).arrayBuffer()));
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

  /* gerar({ html, largura, altura, fps, duracao, som: {L, R} | null, alturaSaida, aoProgredir, cancelar: () => bool }) → { blob, comSom, codecSom }
     20/11: OU desenhar: async (t, ctx, largura, altura) → o próprio quadro desenhado num canvas (Telas em movimento: fotos e vídeos). */
  async function gerar(o) {
    if (!o.desenhar && /<video/i.test(o.html)) throw new Error("este vídeo usa filmagens: gere no computador (RENDERIZAR NO PC)");
    var W = o.largura, H = o.altura, oh = Math.min(o.alturaSaida || 1280, H), ow = Math.round(W * oh / H / 2) * 2; oh = Math.round(oh / 2) * 2;
    var fps = o.fps || 30, total = Math.round(o.duracao * fps), prog = o.aoProgredir || function () {};
    var fr = null, win = null, doc = null;
    if (!o.desenhar) {
      fr = document.createElement("iframe");
      fr.setAttribute("aria-hidden", "true"); fr.style.cssText = "position:fixed;left:-99999px;top:0;width:" + W + "px;height:" + H + "px;border:0;opacity:0;pointer-events:none";
      document.body.appendChild(fr);
    }
    try {
      if (fr) {
        await new Promise(function (ok) { fr.onload = ok; fr.srcdoc = o.html; });
        win = fr.contentWindow; doc = fr.contentDocument;
        for (var e = 0; e < 100 && !win.__seek; e++) await dorme(50);
        if (!win.__seek) throw new Error("o motor não carregou");
        prog({ etapa: "Preparando as letras e imagens", pct: 1 });
        var fontes = await fontesEmbutidas(doc); await embutirImagens(doc);
        [].forEach.call(doc.querySelectorAll("script,link"), function (x) { x.remove(); });
        if (fontes) { var st = doc.createElement("style"); st.textContent = fontes; doc.head.appendChild(st); }
      }

      var trilhas = [], vAm = [], avcC = null, erro = null, somInfo = "sem som no roteiro", aacNativo = false, gravando = null;
      if (o.som) {
        try { aacNativo = !!(window.AudioEncoder && window.AudioData && (await AudioEncoder.isConfigSupported({ codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })).supported); } catch (x) { aacNativo = false; }
        if (!aacNativo && tipoGravador() && o.audioCtx) gravando = aacPeloGravador(o.som, o.duracao, o.audioCtx).catch(function (x) { return { erro: String(x && x.message || x) }; });
        somInfo = aacNativo ? "codificador" : gravando ? "gravador" : "sem codificador AAC nem gravador (AudioEncoder " + (window.AudioEncoder ? "sim" : "não") + ", MediaRecorder " + (tipoGravador() || "não") + ")";
      }
      var enc = new VideoEncoder({ output: function (ch, meta) { if (meta && meta.decoderConfig && meta.decoderConfig.description) avcC = meta.decoderConfig.description; var d = new Uint8Array(ch.byteLength); ch.copyTo(d); vAm.push({ dados: d, dur: Math.round(90000 / fps), chave: ch.type === "key" }); }, error: function (x) { erro = x; } });
      enc.configure({ codec: "avc1.420028", width: ow, height: oh, bitrate: oh > 1300 ? 9e6 : 5e6, framerate: fps, avc: { format: "avc" }, latencyMode: "quality" });
      var cv = document.createElement("canvas"); cv.width = ow; cv.height = oh; var ctx = cv.getContext("2d"), xs = new XMLSerializer();
      for (var f = 0; f < total; f++) {
        if (erro) throw erro; if (o.cancelar && o.cancelar()) throw new Error("cancelado");
        if (o.desenhar) await o.desenhar(f / fps, ctx, ow, oh);
        else {
          await win.__seek(f / fps);
          var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><foreignObject x="0" y="0" width="100%" height="100%">' + xs.serializeToString(doc.documentElement) + "</foreignObject></svg>";
          var img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
          ctx.drawImage(img, 0, 0, ow, oh); img.src = ""; img = null; svg = null;
        }
        var vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
        enc.encode(vf, { keyFrame: f % (fps * 2) === 0 }); vf.close();
        while (enc.encodeQueueSize > 6) await dorme(5);
        if (f % 5 === 0) { prog({ etapa: "Desenhando o vídeo", pct: 2 + Math.round(f / total * 90) }); await dorme(0); }
      }
      await enc.flush(); enc.close(); if (erro) throw erro; if (!avcC) throw new Error("o aparelho não entregou o vídeo comprimido");
      trilhas.push({ tipo: "v", escala: 90000, w: ow, h: oh, amostras: vAm, stsd: stsdVideo(ow, oh, avcC) });

      var codecSom = "";
      if (gravando) {
        prog({ etapa: "Juntando o som", pct: 94 });
        var g = await gravando;
        if (g && g.amostras) { trilhas.push({ tipo: "a", escala: g.sr, amostras: g.amostras, stsd: stsdAudio("aac", g.sr, g.asc) }); codecSom = "aac"; somInfo = "aac pelo gravador, " + g.amostras.length + " blocos a " + g.sr + " Hz"; }
        else somInfo = "o gravador não devolveu som" + (g && g.erro ? " (" + g.erro + ")" : "");
      }
      if (o.som && !codecSom && window.AudioEncoder && window.AudioData) {
        prog({ etapa: "Juntando o som", pct: 94 });
        var SR = 48000, cfg = null, cands = [{ codec: "mp4a.40.2", nome: "aac" }, { codec: "opus", nome: "opus" }];
        for (var c = 0; c < cands.length && !cfg; c++) { try { if ((await AudioEncoder.isConfigSupported({ codec: cands[c].codec, sampleRate: SR, numberOfChannels: 2, bitrate: 128000 })).supported) cfg = cands[c]; } catch (x) { /* tenta o próximo */ } }
        if (cfg) {
          var aAm = [], desc = null, padrao = cfg.nome === "aac" ? 1024 : 960;
          var ae = new AudioEncoder({ output: function (ch, meta) { if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = meta.decoderConfig.description; var d = new Uint8Array(ch.byteLength); ch.copyTo(d); aAm.push({ dados: d, dur: ch.duration ? Math.round(ch.duration * SR / 1e6) : padrao }); }, error: function (x) { erro = x; } });
          var cfgA = { codec: cfg.codec, sampleRate: SR, numberOfChannels: 2, bitrate: 128000 }; if (cfg.nome === "aac") cfgA.aac = { format: "aac" };
          ae.configure(cfgA);
          var N = Math.min(o.som.L.length, Math.round(o.duracao * SR)), passo = 4800;
          for (var p = 0; p < N; p += passo) {
            var n = Math.min(passo, N - p), dados = new Float32Array(n * 2); dados.set(o.som.L.subarray(p, p + n), 0); dados.set(o.som.R.subarray(p, p + n), n);
            var ad = new AudioData({ format: "f32-planar", sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(p * 1e6 / SR), data: dados }); ae.encode(ad); ad.close();
          }
          await ae.flush(); ae.close();
          var d0 = desc ? new Uint8Array(desc) : null, a0 = aAm[0] && aAm[0].dados, hex = function (b) { return [].map.call(b, function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join(""); };
          var media = aAm.length ? Math.round(aAm.reduce(function (t, x) { return t + x.dados.length; }, 0) / aAm.length) : 0;
          var diag = aAm.length + " blocos de ~" + media + " B, desc " + (d0 ? d0.length + "B " + hex(d0.subarray(0, 6)) : "não veio") + ", início " + (a0 ? hex(a0.subarray(0, 4)) : "-");
          if (cfg.nome === "aac" && aAm.length) {
            if (a0[0] === 0xff && (a0[1] & 0xf6) === 0xf0) {   // veio com cabeçalho ADTS em cada bloco: tira o cabeçalho e monta a descrição a partir dele
              var fi = (a0[2] >> 2) & 15; desc = new Uint8Array([((((a0[2] >> 6) & 3) + 1) << 3) | (fi >> 1), ((fi & 1) << 7) | ((((a0[2] & 1) << 2) | (a0[3] >> 6)) << 3)]).buffer;
              aAm.forEach(function (x) { x.dados = x.dados.subarray((x.dados[1] & 1) ? 7 : 9); }); diag += ", ADTS";
            } else if (d0 && d0[0] === 3) {                      // veio o descritor inteiro (como dentro do esds): pega só a parte da configuração
              var q = 1, tam = function () { var n = 0, b; do { b = d0[q++]; n = (n << 7) | (b & 127); } while (b & 128); return n; };
              tam(); q += 2; var fl = d0[q++]; if (fl & 0x80) q += 2; if (fl & 0x40) q += d0[q] + 1; if (fl & 0x20) q += 2;
              if (d0[q++] === 4) { tam(); q += 13; if (d0[q++] === 5) { var nn = tam(); desc = d0.slice(q, q + nn).buffer; diag += ", esds"; } }
            } else if (!d0) desc = new Uint8Array([0x11, 0x90]).buffer;   // AAC-LC, 48 kHz, estéreo
            var asc = new Uint8Array(desc), idx = ((asc[0] & 7) << 1) | (asc[1] >> 7), TAXAS = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000], taxa = TAXAS[idx] || SR;
            aAm.forEach(function (x) { x.dur = 1024; });
            if (media < 40 && o.audioCtx && tipoGravador()) {     // o codificador devolveu praticamente silêncio: grava pelo outro caminho
              prog({ etapa: "Gravando o som de outro jeito", pct: 95 });
              var g2 = await aacPeloGravador(o.som, o.duracao, o.audioCtx).catch(function () { return null; });
              if (g2 && g2.amostras) { trilhas.push({ tipo: "a", escala: g2.sr, amostras: g2.amostras, stsd: stsdAudio("aac", g2.sr, g2.asc) }); codecSom = "aac"; somInfo = "aac pelo gravador (o codificador veio mudo: " + diag + ")"; }
            }
            if (!codecSom) { trilhas.push({ tipo: "a", escala: taxa, amostras: aAm, stsd: stsdAudio("aac", taxa, desc) }); codecSom = "aac"; somInfo = "aac pelo codificador a " + taxa + " Hz, " + diag; }
          } else if (!erro && aAm.length) { trilhas.push({ tipo: "a", escala: SR, amostras: aAm, stsd: stsdAudio(cfg.nome, SR, desc) }); codecSom = cfg.nome; somInfo = cfg.nome + " pelo codificador, " + diag; }
          else somInfo = "o codificador " + cfg.nome + " falhou" + (erro ? " (" + (erro.message || erro) + ")" : ""); erro = null;
        }
      }
      prog({ etapa: "Fechando o arquivo", pct: 98 });
      var blob = mp4(trilhas, Math.round(total / fps * 1000));
      prog({ etapa: "Pronto", pct: 100 });
      return { blob: blob, comSom: !!codecSom, codecSom: codecSom, somInfo: somInfo, largura: ow, altura: oh, quadros: total };
    } finally { if (fr) fr.remove(); }
  }
  window.BWReelsCelular = { suporta: suporta, gerar: gerar, _extrairAac: extrairAac, _mp4: mp4, _stsdAudio: stsdAudio };
})();
