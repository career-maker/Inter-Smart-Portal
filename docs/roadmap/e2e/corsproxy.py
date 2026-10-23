"""Local test helper: forwards 8766 -> 8765 and makes CORS accept the test frontend origin."""
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

UP = ("127.0.0.1", 8765)


class H(BaseHTTPRequestHandler):
    def _go(self):
        origin = self.headers.get("Origin")
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0)) or None
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "origin", "connection")}
        headers["Host"] = "127.0.0.1:8765"
        if origin:
            headers["Origin"] = "http://localhost:3000"  # an origin the backend already allows
        c = http.client.HTTPConnection(*UP, timeout=60)
        c.request(self.command, self.path, body, headers)
        r = c.getresponse()
        data = r.read()
        self.send_response(r.status)
        for k, v in r.getheaders():
            if k.lower() in ("transfer-encoding", "connection", "content-length", "access-control-allow-origin"):
                continue
            self.send_header(k, v)
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    do_GET = do_POST = do_PUT = do_DELETE = do_OPTIONS = do_PATCH = _go

    def log_message(self, *a):
        pass


ThreadingHTTPServer(("127.0.0.1", 8766), H).serve_forever()
