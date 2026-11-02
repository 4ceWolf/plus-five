import sys

from PySide6.QtCore import QThread, Signal, Qt
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (
    QApplication, QCheckBox, QFrame, QHBoxLayout, QLabel, QPushButton,
    QScrollArea, QVBoxLayout, QWidget,
)

from launch_all import CATALOG, ROOT, launch_selected


class LaunchWorker(QThread):
    progress = Signal(str)

    def __init__(self, selected, parent):
        super().__init__(parent)
        self.selected = selected
        self.error = None

    def run(self):
        try:
            launch_selected(self.selected, progress=self.progress.emit)
        except Exception as error:
            self.error = str(error)


class Launcher(QWidget):
    def __init__(self):
        super().__init__()
        self.worker = None
        self.setWindowTitle('Plus Five · App launcher')
        self.resize(720, 900)
        self.setMinimumSize(460, 560)
        self.setFont(QFont('Sans Serif', 11))
        self.setStyleSheet('''
            QWidget { background: #111510; color: #f1f4ec; }
            QLabel#eyebrow { color: #c2ee81; font-size: 12px; font-weight: 700; }
            QLabel#heading { font-size: 32px; font-weight: 700; }
            QLabel#muted { color: #b0b8a8; font-size: 13px; }
            QLabel#group { color: #b0b8a8; font-size: 11px; font-weight: 700; }
            QFrame#row { background: #1b2119; border-radius: 9px; }
            QFrame#row QLabel, QFrame#row QCheckBox { background: transparent; }
            QCheckBox { font-size: 16px; font-weight: 600; spacing: 12px; padding: 4px; }
            QCheckBox::indicator { width: 20px; height: 20px; border: 1px solid #829276; border-radius: 4px; background: #111510; }
            QCheckBox::indicator:checked { background: #c2ee81; border-color: #c2ee81; image: url("CHECK_ICON"); }
            QCheckBox:focus { outline: none; border: 1px solid #c2ee81; border-radius: 4px; }
            QPushButton { background: #262e22; border: 1px solid #45523c; border-radius: 7px; padding: 10px 16px; }
            QPushButton:hover { background: #36432d; }
            QPushButton:focus { border: 2px solid #c2ee81; }
            QPushButton#launch { background: #c2ee81; color: #14200b; font-weight: 700; }
            QPushButton#launch:hover { background: #d5ffa0; }
            QPushButton:disabled { background: #252c21; color: #939d87; border-color: #343e2e; }
            QScrollArea { border: none; }
            QScrollBar:vertical { background: #111510; width: 8px; }
            QScrollBar::handle:vertical { background: #536149; border-radius: 4px; min-height: 30px; }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0px; }
            QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: transparent; }
        '''.replace('CHECK_ICON', (ROOT / 'launcher-check.svg').as_posix()))
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 28, 30, 24)
        layout.setSpacing(12)
        layout.addWidget(self.label('PLUS FIVE  /  YOUR LAUNCHPAD', 'eyebrow'))
        layout.addWidget(self.label('What are we opening?', 'heading'))
        layout.addWidget(self.label('A little focus. A little play. Pick what you need today.', 'muted'))
        actions = QHBoxLayout()
        self.count = self.label('0 selected', 'muted')
        actions.addWidget(self.count)
        actions.addStretch()
        self.select_all = QPushButton('Select all')
        self.clear = QPushButton('Clear')
        actions.addWidget(self.select_all)
        actions.addWidget(self.clear)
        layout.addLayout(actions)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        content = QWidget()
        rows = QVBoxLayout(content)
        rows.setContentsMargins(0, 0, 8, 0)
        rows.setSpacing(8)
        self.checks = {}
        for index, (app, name, description) in enumerate(CATALOG):
            if index in (0, 5):
                rows.addWidget(self.label('EVERYDAY TOOLS · BROWSER' if index == 0 else 'MUSIC COMPANIONS · DESKTOP & TERMINAL', 'group'))
            row = QFrame()
            row.setObjectName('row')
            row_layout = QVBoxLayout(row)
            row_layout.setContentsMargins(12, 8, 12, 10)
            row_layout.setSpacing(0)
            check = QCheckBox(name)
            check.setAccessibleDescription(description)
            check.toggled.connect(self.update_selection)
            self.checks[app] = check
            row_layout.addWidget(check)
            detail = self.label(description, 'muted')
            detail.setContentsMargins(36, 0, 0, 0)
            row_layout.addWidget(detail)
            rows.addWidget(row)
        rows.addStretch()
        scroll.setWidget(content)
        layout.addWidget(scroll, 1)
        self.status = self.label('Nothing opens until you choose. Music Fetch asks for a URL first.', 'muted')
        self.status.setAccessibleName('Launch status')
        self.status.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        layout.addWidget(self.status)
        self.launch = QPushButton('Launch selected')
        self.launch.setObjectName('launch')
        self.launch.setMinimumHeight(48)
        self.launch.clicked.connect(self.start_launch)
        layout.addWidget(self.launch)
        self.select_all.clicked.connect(lambda: self.set_selection(True))
        self.clear.clicked.connect(lambda: self.set_selection(False))
        self.update_selection()

    @staticmethod
    def label(text, role):
        label = QLabel(text)
        label.setObjectName(role)
        label.setWordWrap(True)
        label.setTextFormat(Qt.TextFormat.PlainText)
        return label

    def selected(self):
        return [app for app, check in self.checks.items() if check.isChecked()]

    def set_selection(self, checked):
        for check in self.checks.values():
            check.setChecked(checked)

    def update_selection(self):
        count = len(self.selected())
        self.count.setText(f'{count} of {len(CATALOG)} selected')
        self.launch.setEnabled(count > 0 and self.worker is None)

    def start_launch(self):
        if self.worker is not None or not self.selected():
            return
        self.worker = LaunchWorker(self.selected(), self)
        for control in [*self.checks.values(), self.select_all, self.clear, self.launch]:
            control.setEnabled(False)
        self.launch.setText('Opening your apps…')
        self.status.setText('Preparing your selection…')
        self.worker.progress.connect(self.status.setText)
        self.worker.finished.connect(self.finish_launch)
        self.worker.start()

    def finish_launch(self):
        error = self.worker.error
        self.worker.deleteLater()
        self.worker = None
        self.status.setText(f'Could not finish: {error}' if error else 'Launch requests sent. Keep the app server terminal open while using browser apps.')
        for control in [*self.checks.values(), self.select_all, self.clear]:
            control.setEnabled(True)
        self.launch.setText('Launch selected')
        self.update_selection()
        self.launch.setFocus()

    def closeEvent(self, event):
        if self.worker is not None:
            self.status.setText('Please wait for this launch to finish before closing.')
            event.ignore()
        else:
            event.accept()


def run():
    application = QApplication.instance() or QApplication(sys.argv[:1])
    window = Launcher()
    window.show()
    return application.exec()
