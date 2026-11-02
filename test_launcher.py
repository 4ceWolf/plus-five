import unittest
from unittest.mock import patch

import launch_all


class LauncherTests(unittest.TestCase):
    def test_terminal_keeps_paths_as_separate_arguments(self):
        with patch('launch_all.shutil.which', side_effect=lambda name: '/usr/bin/alacritty' if name == 'alacritty' else None):
            self.assertEqual(launch_all.terminal_command(['python3', '/a folder/run.py']), ['/usr/bin/alacritty', '--hold', '-e', 'python3', '/a folder/run.py'])

    def test_missing_terminal_is_actionable(self):
        with patch('launch_all.shutil.which', return_value=None), self.assertRaisesRegex(RuntimeError, 'No supported terminal'):
            launch_all.terminal_command(['python3'])

    @patch('launch_all.Path.exists', return_value=False)
    @patch('launch_all.Path.is_file', return_value=True)
    @patch('launch_all.terminal_command', side_effect=lambda command: ['terminal', *command])
    def test_dry_run_does_not_start_anything(self, *_):
        with patch('launch_all.subprocess.Popen') as start, patch('launch_all.webbrowser.open_new_tab') as browser, patch('launch_all.server_ready') as probe, patch('builtins.print'):
            self.assertEqual(launch_all.main(['--dry-run']), 0)
            start.assert_not_called()
            browser.assert_not_called()
            probe.assert_not_called()

    @patch('launch_all.Path.exists', return_value=False)
    @patch('launch_all.Path.is_file', return_value=True)
    @patch('launch_all.terminal_command', side_effect=lambda command: ['terminal', *command])
    def test_reuses_server_and_opens_every_program(self, *_):
        with patch('launch_all.server_ready', return_value=True), patch('launch_all.subprocess.Popen') as start, patch('launch_all.webbrowser.open_new_tab', return_value=True) as browser, patch('builtins.print'):
            self.assertEqual(launch_all.main(['--all']), 0)
            self.assertEqual(start.call_count, 2)
            self.assertEqual([call.args[0] for call in browser.call_args_list], [f'{launch_all.ADDRESS}/{app}' for app in launch_all.APPS])

    def test_downloader_prompt_never_evaluates_url_as_a_command(self):
        url = 'https://example.org/music?title=$(anything)'
        with patch('builtins.input', side_effect=[url, '']), patch('builtins.print'), patch('launch_all.subprocess.run') as run:
            self.assertEqual(launch_all.downloader_prompt(), 0)
            self.assertEqual(run.call_args.args[0][-2:], ['--', url])
            self.assertNotIn('shell', run.call_args.kwargs)

    def test_selection_validation(self):
        self.assertEqual(launch_all.normalize_selection(['echo', 'quest', 'echo']), ['quest', 'echo'])
        for selected in ([], ['unknown']):
            with self.assertRaises(RuntimeError):
                launch_all.normalize_selection(selected)

    def test_single_browser_app_needs_no_terminal_when_server_running(self):
        with patch('launch_all.Path.is_file', return_value=True), patch('launch_all.server_ready', return_value=True), patch('launch_all.terminal_command') as terminal, patch('launch_all.webbrowser.open_new_tab', return_value=True) as browser:
            launch_all.launch_selected(['patch'], progress=lambda message: None)
            browser.assert_called_once_with(f'{launch_all.ADDRESS}/patch')
            terminal.assert_not_called()

    def test_echo_only_never_starts_browser_server(self):
        with patch('launch_all.Path.is_file', return_value=True), patch('launch_all.server_ready') as probe, patch('launch_all.terminal_command', return_value=['terminal']), patch('launch_all.subprocess.Popen') as start, patch('launch_all.webbrowser.open_new_tab') as browser:
            launch_all.launch_selected(['echo'], progress=lambda message: None)
            start.assert_called_once()
            browser.assert_not_called()
            probe.assert_not_called()


if __name__ == '__main__':
    unittest.main()
