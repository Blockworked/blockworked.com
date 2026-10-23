// Blockwork's editor for the website: the QML-only half of blockwork-qt (its
// EditorPage and blockstitch's components) on Qt for WebAssembly, with
// DemoBackend standing in for the daemon. See README.md.
#include <QtCore/QFile>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QPointer>
#include <QtCore/QTimer>
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

// `blockwork-demo --contract <file>` (native builds, for check.sh): loads the
// page, writes the backend's capabilities and every QML warning to <file>,
// and exits 1 if anything warned.
static int writeContract(const QString &path, QObject *root, const QList<QQmlError> &warnings)
{
    QJsonObject out;
    if (root) {
        QVariant caps;
        QMetaObject::invokeMethod(root->property("backend").value<QObject *>(), "capabilities",
                                  Q_RETURN_ARG(QVariant, caps));
        out = QJsonDocument::fromJson(caps.toString().toUtf8()).object();
    }
    QJsonArray lines;
    for (const QQmlError &w : warnings)
        lines.append(w.toString());
    out["loaded"] = root != nullptr;
    out["warnings"] = lines;
    QFile file(path);
    if (!file.open(QIODevice::WriteOnly))
        return 2;
    file.write(QJsonDocument(out).toJson());
    return root && warnings.isEmpty() ? 0 : 1;
}

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);
    QQmlApplicationEngine engine;
    const QStringList args = app.arguments();
    const qsizetype contractAt = args.indexOf("--contract");
    const QString contract = contractAt >= 0 && contractAt + 1 < args.size() ? args[contractAt + 1] : QString();
    QList<QQmlError> warnings;
    if (!contract.isEmpty())
        QObject::connect(&engine, &QQmlEngine::warnings, [&](const QList<QQmlError> &w) { warnings += w; });
    engine.loadFromModule("com.blockworked.Demo", "DemoMain");
    if (engine.rootObjects().isEmpty())
        return contract.isEmpty() ? 1 : writeContract(contract, nullptr, warnings) | 1;
    demoMain = engine.rootObjects().first();
    if (!contract.isEmpty()) {
        // Give deferred loaders and the first frames a moment to warn.
        QTimer::singleShot(1500, &app, [&] { app.exit(writeContract(contract, demoMain, warnings)); });
    }
#ifdef Q_OS_WASM
    const auto pending = emscripten::val::global("blockworkEditorScale");
    if (pending.isNumber())
        setEditorScale(pending.as<double>());
#endif
    return app.exec();
}
