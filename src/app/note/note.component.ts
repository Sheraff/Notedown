import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import * as Parser from './parser/Parser.js';

@Component({
  selector: 'nd-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class NoteComponent implements OnInit {

  source: string = `Pre text just for ease.

*emphasis*
_emphasis_
\`inline code\`
**strong**
***strong emphasis***
::highlight::
~~strikethrough~~
--strikethrough--
__underline__
___underline emphasis___

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
  editor: HTMLElement
  comparator: HTMLElement

  constructor() { }

  ngOnInit() {
    this.comparator = document.getElementById('comparator')
    this.comparator.innerHTML = this.source
    this.editor = document.getElementById('editor')
    this.editor.innerHTML = this.parseSrc(this.source)
    // this.setCaret(this.editor, this.editor.textContent.length)
  }

  editing(event: any) {
    const caretPosition = this.getCaret(this.editor)
    this.editor.innerHTML = this.parseSrc(this.editor.textContent)
    this.setCaret(this.editor, caretPosition)
  }

  getCaret(el: HTMLElement) {

    const range = window.getSelection().getRangeAt(0)

    let position:number = range.startOffset
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false)
    while(walker.nextNode()){
      if (walker.currentNode === range.startContainer)
        break
      position += walker.currentNode.length
    }

    //DEBUG
    if(walker.currentNode !== range.startContainer && !walker.nextNode())
      console.error("never reached range.startContainer node")

    return position

  }

  setCaret(el: HTMLElement, position: number) {

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false)
    while(walker.nextNode()){
      if(walker.currentNode.length >= position)
        break
      position -= walker.currentNode.length
    }

     //DEBUG
    if(position < 0)
      console.error("position was greater than the sum of all text nodes' lengths")

    const selection = window.getSelection()
    const range = document.createRange()
    range.setStart(walker.currentNode, position)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)

  }

  parseSrc(source: string) {
    return Parser.parseMdString(source)
  }



}
