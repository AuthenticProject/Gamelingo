using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace GameLingo {
    public class GameLingoTrayApp : ApplicationContext {
        private NotifyIcon trayIcon;
        private Process backendProcess;

        public GameLingoTrayApp() {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            // 1. Start Node IPC Server and Persistent OCR Worker
            try {
                if (!IsPortOpen("127.0.0.1", 5174)) {
                    ProcessStartInfo psi = new ProcessStartInfo {
                        FileName = "cmd.exe",
                        Arguments = "/c node native\\launcher.js",
                        WorkingDirectory = baseDir,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                    backendProcess = Process.Start(psi);
                }
            } catch (Exception ex) {
                MessageBox.Show("Could not start GameLingo Backend: " + ex.Message, "GameLingo Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

            // 2. Setup System Tray Icon & Context Menu
            ContextMenu contextMenu = new ContextMenu();
            MenuItem headerItem = new MenuItem("GameLingo v1.0 (Active)");
            headerItem.Enabled = false;
            contextMenu.MenuItems.Add(headerItem);
            contextMenu.MenuItems.Add("-");

            MenuItem openDashboard = new MenuItem("Open Dashboard Window", (s, e) => LaunchDashboardWindow(baseDir));
            openDashboard.DefaultItem = true;
            contextMenu.MenuItems.Add(openDashboard);

            MenuItem hotkeyInfo = new MenuItem("Hotkey: Ctrl+Alt+T (Translate)", (s, e) => {});
            hotkeyInfo.Enabled = false;
            contextMenu.MenuItems.Add(hotkeyInfo);

            contextMenu.MenuItems.Add("-");
            MenuItem exitItem = new MenuItem("Exit GameLingo", (s, e) => ExitApplication());
            contextMenu.MenuItems.Add(exitItem);

            trayIcon = new NotifyIcon {
                Icon = SystemIcons.Application,
                ContextMenu = contextMenu,
                Text = "GameLingo — Wuthering Waves Translator",
                Visible = true
            };

            trayIcon.DoubleClick += (s, e) => LaunchDashboardWindow(baseDir);

            // 3. Open Initial Dashboard Window
            LaunchDashboardWindow(baseDir);
        }

        private void LaunchDashboardWindow(string baseDir) {
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath)) {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            string appUrl = "http://localhost:5173";

            if (File.Exists(edgePath)) {
                ProcessStartInfo psi = new ProcessStartInfo {
                    FileName = edgePath,
                    Arguments = "--app=" + appUrl + " --window-size=1280,840 --app-id=GameLingoTranslator --user-data-dir=D:\\tmp\\gamelingo_profile",
                    UseShellExecute = true
                };
                Process.Start(psi);
            } else {
                Process.Start(appUrl);
            }
        }

        private bool IsPortOpen(string host, int port) {
            try {
                using (TcpClient client = new TcpClient()) {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(300);
                    if (success) {
                        client.EndConnect(result);
                        return true;
                    }
                    return false;
                }
            } catch {
                return false;
            }
        }

        private void ExitApplication() {
            trayIcon.Visible = false;
            try {
                if (backendProcess != null && !backendProcess.HasExited) {
                    backendProcess.Kill();
                }
            } catch {}
            Application.Exit();
        }
    }

    static class Program {
        [STAThread]
        static void Main() {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new GameLingoTrayApp());
        }
    }
}
