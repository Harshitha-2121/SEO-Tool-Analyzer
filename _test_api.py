import urllib.request, json, time

url = "http://localhost:8080/api/competitor-audit"
data = json.dumps({
    "user_url": "https://example.com",
    "competitors": ["https://httpbin.org"]
}).encode()

req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
try:
    start = time.time()
    resp = urllib.request.urlopen(req, timeout=90)
    result = json.loads(resp.read())
    elapsed = time.time() - start
    output = {
        "success": True,
        "elapsed_sec": round(elapsed, 1),
        "keys": list(result.keys()),
        "has_user": "user" in result,
        "has_competitors": "competitors" in result,
        "has_battle_plan": "battle_plan" in result,
        "user_keys": list(result.get("user", {}).keys()) if result.get("user") else None,
        "competitor_count": len(result.get("competitors", [])),
        "sample": {k: result.get(k) for k in ["success", "user_domain"]}
    }
except Exception as e:
    output = {"success": False, "error": str(e)}

with open("/home/ubuntu/seo-audit-platform/_api_test_result.json", "w") as f:
    json.dump(output, f, indent=2)
