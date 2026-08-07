"""
Twilio Studio Flow Auto-Creator Script
Automatically creates and publishes the EcoLoop Studio Flow directly in your Twilio account via REST API.
"""
import json
import os
import sys
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# Load environment variables directly from .env file
load_dotenv(override=True)


def auto_create_twilio_flow():
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()

    flow_path = os.path.join(os.path.dirname(__file__), "studio_flow.json")
    with open(flow_path, "r", encoding="utf-8") as f:
        definition = json.load(f)

    try:
        client = Client(account_sid, auth_token)
        print(f"[TWILIO API] Connecting to Account SID ({account_sid[:8]}...)...")
        print("[TWILIO API] Creating & publishing Studio Flow 'EcoLoop Studio Dispatch'...")
        
        flow = client.studio.v2.flows.create(
            friendly_name="EcoLoop Studio Dispatch",
            status="published",
            definition=definition
        )

        flow_sid = flow.sid
        print(f"\n[SUCCESS] Studio Flow created and published!")
        print(f"[FLOW SID] TWILIO_STUDIO_FLOW_SID={flow_sid}\n")

        # Automatically update .env file with the created flow_sid
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as env_file:
                lines = env_file.readlines()
            
            updated_lines = []
            sid_updated = False
            for line in lines:
                if line.startswith("TWILIO_STUDIO_FLOW_SID="):
                    updated_lines.append(f'TWILIO_STUDIO_FLOW_SID="{flow_sid}"\n')
                    sid_updated = True
                else:
                    updated_lines.append(line)
            
            if not sid_updated:
                updated_lines.append(f'TWILIO_STUDIO_FLOW_SID="{flow_sid}"\n')

            with open(env_path, "w", encoding="utf-8") as env_file:
                env_file.writelines(updated_lines)

            print(f"[.ENV UPDATED] Saved TWILIO_STUDIO_FLOW_SID={flow_sid} into .env file!")

        return flow_sid

    except TwilioRestException as e:
        print(f"[TWILIO API ERROR] Code: {e.code}, Message: {e.msg}")
        if hasattr(e, "details"):
            print(f"Details: {e.details}")
        return None
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return None


if __name__ == "__main__":
    auto_create_twilio_flow()
