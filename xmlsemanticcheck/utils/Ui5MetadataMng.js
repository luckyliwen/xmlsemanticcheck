define(["./EnumValue", "./Utils"], function(EnumValue, Utils) {
    "use strict";

    //it contain all the UI5 library information by the version, 
    var _mMeta = {};

    //!!now the UI5 control/element metadata not contain the Aggregation for Element, as it is very stable, so just 
    //put the static value here for performance
    var _mElementAggr= {
        customData: {
            Deprecated: false,
            multiple: true,
            type: "sap.ui.core.CustomData"
        }, 
        dependents: {
            Deprecated: false,
            multiple: true,
            type: "sap.ui.core.Control"
        },
        layoutData: {
            Deprecated: false,
            multiple: false,
            type: "sap.ui.core.LayoutData"
        },
        tooltip: {
            Deprecated: false,
            multiple: false,
            type: "sap.ui.core.TooltipBase"
        }
    };

    var _mControlProp = {
        busy: {
            Deprecated: false,
            type: "boolean",
            defaultValue: false
        },
        busyIndicatorDelay: {
            Deprecated: false,
            defaultValue: "1000",
            type: "int"
        },
        visible: {
            Deprecated: false,
            defaultValue: true,
            type: "boolean"
        }
    };

    var defaultCheckLib = [
        "sap.m.json",
        "sap.ui.core.json",
        "sap.ui.commons.json",
        "sap.ui.table.json",
        "sap.ui.layout.json",
        "sap.ui.comp.json",
        "sap.uxap.json"
    ];
    

    return {

    	/**
    	 * load the UI5 metadata from server by version
    	 * @param  {[type]} libInfo : a map, like {version: '1.29',  librarys: 'sap.m, sap.ui.table'}
    	 *                        for the librarys, need confirm with UI5  team whether can return all the library separately or together
    	 * @return {[type]}         [description]
    	 */
    	loadMetadata: function( libInfo ) {
    	    //first check whether it has been loaded, 
    	    if ( libInfo.vesion in _mMeta) {
    	    	return Q( _mMeta[ libInfo.vesion ])
    	    };

            var metadataPromise = Q.defer();

    	    //load data, unzip it
    	    //??like return that.context.service.librarymetadata.getMetadata("sapui5", "xml", "1.29"); 
    	    //??now just use the local demo data to simulate it, 
            var url = "./demo_data/1.35.0.zip";

    	    var oSimulateZipPromise = this._simulateLoadZipFile(url);
    	    var that = this;
    	    
			oSimulateZipPromise.then( 
				function(data){
    	    		return that._onLoadZipSuccess(data, libInfo);
    	    	},
    	    	function( error ) {
    	       		metadataPromise.reject(error);
    	    	}
    	    ).then(
    	    	function(versionMetadata){
    	    		metadataPromise.resolve( versionMetadata );
    	    	},
    	    	function(error) {
    	    		metadataPromise.reject(error);
    	    	}
    	    );

    	    return metadataPromise.promise;
    	},

        /**
         * Get metadata for the control or element
         * 
         * @param  {[type]} mMetadata:  The metadata for the project UI5 version
         * @param  {[type]} controlOrElementName 
         * @return {[type]} The UI5 metadata for the control or element name
         */
        getMetadataByName: function( mMetadata, controlOrElementName) {
            return mMetadata.metadatas[ controlOrElementName ];
        },
        
        /**
         * Get the aggregation metadata for the controls's aggregation name
         * @param  {[type]} mMetadata            [description]
         * @param  {[type]} controlOrElementName [description]
         * @param  {[type]} aggregationNodeName  [description]
         * @return {[type]}                      [description]
         */
        getAggregationMetadata:function( mMetadata, controlOrElementName, aggregationNodeName ) {
            if (mMetadata.metadatas[ controlOrElementName]) {
                //Now the aggregations not contain the Element part, so need add here
                var mAggr = mMetadata.metadatas[ controlOrElementName][ "aggregations"];
                if (aggregationNodeName in mAggr) {
                    return mAggr[aggregationNodeName];
                } else {
                    //Try to get from the Element 
                    return _mElementAggr[ aggregationNodeName];
                }
            }

            return null;
        },

        /*
         * Check whether it is a valid aggregation name or not
         */
        isValidAggregationName: function( mMetadata, controlOrElementName, aggregationNodeName) {
            var md = this.getAggregationMetadata(mMetadata, controlOrElementName, aggregationNodeName);
            return md !== null;
        },

        /*
         * Check whether the aggregation is deprecated or not
         */
        isAggregationDeprecated: function( mMetadata, controlOrElementName, aggregationNodeName) {
            var md = this.getAggregationMetadata(mMetadata, controlOrElementName, aggregationNodeName);
            if (md)
                return md.Deprecated;
            else 
                return false;
        },   

        /*
         * Check whether teh control is deprecated or not
         */
        isControlDeprecated: function( mMetadata, controlOrElementName) {
            var md = mMetadata.metadatas[ controlOrElementName ];
            if (md)
                return md.Deprecated;
            else 
                return false;
        },     

        /**
         * Private function: check whether the control is instance of the type name
         * @param  {[type]}  mMetadata [description]
         * @param  {[type]}  ctrlName  [description]
         * @param  {[type]}  typeName  [description]
         * @return {Boolean} : true if is instance of, otherwise false     
         */
        _isInstanceOf: function(mMetadata, ctrlName, typeName) {
            //!!some is interface, but now UI5 metadata not support it , so currently need ignore it 
            var md = this.getMetadataByName(mMetadata, typeName);
            if (!md)
                return true;

            //first check itself, if not then check it's parent extend: "sap.ui.core.Control"
            if (ctrlName == typeName) {
                return true;
            } else {
                //only reach to the topMost class: "sap.ui.core.Element" for performance
                if ( ctrlName != EnumValue.StrElement) {
                    var md = this.getMetadataByName(mMetadata, ctrlName);
                    if (md) {
                        var extend = md.extend;
                        return this._isInstanceOf(mMetadata, extend, typeName);
                    } else {
                        //!! if can't get that,then by default just ignore it
                        return true;
                    }
                }
            }

            return false;
        },
        
        /**
         * Check whether the control is a validate candidate for a control's aggregation, 
         *      such as for the Table, the sap.ui.table.Column is a valid candidate for the Columns aggregation node
         * @param  {[type]}  mMetadata            [description]
         * @param  {[type]}  controlOrElementName [description]
         * @param  {[type]}  aggregationNodeName  [description]
         * @param  {[type]}  candidateName        [description]
         * @return {Boolean}                      [description]
         */
        isValidAggregationCandidate: function( mMetadata, controlOrElementName, aggregationNodeName, candidateName) {
            var md = this.getAggregationMetadata(mMetadata, controlOrElementName, aggregationNodeName); 
            //now candidateName like sap.ui.table.TreeTable,  
            if (md) {
                //type like sap.ui.table.Table
                var type = md.type; 

                return this._isInstanceOf(mMetadata, candidateName, type);
            }

            return false;            
        },
        
        

        /**
         * Get the meta data type ( Agrr, Prop, Asso,Event ) and the meta data 
         * @param  {[type]} mMetadata            [description]
         * @param  {[type]} controlOrElementName [description]
         * @param  {[type]} metaName             [description]
         * @return {[type]} : {
         *                    metaType: value in EnumValue.MetaType,
         *                    metaData: the map of the detail property of the Prop/Event/Asso
         *                    }
         */
        getMetaTypeAndMetaData: function( mMetadata, controlOrElementName, metaName ) {
            var md = mMetadata.metadatas[ controlOrElementName];

            var ret = {
                metaType: EnumValue.MetaType.Unknown,
                metaData: null
            };

            if ( !md) {
                return ret;
            }

            //first try to get from itself, if not then find from parent,until reach to the Control or element
            if ( metaName in md.properties) {
                ret.metaType = EnumValue.MetaType.Prop ; 
                ret.metaData = md.properties[ metaName];
            } else if (metaName in md.aggregations) {
                ret.metaType = EnumValue.MetaType.Aggr ;
                ret.metaData = md.aggregations[ metaName]; 
            } else if (metaName in md.associations) {
                ret.metaType = EnumValue.MetaType.Asso ; 
                ret.metaData = md.associations[ metaName]; 
            } else if (metaName in md.events) {
                ret.metaType = EnumValue.MetaType.Event ; 
                ret.metaData = md.events[ metaName]; 
            }

            if (ret.metaType != EnumValue.MetaType.Unknown) {
                return ret;    
            } else {
                //try to get from parent, until reach to top most
                if ( controlOrElementName == EnumValue.StrManagedObject) {
                    //still can't find, no need check parent any more
                    return ret;
                } else {
                    var parentName = md.extend;
                    return this.getMetaTypeAndMetaData(mMetadata, parentName, metaName);
                }
            }
        },
    
        /**
         * Check the semantic of the property value, mainly based on the metadata type
         * @param  {[type]} name        : property name
         * @param  {[type]} value       : property value
         * @param  {[type]} propMeta    : the meta data for the property
         * @param  {[type]} controlMeta : the meta dat for the control, it is needed when do the auto fix
         * @param  {[type]} mMetadata: The metadata for current version
         * @return {[type]}           return [] means no error, else return the array: [msgId, arg0, arg1, arg2, arg3]
         */
        checkPropertyValue : function(name, oValue, propMeta, controlMeta, mMetadata) {
            //Here check for the enum value first
            if (  Utils.startsWith( propMeta.type, "sap.") ) {
                var mEnum = mMetadata.enums[ propMeta.type ];
                //some basic type like the sap.ui.core.CSSSize will not find in enums, so it will do the normal check
                if (mEnum) {
                    //here normal case is a enum value not correct, then we also try to get the correct value
                    if ( oValue in mEnum) {
                        return [];
                    } else {
                        //Invalid property value <{0}> for enum type <{1}> of property <{3}>. 
                        //!!here can use the string similary check to get the most matched case
                        return ["XML_INVALID_PROPERTY_ENUM_VALUE", oValue, propMeta.type, name];
                    }
                }
            }

            var oType = sap.ui.base.DataType.getType(propMeta.type);

            // If property has an array type, clone the array to avoid modification of original data
           /* if (oType instanceof sap.ui.base.DataType && oType.isArrayType() && jQuery.isArray(oValue)) {
                oValue = oValue.slice(0);
            }*/

            // In case null is passed as the value return the default value, either from the property or from the type
            if (oValue === null || oValue === undefined) {
                //just pass
            } else if (oType instanceof sap.ui.base.DataType) {
                // Implicit casting for string only, other types are causing errors

                if (oType.getName() == "string") {
                    // if (!(typeof oValue == "string" || oValue instanceof String)) {
                    //  oValue = "" + oValue;
                    // }
                } else if (oType.getName() == "string[]") {
                    // For compatibility convert string values to array with single entry
                    // if (typeof oValue == "string") {
                    //     oValue = [oValue];
                    // }
                    // if (!jQuery.isArray(oValue)) {
                    //     //Invalid property value: {0} is type {1}, expected {2} for property {3}. Please enter the correct value for the mode type. 
                    //     return ["XML_INVALID_PROPERTY_VALUE", oValue, typeof oValue, "string[]", name];
                    // }
                } else  {
                    //here the value is string like "true", so need covnert to to the corresponding data type,
                    var  parsedValue = null; 
                    //but for the enum type can't use the parseValue as it will return null, then the prompt willl lost real value 
                    if (  Utils.startsWith( propMeta.type, "sap.") ) {
                        // if (parseValue == null) {
                        //  parseValue = oValue;
                        // }
                        parsedValue = oValue;
                    } else {
                        parsedValue = oType.parseValue(oValue);
                    }

                    //??need check for the enum value
                    if ( !oType.isValid(parsedValue) ) {
                        //here normal case is a enum value not correct, then we also try to get the correct value 
                        return ["XML_INVALID_PROPERTY_VALUE", oValue, typeof oValue, oType.getName() , name];
                    }
                }
            }

            return [];
        },

        _isNeedCheckedLib : function( fileName ) {
            for (var i=0; i < defaultCheckLib.length; i++) {
                //as the file name may contain _ or not, so just juse indexOf to match 
                if (fileName.indexOf(defaultCheckLib[i]) != -1) 
                    return true;
            }
            return false;
        },
        
    	_onLoadZipSuccess: function( zipContent, libInfo ) {
    	    var jsZip = new JSZip();
			jsZip.load(zipContent);

			
			var version = libInfo.version;

			if ( ! (version in _mMeta)) {
				_mMeta[version] = {
					enums: {},
					metadatas: {} 
					};
			}

			var oDefer = Q.defer();
			for (var fileName in jsZip.files) {
				//??here need check from the libInfo to know which library need parse or not  sap.m.json
				//??now just parse the default mobile library
                if (this._isNeedCheckedLib(fileName)) {
					var content = jsZip.files[fileName].asText();
					try {
						var json = JSON.parse(content);
						//just merge 
						jQuery.extend( true, _mMeta[version], json);
					} catch(ex) {
						oDefer.reject("File content " + fileName + " is invalida");
					}
				}
			}

			//now all library load, so can return 
			oDefer.resolve( _mMeta[version] );

			return oDefer.promise;
    	},

    	_simulateLoadZipFile: function( url) {
    	    var oDefer = new Q.defer();

    	    //here can't directly use the jQuery.ajax to load zip file
			var request = new XMLHttpRequest();
			request.open("GET", url, true);
			request.responseType = "arraybuffer";
			

			request.onload = function(event) {
				if (this.readyState === 4 && this.status < 300) {
					oDefer.resolve(this.response);
				} else {
					oDefer.reject(new Error("Read file " + url + " error"));
				}
			};
			request.onerror = function(error) {
				oDefer.reject(error);
			};
			request.send(null);

			return oDefer.promise;
    	}
    	    	
    };
});