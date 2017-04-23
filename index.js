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

console.log(cleanedMapData)
process.exit()


function cleanMapData(svgData){

	let strOutput = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'
	strOutput += '<svg' + elementAttributeString(svgData) + ' xmlns="http://www.w3.org/2000/svg" version="1.1">'

	//Remove clippaths, they don't seem to matter for this use case
	delete svgData.elements[0]
	let payloadData = svgData.elements[1]
	let markupStrings = _.reduce(payloadData,(result, value, key)=>{
		
		//if(value.children > 0){
			let markedupElement = markupElement(value)
			result.push(markedupElement)		
		//} 
		
		return result

	},[])


	let excludedIndexes =[
		0, //US Topo Label on top fo map
		1, //Numbers for grid on outside edge of map
		2, //Edge grid ticks
		3, //Crosses in middle of map
		4, //White box
		5, //Highway circles

	]

	_.each(markupStrings,(elemString, index) => {

	// 	if(_.indexOf(excludedIndexes,index) === -1){
			strOutput += elemString
	// 	}

	})

	strOutput += '</svg>'

	return strOutput

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

				//console.log(elemChildren)

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
	
	let excludedAttributes = ['elements','type','children','name']

	return _.reduce(element,(attrString,attrVal,attrName) => {
		if(_.indexOf(excludedAttributes,attrName) === -1 && attrVal != undefined){
			return attrString += ' ' + attrName + '="' + attrVal + '"'
		} else {
			return attrString
		}
	},'')
}

function markupElement(payload){

	let tagName = payload.name
	let elementString = '<' + tagName + elementAttributeString(payload) + '>'
	if(payload.elements){

		let childElementsString = ''
		_.each(payload.elements,(childElement) => {
			childElementsString += markupElement(childElement)	
		})
		elementString += childElementsString
	}
	elementString += '</' + tagName + '>'
	return elementString
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
		//let excludedColors = ['#FFB800','#FFFFFF','#F0D1D0','#DADADA']
		let excludedColors = []
		if(_.indexOf(excludedColors,element.attribs.stroke) === -1 && _.indexOf(excludedColors,element.attribs.fill) === -1){

			parsedElement.d = element.attribs.d
			if(element.attribs.fill){ 
				parsedElement.fill = element['fill']
			} else {
				parsedElement.fill = 'none'
			}
			if(element.attribs.stroke) parsedElement.stroke = element['stroke']
			if(element.attribs['fill-opacity']) parsedElement['fill-opacity'] = element['fill-opacity']
			if(element.attribs['stroke-width']) parsedElement['stroke-width'] = element['stroke-width']
			if(element.attribs['stroke-linecap']) parsedElement['stroke-linecap'] = element['stroke-linecap']

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
			//console.log('unparseable')
			//console.log(item)
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
