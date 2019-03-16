import * as Parser from './Parser.js';

/*
 * 
 * Improvements:
 * - add laziness
 * - add setext headings
 * 
 */



source = `
Pre text just for ease.

*coucou*     emphasis
_coucou_     emphasis
\`coucou\`   inline code
**coucou**   strong
***coucou*** strong emphasis
::coucou::   highlight
~~coucou~~   strikethrough
--coucou--   strikethrough
__coucou__   underline
___coucou___ underline emphasis
#coucou      main level hashtag
#coucou/hey  subcategory hashtag
![foo](train.jpg "title")   image (<img src="train.jpg" alt="foo" title="title" />)
![foo][bar]                 image w/ link reference to ref "bar", and alt attribute "foo"
[link](/url "title")
[link]()
[link](/url "title")
[link](/url 'title')
[link](/url (title))
[bar]        uses link reference to ref "bar"
[foo][bar]   uses link reference to ref "bar" and display "foo"

# coucou     heading level h1
## coucou    heading level h2
> coucou     quote block
- coucou     bullet list item
  - hello      list item #2
- bonjour    list item #3
* coucou     bullet list item
+ coucou     bullet list item
1. coucou    numbered list item
7) coucou    numbered list item

[coucou]: /url "link reference"

- [ ] coucou task list item
- [x] coucou checked task list item
- [✓] coucou checked task list item


- simple list
- more of same list
- last item

thematic breaks
---
___
***

\`\`\` javascript     fenced code block
let x = 0
\`\`\`

> \`\`\` javascript
> blockquoted codefence
> \`\`\`

| coucou | bonjour |
| ------:| :---:   | --
|    hey | salut   |

| coucou |
|    hey |

> I am quoting something:
> something new
> > something old
> > something still old
> something new again

> I jumped a line and I'm ending my quote

\`\`\` java #coucou
bite
\`\`\`

`


// Using strategy defined by [commonmark standards](https://spec.commonmark.org/0.28/#appendix-a-parsing-strategy)









// const line = 'a line of ***_emphasis_ text* ::yo lala~~ with:: strong** inlines'
// const parsedLine = Parser.parseInline(line)
// console.log(parsedLine)



let {document, linkrefs} = Parser.parseBlocks(source)
const output = display(document, linkrefs)
console.log(output)


// const util = require('util')
// console.log(util.inspect(document, false, null, true /* enable colors */))


/*


	end of file settings displayed as json 
	(with I/O toggles in the space left by indentation?) 
	(w/ select input when choosing from list of strings?)
	``` settings
		{
			"font": "monospace",
			"theme": "book"
		}
	```

*/
