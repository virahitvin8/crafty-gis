import bs4

def main():
    with open('templates/index.html', 'r', encoding='utf-8') as f:
        tpl = f.read()

    idx1 = tpl.find('const html = `')
    if idx1 == -1:
        print('const html not found')
        return

    idx2 = tpl.find('`;', idx1)
    if idx2 == -1:
        idx2 = tpl.find('`', idx1 + 15)

    html_str = tpl[idx1+14:idx2]
    print('HTML JS Template Length:', len(html_str))

    # parse the html string
    soup = bs4.BeautifulSoup(html_str, 'html.parser')
    cover = soup.find('div', class_='cover-page')
    if cover:
        print('Cover page found')
        # What comes after the cover page?
        sibs = cover.find_next_siblings()
        print('Siblings after cover page:', len(sibs))
        for s in sibs[:3]:
            print(str(s)[:200])
    else:
        print('Cover page NOT found in the js template string')

if __name__ == '__main__':
    main()
