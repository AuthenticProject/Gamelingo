$csharp = @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WindowFinder {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    public struct WindowInfo {
        public IntPtr Handle;
        public uint ProcessId;
        public string Title;
    }

    public static List<WindowInfo> FindWindows() {
        var list = new List<WindowInfo>();
        EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                var sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, sb.Capacity);
                string title = sb.ToString();
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (!string.IsNullOrEmpty(title)) {
                    list.Add(new WindowInfo { Handle = hWnd, ProcessId = pid, Title = title });
                }
            }
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
"@

Add-Type -TypeDefinition $csharp -ErrorAction SilentlyContinue

$winList = [WindowFinder]::FindWindows()
$winList | Where-Object { $_.Title -notmatch 'Program Manager|Default IME|MSCTFIME' } | Select-Object -First 10 | Format-Table -AutoSize
