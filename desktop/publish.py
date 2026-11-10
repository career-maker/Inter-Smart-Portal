"""Upload the built installer + latest.yml to the live server so installed desktop apps can self-update.
Reuses the SSH helper kept outside the repo (~/.claude/live-server/live.py); no secrets live here."""
import glob, os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/live-server"))
import live
DEST = "public_html/api/desktop-updates"
c = live.connect()
live.run(c, f"mkdir -p ~/{DEST}")
sftp = c.open_sftp()
here = os.path.join(os.path.dirname(__file__), "dist")
for f in glob.glob(os.path.join(here, "*.exe")) + glob.glob(os.path.join(here, "*.blockmap")) + [os.path.join(here, "latest.yml")]:
    name = os.path.basename(f)
    print("upload", name)
    sftp.put(f, f"{DEST}/{name}".replace("public_html", "/home/" + c.get_transport().get_username() + "/public_html", 1))
live.run(c, f"ls -la ~/{DEST}")
