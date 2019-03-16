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

class MdNode {
	constructor(type = 'root') {
		this._setType(type)
		this.position = 0
		this._children = []
		this._parent = undefined
		this._childCount = 0
		this.textContent = ''
		this.open = !['text', 'mark'].includes(type)
		this.info = {}
		this.marks = []
		this.depth = 0
	}

	set parent(parent) { this._parent = parent }
	set type(type) { this._setType(type) }

	get type() { return this._type }
	get container() { return this._container }
	get parent() { return this._parent }
	get firstChild() { return this._children[0] }
	get lastChild() { return this._children[this._childCount - 1] }
	nthChild(n) { return this._children[n] }
	get nextSibling() { return this._parent.nthChild(this.position + 1) }
	get previousSiblilng() { return this._parent.nthChild(this.position - 1) }
	
	next(walkBack) { 
		if(!walkBack && this.firstChild)
			return {nextNode: this.firstChild, parent: this}
		if(this.type==='root')
			return {nextNode: false}
		if(this.nextSibling)
			return {nextNode: this.nextSibling, parent: this._parent}

		return this._parent.next(true)
	}

	_setType(type) {
		this._type = type
		this._container = ['root', 'blockquote', 'tasklist', 'ul', 'ol'].includes(type)
	}
	addChild(node) {
		this._children.push(node)
		node.parent = this
		node.position = this._childCount
		node.depth = this.depth + 1
		this._childCount++
		return this
	}
	removeChild(node) {
		this._children = this._children.filter(child => child!==node)
		for (let x = node.position; x++; x<this._childCount)
			this._children[x].position--
		this._childCount--
		return this
	}
}


class Block {
	constructor(type = 'root', functions) {
		this.type = type
		this.functions = functions
	}

	open(string, node) { 
		let match = this.functions.open(string, node)
		if (match) {
			// open new block
			const newNode = new MdNode(this.type)
			node.addChild(newNode)
			node = newNode

			node.marks.push(match[0])

			string = string.substring(match[0].length)

			if (this.functions.post_open){
				res = this.functions.post_open(node, match, string)
				node = res.node
				match = res.match
				string = res.string
			}
		}
		return { node, match: !!match, string } 
	}
	continue(string, node) { 
		let match = this.functions.continue(string, node)
		if (match) {

			node.marks.push(match[0])

			string = string.substring(match[0].length)
			if (this.functions.post_continue) {
				res = this.functions.post_continue(node, match, string)
				node = res.node
				match = res.match
				string = res.string
			}
		}
		return { node, match: !!match, string } 
	}

}



const blocks = {}

blocks.blockquote = new Block('blockquote', {
	open: (string) => /^\s{0,3}>/.exec(string),
	continue: (string) => /^\s{0,3}>/.exec(string),
})

blocks.linkref = new Block('linkref', {
	open: (string) => /\[(.*?)\]:\s?([^'"\s]+)(\s('|")(.*)\4)?\s*$/.exec(string),
	post_open: (node, match, string) => {
		node.info.linkref = {
			name: match[1].toLowerCase(),
			url: match[2],
			title: match[5],
		}
		node.open = false
		return {node, match, string}
	}
})

blocks.codefence = new Block('codefence', {
	open: (string) => /^\s{0,3}(`|~)\1{2,}\s*([^\s\1]*)/.exec(string),
	post_open: (node, match, string) => {
		node.info.char = match[1]
		node.info.language = match[2]

		const textNode = new MdNode('text')
		textNode.textContent = string
		node.addChild(textNode)	

		return {node, match, string: ''}
	}
})
blocks.codefence.continue = function(string, node) {
	const match = new RegExp(`^(\\s{0,3}\`{3,})`).exec(string)
	if (match) {
		node.marks.push(match[0])
		string = string.substring(match[0].length)

		const textNode = new MdNode('text')
		textNode.textContent = ''
		node.addChild(textNode)	

		return {node: node.parent, match: false, string}
	}
	node.marks.push('')
	return {node, match: true, string}
}

blocks.list = new Block('list')
blocks.list.open = function(string, node) {
	const match = /^(\s*)((([0-9]+)([\.\)]))|([-\*\+]))\s*(\[(.)\])?\s+/.exec(string)
	if (match) {
		const list_info = {
			ordered: !!match[3],
			char: match[5] || match[6],
			checklist: !!match[7],
		}
		const item_info = {
			indent: match[1].length,
			numeral: match[4],
			checked: !match[8]===' ',
		}
		const newNode = new MdNode('list')
		node.addChild(newNode)
		newNode.info = list_info
		node = newNode

		node.marks.push(match[0])

		const itemNode = new MdNode('item')
		node.addChild(itemNode)
		itemNode.info = item_info
		itemNode.open = false
		node = itemNode

		string = string.substring(match[0].length)
	}
	return { node, match: !!match, string } 
}
blocks.list.continue = function(string, node) {
	const parent = node
	let match
	if(parent.type==='list'){
		match = /^(\s*)((([0-9]+)([\.\)]))|([-\*\+]))\s*(\[(.)\])?\s+/.exec(string)
		if (match) {
			const list_info = {
				ordered: !!match[3],
				char: match[5] || match[6],
				checklist: !!match[7],
			}
			const item_info = {
				indent: match[1].length,
				numeral: match[4],
				checked: !match[8]===' ',
			}

			if (parent.info.ordered === list_info.ordered &&
				parent.info.char === list_info.char &&
				parent.info.checklist === list_info.checklist) {
					
				node.marks.push(match[0])

				const itemNode = new MdNode('item')
				node.addChild(itemNode)
				itemNode.info = item_info
				itemNode.open = false
				node = itemNode

				string = string.substring(match[0].length)
			} else {
				match = false
			}
		}
	}

	return { node, match: !!match, string } 
}
blocks.table = new Block('table', {
	open:  (string) => /^(\|[^\|]*)+\|[^\|]*$/.exec(string),
	post_open: (node, match, string) => {
		const cells = match[0].split('|')
		cells.shift()
		node.info.th = cells
		node.info.th_only = true
		node.info.tr = []
		return {node, match, string}
	},
	continue: (string, node) => new RegExp(`^(\\|[^\\|]*){${node.info.th.length - 1}}\\|[^\\|]*$`).exec(string),
	post_continue: (node, match, string) => {
		console.log(match)
		let cells = match[0].split('|')
		let post = cells.pop()
		cells.shift()

		if (node.info.th_only) {
			node.info.th_only = false
			const alignCells = cells.map(cell => /^\s*(:?)-{3,}(:?)[\s\-:]*$/.exec(cell))
			if (!alignCells.some(cell => !cell)) {
				node.info.align = alignCells.map(cell => {
					const left = cell[1]!==''
					const right = cell[2]!==''
					return left && right ? 'center' : right ? 'right' : 'left'
				})
				cells = alignCells
				post = [post]
			}
		}

		cells.push(post)
		node.info.tr.push(cells)

		return {node, match, string}
	}
})

blocks.heading = new Block('heading', {
	open: (string) => /^\s{0,3}(#{1,6})\s+/.exec(string),
	post_open: (node, match, string) => {
		node.info.level = match[1].length
		node.open = false
		return {node, match, string}
	}
})

blocks.hr = new Block('hr', {
	open: (string) => /^\s{0,3}([_\-*])(\s*\1){2,}\s*$/.exec(string),
	post_open: (node, match, string) => {
		node.info.char = match[1]
		node.open = false
		return {node, match, string}
	}
})

blocks.link = new Block('link', {
	open: (string) => /(!?)\[(.*?)\]((\(([^\s]*)(\s(((["'])(.*?)\9)|(\((.*?)\))))?\))|(\[(.*?)\]))?/.exec(string),
	post_open: (node, match, string) => {
		node.info.isImg = match[1].length!==0
		if (!match[3]) { // [ref]
			node.info.ref = match[2].toLowerCase()
		} else if (match[13]) { // [text][ref]
			node.info.text = match[2]
			node.info.ref = match[14].toLowerCase()
		} else if (match[4]) { // [text]()
			node.info.text = match[2]
			node.info.url = match[5]
			node.info.title = match[10] | match[12]
		}

		node.open = false
		node.textContent = match[0]
		return {node, match, string}
	}
})

blocks.hashtag = new Block('hashtag', {
	open: (string) => /#([^\s#]+)/.exec(string),
	post_open: (node, match, string) => {
		node.info.tags = match[1].split('/')
		node.open = false
		return {node, match, string}
	}
})


// Using strategy defined by [commonmark standards](https://spec.commonmark.org/0.28/#appendix-a-parsing-strategy)

function parseBlocks (source) {
	const lines = source.split(/[\n\r]/)
	const linkrefs = {}
	const document = new MdNode()

	// Phase 1: block structure
	let currentNode = document
	lines.forEach( line => {

		// console.log(line)

		// First we iterate through the open blocks, starting with the root document, 
		// and descending through last children down to the last open block. 
		// Each block imposes a condition that the line must satisfy if the block is to remain open. 
		// For example, a block quote requires a > character. A paragraph requires a non-blank line. 
		// In this phase we may match all or just some of the open blocks. But we cannot close unmatched blocks yet, 
		// because we may have a lazy continuation line.

		let walkNode = document
		let lastMatched = document
		let shouldClose = true
		if(!/^\s*$/.test(line) || ['codefence'].includes(currentNode.type)){

			while (walkNode = walkNode.lastChild) {
				shouldClose = true

				if (!walkNode.open)
					break

				res = blocks[walkNode.type].continue(line, walkNode)
				if(res.match) {
					lastMatched = res.node
					shouldClose = false
				}
				line = res.string
			}
			// shouldClose = lastMatched !== walkNode
			currentNode = lastMatched
			

			// Next, after consuming the continuation markers for existing blocks, 
			// we look for new block starts (e.g. > for a block quote). 
			// If we encounter a new block start, 
			// we close any blocks unmatched in step 1 before creating the new block as a child of the last matched block.

			const blockKeys = Object.keys(blocks)
			for (const key of blockKeys) {
				const block = blocks[key]
				res = block.open(line, currentNode)
				if (shouldClose && res.match) {
					shouldClose = false
					let closeFromNode = lastMatched
					while (closeFromNode = closeFromNode.lastChild && closeFromNode !== currentNode) {
						closeFromNode.open = false
					}
				}
				currentNode = res.node
				line = res.string
				if(res.node.linkref)
					linkrefs[res.node.linkref.name] = res.node.linkref
			}

			// Finally, we look at the remainder of the line 
			// (after block markers like >, list markers, and indentation have been consumed). 
			// This is text that can be incorporated into the last open block 
			// (a paragraph, code block, heading, or raw HTML).

			if(line.length > 0) {
				const textNode = new MdNode('text')
				textNode.textContent = line
				currentNode.addChild(textNode)	
			}
		} else {
			// A line was skipped, we close all blocks

			let closeFromNode = document
			while (closeFromNode = closeFromNode.lastChild) {
				closeFromNode.open = false
			}
			currentNode = document

			const textNode = new MdNode('text')
			textNode.textContent = line
			currentNode.addChild(textNode)	
		}
	})

	return {document, linkrefs}
}

// function parseInlines (document, linkrefs) {
// 	let walkNode = document

// 	do {
// 		const {nextNode} = walkNode.next()
// 		if(nextNode)
// 			switch (nextNode.type) {
// 				case 'text':
// 					nextNode.textContent = parseInline(nextNode.textContent)
// 					break;
// 				case 'table':
// 					// iterate over th and tr[]
// 					break;
// 				case 'linkref':
// 					// .info.linkref.name & .info.linkref.title
// 					break;
// 				case 'link':
// 					// .info.name & .info.title
// 					break;
// 			}
// 		walkNode = nextNode
// 	} while (walkNode)

// 	return document
// }

function display (document) {
	
	let walkNode = document
	let output = ''

	do {

		// get next node, linear
		let {nextNode, parent} = walkNode.next()

		if(nextNode) {

			// if next node is child of a remote parent, close branches
			if(parent){
				let backWalkNode = walkNode
				while (backWalkNode!==parent) {
					if(backWalkNode.type!=='text')
						output += '\n' + '  '.repeat(backWalkNode.depth) + '</' + backWalkNode.type + '>'
					backWalkNode = backWalkNode.parent
				} 
			}

			walkNode = nextNode
			output += '\n' + '  '.repeat(walkNode.depth)
			if(walkNode.type === 'text') {
				let marks = ''
				let backWalkNode = walkNode
				// if it's a text node, go back up the tree and reassemble all marks
				for (let i = walkNode.depth; i > 1; i--) {
					if(backWalkNode.parent.type!=='item')
						marks = backWalkNode.parent.marks[backWalkNode.position] + marks
					backWalkNode = backWalkNode.parent
				}
				output += marks + parseInline(walkNode.textContent)
			} else {
				// if it's not a text node, open node
				output += '<' + walkNode.type + ' ' + JSON.stringify(walkNode.info) + '>'
				if(walkNode.textContent)
					output += '-----------------------------' + parseInline(walkNode.textContent)
			}

		} else 
			break
	} while (walkNode)

	return output
}


function parseInline (line) {

	const delimiters = []
	let cursor = 0
	let matched = true
	const chars = '(`|\\*{1,3}|_{1,3}|:{2}|~{2}|-{2})'
	const reopen = new RegExp(`(^|\\s)${chars}(?!\\s|$)`)
	const reclose = new RegExp(`(?!\\s)${chars}(?=${chars}*\\s|$)`)
	let lastOpener, lastCloser
	let noOpener, noCloser
	do {
		const tempLine = line.substring(cursor)
		const opener = lastOpener | noOpener ? false : reopen.exec(tempLine)
		const closer = lastCloser | noCloser ? false : reclose.exec(tempLine)

		if (closer && opener) {
			if(closer.index > opener.index) {
				process(opener, 'open')
				lastOpener = false
				lastCloser = closer
			} else {
				process(closer, 'close')
				lastOpener = opener
				lastCloser = false
			}
		} else if(opener) {
			process(opener, 'open')
			noCloser = true 
		} else if(closer) {
			process(closer, 'close')
			noOpener = true
		} else {
			matched = false
		}

		if(matched)	
			cursor = delimiters[delimiters.length-1].index + delimiters[delimiters.length-1].mark.length
	} while (matched)

	function process (match, type) {
		const mark = type==='open' ? match[2] : match[1]
		delimiters.push({
			mark,
			type,
			char: mark[0],
			index: cursor + match.index + (type==='open' ? match[1].length : 0)
		})
	}
	
	// console.log(delimiters)

	// start from end of delimiters going back
	// when encountering an opener, find matching closer going forward
	// a 1 * opener can match with a *** closer (and consume the first)
	// a *** opener can match with a * or a ** closer (and is consumed accordingly). In this case, keep searching until all is consumed.
	// go back to opener and look for the next opener going back

	

	let matches = []
	let l = delimiters.length
	for (let i = l - 1; i >= 0; i--) {
		const opener = delimiters[i]
		if (opener.type==='open') {
			for (let j = i + 1; j < l; j++) {
				const closer = delimiters[j]
				if (opener.char === closer.char) {
					if (opener.mark === closer.mark) {
						matches.push(opener, closer)
						delimiters.splice(i, j-i+1)
					} else {
						if (opener.mark.length > closer.mark.length) {
							const newOpener = {...opener}
							newOpener.mark = closer.mark
							newOpener.inner = true
							opener.mark = opener.mark.substring(closer.mark.length)
							newOpener.index += opener.mark.length
							matches.push(newOpener, closer)
							delimiters.splice(i+1, j-i)
							i++
						} else {
							const newCloser = {...closer}
							newCloser.mark = opener.mark
							newCloser.inner = true
							closer.mark = closer.mark.substring(opener.mark.length)
							closer.index += newCloser.mark.length
							matches.push(opener, newCloser)
							delimiters.splice(i, j-i)
						}
					}
					break
				}
			}
		}
		l = delimiters.length
	}
	
	let lastIndex = 0
	let output = ''
	if(matches) {
		matches.sort((a, b) => {
			if(a===b){
				if(a.type==='open' && a.inner || b.type==='close' && b.inner)
					return -1
				else
					return 1
			}
			return a.index - b.index
		}).forEach(match => {
			if(match.type==='open'){
				output += line.substring(lastIndex, match.index) + '<' + match.mark + '>'
				lastIndex = match.index
			} else {
				output += line.substring(lastIndex, match.index + match.mark.length) + '</' + match.mark + '>'
				lastIndex = match.index + match.mark.length
			}
		})
		output += line.substring(lastIndex)
	} else
		output = line

	return output
}

// const line = 'a line of ***_emphasis_ text* ::yo lala~~ with:: strong** inlines'
// const parsedLine = parseInline(line)
// console.log(parsedLine)



let {document, linkrefs} = parseBlocks(source)
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
