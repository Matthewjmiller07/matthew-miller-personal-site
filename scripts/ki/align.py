"""Find the word a translation uses for each כִּי, by position.

A verse's words are numbered; the ki sits at a fraction `pos` of the Hebrew verse. Every word
in the translation that is a known rendering of ki (for, because, that, but, when, if, surely,
yea ... and their 16th-century spellings, some per translation (LEX_BY); German and French equivalents) is a candidate, and
the candidate whose own fraction of the translated verse is nearest `pos` wins, if it is near
enough. Weak candidates (as, so, now, then, even, only), which are common for other reasons,
must be closer. No candidate in range means the translator restructured the clause or left
ki untranslated ("-").

The page re-finds the highlighted word client-side with the same rule, so keep the two in step.
"""
import re

# surface form -> code. Codes are the normalized renderings shown on the page (CODES).
LEX = {
    # English, modern and early-modern spellings
    'for': 'f', 'because': 'b', 'bycause': 'b', 'becaus': 'b', 'bicause': 'b', 'bicau': 'b', 'becau': 'b',
    'that': 't', 'yt': 't', 'when': 'w', 'whan': 'w', 'whanne': 'w', 'whenne': 'w', 'whenever': 'w',
    'if': 'i', 'yf': 'i', 'yif': 'i', 'but': 'u', 'bot': 'u',
    'surely': 's', 'surelie': 's', 'assuredly': 's',
    'truly': 'r', 'truely': 'r', 'treuli': 'r', 'trewly': 'r', 'verily': 'r', 'verely': 'r', 'certainly': 'r',
    'certeinly': 'r', 'certes': 'r', 'doubtless': 'r', 'doutles': 'r', 'doutlesse': 'r', 'undoubtedly': 'r',
    'indeed': 'd', 'indede': 'd', 'indeede': 'd', 'though': 'h', 'thoughe': 'h', 'although': 'h', 'albeit': 'h', 'thouz': 'h',
    'yea': 'y', 'yes': 'y', 'yhe': 'y',  # 'yhe' is Wycliffe's yea
    'yee': None,  # 'yee' is the pronoun in Geneva and the 1611 King James; Coverdale's yea, see LEX_BY
    'except': 'x', 'excepte': 'x', 'unless': 'x', 'vnlesse': 'x', 'vnles': 'x', 'save': 'x', 'saue': 'x',
    'saving': 'x', 'sauyng': 'x', 'rather': 'q', 'instead': 'q',
    'since': 'c', 'sith': 'c', 'sithe': 'c', 'seeing': 'c', 'seing': 'c', 'seyng': 'c', 'forasmuch': 'c',
    'inasmuch': 'c', 'whereas': 'c',
    'how': 'o', 'hou': 'o', 'lest': 'l', 'till': 'k', 'until': 'k', 'vntill': 'k', 'vntil': 'k', 'while': 'k',
    'whiles': 'k', 'therefore': 'g', 'therfore': 'g', 'wherefore': 'g', 'whether': 'v', 'whethir': 'v',
    'forsothe': 'm', 'forsooth': 'm', 'sotheli': 'm', 'sothely': 'm',
    # weak
    'as': 'a', 'so': 'z', 'now': 'n', 'then': 'e', 'even': 'j', 'only': 'p',
    # German (Zunz)
    'denn': 'f', 'weil': 'b', 'dass': 't', 'daß': 't', 'wenn': 'w', 'wann': 'w', 'als': 'w', 'ob': 'v',
    'aber': 'u', 'sondern': 'q', 'ja': 'y', 'fürwahr': 'r', 'wahrlich': 'r', 'gewiß': 's', 'gewiss': 's',
    'doch': 'd', 'obgleich': 'h', 'obschon': 'h', 'obwohl': 'h', 'wiewohl': 'h', 'da': 'c', 'indem': 'c',
    'außer': 'x', 'nur': 'p', 'nun': 'n', 'dann': 'e', 'wie': 'o', 'damit': 'l', 'bis': 'k',
    # French (Chouraqui)
    'car': 'f', 'parce': 'b', 'que': 't', 'qu': 't', 'quand': 'w', 'lorsque': 'w', 'si': 'i', 'mais': 'u',
    'oui': 'y', 'certes': 'r', 'puisque': 'c', 'quel': 'o', 'quelle': 'o', 'comme': 'a', 'voici': 'n',
}
LEX = {k: v for k, v in LEX.items() if v}
# Spellings that mean different words in different translations. Coverdale (1535) never writes
# "yea": it spells it "yee" ("Yee, hath God sayde"), and writes the pronoun "ye".
LEX_BY = {'cov': {'yee': 'y'}}
# Two-word renderings, scored at the second word: "in dede", "in deede" = indeed.
AFTER_IN = {'dede': 'd', 'deede': 'd'}
WEAK = set('azjnep')
NEAR, NEAR_WEAK, WEAK_PENALTY = 0.25, 0.1, 0.08

CODES = {
    'f': 'for', 'b': 'because', 't': 'that', 'w': 'when', 'i': 'if', 'u': 'but', 's': 'surely',
    'r': 'truly / verily', 'd': 'indeed', 'h': 'though', 'y': 'yea / yes', 'x': 'except / unless',
    'q': 'rather', 'c': 'since / seeing', 'o': 'how', 'l': 'lest', 'k': 'until / while', 'g': 'therefore',
    'v': 'whether', 'm': 'forsooth', 'a': 'as', 'z': 'so', 'n': 'now', 'e': 'then', 'j': 'even',
    'p': 'only', '-': '(no word)',
}

TOKEN_RE = re.compile(r"[^\w’']+|[’']", re.UNICODE)


def tokens(text: str):
    return [t for t in TOKEN_RE.split((text or '').lower()) if t]


def code_at(toks, i, lex):
    t = toks[i]
    code = lex.get(t)
    if not code and i and toks[i - 1] == 'in':
        code = AFTER_IN.get(t)
    return code


def pick(text: str, pos: float, key: str = '') -> str:
    toks = tokens(text)
    n = len(toks)
    if not n:
        return '?'
    lex = {**LEX, **LEX_BY.get(key, {})}
    best, best_score = '-', 9.0
    for i, t in enumerate(toks):
        code = code_at(toks, i, lex)
        if not code:
            continue
        d = abs((i + 0.5) / n - pos)
        weak = code in WEAK
        if d > (NEAR_WEAK if weak else NEAR):
            continue
        score = d + (WEAK_PENALTY if weak else 0)
        if score < best_score:
            best, best_score = code, score
    return best
