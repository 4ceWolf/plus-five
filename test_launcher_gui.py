import time
import unittest
from unittest.mock import patch

from PySide6.QtCore import Qt
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication

from launcher_gui import Launcher


class GuiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.application = QApplication.instance() or QApplication([])

    def setUp(self):
        self.window = Launcher()
        self.window.show()

    def tearDown(self):
        self.window.close()
        self.window.deleteLater()
        self.application.processEvents()

    def wait_for_launch(self):
        deadline = time.monotonic() + 3
        while self.window.worker is not None and time.monotonic() < deadline:
            QTest.qWait(10)
        self.assertIsNone(self.window.worker)

    def test_selection_and_keyboard(self):
        self.assertFalse(self.window.launch.isEnabled())
        self.window.checks['quest'].setFocus()
        QTest.keyClick(self.window.checks['quest'], Qt.Key.Key_Space)
        self.assertEqual(self.window.selected(), ['quest'])
        self.assertTrue(self.window.launch.isEnabled())
        self.window.select_all.click()
        self.assertEqual(len(self.window.selected()), 7)
        self.window.clear.click()
        self.assertFalse(self.window.launch.isEnabled())

    def test_launch_only_selected(self):
        with patch('launcher_gui.launch_selected') as launch:
            self.window.checks['echo'].setChecked(True)
            self.window.launch.click()
            self.wait_for_launch()
            self.assertEqual(launch.call_args.args[0], ['echo'])
            self.assertIn('Launch requests sent', self.window.status.text())

    def test_failure_allows_retry(self):
        with patch('launcher_gui.launch_selected', side_effect=RuntimeError('Test failure')):
            self.window.checks['fetch'].setChecked(True)
            self.window.launch.click()
            self.wait_for_launch()
            self.assertIn('Test failure', self.window.status.text())
            self.assertTrue(self.window.launch.isEnabled())
            self.assertEqual(self.window.selected(), ['fetch'])


if __name__ == '__main__':
    unittest.main()
