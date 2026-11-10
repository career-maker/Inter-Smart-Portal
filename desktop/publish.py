"""Upload the built installer + latest.yml to the live server so installed desktop apps can self-update,
and point the stable download link (used by the portal's App Downloads page) at the new installer.
Reuses the SSH helper kept outside the repo (~/.claude/live-server/live.py); no secrets live here."""
import glob, os, re, sys
sys.path.insert(0, os.path.expanduser("~/.claude/live-server"))
import live

DEST = "public_html/api/desktop-updates"
here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
files = glob.glob(os.path.join(here, "*.exe")) + glob.glob(os.path.join(here, "*.blockmap")) + [os.path.join(here, "latest.yml")]

c = live.connect()
live.run(c, f"mkdir -p ~/{DEST}")
sftp = c.open_sftp()
for f in sorted(files, key=lambda p: p.endswith("latest.yml")):  # latest.yml last: feed flips only after the installer is in place
    name = os.path.basename(f)
    print("upload", name, flush=True)
    with open(f, "rb") as src, sftp.open(f"{DEST}/{name}.part", "wb") as dst:
        dst.set_pipelined(True)
        while chunk := src.read(1 << 20):
            dst.write(chunk)
    sftp.posix_rename(f"{DEST}/{name}.part", f"{DEST}/{name}")

installer = re.search(r"^path:\s*(.+)$", open(os.path.join(here, "latest.yml")).read(), re.M).group(1).strip()
live.run(c, f"cd ~/{DEST} && ln -sfn '{installer}' Inter-Smart-Portal-Setup.exe && ls -la")
