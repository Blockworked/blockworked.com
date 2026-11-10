// The pack viewer's line to its page (PackView.qml): the page hands it a
// pack and a theme, and hears when the viewer is ready and what it rendered.
// On the web that's the page's `blockworkPackView` object; natively
// (`--pack`, `--render`, for checks and backfills) it's main.cpp.
#pragma once
#include <QtCore/QObject>
#include <QtCore/QVariant>
#include <QtQml/qqmlregistration.h>
#include <functional>

class QQmlEngine;
class QJSEngine;

class PackHost : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    QML_SINGLETON
    // The pack file's JSON, as the community site serves it. Empty until one arrives.
    Q_PROPERTY(QString pack READ pack NOTIFY packChanged)
    // "dark" or "light".
    Q_PROPERTY(QString theme READ theme NOTIFY themeChanged)
public:
    static PackHost *instance();
    static PackHost *create(QQmlEngine *, QJSEngine *);

    QString pack() const { return m_pack; }
    QString theme() const { return m_theme; }
    void setPack(const QString &json);
    void setTheme(const QString &theme);
    void requestRender() { emit renderRequested(); }

    // A grabbed item's image (QQuickItemGrabResult.image) as base64 PNG.
    Q_INVOKABLE QString png(const QVariant &image) const;
    Q_INVOKABLE void ready();
    // {blocks: [{id, dark, light, width, height}]}: one image per theme for
    // each block the pack defines, drawn as the palette draws it.
    Q_INVOKABLE void rendered(const QString &json);
    Q_INVOKABLE void failed(const QString &reason);

    // Native builds: what main.cpp does with each.
    std::function<void()> onReady;
    std::function<void(const QString &)> onRendered;
    std::function<void(const QString &)> onFailed;

signals:
    void packChanged();
    void themeChanged();
    void renderRequested();

private:
    // One per process, shared by main.cpp and QML (create).
    PackHost() = default;
    QString m_pack;
    QString m_theme = QStringLiteral("dark");
};
