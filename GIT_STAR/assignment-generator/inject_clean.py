import re
import bs4

def main():
    # 1. Read standalone index.html body
    with open('index.html', 'r', encoding='utf-8') as f:
        soup_standalone = bs4.BeautifulSoup(f, 'lxml')

    body_content = soup_standalone.body.decode_contents()

    # Find where the actual content starts to avoid duplicate cover page
    start_idx = body_content.find('<h2 id="section-1')
    if start_idx != -1:
        content_to_inject = body_content[start_idx:]
    else:
        content_to_inject = body_content

    # Create the new doc-page element containing the new content
    new_doc_page = bs4.BeautifulSoup(f'<div class="doc-page content-page" style="height: auto; min-height: 297mm; padding: 20mm; overflow: visible;">{content_to_inject}</div>', 'html.parser')

    # 2. Read templates/index.html
    with open('templates/index.html', 'r', encoding='utf-8') as f:
        tpl = f.read()

    idx1 = tpl.find('const html = `')
    if idx1 == -1:
        print('const html not found')
        return

    # find the ending backtick of the const html string
    # We must be careful because there are other backticks. Let's find the first ``;`` after idx1
    idx2 = tpl.find('`;\n', idx1)
    if idx2 == -1:
        idx2 = tpl.find('`;', idx1)
    
    html_str = tpl[idx1+14:idx2]

    # 3. Parse the JS template string
    soup_tpl = bs4.BeautifulSoup(html_str, 'html.parser')
    
    # The parent container
    container = soup_tpl.find('div', id='doc-preview-inner')
    if not container:
        # Maybe it's not wrapped in a container in the JS string
        container = soup_tpl

    cover = soup_tpl.find('div', class_='cover-page')
    if cover:
        # Find all siblings and remove them
        sibs = cover.find_next_siblings()
        for sib in sibs:
            sib.extract()
        # Append the new content
        cover.insert_after(new_doc_page)
    else:
        print('Cover page not found in template!')
        return

    # 4. Generate the new JS template string
    new_html_str = str(soup_tpl)

    # 5. Replace in the original template file
    new_tpl = tpl[:idx1+14] + new_html_str + tpl[idx2:]

    with open('templates/index.html', 'w', encoding='utf-8') as f:
        f.write(new_tpl)
    print('Successfully injected new content into templates/index.html')

if __name__ == '__main__':
    main()
