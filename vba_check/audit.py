#!/usr/bin/env python3
"""Audit VBA block-structure balance, handling inline If...Then statements.

Rules (VBA):
- A block `If <cond> Then` that is NOT followed by code on the same line
  must be closed with `End If`. A single-line `If ... Then <code>` needs no
  `End If`.
- `For`/`For Each` close with `Next` (possibly `Next x`).
- `With` closes with `End With`.
- `Select Case` closes with `End Select`.
- `Do While`/`Do` closes with `Loop`.
- `While`/`Wend` also possible (not used here).
"""
import re
import sys


def strip_comments_and_strings(code: str) -> str:
    out = []
    i, n = 0, len(code)
    in_str = False
    while i < n:
        ch = code[i]
        if ch == '"':
            # doubled quote inside a string is an escaped quote
            if in_str and i + 1 < n and code[i + 1] == '"':
                out.append('""')
                i += 2
                continue
            in_str = not in_str
            out.append(' ')
            i += 1
        elif ch == "'" and not in_str:
            while i < n and code[i] != '\n':
                i += 1
        else:
            out.append(ch)
            i += 1
    return ''.join(out)


def main() -> int:
    with open('vba/crafty_gis_report.bas', encoding='utf-8') as fh:
        src = fh.read()
    clean = strip_comments_and_strings(src)
    lines = clean.split('\n')

    # Tokenize each line: find keywords, tracking whether they're statements.
    # Split a line on ':' separators only when outside strings (already stripped
    # to single spaces so quotes are gone).
    line_tokens = []
    for ln in lines:
        # Remove leading whitespace; find keywords with word boundaries
        kw = re.findall(r'\b(If|Then|ElseIf|Else|End If|End With|End Select|For|Next|With|Select Case|End Sub|End Function|Sub|Function|Do While|Loop|While|Wend)\b', ln)
        # Only keep the keywords but we need ordering & 'Then at EOL' info
        # Store raw line too.
        line_tokens.append((ln, kw))

    block_stack = []  # stack of ('IF'|'FOR'|'WITH'|'SELECT'|'DO'|'SUB', line_no)
    errors = []

    for idx, (ln, kws) in enumerate(line_tokens, start=1):
        stripped = ln.strip()
        if not stripped:
            continue

        # Sub/Function opener
        m = re.match(r'(Public|Private)?\s*(Sub|Function)\s+(\w+)', stripped)
        if m:
            block_stack.append(('SUB', idx, m.group(3)))
            continue

        if re.match(r'End\s+(Sub|Function)', stripped):
            if not block_stack or block_stack[-1][0] != 'SUB':
                errors.append(f'Line {idx}: End Sub/Function without matching opener')
            else:
                block_stack.pop()
            continue

        if re.match(r'End If\b', stripped):
            if not block_stack or block_stack[-1][0] != 'IF':
                errors.append(f'Line {idx}: End If without matching If')
            else:
                block_stack.pop()
            continue

        if re.match(r'End With\b', stripped):
            if not block_stack or block_stack[-1][0] != 'WITH':
                errors.append(f'Line {idx}: End With without matching With')
            else:
                block_stack.pop()
            continue

        if re.match(r'End Select\b', stripped):
            if not block_stack or block_stack[-1][0] != 'SELECT':
                errors.append(f'Line {idx}: End Select without matching Select Case')
            else:
                block_stack.pop()
            continue

        if re.match(r'Select Case\b', stripped):
            block_stack.append(('SELECT', idx, 'Select Case'))
            continue

        if re.match(r'With\s', stripped):
            block_stack.append(('WITH', idx, 'With'))
            continue

        if re.match(r'Do\s+While\b|^Do\s*$', stripped):
            block_stack.append(('DO', idx, 'Do'))
            continue

        if re.match(r'Loop\b', stripped):
            if not block_stack or block_stack[-1][0] != 'DO':
                errors.append(f'Line {idx}: Loop without Do')
            else:
                block_stack.pop()
            continue

        if re.match(r'While\b', stripped):
            block_stack.append(('WHILE', idx, 'While'))
            continue

        if re.match(r'Wend\b', stripped):
            if not block_stack or block_stack[-1][0] != 'WHILE':
                errors.append(f'Line {idx}: Wend without While')
            else:
                block_stack.pop()
            continue

        # For / Next (For may appear as 'For r = ...' or 'For Each x In ...')
        if re.match(r'For\s', stripped):
            block_stack.append(('FOR', idx, stripped[:30]))
            continue

        if re.match(r'Next\b', stripped):
            if not block_stack or block_stack[-1][0] != 'FOR':
                errors.append(f'Line {idx}: Next without For')
            else:
                block_stack.pop()
            continue

        # If statement: classify block vs inline.
        if re.match(r'If\b', stripped):
            # find 'Then' on the same line
            then_m = re.search(r'\bThen\b', stripped)
            if then_m:
                after = stripped[then_m.end():].strip()
                # If there's code after Then on the same line -> inline (no End If)
                if after:
                    continue  # inline If...Then
                else:
                    block_stack.append(('IF', idx, stripped[:30]))
            else:
                errors.append(f'Line {idx}: If without Then')
            continue

        if re.match(r'ElseIf\b', stripped):
            # Part of an existing If block; does not open a new one.
            continue

        if re.match(r'Else\b', stripped):
            # Part of an existing If block.
            continue

    # End of file: any unclosed blocks?
    if block_stack:
        for blk in block_stack:
            errors.append(f'Unclosed block at line {blk[1]}: {blk[2]}')

    if errors:
        print('STRUCTURAL ERRORS:')
        for e in errors:
            print('  ' + e)
        return 1
    print('OK — all VBA blocks balanced (Sub/Function, If/End If, For/Next, With/End With, Select Case, Do/Loop).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
