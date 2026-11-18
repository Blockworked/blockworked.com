#include "core.h"
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <blockstitch_ffi.h>

// The ABI version this page was written against (blockstitch_ffi.h).
static constexpr uint32_t kAbiVersion = 2;

Core::Core(QObject *parent) : QObject(parent)
{
    if (bs_abi_version() != kAbiVersion) {
        m_failure = QStringLiteral("The editor core speaks ABI %1, the page %2.").arg(bs_abi_version()).arg(kAbiVersion);
        return;
    }
    m_session = bs_session_new();
}

Core::~Core()
{
    if (m_session)
        bs_session_free(m_session);
}

void Core::reset()
{
    if (!m_failure.isEmpty())
        return;
    bs_session_free(m_session);
    m_session = bs_session_new();
}

QVariantMap Core::dispatch(const QString &command, const QVariant &args)
{
    if (!m_failure.isEmpty())
        return {{"ok", false}, {"result", QVariant()}, {"error", m_failure}};
    QJsonObject line{{"command", command}};
    if (args.isValid() && !args.isNull())
        line.insert("args", QJsonValue::fromVariant(args));
    const QByteArray in = QJsonDocument(line).toJson(QJsonDocument::Compact);
    char *out = bs_dispatch(m_session, in.constData());
    // Copy out, then give the string back to Rust's allocator.
    const QByteArray reply(out);
    bs_string_free(out);
    const QJsonDocument doc = QJsonDocument::fromJson(reply);
    if (!doc.isObject())
        return {{"ok", false}, {"result", QVariant()}, {"error", QStringLiteral("The editor core gave no answer.")}};
    return doc.object().toVariantMap();
}
