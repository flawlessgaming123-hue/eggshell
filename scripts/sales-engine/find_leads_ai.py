import csv
import os
import json
import time
from google import genai

# --- CONFIGURATION ---
API_KEY = os.environ.get("GEMINI_API_KEY") or "PASTE_YOUR_KEY_HERE"
# ---------------------

client = genai.Client(api_key=API_KEY)

def get_working_model():
    try:
        models = list(client.models.list())
        names = [m.name for m in models]
        # Priority order for finding leads
        for target in ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b']:
            if target in names or f"models/{target}" in names:
                return target
        return names[0] if names else 'gemini-1.5-flash'
    except:
        return 'gemini-1.5-flash'

WORKING_MODEL = get_working_model()

def find_leads_with_ai(niche, count=3):
    print(f"--- Using {WORKING_MODEL} to find {niche} Shopify stores ---")
    
    prompt = f"Search the web and find {count} active Shopify stores based in the United Kingdom in the '{niche}' niche. Return a JSON list of objects. Each object MUST have: 'first_name' (founder name if possible, or 'Founder'), 'store_name' (the brand name), and 'niche' (use '{niche}')."

    max_retries = 3
    for attempt in range(max_retries):
        try:
            # We try with the search tool first
            response = client.models.generate_content(
                model=WORKING_MODEL,
                contents=prompt,
                config={
                    'tools': [{'google_search': {}}],
                    'response_mime_type': 'application/json'
                }
            )
            return json.loads(response.text)

        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                wait_time = 45 + (attempt * 15)
                print(f"  > Rate limit hit. Waiting {wait_time}s to reset...")
                time.sleep(wait_time)
                continue
            elif "404" in err:
                print(f"  > Model error. Trying alternative setup...")
                # Try without the google_search tool as a fallback
                try:
                    response = client.models.generate_content(
                        model=WORKING_MODEL,
                        contents=prompt + " (Use your internal knowledge to find real examples)",
                        config={'response_mime_type': 'application/json'}
                    )
                    return json.loads(response.text)
                except:
                    break
            print(f"Error finding leads with AI: {e}")
            return []
    return []

def save_to_csv(new_leads):
    csv_path = os.path.join(os.path.dirname(__file__), 'leads.csv')
    with open(csv_path, mode='a', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['first_name', 'store_name', 'niche', 'ps_type', 'build_window_month'])
        if os.stat(csv_path).st_size == 0: writer.writeheader()
        for lead in new_leads:
            writer.writerow({
                'first_name': lead.get('first_name', 'Founder'),
                'store_name': lead.get('store_name', 'Unknown'),
                'niche': lead.get('niche', 'Niche'),
                'ps_type': 'social_proof',
                'build_window_month': 'May'
            })

if __name__ == "__main__":
    niche = input("Enter niche: ")
    num = int(input("How many leads? ") or "3")
    results = find_leads_with_ai(niche, num)
    if results:
        print(f"\nFound {len(results)} leads. Added to leads.csv.")
        save_to_csv(results)
    else:
        print("\nCould not find leads. Please wait 1 minute and try a common niche.")
