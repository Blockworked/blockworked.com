// The QML face of a blockstitch-ffi session: one document, JSON in and out.
#pragma once
#include <QtCore/QObject>
#include <QtCore/QVariant>
#include <QtQml/qqmlregistration.h>

class Core : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(int abiVersion READ abiVersion CONSTANT)
public:
    explicit Core(QObject *parent = nullptr);
    ~Core() override;
    int abiVersion() const;
    // Answers {ok, result, error}, parsed.
    Q_INVOKABLE QVariant dispatch(const QString &command, const QVariant &args = {});

private:
    quint32 m_session = 0;
};
