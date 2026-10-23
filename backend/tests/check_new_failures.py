"""Exit 1 if junit.xml has failing tests that are not listed in known-failures.txt."""
import sys
import xml.etree.ElementTree as ET

BACKSLASH = chr(92)  # PHPUnit writes namespaces with backslashes on some platforms, dots on others

junit, known = sys.argv[1], sys.argv[2]
allowed = {l.strip() for l in open(known) if l.strip() and not l.startswith('#')}
failed = {
    tc.get('classname').replace(BACKSLASH, '.').split('.')[-1] + '::' + tc.get('name')
    for tc in ET.parse(junit).iter('testcase')
    if tc.find('failure') is not None or tc.find('error') is not None
}
new = sorted(failed - allowed)
print(f"{len(failed)} failing, {len(failed & allowed)} known, {len(new)} NEW")
for n in new:
    print("NEW FAILURE:", n)
sys.exit(1 if new else 0)
