package com.bwaudiovisual.bw;

import android.content.Context;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/* VOZ DO ASSISTENTE NO APP ANDROID (28/11/2026). O WebView do Android NÃO tem a voz do navegador (window.speechSynthesis não existe),
   então o assistente ficava mudo dentro do app. Aqui a voz do próprio Android (TextToSpeech) é oferecida à página como "BWFalaNativa";
   assets/bw-android.js monta por cima dela um speechSynthesis igual ao do navegador (speak/cancel/getVoices + onstart/onend).
   Só fala o texto que a página manda; não grava, não ouve e não envia nada. */
public class BwFala extends UtteranceProgressListener implements TextToSpeech.OnInitListener {
    private final WebView wv;
    private TextToSpeech tts;
    private volatile boolean pronto = false;

    public BwFala(Context ctx, WebView wv) {
        this.wv = wv;
        try { tts = new TextToSpeech(ctx.getApplicationContext(), this); } catch (Exception e) { tts = null; }
    }

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS || tts == null) return;
        try {
            int r = tts.setLanguage(new Locale("pt", "BR"));
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) tts.setLanguage(new Locale("pt"));
            tts.setOnUtteranceProgressListener(this);
            pronto = true;
        } catch (Exception e) { pronto = false; }
    }

    private void avisar(final String ev, final String id) {
        if (wv == null || id == null) return;
        final String limpo = id.replaceAll("[^A-Za-z0-9_-]", "");
        wv.post(() -> {
            try { wv.evaluateJavascript("window.__bwFala&&window.__bwFala('" + ev + "','" + limpo + "')", null); } catch (Exception e) { }
        });
    }

    @Override public void onStart(String id) { avisar("i", id); }
    @Override public void onDone(String id) { avisar("e", id); }
    @Override public void onError(String id) { avisar("x", id); }
    @Override public void onError(String id, int code) { avisar("x", id); }
    @Override public void onStop(String id, boolean interrupted) { avisar("c", id); }

    @JavascriptInterface
    public boolean pronto() { return pronto; }

    @JavascriptInterface
    public String vozes() {
        JSONArray a = new JSONArray();
        try {
            if (!pronto || tts == null) return a.toString();
            Set<Voice> vs = tts.getVoices();
            if (vs == null) return a.toString();
            for (Voice v : vs) {
                Locale l = v.getLocale();
                if (l == null || !"pt".equals(l.getLanguage())) continue;
                Set<String> f = v.getFeatures();
                if (f != null && f.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                JSONObject o = new JSONObject();
                o.put("n", v.getName());
                o.put("l", l.toLanguageTag());
                o.put("r", v.isNetworkConnectionRequired());
                a.put(o);
            }
        } catch (Exception e) { }
        return a.toString();
    }

    @JavascriptInterface
    public void falar(String id, String texto, float velocidade, float tom, String vozNome) {
        if (!pronto || tts == null || texto == null) { avisar("x", id); return; }
        try {
            if (vozNome != null && !vozNome.isEmpty()) {
                Set<Voice> vs = tts.getVoices();
                if (vs != null) for (Voice v : vs) { if (vozNome.equals(v.getName())) { tts.setVoice(v); break; } }
            }
            tts.setSpeechRate(Math.max(0.3f, Math.min(2.5f, velocidade)));
            tts.setPitch(Math.max(0.3f, Math.min(2.0f, tom)));
            Bundle p = new Bundle();
            p.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
            tts.speak(texto, TextToSpeech.QUEUE_ADD, p, id);
        } catch (Exception e) { avisar("x", id); }
    }

    @JavascriptInterface
    public void parar() { try { if (tts != null) tts.stop(); } catch (Exception e) { } }

    @JavascriptInterface
    public boolean falando() { try { return tts != null && tts.isSpeaking(); } catch (Exception e) { return false; } }

    public void desligar() { try { if (tts != null) { tts.stop(); tts.shutdown(); } } catch (Exception e) { } tts = null; pronto = false; }
}
