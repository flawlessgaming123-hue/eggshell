import requests
import csv
import os
import json

# --- CONFIGURATION ---
# Get your API key from: https://app.apollo.io/settings/api
APOLLO_API_KEY = os.environ.get("APOLLO_API_KEY") or "PASTE_YOUR_APOLLO_KEY_HERE"
# ---------------------

def find_leads(niche, total_leads=10):
    url = "https://api.apollo.io/v1/mixed_people/api_search"
    
    headers = {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json"
    }
    
    # Apollo search criteria
    data = {
        "api_key": APOLLO_API_KEY,
        "person_titles": ["founder", "ceo", "owner", "director"],
        "person_locations": ["United Kingdom"],
        "organization_technologies": ["shopify"],
        "q_organization_keyword_tags": [niche], # Niche filtering
        "page": 1,
        "display_mode": "regular_mode"
    }

    print(f"Searching Apollo for {niche} Shopify stores in the UK...")
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        results = response.json()
        
        people = results.get('people', [])
        leads = []
        
        for person in people:
            # Basic mapping to your leads.csv format
            lead = {
                'first_name': person.get('first_name', ''),
                'store_name': person.get('organization', {}).get('name', 'Unknown Store'),
                'niche': niche,
                'ps_type': 'social_proof', # Default for your email engine
                'build_window_month': 'May'  # Default for your email engine
            }
            leads.append(lead)
            if len(leads) >= total_leads:
                break
                
        return leads
    except Exception as e:
        print(f"Error fetching from Apollo: {e}")
        return []

def update_leads_csv(new_leads):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, 'leads.csv')
    
    file_exists = os.path.isfile(csv_path)
    
    with open(csv_path, mode='a', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['first_name', 'store_name', 'niche', 'ps_type', 'build_window_month'])
        
        # If the file is new/empty, write the header
        if not file_exists or os.stat(csv_path).st_size == 0:
            writer.writeheader()
            
        for lead in new_leads:
            writer.writerow(lead)
            print(f"  > Added: {lead['first_name']} from {lead['store_name']}")

if __name__ == "__main__":
    if APOLLO_API_KEY == "PASTE_YOUR_APOLLO_KEY_HERE":
        print("Error: Please set your APOLLO_API_KEY.")
    else:
        niche_input = input("Enter a niche (e.g. skincare, gymwear, pets): ")
        count_input = input("How many leads do you want? (default 5): ") or "5"
        
        found_leads = find_leads(niche_input, int(count_input))
        
        if found_leads:
            print(f"Found {len(found_leads)} leads. Adding to leads.csv...")
            update_leads_csv(found_leads)
            print("\nDone! You can now run 'python generate_emails.py' to target them.")
        else:
            print("No leads found. Try a broader niche.")
