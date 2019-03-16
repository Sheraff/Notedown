import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'nd-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.less']
})
export class NoteComponent implements OnInit {

  source: string = 'Hello _yolo_ **coucou** merci'
  editor: HTMLElement

  constructor() { }

  ngOnInit() {

    this.editor = document.getElementById('editor')
    this.editor.innerHTML = this.parseSrc(this.source)
    this.setCaret(this.editor, this.editor.textContent.length)
  }

  editing(event: any) {
    const caretPosition = this.getCaret(this.editor)
    this.editor.innerHTML = this.parseSrc(event.target.textContent)
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
    const lines: string[] = source.split(/[\n\r]+/)
  }



}
