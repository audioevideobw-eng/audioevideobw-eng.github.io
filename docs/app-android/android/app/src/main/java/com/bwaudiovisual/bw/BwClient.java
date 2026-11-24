package com.bwaudiovisual.bw;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import org.json.JSONObject;

/* Uso SEM INTERNET (24/11/2026): com rede, nada muda (tudo vem do site no ar). Sem rede, os pedidos GET para o site e para as
   bibliotecas dos CDNs são atendidos pela cópia montada no build (assets/offline: site/ + cdn/ + cdn.json — docs/app-android/montar-offline.py).
   Páginas recebem o mesmo código do Capacitor que o app injeta online (para os downloads virarem arquivo). Supabase, POST e IA não passam aqui. */
public class BwClient extends BridgeWebViewClient {
    static final String SITE = "audioevideobw-eng.github.io";
    private final Bridge bridge;
    private final Context ctx;
    private final Map<String, String> cdn = new HashMap<>();
    private Object injetor;
    private Method injetar;

    public BwClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
        this.ctx = bridge.getContext();
        try (InputStream in = ctx.getAssets().open("offline/cdn.json")) {
            JSONObject j = new JSONObject(new String(in.readAllBytes(), "UTF-8"));
            for (Iterator<String> it = j.keys(); it.hasNext(); ) { String k = it.next(); cdn.put(k, j.getString(k)); }
        } catch (Exception e) { /* sem cópia de CDN */ }
        try {
            Field f = bridge.getLocalServer().getClass().getDeclaredField("jsInjector");
            f.setAccessible(true);
            injetor = f.get(bridge.getLocalServer());
            if (injetor != null) { injetar = injetor.getClass().getMethod("getInjectedStream", InputStream.class); injetar.setAccessible(true); }
        } catch (Exception e) { injetor = null; }
    }

    public boolean online() {
        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            Network n = cm.getActiveNetwork();
            if (n == null) return false;
            NetworkCapabilities c = cm.getNetworkCapabilities(n);
            return c != null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Exception e) { return true; }
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
        if ("GET".equalsIgnoreCase(req.getMethod()) && !online()) {
            WebResourceResponse r = daCopia(req.getUrl());
            if (r != null) return r;
        }
        return super.shouldInterceptRequest(view, req);
    }

    private static String tipo(String p) {
        String s = p.toLowerCase();
        if (s.endsWith(".html") || s.endsWith(".htm")) return "text/html";
        if (s.endsWith(".js") || s.endsWith(".mjs")) return "text/javascript";
        if (s.endsWith(".css")) return "text/css";
        if (s.endsWith(".json")) return "application/json";
        if (s.endsWith(".svg")) return "image/svg+xml";
        if (s.endsWith(".png")) return "image/png";
        if (s.endsWith(".jpg") || s.endsWith(".jpeg")) return "image/jpeg";
        if (s.endsWith(".webp")) return "image/webp";
        if (s.endsWith(".wasm")) return "application/wasm";
        if (s.endsWith(".mp4")) return "video/mp4";
        if (s.endsWith(".woff2")) return "font/woff2";
        if (s.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private WebResourceResponse resposta(String mime, InputStream in) {
        WebResourceResponse r = new WebResourceResponse(mime, mime.startsWith("text/") || mime.endsWith("json") ? "UTF-8" : null, in);
        Map<String, String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", "*");
        h.put("Cache-Control", "no-store");
        r.setResponseHeaders(h);
        return r;
    }

    private WebResourceResponse daCopia(Uri u) {
        try {
            String host = u.getHost() == null ? "" : u.getHost();
            if (host.equals(SITE)) {
                String p = u.getPath() == null ? "" : u.getPath();
                if (p.startsWith("/")) p = p.substring(1);
                if (p.isEmpty() || p.endsWith("/")) p = p + "index.html";
                if (p.equals("sw.js")) {
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
                }
                if (!p.contains(".")) p = p + ".html";
                InputStream in = ctx.getAssets().open("offline/site/" + p);
                String m = tipo(p);
                if (m.equals("text/html") && injetor != null) {
                    try { in = (InputStream) injetar.invoke(injetor, in); } catch (Exception e) { /* página sem o Capacitor */ }
                }
                return resposta(m, in);
            }
            String url = u.toString();
            int c = url.indexOf('#');
            if (c >= 0) url = url.substring(0, c);
            String nome = cdn.get(url);
            if (nome != null) return resposta(tipo(u.getPath() == null ? "" : u.getPath()), ctx.getAssets().open("offline/cdn/" + nome));
        } catch (Exception e) { /* não está na cópia */ }
        return null;
    }
}
