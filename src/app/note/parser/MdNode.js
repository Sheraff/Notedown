export default class MdNode {
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