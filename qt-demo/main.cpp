// Blockwork's editor for the website: the QML-only half of blockwork-qt (its
// EditorPage and blockstitch's components) on Qt for WebAssembly, with
// DemoBackend standing in for the daemon. See README.md.
#include <QtCore/QFile>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QPointer>
#include <QtCore/QTimer>
#include <QtGui/QFont>
#include <QtGui/QFontDatabase>
#include <QtGui/QGuiApplication>
#include <QtQml/QQmlApplicationEngine>
#include <QtQml/QQmlExtensionPlugin>
#include <QtQuick/QQuickWindow>
#include "packhost.h"

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

// The pack viewer (public/packview/, PackView.qml): the page hands it a pack
// file's JSON and a theme, and asks it to render the pack's blocks.
static void loadPack(const std::string &json) { PackHost::instance()->setPack(QString::fromStdString(json)); }
static void setPackTheme(const std::string &theme) { PackHost::instance()->setTheme(QString::fromStdString(theme)); }
static void renderPack() { PackHost::instance()->requestRender(); }

#ifdef Q_OS_WASM
EMSCRIPTEN_BINDINGS(blockwork_demo)
{
    emscripten::function("setEditorScale", &setEditorScale);
    emscripten::function("loadPack", &loadPack);
    emscripten::function("setPackTheme", &setPackTheme);
    emscripten::function("renderPack", &renderPack);
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
    // Blockwork's typeface, from the editor's resources (res/fonts in Blockwork),
    // so the page's editor reads like the app.
    for (const char *name : {"Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Italic"}) {
        const int id = QFontDatabase::addApplicationFont(QStringLiteral(":/fonts/AtkinsonHyperlegibleNext-%1.ttf").arg(QLatin1String(name)));
        if (id >= 0 && QStringLiteral("Regular") == QLatin1String(name)) {
            QFont font = app.font();
            font.setFamilies(QFontDatabase::applicationFontFamilies(id));
            app.setFont(font);
        }
    }
    QQmlApplicationEngine engine;
    const QStringList args = app.arguments();
    const qsizetype contractAt = args.indexOf("--contract");
    const QString contract = contractAt >= 0 && contractAt + 1 < args.size() ? args[contractAt + 1] : QString();
    QList<QQmlError> warnings;
    if (!contract.isEmpty())
        QObject::connect(&engine, &QQmlEngine::warnings, [&](const QList<QQmlError> &w) { warnings += w; });
    // `--pack <file> [--theme light] [--render <out.json>] [--shot <out.png>]`
    // opens the pack viewer natively; --render writes what PackView renders
    // and --shot a picture of the viewer, then it exits. The
    // web page picks the viewer with `window.blockworkEntry = "PackView"`.
    const qsizetype packAt = args.indexOf("--pack");
    const qsizetype themeAt = args.indexOf("--theme");
    const qsizetype renderAt = args.indexOf("--render");
    const qsizetype shotAt = args.indexOf("--shot");
    QString entry = QStringLiteral("DemoMain");
#ifdef Q_OS_WASM
    const auto wanted = emscripten::val::global("blockworkEntry");
    if (wanted.isString() && wanted.as<std::string>() == "PackView")
        entry = QStringLiteral("PackView");
#endif
    if (packAt >= 0 && packAt + 1 < args.size()) {
        QFile file(args[packAt + 1]);
        if (!file.open(QIODevice::ReadOnly)) {
            qWarning("Can't read %s", qPrintable(args[packAt + 1]));
            return 2;
        }
        entry = QStringLiteral("PackView");
        PackHost *host = PackHost::instance();
        if (themeAt >= 0 && themeAt + 1 < args.size())
            host->setTheme(args[themeAt + 1]);
        const QString pack = QString::fromUtf8(file.readAll());
        host->onFailed = [](const QString &reason) {
            qWarning("Pack viewer: %s", qPrintable(reason));
            QCoreApplication::exit(1);
        };
        if (renderAt >= 0 && renderAt + 1 < args.size()) {
            const QString out = args[renderAt + 1];
            host->onRendered = [out](const QString &json) {
                QFile file(out);
                QCoreApplication::exit(file.open(QIODevice::WriteOnly) && file.write(json.toUtf8()) >= 0 ? 0 : 2);
            };
        }
        host->onReady = [host, pack, render = renderAt >= 0] {
            // As the page does: the pack once the viewer is up, then the render.
            QTimer::singleShot(0, host, [host, pack, render] {
                host->setPack(pack);
                if (render)
                    QTimer::singleShot(500, host, [host] { host->requestRender(); });
            });
        };
    }
    engine.loadFromModule("com.blockworked.Demo", entry);
    if (engine.rootObjects().isEmpty())
        return contract.isEmpty() ? 1 : writeContract(contract, nullptr, warnings) | 1;
    demoMain = engine.rootObjects().first();
    if (entry == QLatin1String("PackView") && shotAt >= 0 && shotAt + 1 < args.size()) {
        const QString out = args[shotAt + 1];
        QTimer::singleShot(2000, &app, [&app, out] {
            auto *window = qobject_cast<QQuickWindow *>(demoMain->property("window").value<QObject *>());
            app.exit(window && window->grabWindow().save(out) ? 0 : 2);
        });
    }
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
