import glob
import os
import re
import pymupdf

pdf_dir = r"c:\Users\lucio\repos\RESIDENCIAS\residencia-quiz\fuentes\pdf"
out_dir = r"c:\Users\lucio\repos\RESIDENCIAS\ai_ready_documents\Córdoba_"

def clean_line(line):
    line = line.strip()
    if re.match(r'^\d+/\d+/\d+, \d+:\d+$', line) or line.startswith("Examen C") or line.startswith("https://") or re.match(r'^\d+/\d+$', line) or line == "00:00":
        return None
    if re.match(r'^Pregunta \d+$', line) or line in ["Correcta", "Incorrecta", "Sin contestar"] or line.startswith("Se puntúa ") or line.startswith("Puntúa como ") or line.startswith("Marcar pregunta"):
        return None
    return line

def parse_moodle_pdf(pdf_path):
    print(f"Parsing {pdf_path}...")
    doc = pymupdf.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    
    # We split by "La respuesta correcta es: ....\n"
    blocks = re.split(r'(La respuesta correcta es:.*?\n)', text)
    
    # blocks[0] is Q1
    # blocks[1] is answer of Q1
    # blocks[2] is Q2
    # etc...
    
    output_md = []
    q_num = 1
    
    # We iterate over the question blocks (even indices)
    for i in range(0, len(blocks), 2):
        block = blocks[i]
        lines = block.split('\n')
        
        # Clean lines
        valid_lines = []
        for l in lines:
            c = clean_line(l)
            if c:
                valid_lines.append(c)
        
        if not valid_lines:
            continue
            
        # Find where options start (the first line that matches 'a.')
        opt_start_idx = -1
        for j, l in enumerate(valid_lines):
            if l == "a.":
                opt_start_idx = j
                break
        
        if opt_start_idx == -1:
            # Maybe it's just garbage at the end
            continue
            
        statement = " ".join(valid_lines[:opt_start_idx]).strip()
        # Clean up the start headers if it's the very first question
        if q_num == 1 and "%)" in statement:
            perc_match = re.search(r'\d+,\d+%\)', statement)
            if perc_match:
                statement = statement[perc_match.end():].strip()
        
        # Parse options
        options = []
        j = opt_start_idx
        while j < len(valid_lines):
            # expect letter.
            if re.match(r'^[a-e]\.$', valid_lines[j]):
                letter = valid_lines[j][0].upper()
                j += 1
                opt_text_lines = []
                while j < len(valid_lines) and not re.match(r'^[a-e]\.$', valid_lines[j]):
                    opt_text_lines.append(valid_lines[j])
                    j += 1
                opt_text = " ".join(opt_text_lines).strip()
                
                is_correct = False
                if '\uf058' in opt_text:
                    is_correct = True
                    opt_text = opt_text.replace('\uf058', '').strip()
                elif '\uf00d' in opt_text:
                    opt_text = opt_text.replace('\uf00d', '').strip()
                
                options.append((letter, opt_text, is_correct))
            else:
                j += 1
                
        # If no option was marked correct with \uf058, try to parse from the "La respuesta correcta es" block
        if not any(opt[2] for opt in options) and i + 1 < len(blocks):
            ans_block = blocks[i+1].replace("La respuesta correcta es:", "").strip()
            # fuzzy match to option text
            for idx_opt in range(len(options)):
                if ans_block.lower() in options[idx_opt][1].lower():
                    options[idx_opt] = (options[idx_opt][0], options[idx_opt][1], True)
        
        if statement and options:
            output_md.append(f"{q_num}. {statement}")
            for opt in options:
                correct_tag = " **[CORRECTA]**" if opt[2] else ""
                output_md.append(f"{opt[0]}) {opt[1]}{correct_tag}")
            output_md.append("")
            q_num += 1

    return "\n".join(output_md)


os.makedirs(out_dir, exist_ok=True)

for pdf_path in glob.glob(os.path.join(pdf_dir, '*_Cursos_Residencias.pdf')):
    md_content = parse_moodle_pdf(pdf_path)
    
    match = re.search(r'20\d{2}', os.path.basename(pdf_path))
    if match:
        year = match.group(0)
        out_filename = f"{year}_Cursos_Residencias.pdf.md"
        out_path = os.path.join(out_dir, out_filename)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        print(f"Saved {out_path}")
    else:
        print(f"Skipped {pdf_path}, no year found")
