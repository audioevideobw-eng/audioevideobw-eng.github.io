package com.bwaudiovisual.bw;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

/* BW para Android: abre a plataforma no ar; SEM rede, a BwClient entrega a cópia que vai dentro do app.
   24/11/2026 (dono: "rolagem e navegação muito bugadas"):
   - VOLTAR do Android: antes fechava o app inteiro (o Capacitor sem o plugin App não trata o voltar). Agora, na ordem:
     1) fecha o que estiver aberto na página (menu, folha, janela — BWAndroid.voltar() em assets/bw-android.js);
     2) volta para a página anterior; 3) na primeira página, o app vai para o fundo (não é morto, continua de onde parou).
   - ROLAGEM: sem o efeito de "esticar" a página nas pontas (Android 12+) e com a letra no tamanho do site (a fonte grande do
     sistema aumentava os textos e fazia a tela andar para o lado). */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() { voltar(); }
        });
    }

    @Override
    protected void load() {
        super.load();
        BwClient cliente = new BwClient(getBridge());
        getBridge().setWebViewClient(cliente);
        WebView wv = getBridge().getWebView();
        wv.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = wv.getSettings();
        s.setTextZoom(100);
        if (!cliente.online()) wv.post(() -> wv.loadUrl(getBridge().getAppUrl()));
    }

    private void voltar() {
        WebView wv = getBridge() == null ? null : getBridge().getWebView();
        if (wv == null) { moveTaskToBack(true); return; }
        wv.evaluateJavascript("(function(){try{return window.BWAndroid&&BWAndroid.voltar?(BWAndroid.voltar()?'1':'0'):'0'}catch(e){return '0'}})()", v -> {
            if (v != null && v.contains("1")) return;
            if (wv.canGoBack()) wv.goBack();
            else moveTaskToBack(true);
        });
    }
}
