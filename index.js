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
//console.log(elements.length + ' elements')
//console.log(svgData.elements[1][0])
console.log(svgData.elements[1][3].elements)
console.log('svgData')
//console.log(wrapSVG(elements))

//console.log('groups output')
//console.log(groups)
process.exit()


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
			let outputStr = '<' + element.name + '>'
			if(element.hasOwnProperty('children')) outputStr +=  ' children: ' + element.children.length
			console.log(outputStr)

			if(element.type === 'text' && element.data.indexOf('\n') != -1){
				console.log('Weird empty ext string thing')

			} else {

				let elemChildren = parseParentElements(element)

				//console.log(elemChildren)
				//process.exit()


				items.push(elemChildren)
				return items

			}
		} else {
			return items			
		}



	},[])
	
	return outputDocument
	//return groups
}



function parseParentElements(parent){

		let allowedTags = ['g','clippath','path']

		return _.reduce(parent.children,(items,element) => {

			//Omit empty items
			if(element.data && element.data.indexOf('\n') != -1){ 
				return items 
			} else {

				if(_.indexOf(allowedTags,element.name) != -1){
					items.push(parseElement(element))
				} else {

					console.log('not parsing <' + element.name + '>')
					//console.log('IMPOSSABRU')
					//process.exit()

				}
				return items
			}

		},[])
	
}

function parseElement(element){

	//console.log('parsing <' + element.name + '>')

	let parsedElement = {
		'type': element.type,
		'name': element.name,
		'attrs': element.attribs,
		//'data': element.data,
		//'children': element.children
	}	

	if(element.name === 'path'){
		//Exclude white text elements
		//Exclude orange grid
		//Exclude pink text
		let excludedColors = ['#FFB800','#FFFFFF','#F0D1D0','#DADADA']
		if(_.indexOf(excludedColors,element.attribs.stroke) === -1 && _.indexOf(excludedColors,element.attribs.fill) === -1){

			parsedElement.path = element.attribs.d
			parsedElement.fill = element.attribs.fill
			parsedElement.stroke = element.attribs.stroke

			//return parsedElement
		}
	}

	if(element.hasOwnProperty('children')){
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
