package com.bwaudiovisual.bw;

import com.getcapacitor.BridgeActivity;

/* BW para Android: abre a plataforma no ar; SEM rede, a BwClient entrega a cópia que vai dentro do app. */
public class MainActivity extends BridgeActivity {
    @Override
    protected void load() {
        super.load();
        BwClient cliente = new BwClient(getBridge());
        getBridge().setWebViewClient(cliente);
        if (!cliente.online()) getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(getBridge().getAppUrl()));
    }
}
