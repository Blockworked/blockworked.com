#include <QtCore/QElapsedTimer>
#include <QtGui/QGuiApplication>
#include <QtQml/QQmlApplicationEngine>
#include <cstdio>

int main(int argc, char *argv[])
{
    QElapsedTimer timer;
    timer.start();
    QGuiApplication app(argc, argv);
    QQmlApplicationEngine engine;
    engine.loadFromModule("com.blockworked.CoreSpike", "Main");
    if (engine.rootObjects().isEmpty())
        return 1;
    std::printf("spike: main to QML loaded in %lld ms\n", static_cast<long long>(timer.elapsed()));
    return app.exec();
}
