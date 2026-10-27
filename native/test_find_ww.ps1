Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$code = @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WinAPI {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X, Y;
    }

    public class WindowEntry {
        public IntPtr Hwnd;
        public uint Pid;
        public string Title;
        public string ClassName;
        public bool Visible;
        public int X, Y, Width, Height;
        public int ClientWidth, ClientHeight;
        public int ClientScreenX, ClientScreenY;
    }

    public static List<WindowEntry> EnumAll() {
        var list = new List<WindowEntry>();
        EnumWindows((hWnd, lParam) => {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            var title = new StringBuilder(512);
            GetWindowText(hWnd, title, 512);
            var cls = new StringBuilder(512);
            GetClassName(hWnd, cls, 512);
            RECT wr;
            GetWindowRect(hWnd, out wr);
            RECT cr;
            GetClientRect(hWnd, out cr);
            POINT pt = new POINT { X = 0, Y = 0 };
            ClientToScreen(hWnd, ref pt);

            list.Add(new WindowEntry {
                Hwnd = hWnd,
                Pid = pid,
                Title = title.ToString(),
                ClassName = cls.ToString(),
                Visible = IsWindowVisible(hWnd),
                X = wr.Left, Y = wr.Top,
                Width = wr.Right - wr.Left,
                Height = wr.Bottom - wr.Top,
                ClientWidth = cr.Right - cr.Left,
                ClientHeight = cr.Bottom - cr.Top,
                ClientScreenX = pt.X,
                ClientScreenY = pt.Y
            });
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp
$all = [WinAPI]::EnumAll()
$wwPids = (Get-Process | Where-Object { $_.ProcessName -match 'Client-Win64|Wuthering' }).Id
Write-Output "WW PIDs: $($wwPids -join ', ')"

Write-Output "Total windows found: $($all.Count)"
$all | Select-Object -First 10 Hwnd, Pid, Title, ClassName, Visible, Width, Height | Format-Table -AutoSize
