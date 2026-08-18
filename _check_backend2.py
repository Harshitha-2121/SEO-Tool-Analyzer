import ast, json

with open('/home/ubuntu/seo-audit-platform/server.py') as f:
    tree = ast.parse(f.read())

funcs = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
result = {
    'has_analyze_site_metrics': 'analyze_site_metrics' in funcs,
    'has_crawl_site': 'crawl_site' in funcs,
    'has_get_best_ollama_model': 'get_best_ollama_model' in funcs,
    'has_call_ollama': 'call_ollama' in funcs,
    'has_extract_json_from_ollama': 'extract_json_from_ollama' in funcs,
    'has_build_link_graph': 'build_link_graph' in funcs,
    'all_funcs': funcs
}

with open('/home/ubuntu/seo-audit-platform/_backend_check.json', 'w') as f:
    json.dump(result, f, indent=2)
