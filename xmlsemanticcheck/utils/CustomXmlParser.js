/*global define*/
define(["./SAX"], function(saxParser) {
    "use strict";
    /**
     *
     *
     * Modify SAX.js to get startTagLine:
     * add 'parser.startTagLine = parser.line' & 'parser.startTagColumn = parser.column' to line 963 & 990
     */

    function handleOpen(nodes, xml){
        return function(n){
            //console.log("open tag: " + n.name);
            var node = xml.createElementNS(n.ns[n.prefix] || "", n.name);
            for(var property in n.attributes){
                if(n.attributes.hasOwnProperty(property)){
                    var attribute = n.attributes[property];
                    node.setAttribute(attribute.name, attribute.value);
                }
            }
            node.position = {
                line: {
                    start: this.startTagLine + 1,    // SAX.js starts at line 0
                    end: this.line + 1               // SAX.js starts at line 0
                },
                column: {
                    start: this.startTagColumn - 1, // get pos before tag begin
                    end: this.column + 1            // get pos after tag end
                }
            };
            nodes.push(node);
        };
    }

    function handleClose(nodes, xml){
        return function(){//tagName){
            //console.log("close tag: " + tagName);
            var node = nodes.pop();
            if(node){
                if(nodes.length === 0){
                    xml.appendChild(node);
                }else{
                    nodes[nodes.length - 1].appendChild(node);
                }
            }
        };
    }

    function handleComment(nodes, xml){
        return function(comment){
            //console.log("comment tag: " + comment);
            var node = xml.createComment(comment);
            if(nodes.length === 0){
                xml.appendChild(node);
            }else{
                nodes[nodes.length - 1].appendChild(node);
            }
        };
    }

    var xmlString ; //used to hold the xmlString
    var xmlLineArray = [];  //used to hold the split lines for performance

    return {
        parseXML: function (source){
            xmlString  = source;
            xmlLineArray = [];
            var strict = true,
                nodes = [],
                /* eslint-disable no-undef*/
                xml = document.implementation.createDocument("", "", null),
                /* eslint-enable no-undef*/
                parser = saxParser.parser(strict, {xmlns: true, position: true});

            parser.oncomment = handleComment(nodes, xml);
            parser.onopentag = handleOpen(nodes, xml);
            parser.onclosetag = handleClose(nodes, xml);
            parser.write(source);
            return xml;
        },

        /**
         * Get the position of the attribute or event 
         * @param  {[type]} nodePostion : the position of the node
         * @param  {[type]} name        : attr or event name
         * @param  {[type]} value       : attr or event value
         * @return {[type]}             : position, like: { line: {start, end}, column:{start,end} } 
         */
        getPosition: function(nodePos, nodeName, name, value) {
            if ( !xmlLineArray.length) {
                //only first time will split it by \n
                xmlLineArray = xmlString.split('\n');
                xmlLineArray.unshift("");  //as the line number start from 1, so add a empty entry for simple
            }

            var checkLine = 0; 
            var totalLine = nodePos.line.end - nodePos.line.start + 1;
            var ret = {
                line: {},
                column: {}
            };

            while (checkLine < totalLine) {
                var curLineStr = xmlLineArray[ nodePos.line.start + checkLine]; 
                var checkStartPos = 0;  //from which column begin to search
                
                if (checkLine === 0) {
                    //??for first line, need check after the node name
                    //it line <Page  or <m:Button,  so can use < or : to get the position, now just for simple use the nodeName to check
                    var pos = curLineStr.indexOf(nodeName,  nodePos.column.start);
                    if (pos != -1) {
                        checkStartPos = pos +  nodeName.length;
                    }
                }

                if (checkLine === (totalLine-1)) {
                    //for the last line, just limit the end position, 
                    curLineStr = curLineStr.substring(0, nodePos.column.end);
                }

                //??for simple, just use the attr/event name to check, later can use regexp to check 
                var namePos = curLineStr.indexOf(name, checkStartPos);
                if (namePos != -1) {
                    ret.line.start = checkLine + nodePos.line.start;
                    ret.line.end = ret.line.start;
                    ret.column.start = namePos +1;  //start from 1
                    ret.column.end = namePos + name.length;
                    break;
                }

                //check next line 
                checkLine ++;
            }

            return ret;

        }
    };
});
