Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$code = @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Windows.Forms;
using System.Threading;

public class WinManager {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);

    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlt, uint nFlags);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
    public const uint GW_OWNER = 4;

    [DllImport("dwmapi.dll")]
    public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out int pvAttribute, int cbAttribute);
    public const int DWMWA_CLOAKED = 14;

    [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr GetDC(IntPtr hWnd);
    [DllImport("user32.dll", SetLastError = true)] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
    [DllImport("gdi32.dll", SetLastError = true)] public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    [DllImport("gdi32.dll", SetLastError = true)] public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);
    [DllImport("gdi32.dll", SetLastError = true)] public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);
    [DllImport("gdi32.dll", SetLastError = true)] public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, uint dwRop);
    [DllImport("gdi32.dll", SetLastError = true)] public static extern bool DeleteDC(IntPtr hdc);
    [DllImport("gdi32.dll", SetLastError = true)] public static extern bool DeleteObject(IntPtr hObject);

    public const uint SRCCOPY = 0x00CC0020;
    public const uint DESKTOP_ALL = 0x01FF;

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
        public int Width { get { return Right - Left; } }
        public int Height { get { return Bottom - Top; } }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X, Y; }

    public class WindowEntry {
        public long Handle;
        public uint Pid;
        public string ProcessName;
        public string Title;
        public string ClassName;
        public bool Visible;
        public bool Minimized;
        public long OwnerHandle;
        public int X, Y, Width, Height;
        public int ClientWidth, ClientHeight;
        public int ClientScreenX, ClientScreenY;
        public bool IsGameCandidate;
    }

    public class MonitorEntry {
        public int Index;
        public string Name;
        public int X, Y, Width, Height;
        public bool IsPrimary;
    }

    private static void ExecuteOnDesktopThread(Action action) {
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenDesktop("default", 0, false, DESKTOP_ALL);
            if (hDesk == IntPtr.Zero) {
                hDesk = OpenInputDesktop(0, false, DESKTOP_ALL);
            }
            if (hDesk != IntPtr.Zero) {
                SetThreadDesktop(hDesk);
            }
            try {
                action();
            } finally {
                if (hDesk != IntPtr.Zero) {
                    CloseDesktop(hDesk);
                }
            }
        });
        t.Start();
        t.Join();
    }

    public static WindowEntry GetWindowDetails(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return null;

        RECT wr;
        GetWindowRect(hWnd, out wr);
        if (wr.Width <= 10 || wr.Height <= 10) return null;

        var title = new StringBuilder(512);
        GetWindowText(hWnd, title, 512);
        string t = title.ToString().Trim();

        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);

        string procName = "";
        try {
            using (var p = Process.GetProcessById((int)pid)) {
                procName = p.ProcessName;
            }
        } catch {}

        var cls = new StringBuilder(512);
        GetClassName(hWnd, cls, 512);

        RECT cr;
        GetClientRect(hWnd, out cr);
        POINT pt = new POINT { X = 0, Y = 0 };
        ClientToScreen(hWnd, ref pt);

        IntPtr hOwner = GetWindow(hWnd, GW_OWNER);

        bool isGame = false;
        string lowerProc = procName.ToLowerInvariant();
        string lowerTitle = t.ToLowerInvariant();
        if (lowerProc.Contains("client-win64") || lowerProc.Contains("wuthering") || 
            lowerTitle.Contains("wuthering") || lowerTitle.Contains("waves") || 
            lowerProc.Contains("game") || lowerProc.Contains("unreal")) {
            isGame = true;
        }

        return new WindowEntry {
            Handle = hWnd.ToInt64(),
            Pid = pid,
            ProcessName = procName,
            Title = string.IsNullOrEmpty(t) ? procName : t,
            ClassName = cls.ToString(),
            Visible = IsWindowVisible(hWnd),
            Minimized = IsIconic(hWnd),
            OwnerHandle = hOwner.ToInt64(),
            X = wr.Left,
            Y = wr.Top,
            Width = wr.Width,
            Height = wr.Height,
            ClientWidth = cr.Width,
            ClientHeight = cr.Height,
            ClientScreenX = pt.X,
            ClientScreenY = pt.Y,
            IsGameCandidate = isGame
        };
    }

    public static List<WindowEntry> GetAllWindows() {
        var list = new List<WindowEntry>();
        var seenHandles = new HashSet<IntPtr>();

        EnumWindowsProc proc = (hWnd, lParam) => {
            if (seenHandles.Contains(hWnd)) return true;
            seenHandles.Add(hWnd);

            if (!IsWindowVisible(hWnd) || IsIconic(hWnd)) return true;

            RECT wr;
            GetWindowRect(hWnd, out wr);
            if (wr.Width <= 30 || wr.Height <= 30) return true;

            int cloaked = 0;
            try {
                DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out cloaked, sizeof(int));
            } catch {}

            var title = new StringBuilder(512);
            GetWindowText(hWnd, title, 512);
            string t = title.ToString().Trim();

            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);

            string procName = "";
            try {
                using (var p = Process.GetProcessById((int)pid)) {
                    procName = p.ProcessName;
                }
            } catch {}

            bool isGameProc = procName.ToLowerInvariant().Contains("client-win64") || 
                              procName.ToLowerInvariant().Contains("wuthering");
            if (cloaked != 0 && !isGameProc) return true;

            if (t.Equals("Program Manager", StringComparison.OrdinalIgnoreCase)) return true;
            if (t.Equals("Windows Input Experience", StringComparison.OrdinalIgnoreCase)) return true;
            if (procName.Equals("explorer", StringComparison.OrdinalIgnoreCase) && string.IsNullOrEmpty(t)) return true;

            var cls = new StringBuilder(512);
            GetClassName(hWnd, cls, 512);
            string clsName = cls.ToString();
            if (clsName.Equals("Shell_TrayWnd", StringComparison.OrdinalIgnoreCase)) return true;

            RECT cr;
            GetClientRect(hWnd, out cr);
            POINT pt = new POINT { X = 0, Y = 0 };
            ClientToScreen(hWnd, ref pt);

            IntPtr hOwner = GetWindow(hWnd, GW_OWNER);

            bool isGame = false;
            string lowerProc = procName.ToLowerInvariant();
            string lowerTitle = t.ToLowerInvariant();
            if (isGameProc || lowerTitle.Contains("wuthering") || lowerTitle.Contains("waves") || 
                lowerProc.Contains("game") || lowerProc.Contains("unreal")) {
                isGame = true;
            }

            list.Add(new WindowEntry {
                Handle = hWnd.ToInt64(),
                Pid = pid,
                ProcessName = procName,
                Title = string.IsNullOrEmpty(t) ? procName : t,
                ClassName = clsName,
                Visible = true,
                Minimized = false,
                OwnerHandle = hOwner.ToInt64(),
                X = wr.Left,
                Y = wr.Top,
                Width = wr.Width,
                Height = wr.Height,
                ClientWidth = cr.Width,
                ClientHeight = cr.Height,
                ClientScreenX = pt.X,
                ClientScreenY = pt.Y,
                IsGameCandidate = isGame
            });
            return true;
        };

        ExecuteOnDesktopThread(() => {
            IntPtr hDesk = OpenDesktop("default", 0, false, DESKTOP_ALL);
            if (hDesk == IntPtr.Zero) hDesk = OpenInputDesktop(0, false, DESKTOP_ALL);
            if (hDesk != IntPtr.Zero) {
                try {
                    EnumDesktopWindows(hDesk, proc, IntPtr.Zero);
                } finally {
                    CloseDesktop(hDesk);
                }
            }
            EnumWindows(proc, IntPtr.Zero);
        });

        return list;
    }

    public static WindowEntry GetForegroundWindowEntry() {
        WindowEntry entry = null;
        ExecuteOnDesktopThread(() => {
            IntPtr hWnd = GetForegroundWindow();
            if (hWnd != IntPtr.Zero) {
                entry = GetWindowDetails(hWnd);
            }
            if (entry == null) {
                // Top-Z fallback
                var all = GetAllWindows();
                foreach (var w in all) {
                    if (!w.ProcessName.ToLowerInvariant().Contains("gamelingo") &&
                        !w.Title.ToLowerInvariant().Contains("gamelingo")) {
                        entry = w;
                        break;
                    }
                }
            }
        });
        return entry;
    }

    public static WindowEntry FindBestGameWindow() {
        var windows = GetAllWindows();
        foreach (var w in windows) {
            string lp = w.ProcessName.ToLowerInvariant();
            string lt = w.Title.ToLowerInvariant();
            if (lp.Contains("client-win64") || lp.Contains("wuthering") || lt.Contains("wuthering waves")) {
                if (w.ClientWidth >= 640 && w.ClientHeight >= 400) return w;
            }
        }
        foreach (var w in windows) {
            if (w.IsGameCandidate && w.ClientWidth >= 640 && w.ClientHeight >= 400) return w;
        }
        return null;
    }

    public static List<MonitorEntry> GetMonitors() {
        var list = new List<MonitorEntry>();
        int idx = 0;
        foreach (var s in Screen.AllScreens) {
            list.Add(new MonitorEntry {
                Index = idx,
                Name = s.DeviceName,
                X = s.Bounds.X,
                Y = s.Bounds.Y,
                Width = s.Bounds.Width,
                Height = s.Bounds.Height,
                IsPrimary = s.Primary
            });
            idx++;
        }
        return list;
    }

    public static bool CaptureGdiPixels(int targetX, int targetY, int targetW, int targetH, string outputPath, IntPtr hWndFallback = default(IntPtr)) {
        bool captured = false;
        ExecuteOnDesktopThread(() => {
            IntPtr hdcSrc = GetDC(IntPtr.Zero);
            if (hdcSrc == IntPtr.Zero && hWndFallback != IntPtr.Zero) {
                hdcSrc = GetDC(hWndFallback);
            }
            if (hdcSrc == IntPtr.Zero) return;

            IntPtr hdcDest = CreateCompatibleDC(hdcSrc);
            IntPtr hBmp = CreateCompatibleBitmap(hdcSrc, targetW, targetH);
            IntPtr hOld = SelectObject(hdcDest, hBmp);

            bool ok = BitBlt(hdcDest, 0, 0, targetW, targetH, hdcSrc, targetX, targetY, SRCCOPY);
            if (!ok && hWndFallback != IntPtr.Zero) {
                // Fallback to PrintWindow
                PrintWindow(hWndFallback, hdcDest, 2);
                ok = true;
            }

            SelectObject(hdcDest, hOld);
            DeleteDC(hdcDest);
            ReleaseDC(IntPtr.Zero, hdcSrc);

            if (ok) {
                using (Bitmap bmp = Bitmap.FromHbitmap(hBmp)) {
                    bmp.Save(outputPath, ImageFormat.Png);
                }
                captured = true;
            }
            DeleteObject(hBmp);
        });
        return captured;
    }

    public static bool CaptureScreenMonitor(int monitorIndex, string outputPath, int cropX = 0, int cropY = 0, int cropW = 0, int cropH = 0) {
        Screen targetScreen = Screen.PrimaryScreen;
        if (monitorIndex >= 0 && monitorIndex < Screen.AllScreens.Length) {
            targetScreen = Screen.AllScreens[monitorIndex];
        }

        int targetX = targetScreen.Bounds.X;
        int targetY = targetScreen.Bounds.Y;
        int targetW = targetScreen.Bounds.Width;
        int targetH = targetScreen.Bounds.Height;

        if (cropW > 0 && cropH > 0) {
            targetX += cropX;
            targetY += cropY;
            targetW = cropW;
            targetH = cropH;
        }

        return CaptureGdiPixels(targetX, targetY, targetW, targetH, outputPath);
    }

    public static bool CaptureWindowOrClient(long handle, string outputPath, int cropX = 0, int cropY = 0, int cropW = 0, int cropH = 0) {
        IntPtr hWnd = new IntPtr(handle);
        RECT cr;
        GetClientRect(hWnd, out cr);
        POINT pt = new POINT { X = 0, Y = 0 };
        ClientToScreen(hWnd, ref pt);

        int clientX = pt.X;
        int clientY = pt.Y;
        int clientW = cr.Width;
        int clientH = cr.Height;

        if (clientW <= 0 || clientH <= 0) {
            RECT wr;
            GetWindowRect(hWnd, out wr);
            clientX = wr.Left;
            clientY = wr.Top;
            clientW = wr.Width;
            clientH = wr.Height;
        }

        if (clientW <= 0 || clientH <= 0) {
            return CaptureScreenMonitor(0, outputPath, cropX, cropY, cropW, cropH);
        }

        int targetX = clientX;
        int targetY = clientY;
        int targetW = clientW;
        int targetH = clientH;

        if (cropW > 0 && cropH > 0) {
            targetX = clientX + cropX;
            targetY = clientY + cropY;
            targetW = cropW;
            targetH = cropH;
        }

        return CaptureGdiPixels(targetX, targetY, targetW, targetH, outputPath, hWnd);
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp -ReferencedAssemblies "System.Drawing", "System.Windows.Forms"
