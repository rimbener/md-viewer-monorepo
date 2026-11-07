package com.rimbener.mdviewer.saf

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import android.util.Base64
import android.webkit.WebView
import androidx.activity.result.ActivityResult
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.util.concurrent.Executors

@InvokeArg
class TreeArgs {
  lateinit var tree: String
}

@InvokeArg
class DocumentArgs {
  lateinit var tree: String
  lateinit var document: String
}

@InvokeArg
class WriteArgs {
  lateinit var tree: String
  lateinit var document: String
  lateinit var contents: String
}

@InvokeArg
class CreateArgs {
  lateinit var tree: String
  lateinit var parent: String
  lateinit var name: String
}

private const val ACCESS =
  Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION

/**
 * Also reports the safe area, as this is the app's one Android plugin.
 *
 * A folder is a document tree the person granted through the system picker.
 * The grant is persisted, so the tree URI opens the folder again on a later
 * run. Documents are addressed by their id inside that tree.
 */
@TauriPlugin
class SafPlugin(private val activity: Activity) : Plugin(activity) {
  // One thread keeps a write ahead of a read sent after it.
  private val io = Executors.newSingleThreadExecutor()

  private val resolver get() = activity.contentResolver

  private var edges: SafeArea? = null

  override fun load(webView: WebView) {
    edges = SafeArea(webView).also { it.start() }
  }

  @Command
  fun safeArea(invoke: Invoke) {
    invoke.resolve(edges?.current() ?: JSObject())
  }

  private fun run(invoke: Invoke, work: () -> JSObject) {
    io.execute {
      try {
        invoke.resolve(work())
      } catch (ex: Exception) {
        invoke.reject(ex.message ?: ex.javaClass.simpleName)
      }
    }
  }

  private fun documentUri(tree: String, document: String): Uri =
    DocumentsContract.buildDocumentUriUsingTree(Uri.parse(tree), document)

  private fun describe(tree: Uri): JSObject {
    val root = DocumentsContract.getTreeDocumentId(tree)
    val uri = DocumentsContract.buildDocumentUriUsingTree(tree, root)
    val name = resolver.query(uri, arrayOf(Document.COLUMN_DISPLAY_NAME), null, null, null)
      ?.use { if (it.moveToFirst()) it.getString(0) else null }
      ?: throw IllegalStateException("The folder is gone.")
    val folder = JSObject()
    folder.put("tree", tree.toString())
    folder.put("root", root)
    folder.put("name", name)
    return folder
  }

  @Command
  fun pickFolder(invoke: Invoke) {
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
    intent.addFlags(ACCESS or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    startActivityForResult(invoke, intent, "folderPicked")
  }

  @ActivityCallback
  fun folderPicked(invoke: Invoke, result: ActivityResult) {
    val tree = result.data?.data
    if (result.resultCode != Activity.RESULT_OK || tree == null) {
      invoke.resolve(JSObject())
      return
    }
    run(invoke) {
      resolver.takePersistableUriPermission(tree, ACCESS)
      describe(tree)
    }
  }

  /** The folder again from its tree URI, or nothing when the grant is gone. */
  @Command
  fun openTree(invoke: Invoke) {
    val args = invoke.parseArgs(TreeArgs::class.java)
    run(invoke) {
      val tree = Uri.parse(args.tree)
      val isGranted = resolver.persistedUriPermissions.any {
        it.uri == tree && it.isReadPermission
      }
      if (!isGranted) {
        JSObject()
      } else {
        try {
          describe(tree)
        } catch (ex: Exception) {
          JSObject()
        }
      }
    }
  }

  @Command
  fun listChildren(invoke: Invoke) {
    val args = invoke.parseArgs(DocumentArgs::class.java)
    run(invoke) {
      val children = DocumentsContract.buildChildDocumentsUriUsingTree(
        Uri.parse(args.tree),
        args.document,
      )
      val columns = arrayOf(
        Document.COLUMN_DOCUMENT_ID,
        Document.COLUMN_DISPLAY_NAME,
        Document.COLUMN_MIME_TYPE,
      )
      val entries = JSArray()
      resolver.query(children, columns, null, null, null)?.use {
        while (it.moveToNext()) {
          val entry = JSObject()
          entry.put("id", it.getString(0))
          entry.put("name", it.getString(1))
          entry.put("isDirectory", it.getString(2) == Document.MIME_TYPE_DIR)
          entries.put(entry)
        }
      } ?: throw IllegalStateException("The folder cannot be read.")
      val listing = JSObject()
      listing.put("entries", entries)
      listing
    }
  }

  @Command
  fun stat(invoke: Invoke) {
    val args = invoke.parseArgs(DocumentArgs::class.java)
    run(invoke) {
      val columns = arrayOf(Document.COLUMN_LAST_MODIFIED, Document.COLUMN_SIZE)
      resolver.query(documentUri(args.tree, args.document), columns, null, null, null)?.use {
        if (!it.moveToFirst()) {
          throw IllegalStateException("The document is gone.")
        }
        val stat = JSObject()
        stat.put("modified", it.getLong(0))
        stat.put("size", it.getLong(1))
        stat
      } ?: throw IllegalStateException("The document is gone.")
    }
  }

  private fun readBytes(args: DocumentArgs): ByteArray =
    resolver.openInputStream(documentUri(args.tree, args.document))?.use { it.readBytes() }
      ?: throw IllegalStateException("The document cannot be read.")

  @Command
  fun readText(invoke: Invoke) {
    val args = invoke.parseArgs(DocumentArgs::class.java)
    run(invoke) {
      val text = JSObject()
      text.put("contents", readBytes(args).toString(Charsets.UTF_8))
      text
    }
  }

  @Command
  fun readBase64(invoke: Invoke) {
    val args = invoke.parseArgs(DocumentArgs::class.java)
    run(invoke) {
      val file = JSObject()
      file.put("data", Base64.encodeToString(readBytes(args), Base64.NO_WRAP))
      file.put(
        "mimeType",
        resolver.getType(documentUri(args.tree, args.document)) ?: "application/octet-stream",
      )
      file
    }
  }

  @Command
  fun writeText(invoke: Invoke) {
    val args = invoke.parseArgs(WriteArgs::class.java)
    run(invoke) {
      // "w" alone does not truncate on some providers, so a shorter text would keep a tail.
      resolver.openOutputStream(documentUri(args.tree, args.document), "wt")
        ?.use { it.write(args.contents.toByteArray(Charsets.UTF_8)) }
        ?: throw IllegalStateException("The document cannot be written.")
      JSObject()
    }
  }

  @Command
  fun createFile(invoke: Invoke) {
    val args = invoke.parseArgs(CreateArgs::class.java)
    run(invoke) {
      // A typed MIME makes some providers add their own extension to the name.
      val created = DocumentsContract.createDocument(
        resolver,
        documentUri(args.tree, args.parent),
        "application/octet-stream",
        args.name,
      ) ?: throw IllegalStateException("The file cannot be created.")
      val file = JSObject()
      file.put("document", DocumentsContract.getDocumentId(created))
      file
    }
  }
}
