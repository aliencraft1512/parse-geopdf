'use strict'

var fs = require('fs')
var minimist = require('minimist')
var _ = require('lodash')
var cheerio = require('cheerio')
var parse = require('parse-svg-path')


//Getting the filename arg
var argv = minimist(process.argv.slice(2))
var args = argv._
var opts = _.omit(argv, '_')

var fileName = args[0];

if(fileName == '' || fileName == undefined) thr('Enter a relative file path')

//File expects svg to be processes
var path = __dirname + '/' + fileName
let svgData = parseSVG(path)


let cleanedMapData = cleanMapData(svgData)

process.exit()


function cleanMapData(svgData){

	let outputDocument = svgData

	//Remove clippaths, they don't seem to matter for this use case
	delete svgData.elements[0]

	let payloadData = svgData.elements[1]

	_.each(payloadData,(item, index) => {
		console.log(index + ' ' + item.name + ' children: ' + item.children)
	})

}

function parseSVG(filepath){

	let $ = cheerio.load(fs.readFileSync(path))

	let root = $(':root')

	let outputDocument = {
		width: root[0].attribs.width,
		height: root[0].attribs.height,
		viewbox: root[0].attribs.viewbox,
		elements: []
	}

	let documentElements = root[0].children

	outputDocument.elements = _.reduce(documentElements,(items,element) =>{

		if(element.hasOwnProperty('children')){ 

			if(element.type === 'text' && element.data.indexOf('\n') != -1){
				console.log('Weird empty ext string thing')
			} else {

				let elemChildren = parseParentElements(element)
				items.push(elemChildren)
				return items

			}
		} else {
			return items			
		}



	},[])
	
	return outputDocument
}

//Return an XML 'attribute="value"' string per element attribute excluding children, name, type
function elementAttributeString(element){



}

function markupElements(payload){

	return _.reduce(payload,(items,element) => {

		let element = '<' + element.name + ' '  + elementAttributeString(element) + '>'
		if(element.elements) element += markupElements(element.elements)
		element += '</' + element.name + '>'

	}[])
}

function parseParentElements(parent){

		let allowedTags = ['g','clippath','path']

		return _.reduce(parent.children,(items,element) => {

			if(_.indexOf(allowedTags,element.name) != -1){
				items.push(parseElement(element))
			} 
			return items			

		},[])
	
}

function parseElement(element){

	//console.log('parsing <' + element.name + '>')

	let parsedElement = {
		'type': element.type,
		'name': element.name,
		//'attrs': element.attribs,
		//'data': element.data,
		//'children': element.children
	}

	if(element.attribs.id) parsedElement.id = element.attribs.id
	if(element.attribs.opacity) parsedElement.opacity = element.attribs.opacity

	if(element.name === 'path'){
		//Exclude white text elements
		//Exclude orange grid
		//Exclude pink text
		let excludedColors = ['#FFB800','#FFFFFF','#F0D1D0','#DADADA']
		if(_.indexOf(excludedColors,element.attribs.stroke) === -1 && _.indexOf(excludedColors,element.attribs.fill) === -1){

			parsedElement.d = element.attribs.d
			if(element.attribs.fill) parsedElement.fill = element['fill']
			if(element.attribs.stroke) parsedElement.stroke = element['stroke']
			if(element.attribs.['fill-opacity']) parsedElement.['fill-opacity'] = element['fill-opacity']
			if(element.attribs.['stroke-width']) parsedElement.['stroke-width'] = element['stroke-width']
			if(element.attribs.['stroke-linecap']) parsedElement.['stroke-linecap'] = element['stroke-linecap']

			console.log(element)
			process.exit()

		}
	}

	if(element.hasOwnProperty('children') && !_.isEmpty(element.children)){
		parsedElement.elements = parseParentElements(element)
		parsedElement.children = parsedElement.elements.length
	}

	return parsedElement

}

// Format the path array that parse() returns for use with clipper-js
function formatPathArr(array){

	let pathArr = []

	_.each(array,(item) => {

		if(item[0] == 'M' || item[0] == 'L'){
			pathArr.push({X: item[1], Y: item[2]})
		} else {
			console.log('unparseable')
			console.log(item)
		}
	})

	return pathArr
}


//Composes an SVG path from coordinates
function pointPath(pathPointsArr){

	var pathDataString = 'M' + pathPointsArr[0].X + ',' + pathPointsArr[0].Y //+ ' '
	_(pathPointsArr.slice(1)).forEach(function(element){
		
		pathDataString += ' L' + element.X + ',' + element.Y //+ ' '
	
	})

	pathDataString +='Z'

	return pathDataString
}

function wrapSVG(groups){

	var strOutput = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'
	strOutput += '<svg id="workspace" xmlns="http://www.w3.org/2000/svg" version="1.1">'

		_(groups).forEach(function(group){

			_(group).forEach(function(element){

				//console.log(element)
				//process.exit()

				//strOutput += simpleWrapPath(pointPath(element))	
				strOutput += simpleWrapPath(element)
			})

			
		})

	strOutput += '</svg>'

	return strOutput

}

function simpleWrapPath(path){

	let strokeVal = path.stroke || ''
	let fillVal = path.fill || ''

	return '<path d="' + path.path + '" stroke="#' + strokeVal + '" fill="' + fillVal + '"/>'

}
