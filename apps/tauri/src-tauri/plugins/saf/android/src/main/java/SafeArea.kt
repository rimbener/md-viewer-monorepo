package com.rimbener.mdviewer.saf

import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import app.tauri.plugin.JSObject
import kotlin.math.max

/**
 * The app draws edge to edge, so the bars, the cutout and the keyboard cover
 * the page. The WebView does not tell the page, so this sets the covered
 * edges, in CSS pixels, as `--safe-area-*` variables on the document.
 */
class SafeArea(private val webView: WebView) {
  @Volatile
  private var edges = Edges(0, 0, 0, 0)

  data class Edges(val top: Int, val right: Int, val bottom: Int, val left: Int)

  fun start() {
    ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
      )
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      val density = webView.resources.displayMetrics.density
      val css = { px: Int -> Math.round(px / density) }
      edges = Edges(
        css(bars.top),
        css(bars.right),
        css(max(bars.bottom, ime.bottom)),
        css(bars.left),
      )
      webView.evaluateJavascript(script(edges), null)
      insets
    }
    ViewCompat.requestApplyInsets(webView)
  }

  /** For a page that loads after the last change, and asks. */
  fun current(): JSObject {
    val now = edges
    val result = JSObject()
    result.put("top", now.top)
    result.put("right", now.right)
    result.put("bottom", now.bottom)
    result.put("left", now.left)
    return result
  }

  private fun script(edges: Edges): String {
    val sides = listOf(
      "top" to edges.top,
      "right" to edges.right,
      "bottom" to edges.bottom,
      "left" to edges.left,
    )
    return sides.joinToString("") { (side, px) ->
      "document.documentElement.style.setProperty('--safe-area-$side','${px}px');"
    }
  }
}
