define(["./CustomXmlParser", "./XmlCtrlNode", "./EnumValue" , "./Utils", "./Ui5MetadataMng"],
	function(CustomXmlParser, XmlCtrlNode, EnumValue, Utils, Ui5MetadataMng) {
		
return {
	/**
	 * Validate the XML semantic, return a promise, 
	 * @param  {[type]} xmlContent [description]
	 * @param  {[type]} metaData   [description]
	 * @param  {[type]} oConfig    [description]
	 * @return {[type]}            [description]
	 */
	validateXml: function(xmlContent, metaData, oConfig) {
		var content = CustomXmlParser.parseXML(xmlContent);
		if (content.documentElement == null) {
			//invalid xml 
			var error = {
				issues: [{
					message: "Invalid XML"
				}]
			};
			return Q(error);
		}
		var rootNode = this.parseXml(content.documentElement);

		var mGlobal = {
			aId : [],
    		issues: [],
    		metaData: metaData
    	};
		rootNode.checkSemantic(mGlobal);

		//as the aId only used for check the id duplication,so can delete here
		delete mGlobal.aId;
		delete mGlobal.metaData;

		return Q(mGlobal);
	},

	parseXml: function( xmlNode ) {
		var self = this;
		var tn = parseNode(undefined, xmlNode);
		//for normal case, it is an view or fragment, if not then it is an fragment,  so need create an top node for it
		if ( ! tn.isRootNode()) {
			var rootTn = new XmlCtrlNode({
					nodeType: EnumValue.NodeType.Root,
					nodeName: "",  
					isFragment: true
				});
			rootTn.addNode(tn);
			return rootTn;
		} else {
			return tn;	
		}
		

		function isFirstLetterUpperCase (str) {
			var c = str[0];
			return  c >="A"  && c <="Z";
		}
		
		function isNsAttr(name) {
			if ( name =="xmlns" || name.indexOf('xmlns:') == 0)
				return true;
			else 
				return false;
		}
		
		function localName(xmlNode) {
			// localName for standard browsers, baseName for IE, nodeName in the absence of namespaces
			return xmlNode.localName || xmlNode.baseName || xmlNode.nodeName;
		}
		
		function findControlClass(sNamespaceURI, sLocalName) {
			try {
				var sClassName;
				var mLibraries = sap.ui.getCore().getLoadedLibraries();
				jQuery.each(mLibraries, function(sLibName, oLibrary) {
					if ( sNamespaceURI === oLibrary.namespace || sNamespaceURI === oLibrary.name ) {
						sClassName = oLibrary.name + "." + ((oLibrary.tagNames && oLibrary.tagNames[sLocalName]) || sLocalName);
					}
				});
				// TODO guess library from sNamespaceURI and load corresponding lib!?
				sClassName = sClassName || sNamespaceURI + "." + sLocalName;
	
				// ensure that control and library are loaded
				jQuery.sap.require(sClassName); // make sure oClass.getMetadata() exists
	
				return jQuery.sap.getObject(sClassName);
			} catch (ex) {
				
				self.pushWarning( "Can't get class " + sNamespaceURI + sLocalName + " due to " + ex); 
						
				return null;
			}
		}

		/**
		 * Parse the node recursively
		 */
		function parseNode(tree, node) {
			var realTree = createXmlCtrlNode(tree, node);
			
			//parse the attributes
			parseAttributes(realTree, node);
			
			//then add the children
			var jqNode = $(node);
			for ( var i = 0; i < jqNode.children().length; i++) {
				var subNode = jqNode.children()[i];
				parseNode(realTree, subNode);
			}
			return realTree;
		}
		
		/**
		 * Smartly create the XMLCtrlNode 
		 * @param node
		 * @param root
		 * @returns
		 */
		function createXmlCtrlNode(parentTreeNode, node) {
			var tn;
			var tnType ;
			var tnName= "";
			var ns = node.namespaceURI;
			var name = localName(node);
			// as in some case the name can like m:semantic.FullscreenPage, so we need get the last part to check 
			// whether it is a normal call or not
			var lastName = Utils.getLastPart(name, ".");  

			var isFragment = false;
			if ( ! parentTreeNode ) {
				tnType = EnumValue.NodeType.Root;
				isFragment = ( name === "FragmentDefinition");
				//!! current some view use sap.ui.core.View, some use sap.ui.core.mvc.View, so now not judge
				if ( name !== "View" && name !== "FragmentDefinition") {
					tnType = EnumValue.NodeType.Ui5;
					tnName = node.namespaceURI + "." + name;
				}
			} else {
				if ( ns === "http://www.w3.org/1999/xhtml" || ns === "http://www.w3.org/2000/svg" ) {
					tnName = name;
					tnType = EnumValue.NodeType.Html;
					
				} else if (isFirstLetterUpperCase(lastName) && Utils.startsWith(ns,"sap.")) {
					//for ui5, then need add .
					tnName = node.namespaceURI + "." + name;
					tnType = EnumValue.NodeType.Ui5;
				} else {
					//aggregation
					tnName = name;
					tnType = EnumValue.NodeType.Aggr;
				}
			}

			tn = new XmlCtrlNode({
					nodeType: tnType,
					nodeName: tnName,
					isFragment: isFragment
				});

			// tn.setLineColumn(node.position.line.start, node.position.line.end, 
				// node.position.column.start, node.position.column.end);
			tn.setPosition( node.position);
			
			if (parentTreeNode) {
				//??for the node which add to the default aggregation, need check whether need add the default aggregation
				if ( parentTreeNode.isAggrNode()) {
					//parent node is an aggregation node, so directly add
					parentTreeNode.addNode( tn );
				} else {
					if ( tn.isAggrNode()) {
						//itsel is Aggr node, also directly add
						parentTreeNode.addNode( tn );
					} else {
						//!!As now from the UI5 metadata, can't know the derault Aggr node, so we don't have solution to 
						//add the default Aggr node smartly, it means that later we can't check whether  the node is valid or not
						
						parentTreeNode.addNode( tn );
					}
				}
			}
			return tn;
		}
		
		
		function parseAttributes(tree,node,forConvert) {
			//for root or html just add
			var rootOrHtml = tree.isRootOrHtmlNode();
			
			if (rootOrHtml) {
				for (var i = 0; i < node.attributes.length; i++) {
					var attr = node.attributes[i];
					var sName = attr.name;
					
					//ignore the xmlns
					if (isNsAttr(sName))
							continue;
					
					var sValue = attr.value;
					tree.addMetaData(sName, sValue);
				}
				return ;
			}
			
			for (i = 0; i < node.attributes.length; i++) {
				attr = node.attributes[i];
				sName = attr.name;
				sValue = attr.value;

				tree.addMetaData(sName, sValue);
			}
		}
		
	} //end of parseXmlView
};
});

