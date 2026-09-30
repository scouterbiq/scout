import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from store import is_qualified
from enrich import validate_evidence

base = {"company": "Example SME", "sizeTier": "SME", "levySignal": "confirmed",
        "sizeEvidence": "Independent company with 30 employees",
        "levyEvidence": "Employer pays the HRD Corp levy", "sourceUrl": "https://example.com/news"}
assert is_qualified(base)
assert not is_qualified(dict(base, industry="Banks"))
assert not is_qualified(dict(base, levySignal="likely"))
assert not is_qualified(dict(base, sizeTier="Enterprise"))
assert not is_qualified(dict(base, sizeEvidence=""))
assert not is_qualified(dict(base, levyEvidence=""))
entries = [{"link": base["sourceUrl"], "title": "Independent company with 30 employees",
            "summary": "Employer pays the HRD Corp levy"}]
assert is_qualified(validate_evidence([dict(base)], entries)[0])
assert not is_qualified(validate_evidence([dict(base, levyEvidence="Fabricated evidence of paying the levy")], entries)[0])
assert validate_evidence([dict(base, sourceUrl="https://invented.example")], entries) == []
print("Qualification and exact-source evidence checks passed")
