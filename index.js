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
let elements = parseSVG(path)

//console.log(elements.length + ' elements')

console.log(wrapSVG(elements))

//console.log('groups output')
//console.log(groups)
process.exit()

//Takes in an SVG file, returns an array of paths elements
function parseSVGPaths(filepath){

	$ = cheerio.load(fs.readFileSync(path))
	var paths = _.reduce($('path'), function (items, path) {
		items.push($(path).attr('d'))
		return items
	}, [])

	return paths
}

function parseSVG(filepath){

	let $ = cheerio.load(fs.readFileSync(path))
	var groups = _.reduce($('g'), function (items, group) {

		//let groupId = $(group).attr('id')
		//items[groupId] = parseGroupElements(group)
		let groupElements = parseGroupElements(group)
		if(!_.isEmpty(groupElements)) items.push(groupElements)
		return items
		
	}, [])	

	return groups
}

//Takes in a group, returns an array of paths
function parseGroupElements(group){

	let $ = cheerio.load(group)

	var elements = _.reduce($('*'), function (items, element) {
		
		//let elemMessage = element.name + ' - children: ' + element.children.length
		//console.log(elemMessage)
		//Ignore text layers

		if(element.name === 'g') return parseGroupElements(element.children)

		let parsedElement = {
			'type' : element.name
		}

		if(element.name === 'path'){

			//Exclude white text elements
			//Exclude orange grid
			//Exclude pink text
			let excludedColors = ['#FFB800','#FFFFFF','#F0D1D0','#DADADA']
			if(_.indexOf(excludedColors,element.attribs.stroke) === -1 && _.indexOf(excludedColors,element.attribs.fill) === -1){

				//console.log(element)
				//process.exit()
				parsedElement.path = element.attribs.d
				parsedElement.fill = element.attribs.fill
				parsedElement.stroke = element.attribs.stroke
				items.push(parsedElement)
			} 

		} else {

				// console.log('excluded element')
				// console.log(element.attribs.stroke)
				// console.log(element.attribs.fill)
				// console.log('--------')			

			//console.log('not parsing ' + element.name)
		}

		return items

		//return (element.name + ' - children: ' + element.children.length)
	}, [])	

	return elements
		
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
