#include "packhost.h"
#include <QtCore/QBuffer>
#include <QtGui/QImage>
#include <QtQml/QQmlEngine>

#ifdef Q_OS_WASM
#include <emscripten/val.h>

// Calls the page's blockworkPackView.<method>(arg), if it has one.
static void toPage(const char *method, const QString &arg = {})
{
    emscripten::val page = emscripten::val::global("blockworkPackView");
    if (page.isUndefined() || page.isNull() || page[method].isUndefined())
        return;
    page.call<void>(method, arg.toStdString());
}
#endif

PackHost *PackHost::instance()
{
    static PackHost host;
    return &host;
}

PackHost *PackHost::create(QQmlEngine *, QJSEngine *)
{
    QJSEngine::setObjectOwnership(instance(), QJSEngine::CppOwnership);
    return instance();
}

void PackHost::setPack(const QString &json)
{
    m_pack = json;
    emit packChanged();
}

void PackHost::setTheme(const QString &theme)
{
    const QString next = theme == QLatin1String("light") ? theme : QStringLiteral("dark");
    if (next == m_theme)
        return;
    m_theme = next;
    emit themeChanged();
}

QString PackHost::png(const QVariant &image) const
{
    QByteArray bytes;
    QBuffer buffer(&bytes);
    buffer.open(QIODevice::WriteOnly);
    image.value<QImage>().save(&buffer, "PNG");
    return QString::fromLatin1(bytes.toBase64());
}

void PackHost::ready()
{
#ifdef Q_OS_WASM
    toPage("ready");
#endif
    if (onReady)
        onReady();
}

void PackHost::rendered(const QString &json)
{
#ifdef Q_OS_WASM
    toPage("rendered", json);
#endif
    if (onRendered)
        onRendered(json);
}

void PackHost::failed(const QString &reason)
{
#ifdef Q_OS_WASM
    toPage("failed", reason);
#endif
    if (onFailed)
        onFailed(reason);
}
