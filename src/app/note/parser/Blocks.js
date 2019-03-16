import MdNode from './MdNode'
import Block from './Block'

export const blocks = {}



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
		node.type = 'h' + node.info.level
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



blocks.hashtag = new Block('hashtag')
blocks.hashtag.open = function(string, node) {
	const match = /#([A-z][^\s#]+)/.exec(string)
	if (match) {
		const newNode = new MdNode(this.type)
		newNode.info.tags = match[1].split('/')
		newNode.open = false
		newNode.marks.push('#')
		newNode.textContent = match[1]
		node.addChild(newNode)

		string = string.substring(match[0].length)
	}
	return {node, match: !!match, string}
}