/**
 * Escapes LaTeX special characters in text
 */
export function escapeLatex(text: string): string {
  if (!text) return '';
  
  // First replace backslashes
  let result = text.replace(/\\/g, '\\textbackslash');
  
  // Replace special characters
  const replacements: {[key: string]: string} = {
    '&': '\\&',
    '%': '\\%',
    '$': '\\$',
    '#': '\\#',
    '_': '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
    '\\': '\\textbackslash{}',
    '"': '\\textquotedbl{}',
    "'": '\\textquotesingle{}',
    '<': '\\textless{}',
    '>': '\\textgreater{}',
    '|': '\\textbar{}',
    '`': '\\textasciigrave{}',
    '–': '--', // en dash
    '—': '---', // em dash
    '‘': '`', // left single quote
    '’': "'", // right single quote
    '“': '``', // left double quote
    '”': "''", // right double quote
  };
  
  // Replace each special character
  Object.entries(replacements).forEach(([find, replace]) => {
    result = result.replace(new RegExp(find, 'g'), replace);
  });
  
  return result;
}

/**
 * Wraps Hebrew text in RTL commands
 */
export function wrapHebrew(text: string): string {
  if (!text) return '';
  // Check if text contains Hebrew characters
  const hebrewRegex = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
  return hebrewRegex.test(text) ? `\\RLE{${text}}` : text;
}

/**
 * Creates a LaTeX section with proper escaping and RTL support
 */
export function createLatexSection(title: string, content: string, level: 'section' | 'subsection' = 'section'): string {
  const escapedTitle = escapeLatex(title);
  let result = `\\${level}*{${escapedTitle}}\\n`;
  
  // Split content into lines and process each line
  const lines = content.split('\\\\n');
  for (const line of lines) {
    if (line.trim()) {
      const escapedLine = escapeLatex(line);
      result += `${wrapHebrew(escapedLine)}\\\n`;
    }
  }
  
  return result + '\\vspace{1em}\\n';
}

/**
 * Creates a LaTeX document with proper headers and settings for Hebrew
 */
export function createLatexDocument(title: string, author: string, content: string): string {
  return `%!TEX program = xelatex
% Auto-generated LaTeX document
% Generated on ${new Date().toISOString()}

\\documentclass[12pt,a4paper]{article}
\\usepackage{fontspec}
\\usepackage{geometry}
\\geometry{margin=2cm}
\\usepackage{fancyhdr}
\\pagestyle{fancy}
\\fancyhf{}
\\rfoot{\\thepage}
\\usepackage{hyperref}
\\usepackage{polyglossia}
\\setdefaultlanguage{hebrew}
\\setotherlanguage{english}
\\newfontfamily\\hebrewfont[Script=Hebrew]{Ezra SIL}
\\newfontfamily\\englishfont{Ezra SIL}
\\setmainfont{Ezra SIL}
\\setRTL

% Fix for bidi package
\\makeatletter
\\let\\hebrewtextorig\\hebrewtext
\\renewcommand{\\hebrewtext}{\\protect\\RLE\\hebrewtextorig}
\\providecommand{\\bidi@Initialize}{}
\\makeatother

\\begin{document}
\\title{${escapeLatex(title)}}
\\author{${escapeLatex(author)}}
\\date{}
\\maketitle
\\tableofcontents
\\thispagestyle{empty}
\\newpage
\\setcounter{page}{1}

${content}

\\end{document}
`;
}
