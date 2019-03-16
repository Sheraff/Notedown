import MdNode from './MdNode'
import {blocks as BLOCKS} from './Blocks'

export function parseBlocks (source) {
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

				const res = BLOCKS[walkNode.type].continue(line, walkNode)
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

			const blockKeys = Object.keys(BLOCKS)
			for (const key of blockKeys) {
				const block = BLOCKS[key]
				const res = block.open(line, currentNode)
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

export function parseInline (line) {

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
				output += line.substring(lastIndex, match.index) + '<span mark="' + match.mark + '">'
				lastIndex = match.index
			} else {
				output += line.substring(lastIndex, match.index + match.mark.length) + '</span>'
				lastIndex = match.index + match.mark.length
			}
		})
		output += line.substring(lastIndex)
	} else
		output = line

	return output
}