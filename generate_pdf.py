import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Preformatted, PageBreak
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Cover page (page 1) needs no header/footer
        if self._pageNumber > 1:
            self.setFont("Times-Roman", 9)
            self.setFillColor(colors.HexColor("#4B5563"))
            # Running Header
            self.drawString(85, 805, "MCA VI Semester Project Synopsis — RADIX Enterprise SEO Platform")
            self.setStrokeColor(colors.HexColor("#D1D5DB"))
            self.setLineWidth(0.5)
            self.line(85, 798, 540, 798)
            
            # Running Footer
            self.line(85, 55, 540, 55)
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(540, 42, page_text)
            self.drawString(85, 42, "Department of Computer Applications")
        self.restoreState()

def generate_pdf():
    md_path = r"c:\Users\HARSHITHA.J\Downloads\compleate\PROJECT_SYNOPSIS.md"
    pdf_path = r"c:\Users\HARSHITHA.J\Downloads\compleate\PROJECT_SYNOPSIS.pdf"
    
    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Page setup: A4, Left 3.0cm (~85pt), Right 2.0cm (~57pt), Top/Bottom 2.0cm (~57pt)
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=85,
        rightMargin=55,
        topMargin=57,
        bottomMargin=57
    )

    styles = getSampleStyleSheet()

    # Custom Typography with Times-Roman & 1.5 line spacing
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=20,
        leading=26,
        alignment=1, # Center
        textColor=colors.HexColor("#111827"),
        spaceAfter=15
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=12,
        leading=18,
        alignment=1, # Center
        textColor=colors.HexColor("#374151"),
        spaceAfter=25
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=14,
        leading=20,
        textColor=colors.HexColor("#1E3A8A"), # Deep Blue
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=12,
        leading=17,
        textColor=colors.HexColor("#1F2937"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'Heading3_Custom',
        parent=styles['Normal'],
        fontName='Times-BoldItalic',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#374151"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11,
        leading=16.5, # 1.5 spacing feel
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1E1E1E"),
        backColor=colors.HexColor("#F3F4F6"),
        borderColor=colors.HexColor("#E5E7EB"),
        borderWidth=0.5,
        borderPadding=8,
        spaceBefore=8,
        spaceAfter=10
    )

    story = []

    lines = text.split('\n')
    in_code_block = False
    code_lines = []

    for line in lines:
        stripped = line.strip()

        # Handle Code Blocks
        if stripped.startswith("```"):
            if in_code_block:
                code_text = "\n".join(code_lines)
                story.append(Preformatted(code_text, code_style))
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        if not stripped:
            continue

        # Convert markdown formatting to ReportLab HTML tags
        formatted_line = line
        formatted_line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', formatted_line)
        formatted_line = re.sub(r'\*(.*?)\*', r'<i>\1</i>', formatted_line)
        formatted_line = re.sub(r'`(.*?)`', r'<font face="Courier" color="#1E3A8A">\1</font>', formatted_line)

        # Headings
        if stripped.startswith("## TITLE PAGE"):
            story.append(Paragraph("PROJECT SYNOPSIS", title_style))
            story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1E3A8A"), spaceAfter=15))
            continue

        if stripped.startswith("## "):
            h_text = formatted_line.replace("## ", "").strip()
            story.append(Paragraph(h_text, h1_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB"), spaceAfter=8))
            continue

        if stripped.startswith("### "):
            h_text = formatted_line.replace("### ", "").strip()
            story.append(Paragraph(h_text, h2_style))
            continue

        if stripped.startswith("#### "):
            h_text = formatted_line.replace("#### ", "").strip()
            story.append(Paragraph(h_text, h3_style))
            continue

        if stripped == "---":
            story.append(Spacer(1, 6))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#D1D5DB"), spaceAfter=10))
            continue

        # Bullet lists
        if stripped.startswith("* ") or stripped.startswith("- "):
            b_text = formatted_line.lstrip("* ").lstrip("- ").strip()
            story.append(Paragraph(f"• {b_text}", bullet_style))
            continue

        # Numbered lists
        if re.match(r'^\d+\.\s', stripped):
            story.append(Paragraph(formatted_line, bullet_style))
            continue

        # Normal Paragraphs
        story.append(Paragraph(formatted_line, body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF Generation Completed successfully.")

if __name__ == "__main__":
    generate_pdf()
