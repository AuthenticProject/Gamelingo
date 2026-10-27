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

public class WinManager {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

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
    public static extern bool IsIconic(IntPtr hWnd); // Minimized check

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);

    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlt, uint nFlags);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

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
        public int X, Y, Width, Height;
        public int ClientWidth, ClientHeight;
        public int ClientScreenX, ClientScreenY;
        public bool IsGameCandidate;
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
            if (wr.Width < 200 || wr.Height < 150) return true;

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

            // Filter out system utility windows
            if (procName.Equals("explorer", StringComparison.OrdinalIgnoreCase) && string.IsNullOrEmpty(t)) return true;
            if (t.Equals("Program Manager", StringComparison.OrdinalIgnoreCase)) return true;
            if (t.Equals("Windows Input Experience", StringComparison.OrdinalIgnoreCase)) return true;

            var cls = new StringBuilder(512);
            GetClassName(hWnd, cls, 512);

            RECT cr;
            GetClientRect(hWnd, out cr);
            POINT pt = new POINT { X = 0, Y = 0 };
            ClientToScreen(hWnd, ref pt);

            bool isGame = false;
            string lowerProc = procName.ToLowerInvariant();
            string lowerTitle = t.ToLowerInvariant();
            if (lowerProc.Contains("client-win64") || lowerProc.Contains("wuthering") || 
                lowerTitle.Contains("wuthering") || lowerTitle.Contains("waves") || 
                lowerProc.Contains("game") || lowerProc.Contains("unreal")) {
                isGame = true;
            }

            list.Add(new WindowEntry {
                Handle = hWnd.ToInt64(),
                Pid = pid,
                ProcessName = procName,
                Title = string.IsNullOrEmpty(t) ? procName : t,
                ClassName = cls.ToString(),
                Visible = true,
                Minimized = false,
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

        // Try OpenInputDesktop first
        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        if (hDesk != IntPtr.Zero) {
            try {
                EnumDesktopWindows(hDesk, proc, IntPtr.Zero);
            } finally {
                CloseDesktop(hDesk);
            }
        }

        // Also run standard EnumWindows to ensure no window is missed
        EnumWindows(proc, IntPtr.Zero);

        return list;
    }

    public static WindowEntry FindBestGameWindow() {
        var windows = GetAllWindows();
        // 1. First priority: process or title matches Wuthering Waves
        foreach (var w in windows) {
            string lp = w.ProcessName.ToLowerInvariant();
            string lt = w.Title.ToLowerInvariant();
            if (lp.Contains("client-win64") || lp.Contains("wuthering") || lt.Contains("wuthering waves")) {
                if (w.ClientWidth >= 800 && w.ClientHeight >= 500) return w;
            }
        }
        // 2. Second priority: any window with candidate flag and large resolution
        foreach (var w in windows) {
            if (w.IsGameCandidate && w.ClientWidth >= 800 && w.ClientHeight >= 500) return w;
        }
        return null;
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
            // Fallback to primary screen
            clientX = 0; clientY = 0;
            clientW = Screen.PrimaryScreen.Bounds.Width;
            clientH = Screen.PrimaryScreen.Bounds.Height;
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

        using (Bitmap bmp = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                try {
                    g.CopyFromScreen(targetX, targetY, 0, 0, new Size(targetW, targetH), CopyPixelOperation.SourceCopy);
                } catch {
                    // Try PrintWindow fallback
                    IntPtr hdc = g.GetHdc();
                    PrintWindow(hWnd, hdc, 2); // PW_RENDERFULLCONTENT
                    g.ReleaseHdc(hdc);
                }
            }
            bmp.Save(outputPath, ImageFormat.Png);
        }
        return true;
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp -ReferencedAssemblies "System.Drawing", "System.Windows.Forms"
Write-Output "WinManager compiled successfully."
$wins = [WinManager]::GetAllWindows()
Write-Output "Found $($wins.Count) windows."
$best = [WinManager]::FindBestGameWindow()
if ($best) {
    Write-Output "Best Game Window: $($best.Title) (PID: $($best.Pid), Handle: $($best.Handle)) Size: $($best.ClientWidth)x$($best.ClientHeight)"
} else {
    Write-Output "No specific game window auto-detected. Available windows:"
    $wins | Select-Object Handle, Pid, ProcessName, Title, ClientWidth, ClientHeight | Format-Table -AutoSize
}
