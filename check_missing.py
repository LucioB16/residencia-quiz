import os
import subprocess
import json

def get_missing():
    # Dump correctly without powershell encoding issues
    out = subprocess.check_output(["git", "show", "ad9bdef:src/data/questions.json"], cwd="residencia-quiz")
    with open("questions_385.json", "wb") as f:
        f.write(out)
        
    with open("questions_385.json", "r", encoding="utf-8") as f:
        old_q = json.load(f)
        
    with open("residencia-quiz/src/data/questions.json", "r", encoding="utf-8") as f:
        new_q = json.load(f)
        
    new_ids = {q["id"] for q in new_q}
    missing = [q for q in old_q if q["id"] not in new_ids]
    
    by_year = {}
    for q in missing:
        yr = q["id"][1:5]
        by_year.setdefault(yr, []).append(q)
        
    for yr, qs in by_year.items():
        print(f"{yr}: {len(qs)} missing")
        for q in qs[:5]:
            print(f"  -> Q{q['order']}: {q['statement'][:60]} (Correct: {[o for o in q['options'] if o['isCorrect']][0]['id']})")
            
get_missing()
