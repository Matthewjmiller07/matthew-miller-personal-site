# Tourism Library Analysis

## Overview
Interactive web application for analyzing the Israel Ministry of Tourism Professional Library catalog, containing 9,076 publications about tourism, heritage, and cultural studies.

## Features

### 🔍 Advanced Search
- **Title Search**: Find publications by keywords in titles
- **Author Search**: Search by author names
- **Publisher Search**: Filter by publishing houses
- **Year Range**: Filter by publication year or year ranges (e.g., 1990-2000)

### 📊 Data Visualization
- **Decade Analysis**: Bar chart showing publications by decade
- **Publisher Distribution**: Doughnut chart of top 10 publishers
- **Real-time Statistics**: Live updating metrics

### 🎯 Quick Filters
- **Jewish/Heritage Content**: One-click filter for Jewish-related publications
- **Jerusalem Content**: Filter for Jerusalem-focused materials

### 📋 Results Management
- **Sortable Table**: Detailed view of all search results
- **Pagination**: Navigate through large result sets
- **Export to CSV**: Download filtered results for further analysis

## Data Structure

Each publication record contains:
- `item_name`: Title of the publication
- `author_name`: Author information
- `publishing_house`: Publisher details
- `pub_year`: Publication year
- `pub_place`: Publication location
- `pages`: Page count
- `remarks`: Additional notes and references

## Key Insights

### Collection Highlights
- **9,076 total publications** spanning multiple decades
- **878 Jerusalem-focused items** (nearly 10% of collection)
- **Strong government publishing** from Ministry of Tourism
- **International tourism research** from multiple countries

### Notable Content Categories
- **Heritage tourism** and UNESCO site documentation
- **Jerusalem urban planning** and development strategies
- **Religious tourism** studies (Christian, Jewish, Muslim)
- **Statistical tourism reports** from various countries

## Usage

1. **Access the page**: Go to `http://localhost:4321/tourism-library` in your web browser
2. **Browse all data**: Initially shows all 9,076 publications
3. **Apply filters**: Use search boxes or quick filter buttons
4. **Analyze trends**: View charts and statistics
5. **Export results**: Download filtered data as CSV

## 🌐 Access Your New Analysis Tool

**URL:** `http://localhost:4321/tourism-library` (when running locally)

This is now integrated into your Astro site at `/src/pages/tourism-library.astro` and uses the JSON data from `/public/tourism_library_data.json`.

## Technical Details

- **Frontend**: Astro, HTML5, Tailwind CSS, Chart.js
- **Framework**: Astro with client-side JavaScript
- **Data Source**: Israel Ministry of Tourism Open Data Portal
- **Last Updated**: November 2025
- **Data Size**: 2.4MB JSON file in `/public/`
- **Browser Support**: Modern browsers with JavaScript enabled

## Research Applications

### Academic Research
- **Tourism studies**: Historical development of Israeli tourism
- **Heritage management**: UNESCO site documentation
- **Urban planning**: Jerusalem development strategies
- **Cultural studies**: Religious tourism patterns

### Policy Analysis
- **Government tourism policy**: Evolution over decades
- **International cooperation**: Tourism research partnerships
- **Regional development**: Tourism planning strategies

### Data Analysis
- **Publication trends**: Chronological analysis
- **Publisher networks**: Institutional relationships
- **Geographic focus**: Spatial distribution of research

## Interesting Discoveries

### Jewish/Heritage Content
- "Jerusalem: Strategic Plan to Strengthen Jerusalem as Civilizational Capital of the Jewish People" (2007)
- "Muslim Tourism to Israel: Characteristics, Trends and Potential" (1998)
- "Christian Pilgrimage to Israel" series (1997-2000)

### International Context
- Tourism statistics from **South Africa, Singapore, China, Korea**
- UNESCO heritage management reports
- Mediterranean tourism research

### Historical Timeline
- **1970s-1980s**: Early urban planning documents
- **1990s**: Peace process tourism initiatives
- **2000s**: UNESCO heritage site designations
- **2010s**: Modern tourism development strategies

## Limitations

- **Catalog only**: No direct access to full publications
- **Hebrew language**: Many titles in Hebrew
- **Government perspective**: Primarily official publications
- **Physical library**: Access requires visiting Ministry library

## Future Enhancements

Potential improvements could include:
- **Full-text search** across all fields
- **Translation services** for Hebrew content
- **Integration with academic databases**
- **Citation export** (BibTeX, EndNote)
- **Advanced filtering** by language, topic categories

---

*This tool provides unprecedented access to Israel's tourism research heritage, enabling scholars, policymakers, and researchers to explore decades of institutional knowledge about tourism development, heritage management, and cultural preservation.*
