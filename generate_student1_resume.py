import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

def generate_resume(output_path):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    story = []
    
    primary_color = HexColor("#1E3A8A")  # Deep blue
    text_color = HexColor("#1F2937")     # Dark gray
    accent_color = HexColor("#2563EB")   # Accent blue
    line_color = HexColor("#CBD5E1")     # Light gray

    styles = getSampleStyleSheet()

    # Custom styles
    name_style = ParagraphStyle(
        'NameStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        alignment=TA_CENTER
    )

    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=accent_color,
        alignment=TA_CENTER
    )

    contact_style = ParagraphStyle(
        'ContactStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=text_color,
        alignment=TA_CENTER
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=primary_color,
        textTransform='uppercase',
        spaceAfter=3,
        spaceBefore=7
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=text_color,
        alignment=TA_JUSTIFY
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=text_color,
        leftIndent=12,
        firstLineIndent=-10,
        spaceAfter=2
    )

    item_title_style = ParagraphStyle(
        'ItemTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=text_color
    )

    # Header
    story.append(Paragraph("Cornelius Nicolas", name_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Computer Science Engineering &nbsp;|&nbsp; STU001 &nbsp;|&nbsp; CGPA: 9.20 &nbsp;|&nbsp; Class of 2024", subtitle_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Email: student1@college.edu &nbsp;&bull;&nbsp; Phone: +91 999-888-7777 &nbsp;&bull;&nbsp; "
        "LinkedIn: linkedin.com/in/alice-engineer &nbsp;&bull;&nbsp; GitHub: github.com/alice-dev &nbsp;&bull;&nbsp; Portfolio: alice.dev",
        contact_style
    ))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

    # Professional Objective
    story.append(Paragraph("Professional Objective", section_heading_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=4))
    story.append(Paragraph(
        "A highly motivated and passionate Computer Science student looking for an exciting software engineering role to leverage my strong programming skills and problem-solving abilities. Specializing in scalable backend architectures, distributed systems, and modern full-stack web applications.",
        body_style
    ))
    story.append(Spacer(1, 4))

    # Technical Skills
    story.append(Paragraph("Technical Skills", section_heading_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=4))
    story.append(Paragraph("<b>&bull; Programming Languages:</b> Python, Java, JavaScript, TypeScript, SQL, C++", bullet_style))
    story.append(Paragraph("<b>&bull; Cloud Platforms & Infrastructure:</b> AWS (Amazon Web Services), Google Cloud Platform (GCP), Docker, Linux CLI", bullet_style))
    story.append(Paragraph("<b>&bull; Database Management & Storage:</b> Database Management (PostgreSQL, MySQL, MongoDB, Redis), Query Optimization, Schema Design", bullet_style))
    story.append(Paragraph("<b>&bull; Frameworks & Libraries:</b> React.js, FastAPI, Node.js, Next.js, Spring Boot basics, Laravel", bullet_style))
    story.append(Paragraph("<b>&bull; Core Competencies:</b> Cloud Architecture, REST APIs, Microservices, Asynchronous Queues, Agile Collaboration", bullet_style))
    story.append(Spacer(1, 4))

    # Projects
    story.append(Paragraph("Projects", section_heading_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=4))

    story.append(Paragraph("<b>1. E-Commerce Microservices</b> &nbsp;<i>(FastAPI, Docker, PostgreSQL, Redis)</i> &nbsp;&mdash;&nbsp; <u>github.com/alice/ecommerce</u>", item_title_style))
    story.append(Paragraph(
        "Architected and deployed resilient microservices using FastAPI, Docker, and PostgreSQL with Redis caching. Implemented high-throughput order processing, transaction isolation, and secure payment workflows. Achieved sub-50ms latency for catalog lookups.",
        bullet_style
    ))
    story.append(Spacer(1, 2))

    story.append(Paragraph("<b>2. Campus Placement Analytics Platform</b> &nbsp;<i>(Next.js, Python, PostgreSQL)</i> &nbsp;&mdash;&nbsp; <u>github.com/alice/campuslink</u>", item_title_style))
    story.append(Paragraph(
        "Engineered a full-stack Next.js and Python analytics dashboard tracking corporate drive outcomes, interview feedback, and candidate readiness scoring. Automated placement reporting for officers and recruiters with role-based access control.",
        bullet_style
    ))
    story.append(Spacer(1, 2))

    story.append(Paragraph("<b>3. Distributed Task Queue</b> &nbsp;<i>(Python, Asyncio, Redis, Message Broker)</i> &nbsp;&mdash;&nbsp; <u>github.com/alice/task-queue</u>", item_title_style))
    story.append(Paragraph(
        "Built a lightweight distributed task queue leveraging Python asyncio and Redis. Implemented dead-letter queueing, automatic exponential-backoff retries, and concurrent worker pool management capable of handling 5,000+ jobs/minute.",
        bullet_style
    ))
    story.append(Spacer(1, 4))

    # Certifications
    story.append(Paragraph("Certifications", section_heading_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=4))
    story.append(Paragraph("<b>&bull; AWS Certified Cloud Practitioner</b> &mdash; Amazon Web Services <i>(Credential ID: AWS-CCP-98721)</i>", bullet_style))
    story.append(Paragraph("<b>&bull; Professional Python Developer (PCAP)</b> &mdash; Python Institute <i>(Credential ID: PCAP-31-03)</i>", bullet_style))
    story.append(Spacer(1, 4))

    # Academic History
    story.append(Paragraph("Academic History", section_heading_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=line_color, spaceAfter=4))
    
    edu_data = [
        [
            Paragraph("<b>B.Tech in Computer Science and Engineering</b><br/>Delhi Technological University / College", body_style),
            Paragraph("<b>CGPA: 9.20 / 10.0</b><br/>2020 &ndash; 2024", ParagraphStyle('Right', parent=body_style, alignment=TA_RIGHT))
        ],
        [
            Paragraph("<b>Senior Secondary Examination (Class XII)</b><br/>Delhi Public School", body_style),
            Paragraph("<b>Percentage: 92.0%</b><br/>2018 &ndash; 2020", ParagraphStyle('Right', parent=body_style, alignment=TA_RIGHT))
        ],
        [
            Paragraph("<b>Secondary School Examination (Class X)</b><br/>Delhi Public School", body_style),
            Paragraph("<b>Percentage: 95.0%</b><br/>2016 &ndash; 2018", ParagraphStyle('Right', parent=body_style, alignment=TA_RIGHT))
        ]
    ]
    t = Table(edu_data, colWidths=[370, 150])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t)

    doc.build(story)
    print(f"Resume generated successfully at {output_path}")

if __name__ == '__main__':
    targets = [
        r"C:\Users\victus\Campus_link\campuslink\backend-laravel\storage\app\private\resumes\student_1_resume.pdf",
        r"C:\Users\victus\Campus_link\campuslink\backend-laravel\storage\app\resumes\student_1_resume.pdf",
        r"C:\Users\victus\Campus_link\campuslink\backend-laravel\storage\app\public\resumes\student_1_resume.pdf",
        r"C:\Users\victus\Campus_link\campuslink\backend-laravel\public\storage\resumes\student_1_resume.pdf",
        r"C:\Users\victus\Campus_link\uploads\resumes\student_1_resume.pdf"
    ]
    for target in targets:
        generate_resume(target)
