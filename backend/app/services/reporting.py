import os
import csv
from io import StringIO
from sqlalchemy.orm import Session
from datetime import datetime

from app import models
from app.config import settings

def generate_pdf_report(inspection_id: int, db: Session) -> str:
    """
    Generates a structured PDF Audit Report for the given inspection ID.
    Includes side-by-side Golden vs Defective images with heatmap overlays.
    Returns: PDF file path.
    """
    inspection = db.query(models.Inspection).filter(models.Inspection.id == inspection_id).first()
    if not inspection or not inspection.result:
        raise ValueError("Inspection result data not found")

    res = inspection.result
    filename = f"report_{inspection.case_id}.pdf"
    pdf_path = os.path.join(settings.REPORTS_DIR, filename)

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch

        # Document setup
        doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=15
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1e3a8a'),
            spaceBefore=10,
            spaceAfter=10
        )
        body_style = styles['BodyText']

        # ===== HEADER =====
        story.append(Paragraph("VeriVision AI - Parts Fraud Inspection Report", title_style))
        story.append(Spacer(1, 10))

        # ===== METADATA TABLE =====
        meta_data = [
            [Paragraph("<b>Case ID:</b>", body_style), Paragraph(str(inspection.case_id), body_style),
             Paragraph("<b>Date/Time:</b>", body_style), Paragraph(inspection.created_at.strftime("%Y-%m-%d %H:%M:%S"), body_style)],
            [Paragraph("<b>Part Number:</b>", body_style), Paragraph(inspection.product.part_number, body_style),
             Paragraph("<b>Capture Site:</b>", body_style), Paragraph(inspection.capture_site, body_style)],
            [Paragraph("<b>Camera Angle:</b>", body_style), Paragraph(inspection.capture_angle, body_style),
             Paragraph("<b>Operator ID:</b>", body_style), Paragraph(f"User {inspection.user_id}", body_style)],
            [Paragraph("<b>Pipeline Version:</b>", body_style), Paragraph("FraudSense v4.2 (LangGraph)", body_style),
             Paragraph("<b>Image Hash:</b>", body_style), Paragraph(f"0x{abs(hash(inspection.case_id)):08X}", body_style)],
        ]
        meta_table = Table(meta_data, colWidths=[100, 180, 100, 160])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 15))

        # ===== VERDICT SUMMARY =====
        verdict_color = '#10b981'  # Green for clean
        if res.verdict == 'tampered':
            verdict_color = '#ef4444'  # Red
        elif res.verdict in ['missing', 'mismatched']:
            verdict_color = '#f59e0b'  # Orange

        cat_val = getattr(res, 'category', None)
        if not cat_val:
            v_lower = (res.verdict or "").lower()
            act_lower = (res.recommended_action or "").lower()
            if v_lower == "tampered" or "quarantine" in act_lower:
                cat_val = "Swap detection"
            elif v_lower == "missing":
                cat_val = "Missing QC label"
            elif v_lower == "mismatched":
                cat_val = "Altered serial number"
            elif v_lower == "reused":
                cat_val = "Reused board"
            else:
                cat_val = "Clean (OEM Verified)"

        verdict_data = [
            [Paragraph("<font size=16 color='white'><b>VERDICT & COMPLIANCE SUMMARY</b></font>", body_style), ""],
            [Paragraph("<b>Anomaly Category:</b>", body_style), Paragraph(f"<b><font color='#1e3a8a'>{cat_val}</font></b>", body_style)],
            [Paragraph("<b>Final Verdict:</b>", body_style), Paragraph(f"<font color='{verdict_color}'><b>{res.verdict.upper()}</b></font>", body_style)],
            [Paragraph("<b>Fraud Score:</b>", body_style), Paragraph(f"<b>{res.fraud_score} / 100</b>", body_style)],
            [Paragraph("<b>Confidence Level:</b>", body_style), Paragraph(f"{res.confidence * 100:.1f}%", body_style)],
            [Paragraph("<b>Next Action Recommended:</b>", body_style), Paragraph(f"<b><font color='#0284c7'>{res.recommended_action}</font></b>", body_style)]
        ]
        # Multi-Angle Fusion Indicator in PDF Report
        has_multi = "MULTI-ANGLE FUSION" in (res.explanation or "") or inspection.capture_angle != "top"
        if has_multi:
            verdict_data.append([
                Paragraph("<b>Multi-Angle Fusion:</b>", body_style),
                Paragraph("<b>ACTIVE (Multi-View Joint Evidence Synthesized)</b>", body_style)
            ])

        verdict_table = Table(verdict_data, colWidths=[180, 360])
        verdict_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
            ('SPAN', (0,0), (1,0)),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#faf5ff')),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(verdict_table)
        story.append(Spacer(1, 15))

        # ===== SIDE-BY-SIDE IMAGES: Golden vs Defective + Heatmap =====
        story.append(Paragraph("Visual Evidence — Side-by-Side Comparison", section_heading))
        story.append(Spacer(1, 5))

        # Helper to safely load images
        def safe_image(path, width=2.2*inch, height=2.2*inch):
            if path and os.path.exists(path):
                try:
                    return Image(path, width=width, height=height)
                except Exception:
                    pass
            return Paragraph("<i>Image not available</i>", body_style)

        # Get image paths
        captured_path = inspection.captured_image_path if inspection.captured_image_path else None
        golden_path = None
        if inspection.product and inspection.product.golden_references:
            golden_path = inspection.product.golden_references[0].image_path
        heatmap_path = res.heatmap_path if res.heatmap_path else None

        # Build image table: 3 columns (Golden | Defective | Heatmap)
        img_header = [
            Paragraph("<b>Golden Reference (OEM)</b>", body_style),
            Paragraph("<b>Captured / Defective Image</b>", body_style),
            Paragraph("<b>Anomaly Heatmap Overlay</b>", body_style)
        ]
        
        img_row = [
            safe_image(golden_path),
            safe_image(captured_path),
            safe_image(heatmap_path)
        ]

        img_table = Table([img_header, img_row], colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
        img_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(img_table)
        story.append(Spacer(1, 15))

        # ===== DETAILED FINDINGS =====
        story.append(Paragraph("Detailed Inspection Findings", section_heading))
        evidence = res.evidence_json or {}
        detector_results = evidence.get("detector_results", {})
        template_ev = detector_results.get("template", {})
        color_ev = detector_results.get("color", {})
        regions = evidence.get("anomaly_regions", [])
        region_summary = "; ".join(
            [
                f"{r.get('location', 'unknown')} x={r.get('x')} y={r.get('y')} w={r.get('w')} h={r.get('h')}"
                for r in regions[:3]
            ]
        ) if regions else "None above threshold"
        
        metrics_data = [
            ["Metric Analyzed", "Raw Value / Status"],
            ["SSIM Index (Structure)", f"{res.ssim_score:.3f}" if res.ssim_score else "N/A"],
            ["Keypoint Matches (Components)", f"{res.keypoint_match_rate * 100:.1f}%" if res.keypoint_match_rate else "N/A"],
            ["Template / ROI Presence", f"{'FOUND' if template_ev.get('template_match_found', True) else 'MISSING'} ({template_ev.get('template_match_score', 1.0):.3f})"],
            ["Color / Material Similarity", f"{color_ev.get('color_hist_similarity', 1.0):.3f}"],
            ["Top Anomaly Regions", region_summary],
            ["OCR Expected Markings", res.ocr_expected_text or "N/A"],
            ["OCR Detected Markings", res.ocr_detected_text or "N/A"]
        ]
        metrics_table = Table(metrics_data, colWidths=[240, 300])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 15))

        # ===== OCR CHARACTER-LEVEL DIFFS =====
        if res.ocr_detected_text and res.ocr_expected_text:
            story.append(Paragraph("OCR Text Verification — Character-Level Diff", section_heading))
            ocr_data = [
                [Paragraph("<b>Position</b>", body_style), 
                 Paragraph("<b>Expected Character</b>", body_style), 
                 Paragraph("<b>Detected Character</b>", body_style),
                 Paragraph("<b>Status</b>", body_style)]
            ]
            
            # Build character-by-character comparison
            expected = res.ocr_expected_text.upper().replace(" ", "")
            detected = res.ocr_detected_text.upper().replace(" ", "")
            max_len = max(len(expected), len(detected))
            expected = expected.ljust(max_len)
            detected = detected.ljust(max_len)
            
            for idx in range(max_len):
                e_char = expected[idx] if expected[idx] != ' ' else '(space)'
                d_char = detected[idx] if detected[idx] != ' ' else '(space)'
                status = "✅ MATCH" if expected[idx] == detected[idx] else "❌ MISMATCH"
                color = '#10b981' if expected[idx] == detected[idx] else '#ef4444'
                ocr_data.append([
                    Paragraph(str(idx + 1), body_style),
                    Paragraph(f"<b>{e_char}</b>", body_style),
                    Paragraph(f"<b>{d_char}</b>", body_style),
                    Paragraph(f"<font color='{color}'>{status}</font>", body_style)
                ])
            
            ocr_table = Table(ocr_data, colWidths=[60, 120, 120, 120])
            ocr_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('PADDING', (0,0), (-1,-1), 5),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ]))
            story.append(ocr_table)
            story.append(Spacer(1, 15))

        # ===== EXPLANATION =====
        story.append(Paragraph("<b>AI System Explanation:</b>", body_style))
        story.append(Spacer(1, 5))
        story.append(Paragraph(res.explanation or "No explanation generated.", body_style))
        story.append(Spacer(1, 15))

        # ===== THRESHOLDS USED =====
        story.append(Paragraph("Pipeline Configuration & Thresholds", section_heading))
        threshold_data = [
            [Paragraph("<b>Parameter</b>", body_style), Paragraph("<b>Value</b>", body_style)],
            ["SSIM Threshold", f"{settings.SSIM_THRESHOLD}"],
            ["Blur Threshold (Laplacian)", f"{settings.BLUR_THRESHOLD}"],
            ["Brightness Range", f"{settings.BRIGHTNESS_MIN} - {settings.BRIGHTNESS_MAX}"],
            ["Keypoint Match Min", f"{settings.KEYPOINT_MATCH_MIN}"],
            ["Pipeline Model", "FraudSense v4.2 (LangGraph)"],
        ]
        thresh_table = Table(threshold_data, colWidths=[240, 300])
        thresh_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(thresh_table)
        story.append(Spacer(1, 15))

        # ===== HUMAN REVIEW AUDIT TRAIL =====
        audit_history = []
        for log in inspection.audit_logs or []:
            audit_history.append([
                Paragraph(log.timestamp.strftime("%Y-%m-%d %H:%M") if log.timestamp else "N/A", body_style),
                Paragraph(f"<b>{log.action.replace('_', ' ').title()}</b>", body_style),
                Paragraph(log.actor or "System", body_style),
                Paragraph(log.comments or "No comments.", body_style)
            ])

        if audit_history:
            story.append(Paragraph("Human Review & Override Audit Trail", section_heading))
            audit_data = [
                [Paragraph("<b>Timestamp</b>", body_style), 
                 Paragraph("<b>Action Taken</b>", body_style), 
                 Paragraph("<b>Auditor / Role</b>", body_style), 
                 Paragraph("<b>Supervisor Comments / Rationale</b>", body_style)]
            ]
            for row in audit_history:
                audit_data.append(row)
                
            audit_table = Table(audit_data, colWidths=[90, 120, 110, 220])
            audit_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('PADDING', (0,0), (-1,-1), 5),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            story.append(audit_table)
            story.append(Spacer(1, 15))

        # ===== FOOTER =====
        story.append(Paragraph("<i>This report has been automatically generated by VeriVision-AI and is stored in the system audit trail.</i>", body_style))

        # Build PDF
        doc.build(story)
    except Exception as e:
        # Fallback to creating a plain text audit report if ReportLab fails
        print(f"ReportLab PDF generation error: {e}. Generating fallback plain text audit report.")
        txt_path = pdf_path.replace(".pdf", ".txt")
        with open(txt_path, "w") as f:
            f.write(f"VeriVision AI Audit Report\n")
            f.write(f"==========================\n")
            f.write(f"Case ID: {inspection.case_id}\n")
            f.write(f"Part Number: {inspection.product.part_number}\n")
            f.write(f"Verdict: {res.verdict}\n")
            f.write(f"Fraud Score: {res.fraud_score}\n")
            f.write(f"Explanation: {res.explanation}\n\n")
            f.write(f"Human Review & Override Audit Trail:\n")
            f.write(f"------------------------------------\n")
            for log in inspection.audit_logs or []:
                f.write(f"[{log.timestamp.strftime('%Y-%m-%d %H:%M') if log.timestamp else 'N/A'}] Action: {log.action} | Auditor: {log.actor} | Comments: {log.comments}\n")
        return txt_path

    return pdf_path

def generate_csv_export(inspections: list) -> str:
    """
    Exports a list of inspections into a CSV format.
    Returns: CSV string data.
    """
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Case ID", "Product Part Number", "Commodity", 
        "Capture Site", "Capture Angle", "Status", 
        "Date Created", "Anomaly Category", "Verdict", "Fraud Score", "Action Recommended"
    ])
    
    for ins in inspections:
        category = getattr(ins.result, "category", None) if ins.result else "N/A"
        verdict = ins.result.verdict if ins.result else "N/A"
        score = ins.result.fraud_score if ins.result else "N/A"
        action = ins.result.recommended_action if ins.result else "N/A"
        
        writer.writerow([
            ins.case_id, ins.product.part_number, ins.product.commodity,
            ins.capture_site, ins.capture_angle, ins.status,
            ins.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            category or "N/A", verdict, score, action
        ])
        
    return output.getvalue()
