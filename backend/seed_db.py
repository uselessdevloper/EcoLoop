"""
seed_db.py — Run this script once to create default Admin and User accounts.

Usage (from the /backend folder):
    python seed_db.py

Credentials created:
  Admin  → admin@verivision.com  / admin123
  User   → user@verivision.com   / user123
"""

import sys
import os
import re
import shutil

# Ensure the backend root is on the path so app imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app import models, utils


def migrate_db():
    """Safely add new columns to existing tables (SQLite ALTER TABLE)."""
    import sqlite3
    db_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "verivision.db"),
        os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "verivision.db"))
    ]

    for db_path in db_paths:
        if not os.path.exists(db_path):
            continue

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check existing columns in inspections table
        cursor.execute("PRAGMA table_info(inspections)")
        existing_cols = {row[1] for row in cursor.fetchall()}

        migrations = [
            ("vendor", "TEXT"),
            ("component_name", "TEXT"),
            ("date", "TEXT"),
        ]

        # Check existing columns in golden_references table
        cursor.execute("PRAGMA table_info(golden_references)")
        gld_cols = {row[1] for row in cursor.fetchall()}
        if "embedding_vector" not in gld_cols:
            cursor.execute("ALTER TABLE golden_references ADD COLUMN embedding_vector TEXT")
            print(f"  [MIGRATE] Added column 'golden_references.embedding_vector' to {os.path.basename(db_path)}")

        # Check existing columns in inspection_results table
        cursor.execute("PRAGMA table_info(inspection_results)")
        res_cols = {row[1] for row in cursor.fetchall()}
        res_migrations = [
            ("category", "TEXT"),
            ("diagnostic_path", "TEXT"),
            ("evidence_json", "TEXT"),
        ]
        for col_name, col_type in res_migrations:
            if col_name not in res_cols:
                cursor.execute(f"ALTER TABLE inspection_results ADD COLUMN {col_name} {col_type}")
                print(f"  [MIGRATE] Added column 'inspection_results.{col_name}' to {os.path.basename(db_path)}")

        for col_name, col_type in migrations:
            if col_name not in existing_cols:
                cursor.execute(f"ALTER TABLE inspections ADD COLUMN {col_name} {col_type}")
                print(f"  [MIGRATE] Added column 'inspections.{col_name}' to {os.path.basename(db_path)}")
            else:
                print(f"  [SKIP]    Column 'inspections.{col_name}' already exists in {os.path.basename(db_path)}")

        conn.commit()
        conn.close()


def seed():
    # Run migrations first (safe for existing DBs)
    migrate_db()

    # Create all tables if they don't exist yet
    Base.metadata.create_all(bind=engine)

    import shutil
    from app.config import settings

    db = SessionLocal()
    try:
        # 1. Seed Accounts
        accounts = [
            {
                "name": "Admin",
                "email": "admin@verivision.com",
                "password": "admin123",
                "role": "admin",
            },
            {
                "name": "Operator",
                "email": "user@verivision.com",
                "password": "user123",
                "role": "user",
            },
        ]

        created_acc = 0
        for acc in accounts:
            existing = db.query(models.User).filter(models.User.email == acc["email"]).first()
            if existing:
                print(f"  [SKIP]    {acc['email']} already exists (role={existing.role})")
            else:
                hashed = utils.get_password_hash(acc["password"])
                user = models.User(
                    name=acc["name"],
                    email=acc["email"],
                    hashed_password=hashed,
                    role=acc["role"],
                )
                db.add(user)
                created_acc += 1
                print(f"  [CREATED] {acc['email']}  role={acc['role']}")

        db.commit()

        # 2. Dynamically Seed Golden Catalog Reference Library from Golden_Images Directory
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        source_folder = os.path.join(project_root, "Golden_Images")
        os.makedirs(settings.GOLDEN_DIR, exist_ok=True)

        valid_extensions = {".png", ".jpg", ".jpeg", ".webp"}
        image_files = sorted([
            f for f in os.listdir(source_folder)
            if os.path.isfile(os.path.join(source_folder, f)) and os.path.splitext(f)[1].lower() in valid_extensions
        ])

        def get_commodity_from_filename(fname: str) -> str:
            lower = fname.lower()
            if "ram" in lower: return "ram"
            if "battery" in lower or "batt" in lower: return "battery"
            if "motherboard" in lower or "mb" in lower: return "motherboard"
            if "microchip" in lower or "chip" in lower: return "microchip"
            if "rom" in lower or "bios" in lower: return "storage"
            if "ssd" in lower or "hdd" in lower or "drive" in lower: return "storage"
            if "label" in lower or "warranty" in lower or "seal" in lower: return "label"
            if "gpu" in lower or "sound" in lower or "card" in lower: return "gpu"
            return "motherboard"

        def get_part_number_from_filename(fname: str) -> str:
            name_no_ext = os.path.splitext(fname)[0].strip()
            clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name_no_ext).upper()
            clean_name = re.sub(r'_+', '_', clean_name).strip('_')
            if clean_name.startswith("GOLDEN_"):
                clean_name = f"GOLD_{clean_name[7:]}"
            elif not clean_name.startswith("GOLD_") and not clean_name.startswith("GOLD-"):
                clean_name = f"GOLD_{clean_name}"
            return clean_name.replace("_", "-")

        def get_title_from_filename(fname: str) -> str:
            name_no_ext = os.path.splitext(fname)[0].strip()
            words = [w.capitalize() for w in name_no_ext.replace("_", " ").replace("-", " ").split()]
            return " ".join(words)

        catalog_products = []
        seen_part_numbers = set()
        for idx, fname in enumerate(image_files, 1):
            part_num = get_part_number_from_filename(fname)
            if part_num in seen_part_numbers:
                part_num = f"{part_num}-{idx}"
            seen_part_numbers.add(part_num)
            title = get_title_from_filename(fname)
            commodity = get_commodity_from_filename(fname)
            catalog_products.append({
                "part_number": part_num,
                "name": title,
                "commodity": commodity,
                "filename": fname,
                "expected_serial": part_num
            })

        # Only purge products that NO LONGER exist in the Golden_Images folder
        # (to handle case where someone removed a reference image file)
        # This preserves existing products AND their associated inspections!
        existing_part_numbers = {p["part_number"] for p in catalog_products}
        old_products = db.query(models.Product).all()
        for old_prod in old_products:
            if old_prod.part_number not in existing_part_numbers:
                print(f"  [SYNC PURGE] Removing stale catalog entry '{old_prod.part_number}' (no longer in Golden_Images)")
                insps = db.query(models.Inspection).filter(models.Inspection.product_id == old_prod.id).all()
                for insp in insps:
                    db.query(models.InspectionResult).filter(models.InspectionResult.inspection_id == insp.id).delete()
                    db.query(models.AuditLog).filter(models.AuditLog.inspection_id == insp.id).delete()
                    db.delete(insp)
                db.query(models.GoldenReference).filter(models.GoldenReference.product_id == old_prod.id).delete()
                db.delete(old_prod)
        db.commit()

        created_prod = 0
        for prod in catalog_products:
            # Check if product is already seeded
            existing_prod = db.query(models.Product).filter(models.Product.part_number == prod["part_number"]).first()
            if existing_prod:
                print(f"  [SKIP]    Catalog part {prod['part_number']} already registered")
                continue

            # Copy image standard to data/golden
            src_file_path = os.path.join(source_folder, prod["filename"])
            dst_filename = f"golden_{prod['part_number'].lower()}.png"
            dst_file_path = os.path.join(settings.GOLDEN_DIR, dst_filename)

            if not os.path.exists(src_file_path):
                print(f"  [WARN]    Source reference file {src_file_path} not found on disk, skipping.")
                continue

            try:
                shutil.copy(src_file_path, dst_file_path)
            except Exception as copy_err:
                print(f"  [ERROR]   Failed to copy reference {prod['filename']}: {copy_err}")
                continue

            # Determine default ROIs
            if prod["commodity"] == "label":
                roi_json = { "label_roi": { "x": 420, "y": 50, "width": 420, "height": 220 } }
            elif prod["commodity"] == "motherboard":
                roi_json = { "label_roi": { "x": 200, "y": 620, "width": 150, "height": 80 } }
            elif prod["commodity"] == "microchip":
                roi_json = { "label_roi": { "x": 250, "y": 250, "width": 200, "height": 100 } }
            else:
                roi_json = { "label_roi": { "x": 100, "y": 100, "width": 300, "height": 200 } }

            # Create DB Records
            new_prod = models.Product(
                part_number=prod["part_number"],
                name=prod["name"],
                commodity=prod["commodity"]
            )
            db.add(new_prod)
            db.commit()
            db.refresh(new_prod)

            # Calculate 512-dim visual vector embedding
            from app.services.embedding_service import _extract_opencv_fallback
            emb_vec = _extract_opencv_fallback(dst_file_path)

            new_golden = models.GoldenReference(
                product_id=new_prod.id,
                image_path=f"data/golden/{dst_filename}",
                expected_serial=prod["expected_serial"],
                roi_config=roi_json,
                angle="top",
                embedding_vector=emb_vec
            )
            db.add(new_golden)
            db.commit()
            created_prod += 1
            print(f"  [CREATED] Seeded catalog product '{prod['name']}' ({prod['part_number']}) with 512-dim vector embedding.")

        print(f"\n[OK] Seeding complete! {created_acc} accounts, {created_prod} catalog parts registered.")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Seeding process failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("  VeriVision-AI — Database Seeder")
    print("=" * 50)
    seed()