import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from store import is_qualified
from enrich import validate_evidence
base = {"company":"Example SME", "sizeTier":"SME", "sizeEvidence":"Independent company with 30 employees", "sourceUrl":"https://example.com/news", "levySignal":"unclear", "levyEvidence":""}
assert is_qualified(base)
assert is_qualified(dict(base, levySignal="likely"))
assert is_qualified(dict(base, industry="Training Providers"))
assert not is_qualified(dict(base, industry="Banks"))
assert not is_qualified(dict(base, sizeTier="Enterprise"))
assert not is_qualified(dict(base, sizeEvidence=""))
assert not is_qualified(dict(base, verificationStatus="excluded"))
entries=[{"link":base["sourceUrl"],"title":base["sizeEvidence"],"summary":""}]
assert is_qualified(validate_evidence([dict(base)],entries)[0])
lead=validate_evidence([dict(base,levySignal="confirmed",levyEvidence="Invented employer levy evidence")],entries)[0]
assert is_qualified(lead) and lead["levySignal"]=="unclear" and lead["levyEvidence"]==""
assert not is_qualified(validate_evidence([dict(base,sizeEvidence="Invented employee count evidence")],entries)[0])
assert validate_evidence([dict(base,sourceUrl="https://invented.example")],entries)==[]
print("Passed: SME required, HRD optional, fabricated bonus stripped, false size rejected")
