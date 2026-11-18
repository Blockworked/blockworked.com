import QtQuick

// Picking from the screen needs the desktop app; the web build never opens it.
Item {
    signal canceled()
    signal picked(real x, real y, real width, real height)
    function begin(dragOnly, hint) { canceled(); }
}
