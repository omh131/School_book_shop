import fitz, os
src='attached_assets/Untitled_document_1790014346728.PDF'
out='.agents/outputs/pdf_pages'
os.makedirs(out, exist_ok=True)
doc=fitz.open(src)
print('pages', doc.page_count)
for i,page in enumerate(doc):
    pix=page.get_pixmap(matrix=fitz.Matrix(2,2), alpha=False)
    path=f'{out}/page_{i+1}.png'
    pix.save(path)
    print(path, pix.width, pix.height)
