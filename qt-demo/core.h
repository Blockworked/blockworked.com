// Blockwork's editor core (blockwork-web, Rust) as one QML object: one
// in-memory session per Core, answering the desktop editor's commands as
// {ok, result, error}. The library is linked in; see CMakeLists.txt.
#pragma once
#include <QtCore/QObject>
#include <QtCore/QVariant>
#include <QtQml/qqmlregistration.h>

class Core : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    // Empty when the linked core speaks this page's ABI; otherwise why not.
    Q_PROPERTY(QString failure READ failure CONSTANT)
public:
    explicit Core(QObject *parent = nullptr);
    ~Core() override;
    QString failure() const { return m_failure; }
    // The parsed envelope. A malformed answer reads as {ok: false}.
    Q_INVOKABLE QVariantMap dispatch(const QString &command, const QVariant &args = {});
    // Drops the document and starts an empty one.
    Q_INVOKABLE void reset();

private:
    quint32 m_session = 0;
    QString m_failure;
};
