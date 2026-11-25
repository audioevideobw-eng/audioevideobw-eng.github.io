/* assets/meu-assistente.js — página MEU ASSISTENTE (25/11/2026, dono: "trocar o nome do Tio Cláudio para assistente… cada pessoa configura com o
   nome desejado… uma página de config do assistente… modelos feminino, masculino, cores").
   Tudo fica NO APARELHO, como as outras preferências: ui_assistente {nome, visual, cor, voz} (BWAssistente, layout.js), ui_agente_* (as que o
   assistente já usava: nome da pessoa, tom, velocidade, nível da IA, lançar sem perguntar, conversa, bip) e ui_tut_som (tutoriais). Nada vai para a conta. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var A = window.BWAssistente;
  function ui(k, p) { try { var v = localStorage.getItem("ui_agente_" + k); return v == null ? p : JSON.parse(v); } catch (e) { return p; } }
  function uiSet(k, v) { try { localStorage.setItem("ui_agente_" + k, JSON.stringify(v)); } catch (e) { } }
  function tut() { try { return JSON.parse(localStorage.getItem("ui_tut_som") || "{}") || {}; } catch (e) { return {}; } }
  function tutSet(o) { var t = tut(); for (var k in o) t[k] = o[k]; try { localStorage.setItem("ui_tut_som", JSON.stringify(t)); } catch (e) { } }
  var salvo = (function () { var tm = 0; return function () { clearTimeout(tm); tm = setTimeout(function () { if (window.BWAviso) BWAviso("✓ Salvo neste aparelho"); }, 500); }; })();
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  function chips(id, lista, atual, ao) {
    var el = $(id); el.innerHTML = lista.map(function (x) { return '<button type="button" data-v="' + esc(x[0]) + '" class="' + (x[0] === atual ? "on" : "") + '" aria-pressed="' + (x[0] === atual) + '">' + esc(x[1]) + "</button>"; }).join("");
    el.onclick = function (e) { var b = e.target.closest("[data-v]"); if (!b) return; ao(b.getAttribute("data-v")); };
  }
  function desenhar() {
    var p = A.pref(), cor = A.cor(), vis = A.visual();
    document.documentElement.style.setProperty("--ass", cor);
    $("maAv").innerHTML = A.avatar(74);
    $("maTitulo").textContent = A.proprio() ? A.nome().toUpperCase() : "MEU ASSISTENTE";
    $("maFrase").textContent = "Olá, sou " + A.quem() + ".";
    if (document.activeElement !== $("maNome")) $("maNome").value = A.proprio() ? A.nome() : "";
    chips("maSug", [["", "ASSISTENTE"], ["Zé", "ZÉ"], ["Bia", "BIA"], ["Max", "MAX"], ["Luna", "LUNA"], ["Tio Cláudio", "TIO CLÁUDIO"]], A.proprio() ? A.nome() : "", function (v) { A.gravar({ nome: v }); desenhar(); salvo(); });
    $("maVis").innerHTML = A.VISUAIS.map(function (v) { return '<button type="button" data-vis="' + v[0] + '" class="' + (v[0] === vis ? "on" : "") + '" aria-pressed="' + (v[0] === vis) + '"><i>' + A.avatar(50, v[0], cor) + "</i>" + esc(v[1]) + "</button>"; }).join("");
    $("maCores").innerHTML = A.CORES.map(function (c) { return '<button type="button" role="radio" data-cor="' + c[1] + '" style="--c:' + c[1] + '" class="' + (c[1].toLowerCase() === cor.toLowerCase() ? "on" : "") + '" aria-checked="' + (c[1].toLowerCase() === cor.toLowerCase()) + '" aria-label="' + c[0] + '"></button>'; }).join("");
    chips("maVoz", [["auto", "AUTOMÁTICA (pelo visual)"], ["m", "♂ MASCULINA"], ["f", "♀ FEMININA"]], p.voz || "auto", function (v) { A.gravar({ voz: v }); desenhar(); salvo(); falar(); });
    chips("maNivel", [["smart", "⚡ BW SMART"], ["rapido", "RÁPIDO"], ["inteligente", "INTELIGENTE"]], ui("nivel", "smart"), function (v) { uiSet("nivel", v); desenhar(); salvo(); });
  }
  function falar() {
    var s = window.speechSynthesis; if (!s) { if (window.BWAviso) BWAviso.erro("Este navegador não fala."); return; }
    try { if (s.speaking) s.cancel(); } catch (e) { }
    setTimeout(function () {
      var u = new SpeechSynthesisUtterance("Olá, sou " + A.quem() + ". Bora organizar o seu dia?"), v = window.BWAgente && BWAgente.voz && BWAgente.voz();
      u.lang = "pt-BR"; if (v && v.obj) { u.voice = v.obj; u.lang = v.obj.lang; u.pitch = v.tom; } u.rate = +ui("velocidade", 1.05) || 1.05; s.speak(u);
    }, 130);
  }
  $("maNome").addEventListener("input", function () { A.gravar({ nome: this.value.trim() }); desenhar(); salvo(); });
  $("maVoce").value = ui("nome", ""); $("maVoce").addEventListener("input", function () { uiSet("nome", this.value.trim()); salvo(); });
  $("maVis").onclick = function (e) { var b = e.target.closest("[data-vis]"); if (!b) return; A.gravar({ visual: b.getAttribute("data-vis") }); desenhar(); salvo(); };
  $("maCores").onclick = function (e) { var b = e.target.closest("[data-cor]"); if (!b) return; A.gravar({ cor: b.getAttribute("data-cor") }); desenhar(); salvo(); };
  $("maTom").value = ui("tom", "auto"); $("maTom").onchange = function () { uiSet("tom", this.value); salvo(); falar(); };
  var vel = $("maVel"), velTxt = function () { $("maVelTxt").textContent = (+vel.value).toFixed(2).replace(".", ",") + "×"; };
  vel.value = ui("velocidade", 1.05); velTxt(); vel.oninput = velTxt; vel.onchange = function () { uiSet("velocidade", +vel.value); salvo(); falar(); };
  [["maAuto", "auto", false], ["maConversa", "conversa", true], ["maBip", "bip", true]].forEach(function (x) { var el = $(x[0]); el.checked = !!ui(x[1], x[2]); el.onchange = function () { uiSet(x[1], el.checked); salvo(); }; });
  var t = tut(); $("maNarra").checked = t.narra !== false; $("maMusica").checked = t.musica !== false;
  $("maNarra").onchange = function () { tutSet({ narra: this.checked }); salvo(); }; $("maMusica").onchange = function () { tutSet({ musica: this.checked }); salvo(); };
  $("maOuvir").onclick = falar; $("maOuvir2").onclick = falar;
  $("maPadrao").onclick = function () {
    if (!confirm("Voltar o assistente ao padrão (nome Assistente, robô azul, voz automática)? As outras preferências continuam.")) return;
    try { localStorage.removeItem("ui_assistente"); } catch (e) { } try { window.dispatchEvent(new Event("bw-assistente")); } catch (e) { } desenhar(); salvo();
  };
  window.addEventListener("bw-assistente", function () { if (document.activeElement !== $("maNome")) desenhar(); });
  desenhar();
})();
