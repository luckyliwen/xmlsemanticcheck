/**
 * This class will provide some basic function for  the string,array
 */
define([], function() {
	/**
	 * i18n service object
	 * init: _.once(function (oContext) {
				jQuery.sap.assert(oContext, "oContext must be a valid service context");
				_oI18nService = _.get(oContext, "i18n");
				jQuery.sap.assert(_oI18nService, "i18n service does not exists in the given context");
			}),
	 */
	var _oI18nService = null, _oResourceBundle = null; 

   	return {
		isValidId : function( id ) {
		    var regexp = /^([A-Za-z_][-A-Za-z0-9_.:]*)$/;
		    return regexp.test(id);
		},

		isValidCssClass : function( cssClass ) {
		    var regexp = /^([_a-zA-Z]+[_a-zA-Z0-9-]*\s*)+$/;
		    return regexp.test(cssClass);
		},

		isValidFunction : function( funcName ) {
		    var regexp = /^\.?[a-zA-Z_][\w_\.]*$/;
		    return regexp.test(funcName);
		},

		isValidBindingPath : function( path ) {
			var regexp = /([\w_\/>]+\,?)+/;
			return regexp.test(path);	
		},

   		startsWith: function(str, subStr) {
   		    return str.indexOf(subStr) === 0;
   		},
   		
		/**
 		* Get the last part of one string, for sap.m.Button, then it will get Button
 		*/		
		getLastPart: function(name, sep) {
			if (sep == undefined)
				sep = ".";

			var pos = name.lastIndexOf(sep);
			if (pos == -1)
				return name;
			else {
				return name.substr(pos + 1);
			}
		},

		/**
		 * Remove one string last part by length or string
		 * s = "name.xml.view'
		 * s.sapRemoveLast(5)  = name.xml
		 * s.sapRemoveLast('view')  = name.xml. 
		 * @param lenOrStr
		 */
		removeLastPart : function( str, lenOrStr) {
			if (typeof lenOrStr =="number") {
				return str.substr(0,   str.length - lenOrStr);
			} else {
				//if not end by it then no remove
				return str.substr(0,   str.length - lenOrStr.length);
			}
		},

		/**
		 * Gets the text from the resource bundle
		 *
		 * @param {string} sKey the key
		 * @param {string[]=} aArgs List of parameters which should replace the place holders "{n}"
		 * (n is the index) in the found locale-specific string value
		 */
		getText: function (sKey, aArgs) {
			//??
			if ( ! _oI18nService) {
				jQuery.sap.require("sap.ui.model.resource.ResourceModel");
				_oI18nService = this._createResourceModel();
				_oResourceBundle = _oI18nService.getResourceBundle();
			}

			if (_oResourceBundle) {
				return _oResourceBundle.getText(sKey, aArgs)
			} else {
				return sKey;
			}

		},

		/*
		s = "{  path:'tea>receipt_amount',   type:'sap.ui.model.type.Float',formatOptions:{groupingEnabled:true}}" ;
		n = s.replace(/(\w+)(\s*):/mg, function(match, number) {
						//now match contain the word, space and : 
						var word = match.trim();
						//remove the last :
					
						return '"' + word.substr(0, word.length-1) + '" : ';
					});
		n = n.replace( /\'/g, '"');			
		var obj = JSON.parse(n);
		*/

		/**
		 * "{        path :"cart>PictureUrl"
		 * str like {  path:'tea>receipt_amount',   type:'sap.ui.model.type.Float',formatOptions:{groupingEnabled:true}},
		 * return: json object
		 */
		parseComplexObjectFromString : function(str) {
			
			var normal = str.replace(/(\w+)(\s*):/mg, function(match, number) {
				
				//now match contain the word, space and : 
				var word = match.trim();
				
				//first remove the extra space if any
				word = word.replace( /\s/g, "");
				
				return '"' + word.substr(0, word.length-1) + '" : ';
			});
			
			//
			normal = normal.replace( /\'/g, '"');			
			
			var o = null;
			try {
				o = $.parseJSON(normal);
			} catch (ex) {
				jQuery.sap.log.error("Normal string error", "reason " + ex +" str is " + str );
			}

			return o;
		},

		/**
		 * From the complex string get the binding information, 
		 * @return:  one map,  
		 */
		parseBindingInfor : function(str) {
			//if don't have {} then is the pure string
			var m = {value: "", paths: "", formatter:"", tooComplex: false, extraStr: ""};
			if (str == undefined)
				return m;
			
			var startPos = str.indexOf('{');
			var endPos = str.lastIndexOf('}');
			
			if ( startPos == -1 &&  endPos == -1) {
				//pure value
				m.value = str;
				return m;
			} 
			
			//If like footerText="{ path :"cart>/totalPrice", 	formatter :"util.Formatter.totalPrice" } EUR"   
			//then just set the flag no need parse it
			if ( (startPos != 0)  || (endPos != (str.length -1)) ) {
				m.value = str;
				m.tooComplex = true;
				return m;
			}
			
			
			//2: pure path, without the formatter
			var pathPos = str.indexOf('path');
			var formatterPos = str.indexOf('formatter');
			if ( pathPos == -1 && formatterPos == -1) {
				//remove the {
				str = str.substr(1);
				m.paths = this.removeLastPart(str,1);
				
				//even without the path, formatter, it still may have multiple {}, 
				//just like {/currencySymbol} {dpt_i18n>SPENT_TEXT}
				//??later need check good way, now just use string replace 
				if ( m.paths.indexOf('}') != -1) {
					m.paths = m.paths.replace( /\}/g,  "");
					m.paths = m.paths.replace( /\{/g,  ",");
					m.paths = m.paths.replace( /\s/g,  "");
				}
				
				return m;
			}
			
			var obj = this.parseComplexObjectFromString(str);
			
			if (obj == null) {
				m.value = str;
				m.tooComplex = true;
				return m;
			}
			
			//Also there are other options, so need one unify way to do so
			/*
			//not care the parts, path or formater, just normalize it then get the parsed value
			//as some pay 
			str = str.replace( /path/g,  "'path'");
			str = str.replace( /formatter/g,  "'formatter'");
			str = str.replace( /parts/g,  "'parts'");
			
			//as now JSON.parse only know ", so need change all ' to ""
			str = str.replace( /'/g, '"');
			*/
				
				if ('formatter' in obj ) {
					m.formatter = obj.formatter;
					delete obj.formatter;
				}
				
				//have parts, then must no path
				if ("parts" in obj) {
					var arr = [];
					var parts = obj.parts;
					
					for ( var i = 0; i < parts.length; i++) {
						var entry = parts[i];
						//may be pure string or {"path"}
						
						if (typeof entry =="string") {
							arr.push( entry);
						} else if (typeof entry =="object") {
							//then the path must in it
							
							if ("path" in entry) {
								arr.push( entry.path);
							} 
						}
					}
					m.paths = arr.join(',');
					
					delete obj.parts;
					
				} else {
					//only path
					if ("path" in obj) {
						m.paths  = obj.path;
						
						delete obj.path;
					} 
				}
				return m;
		},

		//==========in WebIDE environment, following can be delete
		/**
		 * Private function: create text resource model and bind it to core framework. 
		 * @param sLocale :  language locale.   	
		 */
		_createResourceModel: function(sLocale){
			var locale = sLocale || this._getDefaultLocale();
			var textModel = new sap.ui.model.resource.ResourceModel({
				bundleUrl:    "./xmlsemanticcheck/i18n/i18n.properties", 
				bundleLocale: locale
			});
			return textModel;
		},
		
		/**
		 *  Private function: get current language used by browser. 
		 */
		_getDefaultLocale:function() {
			var sLocale;
			if(window.sap && sap.ui && sap.ui.getCore){
				sLocale = sap.ui.getCore().getConfiguration().getLanguage();
			}
			return sLocale || "en";
		}
	}
});