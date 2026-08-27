import re

with open("frontend/src/app/globals.css", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r':not\(\.dark\)\s+(button|input|textarea|select|table|th|td|tr|tbody|a|hr|\[role=)', r':where(:not(.dark)) \1', content)

with open("frontend/src/app/globals.css", "w", encoding="utf-8") as f:
    f.write(content)
