import os
import sys
import subprocess
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# Assets to embed directly into the single executable
ASSETS = [
    'index.html',
    'style.css',
    'app.js',
    'turkey-data.js',
    'manifest.json',
    'icon.svg',
    'favicon.svg',
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
]

CS_SOURCE = r'''using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;

namespace TurkeyTravelMap
{
    static class Program
    {
        private static HttpListener _listener;
        private static Thread _serverThread;
        private static volatile bool _isRunning = true;
        private static int _port;
        private static Process _browserProcess;
        private static NotifyIcon _trayIcon;

        [STAThread]
        static void Main()
        {
            // Ensure only one instance runs at a time or focus existing
            bool isNewInstance;
            using (var mutex = new Mutex(true, "TurkeyTravelMapApp_Mutex_v1", out isNewInstance))
            {
                if (!isNewInstance)
                {
                    MessageBox.Show("Turkey Travel Map is already running in your background / system tray.", "Turkey Travel Map", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                // 1. Pick a random available loopback port
                _port = GetFreePort();
                string appUrl = string.Format("http://127.0.0.1:{0}/", _port);

                // 2. Start embedded HTTP server
                try
                {
                    _listener = new HttpListener();
                    _listener.Prefixes.Add(appUrl);
                    _listener.Start();

                    _serverThread = new Thread(ServerWorker)
                    {
                        IsBackground = true,
                        Name = "EmbeddedHttpServerThread"
                    };
                    _serverThread.Start();
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Could not start local server: " + ex.Message, "Turkey Travel Map", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // 3. Launch App in dedicated desktop window or default browser
                LaunchBrowser(appUrl);

                // 4. Setup System Tray Icon
                SetupTrayIcon(appUrl);

                // 5. Run message loop
                Application.Run();

                // Cleanup on exit
                _isRunning = false;
                try { if (_listener != null && _listener.IsListening) _listener.Stop(); } catch { }
                if (_trayIcon != null) { _trayIcon.Visible = false; _trayIcon.Dispose(); }
            }
        }

        private static int GetFreePort()
        {
            TcpListener l = new TcpListener(IPAddress.Loopback, 0);
            l.Start();
            int port = ((IPEndPoint)l.LocalEndpoint).Port;
            l.Stop();
            return port;
        }

        private static void ServerWorker()
        {
            while (_isRunning && _listener != null && _listener.IsListening)
            {
                try
                {
                    var context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem((c) => HandleRequest((HttpListenerContext)c), context);
                }
                catch (HttpListenerException)
                {
                    break;
                }
                catch (Exception)
                {
                    if (!_isRunning) break;
                }
            }
        }

        private static void HandleRequest(HttpListenerContext context)
        {
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath;
                string filename = rawUrl.TrimStart('/');
                if (string.IsNullOrEmpty(filename) || filename == "/")
                {
                    filename = "index.html";
                }

                Assembly assembly = Assembly.GetExecutingAssembly();
                Stream stream = assembly.GetManifestResourceStream(filename);

                // Fallback to disk file if present (for live dev)
                if (stream == null && File.Exists(filename))
                {
                    stream = File.OpenRead(filename);
                }

                if (stream == null)
                {
                    context.Response.StatusCode = 404;
                    using (var writer = new StreamWriter(context.Response.OutputStream))
                    {
                        writer.Write("404 Not Found");
                    }
                    context.Response.Close();
                    return;
                }

                string mime = GetMimeType(filename);
                context.Response.ContentType = mime;
                context.Response.StatusCode = 200;
                context.Response.ContentLength64 = stream.Length;

                // Add CORS & caching headers
                context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                context.Response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate");

                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = stream.Read(buffer, 0, buffer.Length)) > 0)
                {
                    context.Response.OutputStream.Write(buffer, 0, read);
                }
                stream.Close();
                context.Response.OutputStream.Flush();
                context.Response.Close();
            }
            catch
            {
                try { context.Response.Close(); } catch { }
            }
        }

        private static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            switch (ext)
            {
                case ".html": return "text/html; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".js": return "application/javascript; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                case ".jpg":
                case ".jpeg": return "image/jpeg";
                case ".ico": return "image/x-icon";
                default: return "application/octet-stream";
            }
        }

        private static void LaunchBrowser(string url)
        {
            string edge1 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            string edge2 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");
            string edge = File.Exists(edge1) ? edge1 : (File.Exists(edge2) ? edge2 : null);

            try
            {
                if (edge != null)
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = edge,
                        Arguments = string.Format("--app=\"{0}\" --window-size=1400,880", url),
                        UseShellExecute = false
                    };
                    _browserProcess = Process.Start(psi);
                    if (_browserProcess != null)
                    {
                        _browserProcess.EnableRaisingEvents = true;
                        _browserProcess.Exited += (s, e) =>
                        {
                            // Automatically exit app when the window is closed
                            Application.Exit();
                        };
                    }
                }
                else
                {
                    Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                }
            }
            catch
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
        }

        private static void SetupTrayIcon(string appUrl)
        {
            try
            {
                _trayIcon = new NotifyIcon();
                _trayIcon.Text = "Turkey Travel Map";

                Assembly assembly = Assembly.GetExecutingAssembly();
                Stream iconStream = assembly.GetManifestResourceStream("favicon.ico");
                if (iconStream != null)
                {
                    _trayIcon.Icon = new Icon(iconStream);
                }
                else
                {
                    _trayIcon.Icon = SystemIcons.Application;
                }

                var menu = new ContextMenuStrip();
                menu.Items.Add("Open Travel Map", null, (s, e) => LaunchBrowser(appUrl));
                menu.Items.Add("-");
                menu.Items.Add("Exit", null, (s, e) => Application.Exit());

                _trayIcon.ContextMenuStrip = menu;
                _trayIcon.DoubleClick += (s, e) => LaunchBrowser(appUrl);
                _trayIcon.Visible = true;
            }
            catch { }
        }
    }
}
'''

def build_executable():
    csc_candidates = [
        r"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
        r"C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe",
    ]
    csc_path = None
    for c in csc_candidates:
        if os.path.exists(c):
            csc_path = c
            break

    if not csc_path:
        print("ERROR: csc.exe compiler not found.")
        sys.exit(1)

    print(f"Using C# compiler: {csc_path}")

    # Write C# launcher source
    cs_path = os.path.join(ROOT_DIR, 'Launcher.cs')
    with open(cs_path, 'w', encoding='utf-8') as f:
        f.write(CS_SOURCE)

    out_exe = os.path.join(ROOT_DIR, 'TurkeyTravelMap.exe')

    # Build compiler arguments
    cmd = [
        csc_path,
        '/target:winexe',
        '/platform:anycpu',
        '/optimize+',
        '/r:System.dll',
        '/r:System.Core.dll',
        '/r:System.Drawing.dll',
        '/r:System.Windows.Forms.dll',
        f'/out:{out_exe}',
    ]

    # Add Windows Icon if exists
    ico_path = os.path.join(ROOT_DIR, 'favicon.ico')
    if os.path.exists(ico_path):
        cmd.append(f'/win32icon:{ico_path}')

    # Embed all required web assets
    for asset in ASSETS:
        full_asset_path = os.path.join(ROOT_DIR, asset)
        if os.path.exists(full_asset_path):
            cmd.append(f'/resource:{full_asset_path},{asset}')
            print(f"  + Embedding resource: {asset} ({os.path.getsize(full_asset_path):,} bytes)")
        else:
            print(f"  ! Warning: asset not found: {asset}")

    cmd.append(cs_path)

    print("\nCompiling single executable...")
    res = subprocess.run(cmd, capture_output=True, text=True)

    # Clean up temporary .cs source
    if os.path.exists(cs_path):
        os.remove(cs_path)

    if res.returncode != 0:
        print("Compilation failed!")
        print("STDOUT:\n", res.stdout)
        print("STDERR:\n", res.stderr)
        sys.exit(1)

    if os.path.exists(out_exe):
        size_bytes = os.path.getsize(out_exe)
        size_mb = size_bytes / (1024 * 1024)
        print(f"\nSUCCESS! Created standalone executable:")
        print(f"  Path: {out_exe}")
        print(f"  Size: {size_mb:.2f} MB ({size_bytes:,} bytes)")
    else:
        print("Output executable not found.")
        sys.exit(1)

if __name__ == '__main__':
    build_executable()
