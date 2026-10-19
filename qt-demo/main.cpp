// Blockwork's editor for the website: the QML-only half of blockwork-qt (its
// EditorPage and blockstitch's components) on Qt for WebAssembly, with
// DemoBackend standing in for the daemon. See README.md.
#include <QtCore/QPointer>
#include <QtGui/QGuiApplication>
#include <QtQml/QQmlApplicationEngine>
#include <QtQml/QQmlExtensionPlugin>

#ifdef Q_OS_WASM
#include <emscripten/bind.h>
#endif

Q_IMPORT_QML_PLUGIN(com_blockworked_BlockstitchPlugin)
Q_IMPORT_QML_PLUGIN(com_blockworked_BlockworkPlugin)

static QPointer<QObject> demoMain;

// Called by the page (src/lib/qtDemo.ts): on phones the locked editor is a
// thumbnail of the desktop layout, drawn at this scale. The page's value from
// before main() ran waits in `window.blockworkEditorScale`.
static void setEditorScale(double scale)
{
    if (demoMain)
        demoMain->setProperty("editorScale", scale);
}

#ifdef Q_OS_WASM
EMSCRIPTEN_BINDINGS(blockwork_demo)
{
    emscripten::function("setEditorScale", &setEditorScale);
}
#endif

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);
    QQmlApplicationEngine engine;
    engine.loadFromModule("com.blockworked.Demo", "DemoMain");
    if (engine.rootObjects().isEmpty())
        return 1;
    demoMain = engine.rootObjects().first();
#ifdef Q_OS_WASM
    const auto pending = emscripten::val::global("blockworkEditorScale");
    if (pending.isNumber())
        setEditorScale(pending.as<double>());
#endif
    return app.exec();
}
