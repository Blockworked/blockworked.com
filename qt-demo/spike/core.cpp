#include "core.h"
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <blockstitch_ffi.h>

Core::Core(QObject *parent) : QObject(parent), m_session(bs_session_new()) {}

Core::~Core()
{
    bs_session_free(m_session);
}

int Core::abiVersion() const
{
    return int(bs_abi_version());
}

QVariant Core::dispatch(const QString &command, const QVariant &args)
{
    QJsonObject line{{"command", command}};
    if (args.isValid())
        line.insert("args", QJsonValue::fromVariant(args));
    const QByteArray in = QJsonDocument(line).toJson(QJsonDocument::Compact);
    char *out = bs_dispatch(m_session, in.constData());
    // Copy out, then give the string back to Rust's allocator.
    const QByteArray reply(out);
    bs_string_free(out);
    return QJsonDocument::fromJson(reply).toVariant();
}
