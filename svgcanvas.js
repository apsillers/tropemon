class SVGCanvas {
	constructor(width, height, defaultFill, defaultStroke) {
		this.width = width;
		this.height = height;
		this.context = new SVGContext(height, width, defaultFill, defaultStroke)
	}
	
	getContext() {
		return this.context;
	}
	
	toBuffer() {
		return this.context.outStr + "</svg>";
	}
}

class SVGContext {
	constructor(height, width, defaultFill, defaultStroke) {
		this.outStr = `<svg version="1.1" font-size="11.5" stroke="${defaultStroke}" font-family="courier" fill="${defaultFill}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><style>*{white-space:pre}</style>`;
		this.defaultStroke = defaultStroke;
		this.defaultFill = defaultFill;
	}
	
	rect(x,y,width,height,fill,stroke,strokeWidth) {
		this.outStr += `<rect x="${x}" y="${y}" width="${width}" height="${height}"`
		if(fill && fill != this.defaultFill) { this.outStr += ` fill="${fill}"`; }
		if(stroke && stroke != this.defaultStroke) { this.outStr += ` stroke="${stroke}"`; }
		if(strokeWidth) { this.outStr += ` stroke-width="${strokeWidth}"` }
		this.outStr += `/>`;
	}
	
	fillText(text, x, y, size, fill, stroke) {
		text = text.replace(">", "&gt;");
		
		this.outStr += `<text x="${x}" y="${y}"`
		if(size && size!=11.5) { this.outStr += ` font-size="${size}"`; }
		if(fill && fill != this.defaultFill) { this.outStr += ` fill="${fill}"`; }
		if(stroke && stroke != this.defaultStroke) { this.outStr += ` stroke="${stroke}"`; }
		this.outStr += `>${text}</text>`;
	}
}

exports.SVGCanvas = SVGCanvas;
