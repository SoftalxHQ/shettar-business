package com.shettar.business

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.ScriptHandler
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * Edge-to-edge WebView + CSS safe-area injection.
 *
 * Android 15+ draws behind system bars. Older WebViews report env(safe-area-inset-*)
 * as 0 (Tauri #14240). We inject --android-safe-* via a <style> tag only — never
 * mutate <html> attributes (that causes React hydration mismatches).
 */
class MainActivity : TauriActivity() {
  private var documentStartScript: ScriptHandler? = null
  private var lastInjectedCss = ""
  private var pendingTop = 0f
  private var pendingRight = 0f
  private var pendingBottom = 0f
  private var pendingLeft = 0f
  private var insetsReady = false
  private var findTries = 0

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    WindowCompat.setDecorFitsSystemWindows(window, false)
    @Suppress("DEPRECATION")
    run {
      window.statusBarColor = Color.TRANSPARENT
      window.navigationBarColor = Color.TRANSPARENT
    }

    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { _, windowInsets ->
      val bars = windowInsets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      val density = resources.displayMetrics.density.coerceAtLeast(0.01f)
      pendingTop = bars.top / density
      pendingRight = bars.right / density
      pendingBottom = bars.bottom / density
      pendingLeft = bars.left / density
      insetsReady = true
      findTries = 0
      injectSafeAreaCss()
      // Do not consume — let the WebView also see insets when its Chromium build supports them.
      windowInsets
    }
    ViewCompat.requestApplyInsets(content)
    content.post {
      findTries = 0
      injectSafeAreaCss()
    }
  }

  private fun injectSafeAreaCss() {
    if (!insetsReady) return

    val webView = findWebView(window.decorView)
    if (webView == null) {
      if (findTries++ < 80) {
        findViewById<View>(android.R.id.content).postDelayed({ injectSafeAreaCss() }, 100)
      }
      return
    }

    val script = buildInjectScript(pendingTop, pendingRight, pendingBottom, pendingLeft)
    webView.evaluateJavascript(script, null)

    if (script == lastInjectedCss) return
    lastInjectedCss = script

    if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      documentStartScript?.remove()
      documentStartScript =
        WebViewCompat.addDocumentStartJavaScript(webView, script, setOf("*"))
    }
  }

  private fun buildInjectScript(top: Float, right: Float, bottom: Float, left: Float): String {
    fun px(value: Float): String = String.format(java.util.Locale.US, "%.1f", value)
    val css =
      ":root{" +
        "--android-safe-top:${px(top)}px;" +
        "--android-safe-right:${px(right)}px;" +
        "--android-safe-bottom:${px(bottom)}px;" +
        "--android-safe-left:${px(left)}px;" +
        // Aliases some guides / plugins use
        "--safe-area-inset-top:${px(top)}px;" +
        "--safe-area-inset-right:${px(right)}px;" +
        "--safe-area-inset-bottom:${px(bottom)}px;" +
        "--safe-area-inset-left:${px(left)}px;" +
        "}"
    val cssJs = css.replace("\\", "\\\\").replace("'", "\\'")
    return """
      (function(){
        var id='shettar-safe-area';
        var el=document.getElementById(id);
        if(!el){
          el=document.createElement('style');
          el.id=id;
          (document.head||document.documentElement).appendChild(el);
        }
        el.textContent='$cssJs';
      })();
    """.trimIndent()
  }

  private fun findWebView(view: View): WebView? {
    if (view is WebView) return view
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        findWebView(view.getChildAt(i))?.let { return it }
      }
    }
    return null
  }
}
