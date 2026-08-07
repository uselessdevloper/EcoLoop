"""
analytics.py — Vendor Analytics, Site Analytics, and Repeat-Offender Detection endpoints.
All data derived from Inspection + InspectionResult tables.
"""

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case as sql_case
from typing import List

from app.database import get_db
from app import models, schemas, utils

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Verdicts considered fraud
FRAUD_VERDICTS = {"tampered", "missing", "mismatched", "reused"}


@router.get("/vendors", response_model=List[schemas.VendorAnalyticsItem])
def get_vendor_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Vendor summary: name, total supplied, fraud cases, fraud rate, trust score."""
    logger.info(f"[Analytics] Vendor analytics requested by {current_user.email}")

    rows = (
        db.query(
            models.Inspection.vendor,
            func.count(models.Inspection.id).label("total"),
            func.sum(
                sql_case(
                    (models.InspectionResult.verdict.in_(FRAUD_VERDICTS), 1),
                    else_=0
                )
            ).label("fraud_count")
        )
        .join(models.InspectionResult, models.InspectionResult.inspection_id == models.Inspection.id)
        .filter(models.Inspection.vendor.isnot(None))
        .filter(models.Inspection.vendor != "")
        .filter(models.Inspection.status == "completed")
        .group_by(models.Inspection.vendor)
        .all()
    )

    result = []
    for vendor_name, total, fraud_count in rows:
        fraud_count = fraud_count or 0
        fraud_rate = round((fraud_count / total) * 100, 1) if total > 0 else 0.0
        trust_score = max(0, min(100, round(100 - (fraud_rate * 1.5))))
        result.append(schemas.VendorAnalyticsItem(
            vendor=vendor_name,
            components_supplied=total,
            fraud_cases=fraud_count,
            fraud_rate=fraud_rate,
            trust_score=trust_score
        ))

    result.sort(key=lambda x: x.fraud_cases, reverse=True)
    return result


@router.get("/vendors/{vendor_name}", response_model=schemas.VendorDetailResponse)
def get_vendor_detail(
    vendor_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Retrieve detailed monthly breakdown and list of fraud component names for a specific vendor."""
    logger.info(f"[Analytics] Detail requested for vendor: {vendor_name} by {current_user.email}")

    inspections = (
        db.query(models.Inspection)
        .join(models.InspectionResult, models.InspectionResult.inspection_id == models.Inspection.id)
        .filter(models.Inspection.vendor == vendor_name)
        .filter(models.Inspection.status == "completed")
        .all()
    )

    months_map = {}
    fraud_components = set()

    for insp in inspections:
        res = insp.result
        if not res:
            continue
        is_fraud = res.verdict in FRAUD_VERDICTS

        dt = None
        if insp.date:
            try:
                dt = datetime.strptime(insp.date, "%Y-%m-%d")
            except Exception:
                try:
                    dt = datetime.strptime(insp.date, "%d-%b-%Y")
                except Exception:
                    pass

        if not dt:
            dt = insp.created_at

        if not dt:
            continue

        month_key = (dt.year, dt.month, dt.strftime("%b"))
        if month_key not in months_map:
            months_map[month_key] = {"fraud": 0, "genuine": 0}

        if is_fraud:
            months_map[month_key]["fraud"] += 1
            if insp.component_name:
                fraud_components.add(insp.component_name)
        else:
            months_map[month_key]["genuine"] += 1

    sorted_trend = []
    for key in sorted(months_map.keys()):
        sorted_trend.append(schemas.VendorMonthlyDetailItem(
            month=key[2],
            fraud=months_map[key]["fraud"],
            genuine=months_map[key]["genuine"]
        ))

    if not sorted_trend:
        sorted_trend.append(schemas.VendorMonthlyDetailItem(
            month=datetime.utcnow().strftime("%b"),
            fraud=0,
            genuine=0
        ))

    return schemas.VendorDetailResponse(
        vendor=vendor_name,
        monthly_trend=sorted_trend,
        fraud_components=sorted(list(fraud_components))
    )


@router.get("/sites", response_model=List[schemas.SiteAnalyticsItem])
def get_site_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Site summary: site name, total inspections, fraud cases, fraud rate."""
    logger.info(f"[Analytics] Site analytics requested by {current_user.email}")

    rows = (
        db.query(
            models.Inspection.capture_site,
            func.count(models.Inspection.id).label("total"),
            func.sum(
                sql_case(
                    (models.InspectionResult.verdict.in_(FRAUD_VERDICTS), 1),
                    else_=0
                )
            ).label("fraud_count")
        )
        .join(models.InspectionResult, models.InspectionResult.inspection_id == models.Inspection.id)
        .filter(models.Inspection.status == "completed")
        .group_by(models.Inspection.capture_site)
        .all()
    )

    result = []
    for site_name, total, fraud_count in rows:
        fraud_count = fraud_count or 0
        fraud_rate = round((fraud_count / total) * 100, 1) if total > 0 else 0.0
        result.append(schemas.SiteAnalyticsItem(
            site=site_name,
            inspections=total,
            fraud_cases=fraud_count,
            fraud_rate=fraud_rate
        ))

    result.sort(key=lambda x: x.fraud_cases, reverse=True)
    return result


@router.get("/repeat-offenders", response_model=List[schemas.RepeatOffenderItem])
def get_repeat_offenders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Vendors with >= 3 fraud cases in the last 90 days."""
    logger.info(f"[Analytics] Repeat offender check requested by {current_user.email}")

    cutoff = datetime.utcnow() - timedelta(days=90)

    rows = (
        db.query(
            models.Inspection.vendor,
            func.count(models.Inspection.id).label("fraud_count")
        )
        .join(models.InspectionResult, models.InspectionResult.inspection_id == models.Inspection.id)
        .filter(models.Inspection.vendor.isnot(None))
        .filter(models.Inspection.vendor != "")
        .filter(models.Inspection.status == "completed")
        .filter(models.Inspection.created_at >= cutoff)
        .filter(models.InspectionResult.verdict.in_(FRAUD_VERDICTS))
        .group_by(models.Inspection.vendor)
        .having(func.count(models.Inspection.id) >= 3)
        .all()
    )

    result = []
    for vendor_name, fraud_count in rows:
        status = "Repeat Offender" if fraud_count >= 5 else "Watch List"
        result.append(schemas.RepeatOffenderItem(
            vendor=vendor_name,
            fraud_cases=fraud_count,
            days_window=90,
            status=status
        ))

    result.sort(key=lambda x: x.fraud_cases, reverse=True)
    return result


@router.get("/monthly-trend", response_model=List[schemas.MonthlyTrendItem])
def get_monthly_trend(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Retrieve month-on-month trend of inspections and fraud cases."""
    logger.info(f"[Analytics] Monthly trend requested by {current_user.email}")

    inspections = (
        db.query(models.Inspection)
        .join(models.InspectionResult, models.InspectionResult.inspection_id == models.Inspection.id)
        .filter(models.Inspection.status == "completed")
        .all()
    )

    months_map = {}
    for insp in inspections:
        res = insp.result
        if not res:
            continue
        is_fraud = res.verdict in FRAUD_VERDICTS

        # Parse month key
        dt = None
        if insp.date:
            try:
                dt = datetime.strptime(insp.date, "%Y-%m-%d")
            except Exception:
                try:
                    dt = datetime.strptime(insp.date, "%d-%b-%Y")
                except Exception:
                    pass
        if not dt:
            dt = insp.created_at
        if not dt:
            continue

        month_key = (dt.year, dt.month, dt.strftime("%b"))
        if month_key not in months_map:
            months_map[month_key] = {"total": 0, "fraud": 0}

        months_map[month_key]["total"] += 1
        if is_fraud:
            months_map[month_key]["fraud"] += 1

    result = []
    for key in sorted(months_map.keys()):
        total = months_map[key]["total"]
        fraud = months_map[key]["fraud"]
        rate = round((fraud / total) * 100, 1) if total > 0 else 0.0
        result.append(schemas.MonthlyTrendItem(
            month=key[2],
            total_inspections=total,
            fraud_cases=fraud,
            fraud_rate=rate
        ))

    if not result:
        result.append(schemas.MonthlyTrendItem(
            month=datetime.utcnow().strftime("%b"),
            total_inspections=0,
            fraud_cases=0,
            fraud_rate=0.0
        ))

    return result


@router.get("/monthly-breakdown", response_model=List[schemas.MonthlyBreakdownItem])
def get_monthly_breakdown(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Retrieve detailed breakdown of inspections/frauds by month, vendor, and location."""
    logger.info(f"[Analytics] Monthly breakdown requested by {current_user.email}")

    inspections = (
        db.query(models.Inspection)
        .join(models.InspectionResult, models.InspectionResult.inspection_id == models.Inspection.id)
        .filter(models.Inspection.status == "completed")
        .all()
    )

    breakdown_map = {}
    for insp in inspections:
        res = insp.result
        if not res:
            continue
        is_fraud = res.verdict in FRAUD_VERDICTS

        # Parse month key
        dt = None
        if insp.date:
            try:
                dt = datetime.strptime(insp.date, "%Y-%m-%d")
            except Exception:
                try:
                    dt = datetime.strptime(insp.date, "%d-%b-%Y")
                except Exception:
                    pass
        if not dt:
            dt = insp.created_at
        if not dt:
            continue

        month_key = (dt.year, dt.month, dt.strftime("%b"))
        vendor_name = insp.vendor or "Unknown Vendor"
        location_name = insp.capture_site or "Unknown Site"

        group_key = (month_key, vendor_name, location_name)
        if group_key not in breakdown_map:
            breakdown_map[group_key] = {"total": 0, "fraud": 0}

        breakdown_map[group_key]["total"] += 1
        if is_fraud:
            breakdown_map[group_key]["fraud"] += 1

    result = []
    for key in sorted(breakdown_map.keys()):
        month_key, vendor_name, location_name = key
        total = breakdown_map[key]["total"]
        fraud = breakdown_map[key]["fraud"]
        rate = round((fraud / total) * 100, 1) if total > 0 else 0.0
        result.append(schemas.MonthlyBreakdownItem(
            month=month_key[2],
            vendor=vendor_name,
            location=location_name,
            total_inspections=total,
            fraud_cases=fraud,
            fraud_rate=rate
        ))

    return result
