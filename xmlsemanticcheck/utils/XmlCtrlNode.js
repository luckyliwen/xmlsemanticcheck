/**
 * This class will hold the information for a xml control node, it inherit from TreeNode so can easily get the children
 */

define([
		"./EnumValue", "./CustomXmlParser", "./Ui5MetadataMng", "./Utils", "../config/Config"
	], 
function(EnumValue, CustomXmlParser, Ui5MetadataMng, Utils, Config) {
	jQuery.sap.require("sap.ui.commons.TreeNode");

var XmlCtrlNode = sap.ui.commons.TreeNode.extend("sap.watt.saptoolsets.fiori.editor.plugin.xmlsemanticcheck.XmlCtrlNode", 
   	{metadata : {
		properties : {
			//!! all start by node in order to avoid confilct
			//the control name, such as sap.m.Button
			nodeName: 	  { type: "string"},  
			nodeType:     {type: "string", defaultValue: ""},
			isFragment : { type: "boolean", defaultValue: false}, //only valid for the RootNode

			//--line and column infor for the node, now only use the position  
			// lineStart : { type: 'int'},
			// lineEnd : { type: 'int'},
			// colStart:    { type:  'int'},
			// colEnd:    { type:  'int'},
			position: { type: "any"}, //format defined in customerXmlParse, 
		}
	},

	//=============some help function for the node type
	isRootNode: function() {
		return this.getNodeType() == EnumValue.NodeType.Root;
	},

	//!!!! only have meaning for top node
	isFragment: function() {
		return this.getIsFragment();
	},
	
	isHtmlNode: function() {
		return this.getNodeType() == EnumValue.NodeType.Html;
	},
	
	isUi5Node: function() {
		return this.getNodeType() == EnumValue.NodeType.Ui5;
	},
	
	isUi5FragmentNode: function(  ) {
	    return this.isUi5Node() && this.getNodeName() === EnumValue.StrFragment;
	},
	
	isUi5ExtPoint: function( evt ) {
		return this.isUi5Node() && this.getNodeName() === EnumValue.StrExtPoint;   
	},

	isRootOrHtmlNode: function() {
		return this.getNodeType() == EnumValue.NodeType.Root || this.getNodeType() == EnumValue.NodeType.Html;
	},
	
	isAggrNode: function() {
		return (this.getNodeType() == EnumValue.NodeType.Aggr);
	},
	
	isAggrNodeOfName: function(name) {
		return (this.getNodeType() == EnumValue.NodeType.Aggr) &&
			   (name == this.getNodeName());
	},
});

	XmlCtrlNode.prototype.init = function() {
	    this._mMeta = {};
	};


	XmlCtrlNode.prototype.addMetaData = function(name, value) {
	    this._mMeta[name] = value;
	};

/* 	var oIssue = {
                        category: "Syntax Error",
                        checker:"",
                        helpUrl: "",
                        line: error.row,
                        column: error.column,
                        message: error.text,
                        source: "",
                        path: sFullPath
                    };

*/	
	XmlCtrlNode.prototype.addIssue = function(mGlobal,line, column, msgId,arg0, arg1, arg2,arg3) {
		var msg = Utils.getText(msgId, [arg0, arg1, arg2,arg3]);
	    var issue = {
			category: "Semantic Error",  //??here need set different category 
            checker:"",
            helpUrl: "",
            line:   line,
            column: column,
            message: msg,
            source: "",
            path: ""
		};

		mGlobal.issues.push( issue);
	}
	
	
	XmlCtrlNode.prototype.addNodeIssue =  function(mGlobal, msgId, arg0, arg1, arg2, arg3) {
		var position = this.getPosition();
		this.addIssue(mGlobal, position.line.start, position.column.start,
			msgId, arg0, arg1, arg2,arg3);
	}

	/**
	 * Add all the metadata issue:
	 * @param {[type]} mGlobal [description]
	 * @param {[type]} msgId   [description]
	 * @param {[type]} arg0    [description]
	 * @param {[type]} arg1    [description]
	 * @param {[type]} arg2    [description]
	 */
	XmlCtrlNode.prototype.addMetaIssue = function(mGlobal, name, value, msgId, arg0, arg1, arg2,arg3) {
		var nodePos = this.getPosition();
		var position = CustomXmlParser.getPosition(nodePos, 
			Utils.getLastPart(this.getNodeName()), name, value);

		this.addIssue(mGlobal, position.line.start, position.column.start,
			msgId, arg0, arg1, arg2,arg3);
	}

	/**
	 * Check the syntax and semantic for node
	 * @param  {[type]} mGlobal: which will hold some information need considerate for all the node, 
	 *               such as the id then need sure no duplidate
	 * @return {[type]}      [description]
	 */
	XmlCtrlNode.prototype.checkSemantic =  function( mGlobal ) {
	    this.checkSemantic_NodeSelf(mGlobal);
	    this.checkSemantic_Meta(mGlobal);
	    
	    //then the sub nodes 
	    var nodes = this.getNodes();
		for ( var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			node.checkSemantic(mGlobal);
		}
	}
	
	XmlCtrlNode.prototype.checkSemantic_Meta_Prop = function( mGlobal, name, value, propMeta, controlMeta) {
	    var binding = Utils.parseBindingInfor(value);
	    if ( binding.paths && binding.paths != "") {
			if ( ! Utils.isValidBindingPath(binding.paths))  {
				this.addMetaIssue(mGlobal, name, value,"XML_INVALID_BINDING_PATH");
			}

			if (binding.formatter && binding.formatter != "") {	
				if ( ! Utils.isValidFunction(binding.formatter))  {
					this.addMetaIssue(mGlobal, name, value, "XML_INVALID_FORMATTER_FUNC", binding.formatter);
				}
			}
			return;
		} 

		var retArr = Ui5MetadataMng.checkPropertyValue(name, value, propMeta, controlMeta, mGlobal.metaData);
		if (retArr.length >0) {
			this.addMetaIssue(mGlobal, name, value,retArr[0], retArr[1],retArr[2],retArr[3],retArr[4]);
		}

	}

	XmlCtrlNode.prototype.checkSemantic_Meta_Event = function( mGlobal, name, value, metaData  ) {
	    if ( !Utils.isValidFunction(value)) {
			this.addMetaIssue(mGlobal, name, value, "XML_INVALID_EVENT_FUNC", value);
		}
	}

	XmlCtrlNode.prototype.checkSemantic_Meta_Asso = function( mGlobal, name, value, metaData  ) {
		//for the Associatin, the id must existed, but it maybe before the corresponding control, so here just check the id is valid    
		if ( ! Utils.isValidId(value)) {
			this.addMetaIssue(mGlobal, name, value,"XML_INVALID_ASSOCIATION_VALUE");
		}
	}

	XmlCtrlNode.prototype.checkSemantic_Meta_Aggr = function( mGlobal, name, value, metaData  ) {
	    //here later we can add check for the binding path of  the aggregation, or the normal string for the alterType such as string
	}

	XmlCtrlNode.prototype.checkSemantic_Meta = function( mGlobal ) {
		//first need ensure can get the metadata for this control
		var controlMeta = Ui5MetadataMng.getMetadataByName(mGlobal.metaData, this.getNodeName());
		if (!controlMeta)
			return;

		for (var name in this._mMeta) {
			var value = this._mMeta[name];

			//for the id and class, can check it without the metadata
			if (name == 'id') {
				if ( ! Utils.isValidId(value)) {
					this.addMetaIssue(mGlobal, name, value, "XML_INVALID_ID");
				}

				if ( mGlobal.aId.indexOf( value ) === -1 ) {
					mGlobal.aId.push( value );
				} else {
					if ( Config.isCheckPointEnabled( EnumValue.CheckPoint.DuplicateId)) {		
						this.addMetaIssue(mGlobal, name, value, "XML_DUPLICATE_ID");
					}
				}
				continue;
			} else if (name == "class") {
				if ( ! Utils.isValidCssClass(value)) {
					this.addMetaIssue(mGlobal, name, value, "XML_INVALID_CSS");
				}
				continue;
			} else if (name == 'binding') {
				//as the binding is special property, which not provided in the metadata, so just ingore it
				continue;
			}

			var metaInfo = Ui5MetadataMng.getMetaTypeAndMetaData(mGlobal.metaData, this.getNodeName(), name);

			if (metaInfo.metaType == EnumValue.MetaType.Unknown) {
				//now it may like customData:persoKey, in UI5 it will add customer data, so just do simple check
				if ( name.indexOf(":") == -1) {
					this.addMetaIssue(mGlobal, name, value, "XML_INVALID_PROPERTY_NAME", name);
				}
				//!!here  can add the auto check solution
			} else if (metaInfo.metaType == EnumValue.MetaType.Prop) {
				this.checkSemantic_Meta_Prop( mGlobal,name,value, metaInfo.metaData, controlMeta); 
			} else if (metaInfo.metaType == EnumValue.MetaType.Asso) {
				this.checkSemantic_Meta_Asso( mGlobal,name,value, metaInfo.metaData); 
			} else if (metaInfo.metaType == EnumValue.MetaType.Event) {
				this.checkSemantic_Meta_Event( mGlobal,name,value, metaInfo.metaData); 
			} else if (metaInfo.metaType == EnumValue.MetaType.Aggr) {
				this.checkSemantic_Meta_Aggr( mGlobal,name,value, metaInfo.metaData); 
			}
		}
	}
	
	 
	/**
	 * Check the semantic error for the node itself
	 * @param  {[type]} mGlobal [description]
	 * @return {[type]}         [description]
	 */
	XmlCtrlNode.prototype.checkSemantic_NodeSelf = function( mGlobal ) {
		var parentMeta;
		var parent;
		var aggrInfo;

		//first need ensure can get the metadata for the ui5 control
		if ( this.isUi5Node()) {
			var controlMeta = Ui5MetadataMng.getMetadataByName(mGlobal.metaData, this.getNodeName());
			if (!controlMeta)
				return;
		}

	    if (this.isRootNode()) {
	    	//now for root node no need check 
	    } else if ( this.isAggrNode()) {
	    	parent = this.getParent();

	    	if ( !parent.isUi5Node()) {
	    		this.addNodeIssue(mGlobal, "XML_INVALID_AGGR_NODE", this.getParent().getNodeName());
	    	} 
	    	var bValidAggrNodeName = Ui5MetadataMng.isValidAggregationName(mGlobal.metaData, 
	    		this.getParent().getNodeName(), this.getNodeName());

	    	if (  !bValidAggrNodeName) {
	    		//node name is not valid, 
				this.addNodeIssue(mGlobal, "XML_INVALID_AGGR_NODE", this.getParent().getNodeName());
	    	} else {
	    		//check the Aggr deprecated
	    		if (  Config.isCheckPointEnabled( EnumValue.CheckPoint.Deprecated)) {
	    			if ( Ui5MetadataMng.isAggregationDeprecated(mGlobal.metaData, 
	    					this.getParent().getNodeName(), this.getNodeName()) ) 
	    			{
	    				this.addNodeIssue(mGlobal, "XML_DEPRECATED_AGGREGATION",  this.getNodeName(),
	    					this.getParent().getNodeName());
	    			}
	    		}
	    	}

	    } else if ( this.isUi5Node()) {
	    	//check whether is valid candidate for the parent node 
	    	if ( this.isUi5FragmentNode() || this.isUi5ExtPoint() ) {
	    		//for the fragment it is very difficult  to get the real code so now just ignore it 
	    	} else {
	    		
	    		if (  Config.isCheckPointEnabled( EnumValue.CheckPoint.Deprecated)) {
	    			if ( Ui5MetadataMng.isControlDeprecated(mGlobal.metaData, this.getNodeName()) ) {
	    				this.addNodeIssue(mGlobal, "XML_DEPRECATED_CONTROL",  this.getNodeName(),
	    					this.getParent().getNodeName());
	    			}
	    		}	

		    	parent = this.getParent();
		    	if ( parent.isAggrNode()) {
					//!!now there are some controls which implemented itself logic for Aggr, for example the 
					// SemanticPage.prototype.addCustomFooterContent , then it means even the customFooterContent type is sap.m.Button
					// but now it can add all the controls, for this case just maintain it in cfg,
					if ( Config.isSpecialAggregationNode( parent.getNodeName()))
						return ;
				
		    		var parentParent = parent.getParent();
		    		if ( !parentParent.isUi5Node()) {
		    			//it should not happens and have been report by parent node
		    			return;
		    		}

					var aggrInfo =  Ui5MetadataMng.getAggregationMetadata(mGlobal.metaData,
							parentParent.getNodeName(), parent.getNodeName());
					if (aggrInfo) {
						var bValidCandidate = Ui5MetadataMng.isValidAggregationCandidate(mGlobal.metaData,
							parentParent.getNodeName(), 
							parent.getNodeName(),
							this.getNodeName() );

						if (!bValidCandidate) {
							this.addNodeIssue(mGlobal, "XML_INVALID_CANDIDATE", 
								parentParent.getNodeName(), aggrInfo.type);
						}

						//also can check whether it is not multiple but put several nodes
						if ( !aggrInfo.multiple) {
							if ( parent.getNodes().length > 1) {
								//it don't allow multiple, so only report from the seconds
								if ( this != parent.getNodes()[0]) {
									this.addNodeIssue(mGlobal, "XML_INVALID_MULTIPLICITY", 
										parent.getNodeName(), parent.getNodes().length);
								}
							}
						}
					} //if (aggrInfo) { 
		    	} //end of if ( parent.isAggrNode())	
		    	else {
		    		//!!As now from the metadata can't get the default Aggregation name, so can't do check for this case
		    	}
	    	}
	    }
	}

	return XmlCtrlNode;
});