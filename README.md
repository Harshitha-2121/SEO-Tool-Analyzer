# SEO-Tool-Analyzer

An AI-powered SEO analysis platform that crawls and analyzes websites to identify technical SEO issues, content gaps, performance problems, competitor opportunities, and ranking factors. The platform combines Ollagraph web intelligence and crawling capabilities with AI-powered analysis to provide actionable SEO recommendations in both technical and easy-to-understand business language.

### Key Capabilities

* Comprehensive technical SEO auditing
* On-page SEO analysis
* Automatic competitor discovery
* AI Opportunity Finder
* Keyword and content gap analysis
* Search intent and topic analysis
* Internal link analysis
* Backlink intelligence
* Schema and structured-data analysis
* Core Web Vitals and performance analysis
* EEAT and AI-search readiness analysis
* AI-generated SEO fixes and recommendations
* SEO Growth Roadmaps
* SEO Digital Twin and predictive analysis
* Business and SEO-level explanations
* Continuous SEO monitoring and reporting

Built to help businesses understand **what is wrong, why it matters, what competitors are doing better, and what actions should be taken to improve their website's organic visibility.**

---

## AI SEO Digital Twin Simulator Setup

This simulator uses real crawl data from the Ollagraph API and real inference from the local Ollama model to forecast search engine visibility changes.

### Prerequisites

#### 1. Set environment variables
You must set the following environment variables before starting the backend server:

```bash
export OLLAGRAPH_API_KEY="your_ollagraph_api_key"
```

#### 2. Pull local Ollama model
The simulator automatically queries your local Ollama instance for the available models and prefers `llama3`. Ensure you pull the model:

```bash
ollama pull llama3
```

### Running the Platform
Start the backend python server from the root of the project:

```bash
python server.py
```
This will start the server on port `8080`.

