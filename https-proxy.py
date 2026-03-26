#!/usr/bin/env python3
"""HTTPS reverse proxy — works around Node 22's broken TLS server.

Forwards HTTPS :3002 → Vite HTTP :3000 so Spotify accepts the redirect URI.
Also proxies /sonos-bridge/* → Sonos HTTP API to avoid mixed-content blocks.
"""
import http.server, ssl, urllib.request, os

LISTEN_PORT = 3002
VITE_TARGET = 'http://127.0.0.1:3000'
SONOS_TARGET = os.environ.get('SONOS_BRIDGE_URL', 'http://192.168.4.79:5005')
SONOS_PREFIX = '/sonos-bridge/'

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def _forward(self):
        if self.path.startswith(SONOS_PREFIX):
            target = SONOS_TARGET + self.path[len(SONOS_PREFIX) - 1:]
        else:
            target = f'{VITE_TARGET}{self.path}'

        hdrs = {k: v for k, v in self.headers.items()
                if k.lower() not in ('host',)}
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(target, data=body, headers=hdrs,
                                     method=self.command)
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            self.send_response(resp.status)
            for k, v in resp.getheaders():
                if k.lower() != 'transfer-encoding':
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() != 'transfer-encoding':
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_error(502, str(e))

    do_GET = do_POST = do_PUT = do_DELETE = _forward
    do_PATCH = do_HEAD = do_OPTIONS = _forward

    def log_message(self, fmt, *args):
        pass  # quiet

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain('.certs/cert.pem', '.certs/key.pem')

srv = http.server.HTTPServer(('0.0.0.0', LISTEN_PORT), ProxyHandler)
srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
print(f'HTTPS proxy  https://0.0.0.0:{LISTEN_PORT}  →  {VITE_TARGET}')
srv.serve_forever()
