"""Render a dealer rental agreement as an organized PDF.

The dealer writes free-form content; this module lays it out as a clean
document: the property dealer title (business name, else dealer name) on
top, then the agreement title, date, property and landlord, and the
content as paragraphs. Only Latin script is rendered (core PDF fonts),
so anything outside latin-1 is replaced instead of breaking the download.
"""

from datetime import datetime

from fpdf import FPDF

_REPLACEMENTS = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "-",
    "\u2022": "-",
    "\u2026": "...",
    "\u2192": "->",
    "\u00a0": " ",
}


def _clean(text: str) -> str:
    for src, dst in _REPLACEMENTS.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", "replace").decode("latin-1")


class _AgreementPDF(FPDF):
    def __init__(self, dealer_title: str):
        super().__init__()
        self.dealer_title = _clean(dealer_title)
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(20, 18, 20)

    def header(self):
        if self.page_no() == 1:
            return  # first page has its own title block
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(107, 118, 134)
        self.cell(0, 8, self.dealer_title)
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(107, 118, 134)
        self.cell(0, 10, f"{self.dealer_title}  |  Page {self.page_no()}/{{nb}}", align="C")


def render_agreement_pdf(
    *,
    dealer_title: str,
    agreement_title: str,
    content: str,
    property_title: str | None = None,
    landlord_name: str | None = None,
    created_at: datetime | None = None,
) -> bytes:
    pdf = _AgreementPDF(dealer_title)
    pdf.alias_nb_pages()
    pdf.add_page()

    # Title block: dealer title first, then the document type.
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(26, 36, 51)
    pdf.multi_cell(0, 10, _clean(dealer_title))
    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(31, 111, 91)
    pdf.cell(0, 8, "Rental Agreement")
    pdf.ln(10)
    pdf.set_draw_color(226, 230, 236)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(6)

    # Meta lines.
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(26, 36, 51)
    pdf.multi_cell(0, 8, _clean(agreement_title))
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(107, 118, 134)
    if isinstance(created_at, datetime):
        date_str = created_at.strftime("%d %B %Y")
    else:
        date_str = str(created_at) if created_at else ""
    if date_str:
        pdf.cell(0, 7, f"Date: {date_str}")
        pdf.ln(7)
    if property_title:
        pdf.cell(0, 7, f"Property: {_clean(property_title)}")
        pdf.ln(7)
    if landlord_name:
        pdf.cell(0, 7, f"Landlord: {_clean(landlord_name)}")
        pdf.ln(7)
    pdf.ln(4)

    # Content, one paragraph per line; blank lines become spacing.
    pdf.set_font("Helvetica", "", 11.5)
    pdf.set_text_color(26, 36, 51)
    for line in _clean(content).split("\n"):
        line = line.strip()
        if not line:
            pdf.ln(4)
            continue
        pdf.multi_cell(0, 6.5, line)
        pdf.ln(1.5)

    return bytes(pdf.output())
