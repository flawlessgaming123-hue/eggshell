import csv
import os
import time
import requests
import random
from duckduckgo_search import DDGS

def is_shopify(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'}
        response = requests.get(url, timeout=10, headers=headers)
        html = response.text.lower()
        if 'cdn.shopify.com' in html or 'myshopify.com' in html or 'powered by shopify' in html:
            return True
    except:
        pass
    return False

def find_leads_free(niche, count=3):
    print(f"--- Searching for {niche} stores ---")
    
    # We use a very "human" search query
    query = f"top {niche} brands UK shopify"
    
    leads = []
    try:
        # Using the new DDGS syntax to avoid warnings
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=20))
            
            if not results:
                # Fallback query
                results = list(ddgs.text(f"{niche} store .co.uk", max_results=20))

            for r in results:
                if len(leads) >= count: break
                url = r.get('href', '')
                if not url or 'facebook' in url or 'amazon' in url or 'instagram' in url: continue
                
                print(f"  Checking: {url}...")
                if is_shopify(url):
                    name = url.split('//')[-1].split('.')[0].replace('www.', '').capitalize()
                    leads.append({
                        'first_name': 'Founder',
                        'store_name': name,
                        'niche': niche,
                        'ps_type': 'social_proof',
                        'build_window_month': 'May'
                    })
                    print(f"    [✔] Found: {name}")
                time.sleep(random.uniform(2, 4)) # Human-like delay
    except Exception as e:
        print(f"Error: {e}")
            
    return leads

def save_to_csv(new_leads):
    csv_path = os.path.join(os.path.dirname(__file__), 'leads.csv')
    with open(csv_path, mode='a', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['first_name', 'store_name', 'niche', 'ps_type', 'build_window_month'])
        if os.stat(csv_path).st_size == 0: writer.writeheader()
        writer.writerows(new_leads)

if __name__ == "__main__":
    niche = input("Enter niche: ")
    num = int(input("How many leads? ") or "3")
    res = find_leads_free(niche, num)
    if res:
        save_to_csv(res)
        print(f"Added {len(res)} leads!")
    else:
        print("Still blocked by search engine. PLEASE TRY 'python find_leads_ai.py' INSTEAD.")
