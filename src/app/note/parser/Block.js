import MdNode from './MdNode'

export default class Block {
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
				const res = this.functions.post_open(node, match, string)
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
				const res = this.functions.post_continue(node, match, string)
				node = res.node
				match = res.match
				string = res.string
			}
		}
		return { node, match: !!match, string } 
	}

}