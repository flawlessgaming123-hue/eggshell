import csv
import os
import time
import json
from google import genai

# --- CONFIGURATION ---
API_KEY = os.environ.get("GEMINI_API_KEY") or "PASTE_YOUR_KEY_HERE"
# ---------------------

try:
    client = genai.Client(api_key=API_KEY)
except Exception as e:
    print(f"Failed to initialize Gemini Client: {e}")
    exit(1)

# FORCE using 1.5-flash as it has more stable free-tier limits
WORKING_MODEL = 'gemini-1.5-flash'

SCHEMATIC = """
You are an expert B2B cold email copywriter. Use the provided variables to write a cold email pitching a £3,950 Shopify hybrid app.
RULES:
1. Wrap existing store, no rebuild. Native bottom nav & JS injection.
2. Push notifications via Firebase (abandoned cart, shipped) + Native Inbox.
3. £3,950 build fee + optional £49/mo or £149/mo retainers.
4. Tone: UK English, direct, commercially savvy. Focus on retention ROI.
5. NO bullet points in the body.
6. Single CTA: 15-minute call / live demo.
7. Generate 3 subject lines (under 8 words, curiosity-driven, no prices/agency names).

OUTPUT FORMAT: Return valid JSON with keys: "subject_1", "subject_2", "subject_3", "body".
"""

def generate_email(first_name, store_name, niche, ps_type, build_window_month):
    prompt = f"Variables:\n- First Name: {first_name}\n- Store Name: {store_name}\n- Niche: {niche}\n- PS Type: {ps_type}\n- Build Window Month: {build_window_month}"
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=WORKING_MODEL,
                contents=[SCHEMATIC, prompt],
                config={
                    'response_mime_type': 'application/json',
                    'temperature': 0.7
                }
            )
            return json.loads(response.text)
        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                # Wait 65 seconds to clear the 1-minute rate limit window
                wait_time = 65
                print(f"  > Free Tier Limit hit. Pausing for {wait_time}s to reset...")
                time.sleep(wait_time)
                continue
            print(f"Error generating for {store_name}: {err_msg}")
            return None
    return None

def process_leads(input_csv, output_csv):
    if not API_KEY or API_KEY == "PASTE_YOUR_KEY_HERE":
        print("Error: No API Key found.")
        return

    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, input_csv)
    output_path = os.path.join(script_dir, output_csv)

    with open(input_path, mode='r', encoding='utf-8-sig') as infile, \
         open(output_path, mode='w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.DictReader(infile)
        writer = csv.DictWriter(outfile, fieldnames=['first_name', 'store_name', 'niche', 'subject_1', 'subject_2', 'subject_3', 'email_body'])
        writer.writeheader()
        
        for row in reader:
            row = {k.strip(): v for k, v in row.items()}
            print(f"Generating email for {row.get('store_name', 'Unknown')}...")
            
            result = generate_email(
                row.get('first_name', ''), 
                row.get('store_name', ''), 
                row.get('niche', ''), 
                row.get('ps_type', ''), 
                row.get('build_window_month', '')
            )
            
            if result:
                row_data = {
                    'first_name': row.get('first_name', ''),
                    'store_name': row.get('store_name', ''),
                    'niche': row.get('niche', ''),
                    'subject_1': result.get('subject_1', ''),
                    'subject_2': result.get('subject_2', ''),
                    'subject_3': result.get('subject_3', ''),
                    'email_body': result.get('body', '')
                }
                writer.writerow(row_data)
                print(f"  > Success! Saved to CSV.")
            
            # 10 second delay between leads to avoid hitting the limit too fast
            time.sleep(10)

if __name__ == "__main__":
    print(f"Starting engine using {WORKING_MODEL} (Patient Mode)...")
    process_leads('leads.csv', 'ready_to_send_emails.csv')
    print("\n--- COMPLETE! ---")
    print(f"Final results saved in: {os.path.join(os.getcwd(), 'ready_to_send_emails.csv')}")
